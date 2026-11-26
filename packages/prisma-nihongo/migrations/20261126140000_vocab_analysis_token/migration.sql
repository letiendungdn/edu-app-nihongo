CREATE TABLE "VocabAnalysisToken" (
    "id" SERIAL NOT NULL,
    "surface" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "reading" TEXT,
    "romaji" TEXT,
    "gloss" TEXT NOT NULL,
    "pos" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "VocabAnalysisToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VocabAnalysisToken_surface_key" ON "VocabAnalysisToken"("surface");
CREATE INDEX "VocabAnalysisToken_kind_sortOrder_idx" ON "VocabAnalysisToken"("kind", "sortOrder");

INSERT INTO "VocabAnalysisToken"
    ("surface", "kind", "reading", "romaji", "gloss", "pos", "detail", "sortOrder")
VALUES
    ('は', 'particle', 'は', 'wa', 'Trợ từ chủ đề (wa), đánh dấu phần đang nói đến.', 'Trợ từ chủ đề', 'Topic marker — đánh dấu chủ đề của câu.', 0),
    ('が', 'particle', 'が', 'ga', 'Trợ từ chủ ngữ / nhấn mạnh đối tượng.', 'Trợ từ chủ ngữ', 'Subject / focus marker.', 1),
    ('を', 'particle', 'を', 'o', 'Trợ từ tân ngữ trực tiếp (o), đối tượng của hành động.', 'Trợ từ tân ngữ', 'Direct object marker.', 2),
    ('に', 'particle', 'に', 'ni', 'Trợ từ đích / thời điểm / đối tượng gián tiếp.', 'Trợ từ', 'Destination / time / indirect object.', 3),
    ('で', 'particle', 'で', 'de', 'Trợ từ nơi diễn ra hành động hoặc phương tiện.', 'Trợ từ', 'Place of action / means.', 4),
    ('と', 'particle', 'と', 'to', 'Trợ từ “với / và” hoặc mở phần trích dẫn.', 'Trợ từ', 'With / and / quotation.', 5),
    ('も', 'particle', 'も', 'mo', 'Trợ từ “cũng”.', 'Trợ từ', 'Also / too.', 6),
    ('へ', 'particle', 'へ', 'e', 'Trợ từ hướng đi (e).', 'Trợ từ hướng', 'Direction marker (e).', 7),
    ('から', 'particle', 'から', 'kara', 'Trợ từ “từ / vì”.', 'Trợ từ', 'From / because.', 8),
    ('まで', 'particle', 'まで', 'made', 'Trợ từ “đến / tới”.', 'Trợ từ', 'Until / to.', 9),
    ('より', 'particle', 'より', 'yori', 'Trợ từ so sánh “hơn”.', 'Trợ từ', 'Than (comparison).', 10),
    ('の', 'particle', 'の', 'no', 'Trợ từ sở hữu / liên kết danh từ.', 'Trợ từ sở hữu', 'Possessive / noun linker.', 11),
    ('です', 'particle', 'です', 'desu', 'Động từ copula thể lịch sự (là / thì).', 'Hệ từ / đuôi lịch sự', 'Polite copula — is / am / are.', 12),
    ('ます', 'particle', 'ます', 'masu', 'Hậu tố lịch sự của động từ nhóm I/II.', 'Hậu tố lịch sự', 'Polite verb ending.', 13),
    ('でした', 'particle', 'でした', 'deshita', 'Thể quá khứ lịch sự của です.', 'Hệ từ quá khứ', 'Past polite copula.', 14),
    ('ません', 'particle', 'ません', 'masen', 'Phủ định lịch sự của động từ -masu.', 'Phủ định lịch sự', 'Polite negative verb ending.', 15),
    ('おはようございます', 'greeting', 'おはようございます', 'ohayou gozaimasu', 'Lời chào buổi sáng lịch sự.', 'Câu chào', 'Good morning.', 16),
    ('こんにちは', 'greeting', 'こんにちは', 'konnichiwa', 'Lời chào buổi trưa / xin chào.', 'Câu chào', 'Hello / good afternoon.', 17),
    ('こんばんは', 'greeting', 'こんばんは', 'konbanwa', 'Lời chào buổi tối.', 'Câu chào', 'Good evening.', 18),
    ('私', 'common', 'わたし', 'watashi', 'Từ đang học: tôi.', 'Đại từ', 'Tôi (I, me) · Kanji: Tư (riêng tư, cá nhân)', 19),
    ('学生', 'common', 'がくせい', 'gakusei', 'Học sinh, sinh viên.', 'Danh từ', 'Học sinh, sinh viên (student)', 20),
    ('先生', 'common', 'せんせい', 'sensei', 'Thầy giáo, cô giáo.', 'Danh từ', 'Teacher', 21),
    ('人', 'common', 'ひと', 'hito', 'Người.', 'Danh từ', 'Person / people', 22),
    ('日本', 'common', 'にほん', 'nihon', 'Nhật Bản.', 'Danh từ', 'Japan', 23),
    ('本', 'common', 'ほん', 'hon', 'Sách.', 'Danh từ', 'Book', 24),
    ('方', 'common', 'かた', 'kata', 'Vị / người (kính ngữ).', 'Danh từ kính ngữ', 'Person (polite) — かた', 25),
    ('木村', 'common', 'きむら', 'kimura', 'Họ Kimura (tên người).', 'Tên riêng', 'Family name: Kimura', 26);
