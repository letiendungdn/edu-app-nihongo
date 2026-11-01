'use client';

/** Bộ sách luyện thi mà app chỉ xếp nội dung JLPT chung theo khung bài (tuần/ngày, phần, chương). */
const FRAMEWORK_TEXTBOOKS = new Set(['SOUMATOME', 'SHINKANZEN', 'TRY']);

export function isFrameworkTextbook(textbook: string | null | undefined): boolean {
  return Boolean(textbook && FRAMEWORK_TEXTBOOKS.has(textbook));
}

/**
 * Ghi chú cho bài Sou Matome / Shinkanzen / TRY!: nội dung là kho JLPT chung của app
 * sắp theo lịch học của sách, không phải nội dung gốc trong sách.
 */
export default function TextbookFrameworkNote({
  textbook,
  className,
}: {
  textbook: string | null | undefined;
  className?: string;
}) {
  if (!isFrameworkTextbook(textbook)) return null;
  return (
    <p className={`textbook-framework-note${className ? ` ${className}` : ''}`} role="note">
      Nội dung tổng hợp JLPT của app, sắp theo lịch học của sách — không phải nội dung gốc trong sách.
    </p>
  );
}
