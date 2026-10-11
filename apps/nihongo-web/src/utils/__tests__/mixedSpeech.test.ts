import { describe, expect, it } from 'vitest';
import { grammarExplanationSpeechParts, speechPartsFromMixedText } from '../speech';

describe('speechPartsFromMixedText', () => {
  it('tách chữ Nhật trong câu giải thích tiếng Việt', () => {
    expect(
      speechPartsFromMixedText(
        'Ý nghĩa: N1 là N2. Giải thích: は (đọc là wa) đánh dấu chủ đề của câu; です đặt cuối câu khẳng định, thể hiện sự lịch sự.',
      ),
    ).toEqual([
      { text: 'Ý nghĩa: N1 là N2. Giải thích:', lang: 'vi-VN' },
      { text: 'は', lang: 'ja-JP' },
      { text: '(đọc là wa) đánh dấu chủ đề của câu;', lang: 'vi-VN' },
      { text: 'です', lang: 'ja-JP' },
      { text: 'đặt cuối câu khẳng định, thể hiện sự lịch sự.', lang: 'vi-VN' },
    ]);
  });

  it('giữ câu chỉ có tiếng Việt thành một đoạn', () => {
    expect(speechPartsFromMixedText('Tôi là Mike Miller.')).toEqual([
      { text: 'Tôi là Mike Miller.', lang: 'vi-VN' },
    ]);
  });
});

describe('grammarExplanationSpeechParts', () => {
  it('đọc nghĩa tiếng Việt và chữ Nhật trong giải thích', () => {
    const parts = grammarExplanationSpeechParts({
      meaning: 'N1 là N2',
      explanation: 'は (đọc là wa) đánh dấu chủ đề của câu; です đặt cuối câu khẳng định, thể hiện sự lịch sự.',
    });

    expect(parts.map((part) => part.lang)).toEqual(['vi-VN', 'ja-JP', 'vi-VN', 'ja-JP', 'vi-VN']);
    expect(parts[1]?.text).toBe('は');
    expect(parts[3]?.text).toBe('です');
  });
});
