import { NEVER, of, throwError } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { GrpcDispatchClient } from './grpc-dispatch.client';

function clientWith(dispatch: () => unknown) {
  const grpc = { getService: () => ({ dispatch }) };
  const client = new GrpcDispatchClient(grpc as never, 'ContentService');
  client.onModuleInit();
  return client;
}

describe('GrpcDispatchClient', () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
  });

  it('trả kết quả đã parse', async () => {
    const client = clientWith(() => of({ result: JSON.stringify({ ok: 1 }), error: '' }));
    await expect(firstValueFrom(client.send('X', {}))).resolves.toEqual({ ok: 1 });
  });

  it('lỗi hạ tầng lặp lại → mở mạch: trả 503 ngay, không gọi service nữa', async () => {
    process.env.MICROSERVICE_TIMEOUT_MS = '5';
    const dispatch = jest.fn(() => NEVER);
    const client = clientWith(dispatch);
    for (let i = 0; i < 10; i += 1) {
      await expect(firstValueFrom(client.send('GET_LESSONS', {}))).rejects.toMatchObject({ statusCode: 504 });
    }
    expect(client.breaker.currentState).toBe('OPEN');
    dispatch.mockClear();
    await expect(firstValueFrom(client.send('GET_LESSONS', {}))).rejects.toMatchObject({ statusCode: 503 });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('lỗi nghiệp vụ (404) không mở mạch — service vẫn sống', async () => {
    const client = clientWith(() =>
      of({ result: '', error: JSON.stringify({ statusCode: 404, message: 'Không tìm thấy' }) }),
    );
    for (let i = 0; i < 15; i += 1) {
      await expect(firstValueFrom(client.send('GET_LESSON', {}))).rejects.toMatchObject({ statusCode: 404 });
    }
    expect(client.breaker.currentState).toBe('CLOSED');
  });

  it('mất kết nối gRPC → 503, không lộ chi tiết nội bộ', async () => {
    const client = clientWith(() =>
      throwError(() => Object.assign(new Error('14 UNAVAILABLE: No connection established'), { code: 14 })),
    );
    const err = (await firstValueFrom(client.send('GET_LESSON', {})).catch((e: unknown) => e)) as {
      statusCode: number;
      message: string;
    };
    expect(err.statusCode).toBe(503);
    expect(err.message).not.toMatch(/UNAVAILABLE|No connection/);
  });

  it('service con không phản hồi → lỗi 504 sau timeout (không treo mãi)', async () => {
    process.env.MICROSERVICE_TIMEOUT_MS = '50';
    const client = clientWith(() => NEVER);
    await expect(firstValueFrom(client.send('GET_LESSONS', {}))).rejects.toMatchObject({
      statusCode: 504,
    });
  });
});
