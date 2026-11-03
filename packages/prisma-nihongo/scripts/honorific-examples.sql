-- Câu ví dụ kính ngữ cho động từ N5–N4: tôn kính れる／られる, động từ tôn kính đặc biệt, お V に なります; và 3 câu cho mẫu ngữ pháp 7832.
-- Giúp kho câu của tính năng dự đoán đề thi đếm được mẫu tôn kính. Chạy lại nhiều lần không bị trùng.
BEGIN;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27255, '先生は毎朝新聞を読まれます。', 'せんせいは まいあさ しんぶんを よまれます。', 'Thầy giáo đọc báo mỗi sáng.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27255 AND ja = '先生は毎朝新聞を読まれます。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27255, '先生、この本はもう読まれましたか。', 'せんせい、この ほんは もう よまれましたか。', 'Thưa thầy, thầy đã đọc cuốn sách này chưa ạ?', 2, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27255 AND ja = '先生、この本はもう読まれましたか。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27189, '部長はもう帰られましたか。', 'ぶちょうは もう かえられましたか。', 'Trưởng phòng đã về chưa ạ?', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27189 AND ja = '部長はもう帰られましたか。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27188, '先生は何時ごろ来られますか。', 'せんせいは なんじごろ こられますか。', 'Khoảng mấy giờ thầy đến ạ?', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27188 AND ja = '先生は何時ごろ来られますか。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27188, '会長も明日来られますか。', 'かいちょうも あした こられますか。', 'Ngày mai chủ tịch cũng đến chứ ạ?', 2, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27188 AND ja = '会長も明日来られますか。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27717, '課長は会議でその計画を話されました。', 'かちょうは かいぎで その けいかくを はなされました。', 'Tổ trưởng đã trình bày kế hoạch đó trong cuộc họp.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27717 AND ja = '課長は会議でその計画を話されました。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27718, '社長はいつもこのペンを使われます。', 'しゃちょうは いつも この ペンを つかわれます。', 'Giám đốc lúc nào cũng dùng cây bút này.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27718 AND ja = '社長はいつもこのペンを使われます。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27712, 'お客様がロビーで待たれています。', 'おきゃくさまが ロビーで またれています。', 'Quý khách đang đợi ở sảnh.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27712 AND ja = 'お客様がロビーで待たれています。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27754, '先生は来月から新しい授業を始められます。', 'せんせいは らいげつから あたらしい じゅぎょうを はじめられます。', 'Từ tháng sau thầy sẽ bắt đầu lớp học mới.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27754 AND ja = '先生は来月から新しい授業を始められます。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27122, '部長は今日、会社を休まれました。', 'ぶちょうは きょう、かいしゃを やすまれました。', 'Hôm nay trưởng phòng đã nghỉ làm.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27122 AND ja = '部長は今日、会社を休まれました。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27861, '社長は午後から出かけられる予定です。', 'しゃちょうは ごごから でかけられる よていです。', 'Giám đốc dự định ra ngoài từ buổi chiều.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27861 AND ja = '社長は午後から出かけられる予定です。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 28419, '先生がこの問題の答えを決められました。', 'せんせいが この もんだいの こたえを きめられました。', 'Thầy giáo đã quyết định đáp án của câu hỏi này.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 28419 AND ja = '先生がこの問題の答えを決められました。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 38559, '部長は毎朝電車で会社へ通われています。', 'ぶちょうは まいあさ でんしゃで かいしゃへ かよわれています。', 'Mỗi sáng trưởng phòng đi làm bằng tàu điện.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 38559 AND ja = '部長は毎朝電車で会社へ通われています。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27257, '社長は昨日、新しい車を買われたそうです。', 'しゃちょうは きのう、あたらしい くるまを かわれた そうです。', 'Nghe nói hôm qua giám đốc đã mua xe mới.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27257 AND ja = '社長は昨日、新しい車を買われたそうです。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27251, 'お客様は何を飲まれますか。', 'おきゃくさまは なにを のまれますか。', 'Quý khách dùng đồ uống gì ạ?', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27251 AND ja = 'お客様は何を飲まれますか。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 28474, '先輩は毎晩遅くまで研究を続けられています。', 'せんぱいは まいばん おそくまで けんきゅうを つづけられています。', 'Đàn anh tối nào cũng tiếp tục nghiên cứu đến khuya.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 28474 AND ja = '先輩は毎晩遅くまで研究を続けられています。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 38419, '社長が皆様の前で挨拶されました。', 'しゃちょうが みなさまの まえで あいさつ されました。', 'Giám đốc đã phát biểu chào hỏi trước mọi người.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 38419 AND ja = '社長が皆様の前で挨拶されました。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 28096, '先生は毎日駅まで歩かれます。', 'せんせいは まいにち えきまで あるかれます。', 'Thầy giáo ngày nào cũng đi bộ đến ga.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 28096 AND ja = '先生は毎日駅まで歩かれます。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27250, '社長はもうお昼ご飯を食べられましたか。', 'しゃちょうは もう おひる ごはんを たべられましたか。', 'Giám đốc đã dùng bữa trưa chưa ạ?', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27250 AND ja = '社長はもうお昼ご飯を食べられましたか。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 28150, '店長は新しいメニューを考えられました。', 'てんちょうは あたらしい メニューを かんがえられました。', 'Cửa hàng trưởng đã nghĩ ra thực đơn mới.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 28150 AND ja = '店長は新しいメニューを考えられました。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 37684, 'お父様は毎朝公園を散歩されているそうですね。', 'おとうさまは まいあさ こうえんを さんぽ されている そうですね。', 'Nghe nói bố anh sáng nào cũng đi dạo công viên nhỉ.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 37684 AND ja = 'お父様は毎朝公園を散歩されているそうですね。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27256, '教授は今、新しい本を書かれています。', 'きょうじゅは いま、あたらしい ほんを かかれています。', 'Giáo sư hiện đang viết một cuốn sách mới.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27256 AND ja = '教授は今、新しい本を書かれています。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27253, '先生はもうその映画を見られましたか。', 'せんせいは もう その えいがを みられましたか。', 'Thầy đã xem bộ phim đó chưa ạ?', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27253 AND ja = '先生はもうその映画を見られましたか。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27254, '部長はこのニュースをもう聞かれましたか。', 'ぶちょうは この ニュースを もう きかれましたか。', 'Trưởng phòng đã nghe tin này chưa ạ?', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27254 AND ja = '部長はこのニュースをもう聞かれましたか。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27992, '先生がそう言われたので、安心しました。', 'せんせいが そう いわれたので、あんしん しました。', 'Vì thầy đã nói vậy nên tôi yên tâm.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27992 AND ja = '先生がそう言われたので、安心しました。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27315, '田中先生は大学で日本語を教えられています。', 'たなか せんせいは だいがくで にほんごを おしえられています。', 'Thầy Tanaka đang dạy tiếng Nhật ở trường đại học.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27315 AND ja = '田中先生は大学で日本語を教えられています。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27310, '社長は取引先へお礼の手紙を送られました。', 'しゃちょうは とりひきさきへ おれいの てがみを おくられました。', 'Giám đốc đã gửi thư cảm ơn tới đối tác.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27310 AND ja = '社長は取引先へお礼の手紙を送られました。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27962, '教授はこの町の歴史を長く調べられています。', 'きょうじゅは この まちの れきしを ながく しらべられています。', 'Giáo sư đã nghiên cứu lịch sử thị trấn này từ lâu.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27962 AND ja = '教授はこの町の歴史を長く調べられています。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 28135, '課長が新しい制度を詳しく説明されました。', 'かちょうが あたらしい せいどを くわしく せつめい されました。', 'Tổ trưởng đã giải thích chi tiết chế độ mới.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 28135 AND ja = '課長が新しい制度を詳しく説明されました。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 28178, '部長はもう取引先へ連絡されましたか。', 'ぶちょうは もう とりひきさきへ れんらく されましたか。', 'Trưởng phòng đã liên lạc với đối tác chưa ạ?', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 28178 AND ja = '部長はもう取引先へ連絡されましたか。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 38402, '社長は今、会議室へ入られました。', 'しゃちょうは いま、かいぎしつへ はいられました。', 'Giám đốc vừa vào phòng họp.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 38402 AND ja = '社長は今、会議室へ入られました。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 38385, '部長はもう会社を出られました。', 'ぶちょうは もう かいしゃを でられました。', 'Trưởng phòng đã rời công ty rồi.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 38385 AND ja = '部長はもう会社を出られました。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 38376, '先生は次の駅で降りられます。', 'せんせいは つぎの えきで おりられます。', 'Thầy sẽ xuống ở ga tiếp theo.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 38376 AND ja = '先生は次の駅で降りられます。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27121, '社長は若いころ、銀行で働かれていました。', 'しゃちょうは わかいころ、ぎんこうで はたらかれていました。', 'Hồi trẻ giám đốc từng làm việc ở ngân hàng.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27121 AND ja = '社長は若いころ、銀行で働かれていました。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27663, '先輩は毎朝プールで泳がれています。', 'せんぱいは まいあさ プールで およがれています。', 'Đàn anh sáng nào cũng bơi ở hồ bơi.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27663 AND ja = '先輩は毎朝プールで泳がれています。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 37685, '部長は毎朝公園を走られるそうです。', 'ぶちょうは まいあさ こうえんを はしられる そうです。', 'Nghe nói trưởng phòng sáng nào cũng chạy bộ ở công viên.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 37685 AND ja = '部長は毎朝公園を走られるそうです。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27723, '校長先生が前へ立たれると、みんな静かになりました。', 'こうちょう せんせいが まえへ たたれると、みんな しずかに なりました。', 'Khi thầy hiệu trưởng đứng lên phía trước, mọi người đều im lặng.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27723 AND ja = '校長先生が前へ立たれると、みんな静かになりました。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27713, '社長はいつも大きなかばんを持たれています。', 'しゃちょうは いつも おおきな かばんを もたれています。', 'Giám đốc lúc nào cũng mang một chiếc cặp lớn.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27713 AND ja = '社長はいつも大きなかばんを持たれています。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27716, '部長が田中さんを呼ばれています。', 'ぶちょうが たなかさんを よばれています。', 'Trưởng phòng đang gọi anh Tanaka.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27716 AND ja = '部長が田中さんを呼ばれています。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27720, '先生が昔の写真を見せられました。', 'せんせいが むかしの しゃしんを みせられました。', 'Thầy đã cho xem những bức ảnh ngày xưa.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27720 AND ja = '先生が昔の写真を見せられました。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27856, '先生は学生全員の名前を覚えられています。', 'せんせいは がくせい ぜんいんの なまえを おぼえられています。', 'Thầy nhớ tên của tất cả học sinh.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27856 AND ja = '先生は学生全員の名前を覚えられています。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27857, '部長が傘を忘れられたようです。', 'ぶちょうが かさを わすれられたようです。', 'Hình như trưởng phòng để quên ô.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27857 AND ja = '部長が傘を忘れられたようです。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 28093, '社長は会社の名前を変えられました。', 'しゃちょうは かいしゃの なまえを かえられました。', 'Giám đốc đã đổi tên công ty.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 28093 AND ja = '社長は会社の名前を変えられました。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27983, '先生が私の作文を直されました。', 'せんせいが わたしの さくぶんを なおされました。', 'Thầy đã sửa bài văn của tôi.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27983 AND ja = '先生が私の作文を直されました。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 28295, '会長はどのプランを選ばれましたか。', 'かいちょうは どの プランを えらばれましたか。', 'Chủ tịch đã chọn phương án nào ạ?', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 28295 AND ja = '会長はどのプランを選ばれましたか。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27902, '社長はご自分で車を運転されます。', 'しゃちょうは ごじぶんで くるまを うんてん されます。', 'Giám đốc tự mình lái xe.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27902 AND ja = '社長はご自分で車を運転されます。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 28672, 'お客様は駐車場を利用されますか。', 'おきゃくさまは ちゅうしゃじょうを りよう されますか。', 'Quý khách có sử dụng bãi đỗ xe không ạ?', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 28672 AND ja = 'お客様は駐車場を利用されますか。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27903, 'お客様はもう席を予約されていますか。', 'おきゃくさまは もう せきを よやく されていますか。', 'Quý khách đã đặt chỗ trước chưa ạ?', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27903 AND ja = 'お客様はもう席を予約されていますか。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 28864, '社長が取引先の方々を招待されました。', 'しゃちょうが とりひきさきの かたがたを しょうたい されました。', 'Giám đốc đã mời các vị bên đối tác.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 28864 AND ja = '社長が取引先の方々を招待されました。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 28134, '部長がお客様を工場へ案内されました。', 'ぶちょうが おきゃくさまを こうじょうへ あんない されました。', 'Trưởng phòng đã dẫn khách tham quan nhà máy.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 28134 AND ja = '部長がお客様を工場へ案内されました。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 28339, '先生も今度の旅行は参加されますか。', 'せんせいも こんどの りょこうは さんか されますか。', 'Chuyến đi lần này thầy cũng tham gia chứ ạ?', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 28339 AND ja = '先生も今度の旅行は参加されますか。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 28506, '先輩は去年大学を卒業されました。', 'せんぱいは きょねん だいがくを そつぎょう されました。', 'Đàn anh đã tốt nghiệp đại học năm ngoái.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 28506 AND ja = '先輩は去年大学を卒業されました。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27666, '先輩は来月結婚されるそうです。', 'せんぱいは らいげつ けっこん される そうです。', 'Nghe nói tháng sau đàn anh sẽ kết hôn.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27666 AND ja = '先輩は来月結婚されるそうです。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 37956, '先生は去年、大阪へ引っ越されました。', 'せんせいは きょねん、おおさかへ ひっこされました。', 'Năm ngoái thầy đã chuyển nhà đến Osaka.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 37956 AND ja = '先生は去年、大阪へ引っ越されました。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 29064, '社長は明日の朝、成田を出発されます。', 'しゃちょうは あしたの あさ、なりたを しゅっぱつ されます。', 'Sáng mai giám đốc sẽ khởi hành từ Narita.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 29064 AND ja = '社長は明日の朝、成田を出発されます。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 29065, '会長はもう到着されましたか。', 'かいちょうは もう とうちゃく されましたか。', 'Chủ tịch đã đến nơi chưa ạ?', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 29065 AND ja = '会長はもう到着されましたか。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 28000, '先生は若いころ、アメリカへ留学されていました。', 'せんせいは わかいころ、アメリカへ りゅうがく されていました。', 'Hồi trẻ thầy từng du học ở Mỹ.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 28000 AND ja = '先生は若いころ、アメリカへ留学されていました。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 28461, '部長は社長とよく相談されています。', 'ぶちょうは しゃちょうと よく そうだん されています。', 'Trưởng phòng thường bàn bạc với giám đốc.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 28461 AND ja = '部長は社長とよく相談されています。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 37952, '課長、この資料を確認されましたか。', 'かちょう、この しりょうを かくにん されましたか。', 'Thưa tổ trưởng, anh đã kiểm tra tài liệu này chưa ạ?', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 37952 AND ja = '課長、この資料を確認されましたか。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 37695, '先生は毎日ピアノを練習されています。', 'せんせいは まいにち ピアノを れんしゅう されています。', 'Ngày nào thầy cũng luyện đàn piano.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 37695 AND ja = '先生は毎日ピアノを練習されています。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 38499, '部長は社員旅行を計画されています。', 'ぶちょうは しゃいん りょこうを けいかく されています。', 'Trưởng phòng đang lên kế hoạch chuyến du lịch của nhân viên.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 38499 AND ja = '部長は社員旅行を計画されています。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27120, '先生は毎晩何時ごろ寝られますか。', 'せんせいは まいばん なんじごろ ねられますか。', 'Mỗi tối thầy đi ngủ khoảng mấy giờ ạ?', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27120 AND ja = '先生は毎晩何時ごろ寝られますか。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27119, '先生は毎朝五時に起きられるそうです。', 'せんせいは まいあさ ごじに おきられる そうです。', 'Nghe nói sáng nào thầy cũng dậy lúc 5 giờ.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27119 AND ja = '先生は毎朝五時に起きられるそうです。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27709, '社長が窓を開けられました。', 'しゃちょうが まどを あけられました。', 'Giám đốc đã mở cửa sổ.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27709 AND ja = '社長が窓を開けられました。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27710, '先生がドアを閉められました。', 'せんせいが ドアを しめられました。', 'Thầy đã đóng cửa.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27710 AND ja = '先生がドアを閉められました。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27860, '先生は借りた本をもう返されました。', 'せんせいは かりた ほんを もう かえされました。', 'Thầy đã trả cuốn sách đã mượn rồi.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27860 AND ja = '先生は借りた本をもう返されました。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27314, '部長は図書館で本を借りられました。', 'ぶちょうは としょかんで ほんを かりられました。', 'Trưởng phòng đã mượn sách ở thư viện.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27314 AND ja = '部長は図書館で本を借りられました。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27859, 'お客様はカードで払われますか。', 'おきゃくさまは カードで はらわれますか。', 'Quý khách thanh toán bằng thẻ phải không ạ?', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27859 AND ja = 'お客様はカードで払われますか。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27899, '先輩は古い切手を集められています。', 'せんぱいは ふるい きってを あつめられています。', 'Đàn anh đang sưu tầm tem cũ.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27899 AND ja = '先輩は古い切手を集められています。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 28603, '部長がその話を社員全員へ伝えられました。', 'ぶちょうが その はなしを しゃいん ぜんいんへ つたえられました。', 'Trưởng phòng đã truyền đạt chuyện đó tới toàn thể nhân viên.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 28603 AND ja = '部長がその話を社員全員へ伝えられました。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 28151, '先生はもう着かれましたか。', 'せんせいは もう つかれましたか。', 'Thầy đã đến nơi chưa ạ?', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 28151 AND ja = '先生はもう着かれましたか。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 37694, '先生は今、授業の準備をされています。', 'せんせいは いま、じゅぎょうの じゅんびを されています。', 'Thầy đang chuẩn bị cho giờ học.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 37694 AND ja = '先生は今、授業の準備をされています。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27250, '先生、どうぞ召し上がってください。', 'せんせい、どうぞ めしあがってください。', 'Thưa thầy, xin mời thầy dùng bữa.', 2, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27250 AND ja = '先生、どうぞ召し上がってください。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27250, '社長は何を召し上がりますか。', 'しゃちょうは なにを めしあがりますか。', 'Giám đốc dùng món gì ạ?', 3, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27250 AND ja = '社長は何を召し上がりますか。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27188, '先生は何時ごろいらっしゃいますか。', 'せんせいは なんじごろ いらっしゃいますか。', 'Khoảng mấy giờ thầy đến ạ?', 3, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27188 AND ja = '先生は何時ごろいらっしゃいますか。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27188, 'お客様がもういらっしゃいました。', 'おきゃくさまが もう いらっしゃいました。', 'Quý khách đã đến rồi.', 4, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27188 AND ja = 'お客様がもういらっしゃいました。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27992, '先生がおっしゃったとおりにしました。', 'せんせいが おっしゃったとおりに しました。', 'Tôi đã làm đúng như thầy nói.', 2, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27992 AND ja = '先生がおっしゃったとおりにしました。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27992, '部長は何とおっしゃいましたか。', 'ぶちょうは なんと おっしゃいましたか。', 'Trưởng phòng đã nói gì ạ?', 3, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27992 AND ja = '部長は何とおっしゃいましたか。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27253, '先生、この写真をご覧になりましたか。', 'せんせい、この しゃしんを ごらんに なりましたか。', 'Thưa thầy, thầy đã xem bức ảnh này chưa ạ?', 2, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27253 AND ja = '先生、この写真をご覧になりましたか。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27253, '社長はもうその資料をご覧になりました。', 'しゃちょうは もう その しりょうを ごらんに なりました。', 'Giám đốc đã xem tài liệu đó rồi.', 3, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27253 AND ja = '社長はもうその資料をご覧になりました。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27188, '部長は明日、何時ごろいらっしゃいますか。', 'ぶちょうは あした、なんじごろ いらっしゃいますか。', 'Ngày mai khoảng mấy giờ trưởng phòng đến ạ?', 5, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27188 AND ja = '部長は明日、何時ごろいらっしゃいますか。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27250, 'お客様、もう少し召し上がりませんか。', 'おきゃくさま、もうすこし めしあがりませんか。', 'Thưa quý khách, quý khách dùng thêm chút nữa nhé?', 4, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27250 AND ja = 'お客様、もう少し召し上がりませんか。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27717, '先生はゆっくり話すようにとおっしゃいました。', 'せんせいは ゆっくり はなすようにと おっしゃいました。', 'Thầy dặn hãy nói chậm thôi.', 2, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27717 AND ja = '先生はゆっくり話すようにとおっしゃいました。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27255, '先生はどんな本をご覧になりますか。', 'せんせいは どんな ほんを ごらんに なりますか。', 'Thầy thường xem loại sách nào ạ?', 3, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27255 AND ja = '先生はどんな本をご覧になりますか。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27188, '部長はいつも何時ごろ会社にいらっしゃいますか。', 'ぶちょうは いつも なんじごろ かいしゃに いらっしゃいますか。', 'Trưởng phòng thường đến công ty lúc mấy giờ ạ?', 6, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27188 AND ja = '部長はいつも何時ごろ会社にいらっしゃいますか。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 28419, '社長は来週どうなさいますか。', 'しゃちょうは らいしゅう どう なさいますか。', 'Tuần sau giám đốc định thế nào ạ?', 2, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 28419 AND ja = '社長は来週どうなさいますか。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27255, '先生はもうこの本をお読みになりましたか。', 'せんせいは もうこの ほんを およみに なりましたか。', 'Thầy đã đọc cuốn sách này chưa ạ?', 4, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27255 AND ja = '先生はもうこの本をお読みになりましたか。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27189, '部長はもうお帰りになりました。', 'ぶちょうは もう おかえりに なりました。', 'Trưởng phòng đã về rồi ạ.', 2, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27189 AND ja = '部長はもうお帰りになりました。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27122, '先生はもうお休みになりました。', 'せんせいは もう おやすみに なりました。', 'Thầy đã đi nghỉ rồi ạ.', 2, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27122 AND ja = '先生はもうお休みになりました。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27713, 'お客様、お荷物をお持ちになりますか。', 'おきゃくさま、おにもつを おもちに なりますか。', 'Thưa quý khách, quý khách tự mang hành lý chứ ạ?', 2, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27713 AND ja = 'お客様、お荷物をお持ちになりますか。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27257, '社長はどちらの車をお買いになりましたか。', 'しゃちょうは どちらの くるまを おかいに なりましたか。', 'Giám đốc đã mua chiếc xe nào ạ?', 2, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27257 AND ja = '社長はどちらの車をお買いになりましたか。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27256, '先生がお書きになった本を読みました。', 'せんせいが おかきに なった ほんを よみました。', 'Tôi đã đọc cuốn sách thầy viết.', 2, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27256 AND ja = '先生がお書きになった本を読みました。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27254, '先生はもうそのお話をお聞きになりましたか。', 'せんせいは もう その おはなしを おききに なりましたか。', 'Thầy đã nghe chuyện đó chưa ạ?', 2, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27254 AND ja = '先生はもうそのお話をお聞きになりましたか。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27718, 'お客様はこちらのパソコンをお使いになれます。', 'おきゃくさまは こちらの パソコンを おつかいに なれます。', 'Quý khách có thể sử dụng máy tính này.', 2, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27718 AND ja = 'お客様はこちらのパソコンをお使いになれます。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27712, '部長、こちらで少しお待ちになりますか。', 'ぶちょう、こちらで すこし おまちに なりますか。', 'Thưa trưởng phòng, anh có đợi ở đây một lát không ạ?', 2, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27712 AND ja = '部長、こちらで少しお待ちになりますか。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 28419, '社長はもうお決めになりましたか。', 'しゃちょうは もう おきめに なりましたか。', 'Giám đốc đã quyết định chưa ạ?', 3, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 28419 AND ja = '社長はもうお決めになりましたか。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27251, 'お客様は何をお飲みになりますか。', 'おきゃくさまは なにを おのみに なりますか。', 'Quý khách dùng đồ uống gì ạ?', 2, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27251 AND ja = 'お客様は何をお飲みになりますか。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27861, '先生は午後お出かけになります。', 'せんせいは ごご おでかけに なります。', 'Buổi chiều thầy sẽ ra ngoài.', 2, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27861 AND ja = '先生は午後お出かけになります。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 28150, '社長はどのようにお考えになりますか。', 'しゃちょうは どのように おかんがえに なりますか。', 'Giám đốc nghĩ thế nào ạ?', 2, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 28150 AND ja = '社長はどのようにお考えになりますか。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27315, '先生はどこで日本語をお教えになっていますか。', 'せんせいは どこで にほんごを おおしえに なっていますか。', 'Thầy đang dạy tiếng Nhật ở đâu ạ?', 2, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27315 AND ja = '先生はどこで日本語をお教えになっていますか。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27857, 'お客様、お忘れになった物はございませんか。', 'おきゃくさま、おわすれに なったものはございませんか。', 'Thưa quý khách, quý khách có để quên đồ gì không ạ?', 2, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27857 AND ja = 'お客様、お忘れになった物はございませんか。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27310, '先生がお送りになった手紙が届きました。', 'せんせいが おおくりに なった てがみが とどきました。', 'Bức thư thầy gửi đã đến nơi.', 2, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27310 AND ja = '先生がお送りになった手紙が届きました。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 28672, 'お客様は駐車場をご利用になれます。', 'おきゃくさまは ちゅうしゃじょうを ごりように なれます。', 'Quý khách có thể sử dụng bãi đỗ xe.', 2, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 28672 AND ja = 'お客様は駐車場をご利用になれます。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 38529, '会長も明日の会議にご出席になります。', 'かいちょうも あしたの かいぎに ごしゅっせきに なります。', 'Chủ tịch cũng sẽ dự cuộc họp ngày mai.', 1, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 38529 AND ja = '会長も明日の会議にご出席になります。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27666, '先生はいつご結婚になったんですか。', 'せんせいは いつ ごけっこんに なったんですか。', 'Thầy kết hôn khi nào vậy ạ?', 2, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27666 AND ja = '先生はいつご結婚になったんですか。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 29065, '社長はもう空港にご到着になりました。', 'しゃちょうは もう くうこうに ごとうちゃくに なりました。', 'Giám đốc đã đến sân bay rồi.', 2, now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 29065 AND ja = '社長はもう空港にご到着になりました。')
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
INSERT INTO "Example" (jp, romaji, vi, "grammarId", "sortOrder")
SELECT '部長は来週大阪へ出張されます。', 'Buchō wa raishū Ōsaka e shutchō saremasu.', 'Tuần sau trưởng phòng sẽ đi công tác Osaka.', 7832, 2
WHERE NOT EXISTS (SELECT 1 FROM "Example" WHERE "grammarId" = 7832 AND jp = '部長は来週大阪へ出張されます。');
INSERT INTO "Example" (jp, romaji, vi, "grammarId", "sortOrder")
SELECT '先生はいつ日本へ戻られますか。', 'Sensei wa itsu Nihon e modoraremasu ka.', 'Khi nào thầy trở về Nhật ạ?', 7832, 3
WHERE NOT EXISTS (SELECT 1 FROM "Example" WHERE "grammarId" = 7832 AND jp = '先生はいつ日本へ戻られますか。');
INSERT INTO "Example" (jp, romaji, vi, "grammarId", "sortOrder")
SELECT '社長はもう会議室を出られました。', 'Shachō wa mō kaigishitsu o deraremashita.', 'Giám đốc đã rời phòng họp rồi.', 7832, 4
WHERE NOT EXISTS (SELECT 1 FROM "Example" WHERE "grammarId" = 7832 AND jp = '社長はもう会議室を出られました。');
COMMIT;
