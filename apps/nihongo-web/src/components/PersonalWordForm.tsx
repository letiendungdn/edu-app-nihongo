'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  personalWordSchema,
  type PersonalWordInput,
  type PersonalWordValues,
} from '../utils/personalWordSchema';

type Props = {
  onSubmit: (data: PersonalWordValues) => Promise<unknown>;
  serverError?: string;
};

export default function PersonalWordForm({ onSubmit, serverError }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PersonalWordInput, unknown, PersonalWordValues>({
    resolver: zodResolver(personalWordSchema),
    defaultValues: { kana: '', meaning: '', lesson: 1 },
  });

  return (
    <form
      className="pw-form"
      noValidate
      onSubmit={handleSubmit(async (data) => {
        try {
          await onSubmit(data);
          reset(); // chỉ xóa form khi lưu thành công
        } catch {
          // lỗi server hiện qua serverError; giữ nguyên chữ đã nhập để sửa
        }
      })}
    >
      <label>
        Cách đọc
        <input {...register('kana')} aria-invalid={!!errors.kana} placeholder="たべます" />
      </label>
      {errors.kana && <p role="alert" className="pw-error">{errors.kana.message}</p>}

      <label>
        Nghĩa
        <input {...register('meaning')} aria-invalid={!!errors.meaning} placeholder="ăn" />
      </label>
      {errors.meaning && <p role="alert" className="pw-error">{errors.meaning.message}</p>}

      <label>
        Bài
        <input type="number" {...register('lesson')} aria-invalid={!!errors.lesson} />
      </label>
      {errors.lesson && <p role="alert" className="pw-error">{errors.lesson.message}</p>}

      {serverError && <p role="alert" className="pw-error">{serverError}</p>}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Đang lưu…' : 'Thêm vào sổ'}
      </button>
    </form>
  );
}
