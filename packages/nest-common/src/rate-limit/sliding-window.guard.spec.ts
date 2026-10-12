import { HttpException, HttpStatus, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type Redis from 'ioredis';
import { SlidingWindowRateLimitGuard } from './sliding-window.guard';

/**
 * Redis giả: chỉ đủ cho `pipeline()`. `countBefore` là số request đã có trong cửa sổ
 * (kết quả của lệnh thứ 2, ZCARD). Ghi lại từng lệnh để kiểm tra guard gửi gì.
 */
function fakeRedis(countBefore: number) {
  const calls: [string, ...unknown[]][] = [];
  const pipe = {
    zremrangebyscore: jest.fn((...a: unknown[]) => (calls.push(['zremrangebyscore', ...a]), pipe)),
    zcard: jest.fn((...a: unknown[]) => (calls.push(['zcard', ...a]), pipe)),
    zadd: jest.fn((...a: unknown[]) => (calls.push(['zadd', ...a]), pipe)),
    expire: jest.fn((...a: unknown[]) => (calls.push(['expire', ...a]), pipe)),
    exec: jest.fn().mockResolvedValue([
      [null, 0],
      [null, countBefore],
      [null, 1],
      [null, 1],
    ]),
  };
  const redis = { pipeline: jest.fn(() => pipe) } as unknown as Redis;
  return { redis, pipe, calls };
}

function context(ip?: string): ExecutionContext {
  class AuthController {}
  function login() {}
  return {
    getHandler: () => login,
    getClass: () => AuthController,
    switchToHttp: () => ({ getRequest: () => ({ ip }) }),
  } as unknown as ExecutionContext;
}

describe('SlidingWindowRateLimitGuard', () => {
  const NOW = new Date('2026-10-12T10:00:00.000Z').getTime();
  let reflector: Reflector;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    reflector = new Reflector();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  function guardWith(config: { limit: number; windowSec: number } | undefined, countBefore = 0) {
    jest.spyOn(reflector, 'get').mockReturnValue(config);
    const fake = fakeRedis(countBefore);
    return { guard: new SlidingWindowRateLimitGuard(reflector, fake.redis), ...fake };
  }

  it('route không có @RateLimit → cho qua và KHÔNG gọi Redis', async () => {
    const { guard, redis } = guardWith(undefined);
    await expect(guard.canActivate(context('1.2.3.4'))).resolves.toBe(true);
    expect(redis.pipeline).not.toHaveBeenCalled();
  });

  it('chưa tới giới hạn → cho qua', async () => {
    const { guard } = guardWith({ limit: 5, windowSec: 60 }, 4);
    await expect(guard.canActivate(context('1.2.3.4'))).resolves.toBe(true);
  });

  it('đủ giới hạn → ném 429 kèm retryAfter', async () => {
    const { guard } = guardWith({ limit: 5, windowSec: 60 }, 5);
    const error = await guard.canActivate(context('1.2.3.4')).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect((error as HttpException).getResponse()).toEqual({
      message: 'Too many requests',
      retryAfter: 60,
    });
  });

  it('gửi đúng 4 lệnh theo thứ tự: dọn cũ, đếm, thêm mới, đặt hạn', async () => {
    const { guard, calls } = guardWith({ limit: 5, windowSec: 60 });
    await guard.canActivate(context('1.2.3.4'));

    const key = 'rl:1.2.3.4:AuthController:login';
    expect(calls.map((c) => c[0])).toEqual(['zremrangebyscore', 'zcard', 'zadd', 'expire']);
    expect(calls[0]).toEqual(['zremrangebyscore', key, 0, NOW - 60_000]);
    expect(calls[2]).toEqual(['zadd', key, NOW, expect.stringMatching(new RegExp(`^${NOW}-`))]);
    expect(calls[3]).toEqual(['expire', key, 61]);
  });

  it('không có ip → dùng "unknown" làm khóa (mọi request như vậy chung một hạn mức)', async () => {
    const { guard, calls } = guardWith({ limit: 5, windowSec: 60 });
    await guard.canActivate(context(undefined));
    expect(calls[1]).toEqual(['zcard', 'rl:unknown:AuthController:login']);
  });

  it('Redis trả kết quả rỗng → coi như 0, cho qua', async () => {
    const { guard, pipe } = guardWith({ limit: 5, windowSec: 60 });
    pipe.exec.mockResolvedValueOnce(null);
    await expect(guard.canActivate(context('1.2.3.4'))).resolves.toBe(true);
  });
});
