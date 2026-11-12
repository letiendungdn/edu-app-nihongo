import { describe, expect, it } from 'vitest';
import { englishForSpeech } from './englishSpeech';

describe('englishForSpeech', () => {
  it('bỏ ghi chú trong ngoặc, dấu ~, đổi ; thành ,', () => {
    expect(englishForSpeech('fictional company (in textbook)')).toBe('fictional company');
    expect(englishForSpeech('to turn on; to switch on')).toBe('to turn on, to switch on');
    expect(englishForSpeech('this ~ (near the speaker)')).toBe('this');
  });
});
