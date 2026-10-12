import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { RolesGuard } from './roles.guard';

/** ExecutionContext giả: guard chỉ dùng getHandler, getClass và switchToHttp().getRequest(). */
function context(user: unknown): ExecutionContext {
  return {
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  afterEach(() => {
    jest.restoreAllMocks(); // trả getAllAndOverride về bản thật cho test sau
  });

  it('route không khai báo @Roles → cho qua, kể cả chưa đăng nhập', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(context(undefined))).toBe(true);
  });

  it('@Roles() rỗng → cho qua', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
    expect(guard.canActivate(context(null))).toBe(true);
  });

  it('đúng role → cho qua', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    expect(guard.canActivate(context({ id: 1, role: Role.ADMIN }))).toBe(true);
  });

  it('sai role → chặn', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    expect(guard.canActivate(context({ id: 2, role: Role.USER }))).toBe(false);
  });

  it.each([undefined, null])('route cần role mà user là %p → chặn, không crash', (user) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    expect(guard.canActivate(context(user))).toBe(false);
  });

  it('đọc metadata ở cả method lẫn class (method ghi đè class)', () => {
    const spy = jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = context(undefined);
    guard.canActivate(ctx);
    expect(spy).toHaveBeenCalledWith('roles', [expect.any(Function), expect.any(Function)]);
  });
});
