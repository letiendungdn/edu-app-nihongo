import { z } from 'zod';

/** Cùng luật với DTO ở gateway (personal-word.dto.ts): web kiểm để người dùng sửa nhanh, server kiểm để không ai lách. */
export const personalWordSchema = z.object({
  kana: z
    .string()
    .trim()
    .min(1, 'Nhập cách đọc')
    .regex(/^[\u3040-\u30ff]+$/, 'Chỉ dùng hiragana hoặc katakana'),
  meaning: z.string().trim().min(1, 'Nhập nghĩa').max(100, 'Nghĩa tối đa 100 ký tự'),
  lesson: z.coerce.number({ error: 'Bài phải là số' }).int('Bài phải là số nguyên').min(1, 'Bài từ 1 tới 50').max(50, 'Bài từ 1 tới 50'),
});

export type PersonalWordInput = z.input<typeof personalWordSchema>;
export type PersonalWordValues = z.output<typeof personalWordSchema>;
