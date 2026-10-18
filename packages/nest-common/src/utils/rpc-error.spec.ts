import { HttpStatus } from '@nestjs/common';
import { resolveMicroserviceError } from './rpc-error';

describe('resolveMicroserviceError', () => {
  it('Stripe sai API key (statusCode 401) → 502, KHÔNG phải 401 (client sẽ tưởng phiên hết hạn)', () => {
    const err = Object.assign(new Error('Invalid API Key provided: sk_test_***'), {
      type: 'StripeAuthenticationError',
      statusCode: 401,
    });
    const res = resolveMicroserviceError(err);
    expect(res?.status).toBe(HttpStatus.BAD_GATEWAY);
    expect(res?.message).not.toContain('sk_test'); // không lộ thông điệp nội bộ
  });

  it('thẻ bị từ chối → 402 kèm lý do cho người dùng', () => {
    const err = Object.assign(new Error('Your card was declined.'), { type: 'StripeCardError', statusCode: 402 });
    expect(resolveMicroserviceError(err)).toEqual({ status: 402, message: 'Your card was declined.' });
  });

  it('request sai gửi tới Stripe → 400 không lộ id nội bộ', () => {
    const err = Object.assign(new Error('No such customer: cus_123'), {
      type: 'StripeInvalidRequestError',
      statusCode: 404,
    });
    expect(resolveMicroserviceError(err)).toEqual({ status: 400, message: 'Yêu cầu thanh toán không hợp lệ' });
  });

  it('401/403 từ dịch vụ khác (không phải HttpException của mình) → 502', () => {
    expect(resolveMicroserviceError({ statusCode: 403, message: 'forbidden upstream' })?.status).toBe(502);
  });

  it('các mã khác giữ nguyên như trước', () => {
    expect(resolveMicroserviceError({ statusCode: 409, message: 'trùng' })).toEqual({ status: 409, message: 'trùng' });
  });
});
