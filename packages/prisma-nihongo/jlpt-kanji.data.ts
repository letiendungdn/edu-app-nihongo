// Kanji JLPT N2 / N1 — biên soạn best-effort, ưu tiên chữ tần suất cao.
// N5–N3 đã có sẵn trong DB (KanjiLesson 1–32). File này bổ sung N2, N1.
// lessonNumber của KanjiLesson: 401–403 (N2), 501–502 (N1) — không đụng 1–32.
// Mở rộng: thêm phần tử vào `entries` hoặc thêm KanjiLesson mới.

export type JlptKanjiLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

export type JlptKanjiVocab = {
  word: string;
  reading: string;
  meaningVi: string;
  exampleJa?: string;
  exampleKana?: string;
  exampleVi?: string;
};

export type JlptKanjiEntry = {
  character: string;
  /** Bỏ trống với chữ do Nhật tạo (国字) — không có âm Hán-Việt */
  hanViet?: string;
  onyomi?: string;
  kunyomi?: string;
  meaningVi: string;
  strokeCount?: number;
  mnemonicVi?: string;
  grade?: number;
  vocabularies?: JlptKanjiVocab[];
};

export type JlptKanjiLesson = {
  lessonNumber: number;
  jlptLevel: JlptKanjiLevel;
  title: string;
  sortOrder: number;
  entries: JlptKanjiEntry[];
};

