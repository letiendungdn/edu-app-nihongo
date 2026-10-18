/** Menu chính. Mỗi mục một chữ Hán/kana làm biểu tượng — dùng chung cho sidebar và thẻ trang chủ. */
export const NAV_GROUPS = [
  {
    label: 'Học',
    items: [
      { href: '/kana',      icon: 'あ',  label: 'Kana' },
      { href: '/vocab',     icon: '単',  label: 'Từ vựng' },
      { href: '/vocab/list', icon: '覧', label: 'Danh sách từ' },
      { href: '/vocab/mindmap', icon: '図', label: 'Sơ đồ từ vựng' },
      { href: '/vocab/picture', icon: '絵', label: 'Từ điển tranh' },
      { href: '/grammar',   icon: '文',  label: 'Ngữ pháp' },
      { href: '/grammar/mindmap', icon: '系', label: 'Sơ đồ ngữ pháp' },
      { href: '/kanji',     icon: '漢',  label: 'Kanji' },
      { href: '/kanji/mindmap', icon: '網', label: 'Sơ đồ kanji' },
      { href: '/kanji/list', icon: '表', label: 'Bảng Kanji JLPT' },
      { href: '/kanji/structure', icon: '構', label: 'Cấu tạo Kanji' },
      { href: '/strokes',   icon: '筆',  label: 'Tra nét viết' },
      { href: '/counters',  icon: '数',  label: 'Đếm số' },
      { href: '/suffixes',     icon: '尾',  label: 'Hậu tố' },
      { href: '/word-classes', icon: '品',  label: 'Loại từ' },
      { href: '/countries',    icon: '国', label: 'Quốc gia' },
    ],
  },
  {
    // Mục sách render riêng (TextbookNavItems) — ở đây chỉ còn link chung của nhóm.
    label: 'Giáo trình',
    items: [
      { href: '/book-audio', icon: '聴', label: 'File nghe sách' },
    ],
  },
  {
    label: 'Phát âm',
    items: [
      { href: '/pronunciation',       icon: '音', label: 'Luyện phát âm' },
      { href: '/pronunciation-rules', icon: '則', label: 'Quy tắc phát âm' },
      { href: '/tts',                 icon: '声', label: 'Đọc văn bản' },
      { href: '/stt',                 icon: '録', label: 'Ghi âm → chữ' },
      { href: '/english-katakana',    icon: 'カ', label: 'EN ↔ カナ' },
    ],
  },
  {
    label: 'Nội dung',
    items: [
      { href: '/daily-listening', icon: '日', label: 'Nghe mỗi ngày' },
      { href: '/conversation',    icon: '話', label: 'Giao tiếp · 自己紹介' },
      { href: '/listening-types', icon: '耳', label: 'Dạng nghe JLPT' },
      { href: '/roleplay',        icon: '演', label: 'Đóng vai' },
      { href: '/reading',         icon: '読', label: 'Đọc hiểu' },
      { href: '/dictation',       icon: '書', label: 'Nghe chép' },
      { href: '/notes',           icon: '記', label: 'Ghi chú ngày' },
    ],
  },
  {
    label: 'Luyện tập',
    items: [
      { href: '/practice',          icon: '練',  label: 'Hub luyện tập' },
      { href: '/conjugation',       icon: '変',  label: 'Chia động từ' },
      { href: '/particles',         icon: '助',  label: 'Điền trợ từ' },
      { href: '/kanji-readings',    icon: '訓',  label: 'Kanji trong từ' },
      { href: '/grammar-srs',       icon: '復',  label: 'SRS ngữ pháp' },
      { href: '/srs',               icon: '憶', label: 'SRS — Thẻ ghi nhớ' },
      { href: '/sentence-practice', icon: '作', label: 'Luyện câu AI' },
      { href: '/vocab/quiz',        icon: '問', label: 'TN từ vựng' },
      { href: '/kana/quiz',         icon: '仮', label: 'TN Kana' },
      { href: '/kanji/quiz',        icon: '字', label: 'TN Kanji' },
      { href: '/vocab-review',      icon: '誤', label: 'Từ sai' },
      { href: '/quiz',              icon: '答', label: 'Quiz' },
      { href: '/mock-exam',         icon: '試', label: 'Thi thử JLPT' },
      { href: '/jlpt',              icon: '道', label: 'Lộ trình JLPT' },
      { href: '/analytics',         icon: '進', label: 'Tiến độ' },
    ],
  },
  {
    label: 'Công cụ',
    items: [
      { href: '/tools',          icon: '画', label: 'Canvas Tools' },
      { href: '/kanji-practice', icon: '習', label: 'Luyện viết Kanji' },
      { href: '/whiteboard',     icon: '板',  label: 'Bảng trắng' },
      { href: '/worksheet',      icon: '紙', label: 'Tạo bài tập' },
      { href: '/japan-map',      icon: '地', label: 'Bản đồ Nhật Bản' },
    ],
  },
  {
    label: 'Khác',
    items: [
      { href: '/community', icon: '友', label: 'Cộng đồng' },
      { href: '/support',   icon: '援', label: 'Hỗ trợ' },
      { href: '/pricing',   icon: '昇', label: 'Nâng cấp' },
    ],
  },
] as const;

const ICON_BY_HREF: Map<string, string> = new Map(
  NAV_GROUPS.flatMap((group) => group.items.map((item) => [item.href as string, item.icon as string])),
);

/** Biểu tượng của một trang theo đường dẫn (bỏ query). Không có trong menu → undefined. */
export function navIconFor(href: string): string | undefined {
  return ICON_BY_HREF.get(href.split('?')[0]);
}
