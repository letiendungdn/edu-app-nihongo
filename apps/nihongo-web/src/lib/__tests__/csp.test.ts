import { describe, expect, it } from 'vitest';
import { buildCsp, createNonce } from '../csp';

describe('buildCsp', () => {
  it('production https: script chỉ chạy khi có nonce, không unsafe-inline/eval, không origin dev', () => {
    const csp = buildCsp('abc', { dev: false, secure: true });
    expect(csp).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic'");
    expect(csp).not.toMatch(/script-src[^;]*unsafe-(inline|eval)/);
    expect(csp).not.toContain('localhost');
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).toContain('upgrade-insecure-requests');
  });

  it('máy dev http: cho signaling/LiveKit localhost, không upgrade-insecure-requests', () => {
    const csp = buildCsp('abc', { dev: true, secure: false });
    expect(csp).toMatch(/connect-src[^;]*ws:\/\/localhost:\*/);
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).not.toContain('upgrade-insecure-requests');
  });
});

describe('createNonce', () => {
  it('mỗi lần một giá trị mới, 128 bit base64', () => {
    const a = createNonce();
    expect(a).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(createNonce()).not.toBe(a);
  });
});