export const JLPT_KANJI_LESSONS: JlptKanjiLesson[] = [
  // ─────────────────────────────── N2 ───────────────────────────────
  {
    lessonNumber: 401,
    jlptLevel: 'N2',
    title: 'Bài 33 · Kanji N2 (1) — Chính trị, xã hội',
    sortOrder: 4010,
    entries: [
      { character: '政', hanViet: 'CHÍNH', onyomi: 'せい, しょう', kunyomi: 'まつりごと', meaningVi: 'chính trị', strokeCount: 9 },
      { character: '党', hanViet: 'ĐẢNG', onyomi: 'とう', meaningVi: 'đảng phái', strokeCount: 10 },
      { character: '議', hanViet: 'NGHỊ', onyomi: 'ぎ', meaningVi: 'bàn bạc, nghị luận', strokeCount: 20 },
      { character: '民', hanViet: 'DÂN', onyomi: 'みん', kunyomi: 'たみ', meaningVi: 'dân chúng', strokeCount: 5 },
      { character: '権', hanViet: 'QUYỀN', onyomi: 'けん, ごん', meaningVi: 'quyền lực, quyền lợi', strokeCount: 15 },
      { character: '令', hanViet: 'LỆNH', onyomi: 'れい', meaningVi: 'mệnh lệnh, pháp lệnh', strokeCount: 5 },
      { character: '状', hanViet: 'TRẠNG', onyomi: 'じょう', meaningVi: 'tình trạng; lá thư', strokeCount: 7 },
      { character: '態', hanViet: 'THÁI', onyomi: 'たい', meaningVi: 'trạng thái, thái độ', strokeCount: 14 },
      { character: '認', hanViet: 'NHẬN', onyomi: 'にん', kunyomi: 'みと-める', meaningVi: 'công nhận, thừa nhận', strokeCount: 14 },
      { character: '確', hanViet: 'XÁC', onyomi: 'かく', kunyomi: 'たし-か, たし-かめる', meaningVi: 'chắc chắn, xác nhận', strokeCount: 15 },
      { character: '識', hanViet: 'THỨC', onyomi: 'しき', meaningVi: 'nhận thức, hiểu biết', strokeCount: 19 },
      { character: '常', hanViet: 'THƯỜNG', onyomi: 'じょう', kunyomi: 'つね, とこ', meaningVi: 'thường xuyên, bình thường', strokeCount: 11 },
      { character: '報', hanViet: 'BÁO', onyomi: 'ほう', kunyomi: 'むく-いる', meaningVi: 'báo cáo; đền đáp', strokeCount: 12 },
      { character: '告', hanViet: 'CÁO', onyomi: 'こく', kunyomi: 'つ-げる', meaningVi: 'thông báo, cáo giác', strokeCount: 7 },
      { character: '存', hanViet: 'TỒN', onyomi: 'そん, ぞん', meaningVi: 'tồn tại; biết (ぞんじる)', strokeCount: 6 },
      { character: '在', hanViet: 'TẠI', onyomi: 'ざい', kunyomi: 'あ-る', meaningVi: 'ở, hiện diện', strokeCount: 6 },
      { character: '経', hanViet: 'KINH', onyomi: 'けい, きょう', kunyomi: 'へ-る', meaningVi: 'trải qua; kinh tế', strokeCount: 11 },
      { character: '済', hanViet: 'TẾ', onyomi: 'さい', kunyomi: 'す-む, す-ます', meaningVi: 'xong xuôi; cứu tế', strokeCount: 11 },
      { character: '営', hanViet: 'DOANH', onyomi: 'えい', kunyomi: 'いとな-む', meaningVi: 'kinh doanh, điều hành', strokeCount: 12 },
      { character: '産', hanViet: 'SẢN', onyomi: 'さん', kunyomi: 'う-む, う-まれる, うぶ', meaningVi: 'sản xuất; sinh đẻ', strokeCount: 11 },
    ],
  },
  {
    lessonNumber: 402,
    jlptLevel: 'N2',
    title: 'Bài 34 · Kanji N2 (2) — Kinh tế, sự vật',
    sortOrder: 4020,
    entries: [
      { character: '得', hanViet: 'ĐẮC', onyomi: 'とく', kunyomi: 'え-る, う-る', meaningVi: 'được, thu được; lợi', strokeCount: 11 },
      { character: '失', hanViet: 'THẤT', onyomi: 'しつ', kunyomi: 'うしな-う', meaningVi: 'mất mát, thất bại', strokeCount: 5 },
      { character: '職', hanViet: 'CHỨC', onyomi: 'しょく', meaningVi: 'chức vụ, nghề nghiệp', strokeCount: 18 },
      { character: '労', hanViet: 'LAO', onyomi: 'ろう', meaningVi: 'lao động, vất vả', strokeCount: 7 },
      { character: '協', hanViet: 'HIỆP', onyomi: 'きょう', meaningVi: 'hợp tác, hiệp hội', strokeCount: 8 },
      { character: '価', hanViet: 'GIÁ', onyomi: 'か', kunyomi: 'あたい', meaningVi: 'giá trị, giá cả', strokeCount: 8 },
      { character: '額', hanViet: 'NGẠCH', onyomi: 'がく', kunyomi: 'ひたい', meaningVi: 'số tiền; trán; khung', strokeCount: 18 },
      { character: '税', hanViet: 'THUẾ', onyomi: 'ぜい', meaningVi: 'thuế', strokeCount: 12 },
      { character: '費', hanViet: 'PHÍ', onyomi: 'ひ', kunyomi: 'つい-やす, つい-える', meaningVi: 'chi phí, tiêu tốn', strokeCount: 12 },
      { character: '輸', hanViet: 'THÂU', onyomi: 'ゆ', meaningVi: 'vận chuyển; xuất nhập khẩu', strokeCount: 16 },
      { character: '停', hanViet: 'ĐÌNH', onyomi: 'てい', meaningVi: 'dừng lại, đình chỉ', strokeCount: 11 },
      { character: '因', hanViet: 'NHÂN', onyomi: 'いん', kunyomi: 'よ-る', meaningVi: 'nguyên nhân', strokeCount: 6 },
      { character: '果', hanViet: 'QUẢ', onyomi: 'か', kunyomi: 'は-たす, は-てる', meaningVi: 'kết quả; hoa quả', strokeCount: 8 },
      { character: '個', hanViet: 'CÁ', onyomi: 'こ, か', meaningVi: 'cái (đơn vị đếm); cá nhân', strokeCount: 10 },
      { character: '各', hanViet: 'CÁC', onyomi: 'かく', kunyomi: 'おのおの', meaningVi: 'mỗi, từng', strokeCount: 6 },
      { character: '共', hanViet: 'CỘNG', onyomi: 'きょう', kunyomi: 'とも', meaningVi: 'cùng, chung', strokeCount: 6 },
      { character: '術', hanViet: 'THUẬT', onyomi: 'じゅつ', meaningVi: 'kỹ thuật, nghệ thuật', strokeCount: 11 },
      { character: '象', hanViet: 'TƯỢNG', onyomi: 'しょう, ぞう', meaningVi: 'hiện tượng; con voi', strokeCount: 12 },
      { character: '容', hanViet: 'DUNG', onyomi: 'よう', meaningVi: 'nội dung; dung nạp', strokeCount: 10 },
      { character: '判', hanViet: 'PHÁN', onyomi: 'はん, ばん', meaningVi: 'phán xét; con dấu', strokeCount: 7 },
    ],
  },
  {
    lessonNumber: 403,
    jlptLevel: 'N2',
    title: 'Bài 35 · Kanji N2 (3) — Quy tắc, phán đoán',
    sortOrder: 4030,
    entries: [
      { character: '断', hanViet: 'ĐOÁN', onyomi: 'だん', kunyomi: 'た-つ, ことわ-る', meaningVi: 'phán đoán; từ chối; cắt', strokeCount: 11 },
      { character: '収', hanViet: 'THU', onyomi: 'しゅう', kunyomi: 'おさ-める, おさ-まる', meaningVi: 'thu vào, thu hoạch', strokeCount: 4 },
      { character: '支', hanViet: 'CHI', onyomi: 'し', kunyomi: 'ささ-える', meaningVi: 'chi trả; nâng đỡ; chi nhánh', strokeCount: 4 },
      { character: '規', hanViet: 'QUY', onyomi: 'き', meaningVi: 'quy tắc, quy định', strokeCount: 11 },
      { character: '則', hanViet: 'TẮC', onyomi: 'そく', meaningVi: 'quy tắc, nguyên tắc', strokeCount: 9 },
      { character: '制', hanViet: 'CHẾ', onyomi: 'せい', meaningVi: 'chế độ; kiềm chế', strokeCount: 8 },
      { character: '限', hanViet: 'HẠN', onyomi: 'げん', kunyomi: 'かぎ-る', meaningVi: 'giới hạn', strokeCount: 9 },
      { character: '禁', hanViet: 'CẤM', onyomi: 'きん', meaningVi: 'cấm đoán', strokeCount: 13 },
      { character: '許', hanViet: 'HỨA', onyomi: 'きょ', kunyomi: 'ゆる-す', meaningVi: 'cho phép, tha thứ', strokeCount: 11 },
      { character: '守', hanViet: 'THỦ', onyomi: 'しゅ, す', kunyomi: 'まも-る, もり', meaningVi: 'bảo vệ, tuân thủ', strokeCount: 6 },
      { character: '破', hanViet: 'PHÁ', onyomi: 'は', kunyomi: 'やぶ-る, やぶ-れる', meaningVi: 'phá vỡ; rách', strokeCount: 10 },
      { character: '序', hanViet: 'TỰ', onyomi: 'じょ', meaningVi: 'thứ tự; mở đầu', strokeCount: 7 },
      { character: '例', hanViet: 'LỆ', onyomi: 'れい', kunyomi: 'たと-える', meaningVi: 'ví dụ; lệ thường', strokeCount: 8 },
      { character: '類', hanViet: 'LOẠI', onyomi: 'るい', kunyomi: 'たぐ-い', meaningVi: 'chủng loại, phân loại', strokeCount: 18 },
      { character: '比', hanViet: 'TỶ', onyomi: 'ひ', kunyomi: 'くら-べる', meaningVi: 'so sánh; tỷ lệ', strokeCount: 4 },
      { character: '較', hanViet: 'GIẢO', onyomi: 'かく', meaningVi: 'so sánh (比較)', strokeCount: 13 },
      { character: '差', hanViet: 'SAI', onyomi: 'さ', kunyomi: 'さ-す', meaningVi: 'sự chênh lệch, khác biệt', strokeCount: 10 },
      { character: '解', hanViet: 'GIẢI', onyomi: 'かい, げ', kunyomi: 'と-く, と-ける, と-かす', meaningVi: 'giải quyết, giải thích', strokeCount: 13 },
      { character: '決', hanViet: 'QUYẾT', onyomi: 'けつ', kunyomi: 'き-める, き-まる', meaningVi: 'quyết định', strokeCount: 7 },
      { character: '否', hanViet: 'PHỦ', onyomi: 'ひ', kunyomi: 'いな', meaningVi: 'phủ định, từ chối', strokeCount: 7 },
    ],
  },

  // ─────────────────────────────── N1 ───────────────────────────────
  {
    lessonNumber: 501,
    jlptLevel: 'N1',
    title: 'Bài 36 · Kanji N1 (1) — Hành chính, hành động',
    sortOrder: 5010,
    entries: [
      { character: '賛', hanViet: 'TÁN', onyomi: 'さん', meaningVi: 'tán thành, ca ngợi', strokeCount: 15 },
      { character: '示', hanViet: 'THỊ', onyomi: 'じ, し', kunyomi: 'しめ-す', meaningVi: 'chỉ ra, trưng bày', strokeCount: 5 },
      { character: '評', hanViet: 'BÌNH', onyomi: 'ひょう', meaningVi: 'bình luận, đánh giá', strokeCount: 12 },
      { character: '能', hanViet: 'NĂNG', onyomi: 'のう', meaningVi: 'năng lực, khả năng', strokeCount: 10 },
      { character: '技', hanViet: 'KỸ', onyomi: 'ぎ', kunyomi: 'わざ', meaningVi: 'kỹ năng, kỹ xảo', strokeCount: 7 },
      { character: '査', hanViet: 'TRA', onyomi: 'さ', meaningVi: 'điều tra, kiểm tra', strokeCount: 9 },
      { character: '責', hanViet: 'TRÁCH', onyomi: 'せき', kunyomi: 'せ-める', meaningVi: 'trách nhiệm; khiển trách', strokeCount: 11 },
      { character: '任', hanViet: 'NHIỆM', onyomi: 'にん', kunyomi: 'まか-せる, まか-す', meaningVi: 'nhiệm vụ, giao phó', strokeCount: 6 },
      { character: '護', hanViet: 'HỘ', onyomi: 'ご', meaningVi: 'bảo hộ, che chở', strokeCount: 20 },
      { character: '被', hanViet: 'BỊ', onyomi: 'ひ', kunyomi: 'こうむ-る, かぶ-る', meaningVi: 'bị, gánh chịu', strokeCount: 10 },
      { character: '概', hanViet: 'KHÁI', onyomi: 'がい', meaningVi: 'khái quát, đại khái', strokeCount: 14 },
      { character: '維', hanViet: 'DUY', onyomi: 'い', meaningVi: 'duy trì, buộc', strokeCount: 14 },
      { character: '促', hanViet: 'XÚC', onyomi: 'そく', kunyomi: 'うなが-す', meaningVi: 'thúc giục', strokeCount: 9 },
      { character: '抑', hanViet: 'ỨC', onyomi: 'よく', kunyomi: 'おさ-える', meaningVi: 'kìm hãm, ức chế', strokeCount: 7 },
      { character: '緩', hanViet: 'HOÃN', onyomi: 'かん', kunyomi: 'ゆる-い, ゆる-む, ゆる-める, ゆる-やか', meaningVi: 'lỏng lẻo, nới lỏng', strokeCount: 15 },
      { character: '握', hanViet: 'ÁC', onyomi: 'あく', kunyomi: 'にぎ-る', meaningVi: 'nắm, nắm bắt', strokeCount: 12 },
      { character: '措', hanViet: 'THỐ', onyomi: 'そ', meaningVi: 'sắp đặt; biện pháp (措置)', strokeCount: 11 },
      { character: '遂', hanViet: 'TOẠI', onyomi: 'すい', kunyomi: 'と-げる', meaningVi: 'hoàn thành, đạt được', strokeCount: 12 },
      { character: '企', hanViet: 'XÍ', onyomi: 'き', kunyomi: 'くわだ-てる', meaningVi: 'lập kế hoạch; doanh nghiệp', strokeCount: 6 },
      { character: '兼', hanViet: 'KIÊM', onyomi: 'けん', kunyomi: 'か-ねる', meaningVi: 'kiêm nhiệm, gồm cả', strokeCount: 10 },
    ],
  },
  {
    lessonNumber: 502,
    jlptLevel: 'N1',
    title: 'Bài 37 · Kanji N1 (2) — Cảm xúc, nội tâm',
    sortOrder: 5020,
    entries: [
      { character: '慨', hanViet: 'KHÁI', onyomi: 'がい', meaningVi: 'cảm khái; phẫn nộ (憤慨)', strokeCount: 13 },
      { character: '憂', hanViet: 'ƯU', onyomi: 'ゆう', kunyomi: 'うれ-える, うれ-い, う-い', meaningVi: 'lo âu, buồn phiền', strokeCount: 15 },
      { character: '鬱', hanViet: 'UẤT', onyomi: 'うつ', meaningVi: 'u uất, trầm cảm', strokeCount: 29 },
      { character: '妬', hanViet: 'ĐỐ', onyomi: 'と', kunyomi: 'ねた-む', meaningVi: 'ghen ghét, đố kỵ', strokeCount: 8 },
      { character: '葛', hanViet: 'CÁT', onyomi: 'かつ', kunyomi: 'くず', meaningVi: 'dây sắn; giằng xé (葛藤)', strokeCount: 12 },
      { character: '藤', hanViet: 'ĐẰNG', onyomi: 'とう', kunyomi: 'ふじ', meaningVi: 'cây tử đằng; mâu thuẫn nội tâm', strokeCount: 18 },
      { character: '悟', hanViet: 'NGỘ', onyomi: 'ご', kunyomi: 'さと-る', meaningVi: 'giác ngộ, nhận ra', strokeCount: 10 },
      { character: '慰', hanViet: 'ÚY', onyomi: 'い', kunyomi: 'なぐさ-める, なぐさ-む', meaningVi: 'an ủi', strokeCount: 15 },
      { character: '憾', hanViet: 'HÁM', onyomi: 'かん', meaningVi: 'tiếc nuối, ân hận (遺憾)', strokeCount: 16 },
      { character: '抗', hanViet: 'KHÁNG', onyomi: 'こう', meaningVi: 'kháng cự, đối kháng', strokeCount: 7 },
      { character: '尊', hanViet: 'TÔN', onyomi: 'そん', kunyomi: 'たっと-い, とうと-い, たっと-ぶ, とうと-ぶ', meaningVi: 'tôn kính', strokeCount: 12 },
      { character: '厳', hanViet: 'NGHIÊM', onyomi: 'げん, ごん', kunyomi: 'きび-しい, おごそ-か', meaningVi: 'nghiêm khắc, trang nghiêm', strokeCount: 17 },
      { character: '誇', hanViet: 'KHOA', onyomi: 'こ', kunyomi: 'ほこ-る', meaningVi: 'tự hào; khoe khoang', strokeCount: 13 },
      { character: '偏', hanViet: 'THIÊN', onyomi: 'へん', kunyomi: 'かたよ-る', meaningVi: 'thiên lệch, thành kiến', strokeCount: 11 },
      { character: '甚', hanViet: 'THẬM', onyomi: 'じん', kunyomi: 'はなは-だ, はなは-だしい', meaningVi: 'rất, quá mức', strokeCount: 9 },
      { character: '紛', hanViet: 'PHÂN', onyomi: 'ふん', kunyomi: 'まぎ-れる, まぎ-らわしい, まぎ-らす', meaningVi: 'rối rắm; lẫn lộn; tranh chấp', strokeCount: 10 },
      { character: '煩', hanViet: 'PHIỀN', onyomi: 'はん, ぼん', kunyomi: 'わずら-う, わずら-わしい', meaningVi: 'phiền muộn, rắc rối', strokeCount: 13 },
      { character: '慕', hanViet: 'MỘ', onyomi: 'ぼ', kunyomi: 'した-う', meaningVi: 'ngưỡng mộ, mến mộ', strokeCount: 14 },
      { character: '崇', hanViet: 'SÙNG', onyomi: 'すう', kunyomi: 'あが-める', meaningVi: 'tôn sùng, sùng bái', strokeCount: 11 },
      { character: '憧', hanViet: 'CHÔNG', onyomi: 'しょう, どう', kunyomi: 'あこが-れる', meaningVi: 'khao khát, ngưỡng vọng', strokeCount: 15 },
    ],
  },
  {
    lessonNumber: 404,
    jlptLevel: 'N2',
    title: 'Bài 38 · Kanji N2 (4) — Chuyển động, ngôn luận',
    sortOrder: 4040,
    entries: [
      { character: '傾', hanViet: 'KHUYNH', onyomi: 'けい', kunyomi: 'かたむ-く, かたむ-ける', meaningVi: 'nghiêng; khuynh hướng', strokeCount: 13 },
      { character: '副', hanViet: 'PHÓ', onyomi: 'ふく', meaningVi: 'phó (chức); phụ', strokeCount: 11 },
      { character: '律', hanViet: 'LUẬT', onyomi: 'りつ, りち', meaningVi: 'quy luật, luật lệ', strokeCount: 9 },
      { character: '徴', hanViet: 'TRƯNG', onyomi: 'ちょう', meaningVi: 'dấu hiệu; trưng thu', strokeCount: 14 },
      { character: '与', hanViet: 'DỮ', onyomi: 'よ', kunyomi: 'あた-える', meaningVi: 'cho, trao; tham dự', strokeCount: 3 },
      { character: '賃', hanViet: 'NHẬM', onyomi: 'ちん', meaningVi: 'tiền công, tiền thuê', strokeCount: 13 },
      { character: '導', hanViet: 'ĐẠO', onyomi: 'どう', kunyomi: 'みちび-く', meaningVi: 'dẫn dắt, hướng dẫn', strokeCount: 15 },
      { character: '承', hanViet: 'THỪA', onyomi: 'しょう', kunyomi: 'うけたまわ-る', meaningVi: 'tiếp nhận, thừa nhận', strokeCount: 8 },
      { character: '除', hanViet: 'TRỪ', onyomi: 'じょ, じ', kunyomi: 'のぞ-く', meaningVi: 'loại trừ, dọn bỏ', strokeCount: 10 },
      { character: '迎', hanViet: 'NGHÊNH', onyomi: 'げい', kunyomi: 'むか-える', meaningVi: 'đón, nghênh tiếp', strokeCount: 7 },
      { character: '逃', hanViet: 'ĐÀO', onyomi: 'とう', kunyomi: 'に-げる, に-がす, のが-す', meaningVi: 'chạy trốn, bỏ lỡ', strokeCount: 9 },
      { character: '迷', hanViet: 'MÊ', onyomi: 'めい', kunyomi: 'まよ-う', meaningVi: 'lạc, phân vân', strokeCount: 9 },
      { character: '訪', hanViet: 'PHỎNG', onyomi: 'ほう', kunyomi: 'たず-ねる, おとず-れる', meaningVi: 'thăm viếng', strokeCount: 11 },
      { character: '討', hanViet: 'THẢO', onyomi: 'とう', kunyomi: 'う-つ', meaningVi: 'thảo luận; đánh dẹp', strokeCount: 10 },
      { character: '論', hanViet: 'LUẬN', onyomi: 'ろん', meaningVi: 'luận, bàn luận', strokeCount: 15 },
      { character: '訳', hanViet: 'DỊCH', onyomi: 'やく', kunyomi: 'わけ', meaningVi: 'dịch thuật; lý do', strokeCount: 11 },
      { character: '詞', hanViet: 'TỪ', onyomi: 'し', meaningVi: 'từ (ngữ pháp); lời (bài hát)', strokeCount: 12 },
      { character: '延', hanViet: 'DIÊN', onyomi: 'えん', kunyomi: 'の-びる, の-ばす, の-べる', meaningVi: 'kéo dài, hoãn', strokeCount: 8 },
      { character: '略', hanViet: 'LƯỢC', onyomi: 'りゃく', meaningVi: 'lược bỏ, sơ lược; mưu lược', strokeCount: 11 },
      { character: '及', hanViet: 'CẬP', onyomi: 'きゅう', kunyomi: 'およ-ぶ, およ-び, およ-ぼす', meaningVi: 'đạt tới, lan tới; và', strokeCount: 3 },
    ],
  },
  {
    lessonNumber: 503,
    jlptLevel: 'N1',
    title: 'Bài 39 · Kanji N1 (3) — Hành chính, trừu tượng',
    sortOrder: 5030,
    entries: [
      { character: '該', hanViet: 'CAI', onyomi: 'がい', meaningVi: 'thuộc diện, tương ứng (該当)', strokeCount: 13 },
      { character: '循', hanViet: 'TUẦN', onyomi: 'じゅん', meaningVi: 'tuần hoàn', strokeCount: 12 },
      { character: '棄', hanViet: 'KHÍ', onyomi: 'き', meaningVi: 'vứt bỏ, từ bỏ (放棄)', strokeCount: 13 },
      { character: '虐', hanViet: 'NGƯỢC', onyomi: 'ぎゃく', kunyomi: 'しいた-げる', meaningVi: 'ngược đãi, tàn bạo', strokeCount: 9 },
      { character: '募', hanViet: 'MỘ', onyomi: 'ぼ', kunyomi: 'つの-る', meaningVi: 'tuyển mộ; kêu gọi; dâng lên', strokeCount: 12 },
      { character: '欺', hanViet: 'KHI', onyomi: 'ぎ', kunyomi: 'あざむ-く', meaningVi: 'lừa dối', strokeCount: 12 },
      { character: '施', hanViet: 'THI', onyomi: 'し, せ', kunyomi: 'ほどこ-す', meaningVi: 'thực thi; ban cho (施設)', strokeCount: 9 },
      { character: '審', hanViet: 'THẨM', onyomi: 'しん', meaningVi: 'thẩm định, xét xử', strokeCount: 15 },
      { character: '慮', hanViet: 'LỰ', onyomi: 'りょ', meaningVi: 'suy xét, lo lắng (考慮)', strokeCount: 15 },
      { character: '謀', hanViet: 'MƯU', onyomi: 'ぼう, む', kunyomi: 'はか-る', meaningVi: 'mưu tính, âm mưu', strokeCount: 16 },
      { character: '如', hanViet: 'NHƯ', onyomi: 'じょ, にょ', kunyomi: 'ごと-し', meaningVi: 'như, giống như (欠如)', strokeCount: 6 },
      { character: '款', hanViet: 'KHOẢN', onyomi: 'かん', meaningVi: 'điều khoản (定款)', strokeCount: 12 },
      { character: '妥', hanViet: 'THỎA', onyomi: 'だ', meaningVi: 'thỏa đáng; thỏa hiệp (妥協)', strokeCount: 7 },
      { character: '諮', hanViet: 'TƯ', onyomi: 'し', kunyomi: 'はか-る', meaningVi: 'tham vấn, hỏi ý (諮問)', strokeCount: 16 },
      { character: '累', hanViet: 'LŨY', onyomi: 'るい', meaningVi: 'tích lũy, liên lụy', strokeCount: 11 },
      { character: '頻', hanViet: 'TẦN', onyomi: 'ひん', meaningVi: 'thường xuyên (頻繁)', strokeCount: 17 },
      { character: '顕', hanViet: 'HIỂN', onyomi: 'けん', meaningVi: 'rõ rệt, hiển hiện (顕著)', strokeCount: 18 },
      { character: '遮', hanViet: 'GIÀ', onyomi: 'しゃ', kunyomi: 'さえぎ-る', meaningVi: 'che chắn, ngăn cản', strokeCount: 14 },
      { character: '阻', hanViet: 'TRỞ', onyomi: 'そ', kunyomi: 'はば-む', meaningVi: 'ngăn trở, cản trở', strokeCount: 8 },
      { character: '妨', hanViet: 'PHƯƠNG', onyomi: 'ぼう', kunyomi: 'さまた-げる', meaningVi: 'cản trở, gây trở ngại', strokeCount: 7 },
    ],
  },
];
