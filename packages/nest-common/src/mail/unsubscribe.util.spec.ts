import { signUnsubscribeToken, verifyUnsubscribeToken } from './unsubscribe.util';

const SECRET = 'test-secret';

describe('unsubscribe token', () => {
  it('token vừa ký thì verify được', () => {
    const token = signUnsubscribeToken(7, 'a@b.com', SECRET);
    expect(verifyUnsubscribeToken(7, 'a@b.com', token, SECRET)).toBe(true);
  });

  it('không phân biệt hoa thường của email', () => {
    const token = signUnsubscribeToken(7, 'A@B.com', SECRET);
    expect(verifyUnsubscribeToken(7, 'a@b.COM', token, SECRET)).toBe(true);
  });

  it('token an toàn khi đặt trong URL (base64url: không có + / =)', () => {
    const token = signUnsubscribeToken(123456, 'someone@example.com', SECRET);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it.each([
    ['userId khác', 8, 'a@b.com', SECRET],
    ['email khác', 7, 'c@d.com', SECRET],
    ['secret khác', 7, 'a@b.com', 'other-secret'],
  ])('%s → từ chối', (_case, userId, email, secret) => {
    const token = signUnsubscribeToken(7, 'a@b.com', SECRET);
    expect(verifyUnsubscribeToken(userId, email, token, secret)).toBe(false);
  });

  it('token sai độ dài → false, không ném lỗi (timingSafeEqual ném nếu 2 buffer khác độ dài)', () => {
    expect(verifyUnsubscribeToken(7, 'a@b.com', 'ngắn', SECRET)).toBe(false);
    expect(verifyUnsubscribeToken(7, 'a@b.com', '', SECRET)).toBe(false);
  });
});
