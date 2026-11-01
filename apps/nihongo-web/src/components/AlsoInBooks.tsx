const BOOK_LABEL: Record<string, string> = {
  MINNA: 'Minna',
  KLL: 'Look and Learn',
  JLPT: 'Kho JLPT',
  SOUMATOME: 'Sou Matome',
  SHINKANZEN: 'Shinkanzen',
  TRY: 'TRY!',
};

/** Ký hiệu mục này còn xuất hiện ở sách khác. */
export default function AlsoInBooks({ books }: { books?: string[] | null }) {
  if (!books?.length) return null;
  const names = books.map((code) => BOOK_LABEL[code] ?? code);
  const label = `Trùng với ${names.join(', ')}`;
  return (
    <p className="also-in-books" title={label}>
      <span className="also-in-books__mark" aria-hidden="true">
        ⧉
      </span>
      <span>{label}</span>
    </p>
  );
}
