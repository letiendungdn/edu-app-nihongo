import { describe, expect, it } from 'vitest';
import { parseVocabList, unwrapEnvelope } from './envelope';

describe('unwrapEnvelope', () => {
  it('mở lớp { success: true, data } của gateway', () => {
    expect(unwrapEnvelope({ success: true, data: { answer: 'x' }, timestamp: 't' })).toEqual({ answer: 'x' });
  });
  it('không đụng response lỗi hoặc không bọc', () => {
    const err = { success: false, error: { message: 'x' } };
    expect(unwrapEnvelope(err)).toBe(err);
    expect(unwrapEnvelope([1, 2])).toEqual([1, 2]);
  });
});

describe('parseVocabList sau khi mở lớp bọc', () => {
  it('trang từ vựng { data: [...], total } → danh sách (bản cũ luôn trống)', () => {
    const body = { success: true, data: { data: [{ id: 1, kana: 'ねこ' }], total: 1, page: 1, limit: 100 } };
    expect(parseVocabList(unwrapEnvelope(body))).toEqual([{ id: 1, kana: 'ねこ' }]);
  });
  it('mảng trần vẫn nhận', () => {
    expect(parseVocabList([{ id: 2 }])).toEqual([{ id: 2 }]);
  });
});
