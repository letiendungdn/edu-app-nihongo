-- Câu ví dụ sai khiến bị động (〜させられる／〜(a)される: bị bắt phải làm) cho động từ N5–N4.
-- Giúp kho câu của tính năng dự đoán đề thi đếm được mẫu này. Chạy lại nhiều lần không bị trùng.
BEGIN;
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27712, '駅で一時間も待たされました。', 'えきで いちじかんも またされました。', 'Tôi bị bắt đợi ở ga tận một tiếng.', (SELECT coalesce(max("sortOrder"), -1) + 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27712), now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27712 AND ja = '駅で一時間も待たされました。');
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27254, '父に昔の話を何度も聞かされました。', 'ちちに むかしの はなしを なんども きかされました。', 'Tôi bị bố bắt nghe chuyện ngày xưa mấy lần.', (SELECT coalesce(max("sortOrder"), -1) + 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27254), now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27254 AND ja = '父に昔の話を何度も聞かされました。');
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27251, '飲み会で先輩にお酒を飲まされました。', 'のみかいで せんぱいに おさけを のまされました。', 'Ở buổi nhậu, tôi bị đàn anh ép uống rượu.', (SELECT coalesce(max("sortOrder"), -1) + 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27251), now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27251 AND ja = '飲み会で先輩にお酒を飲まされました。');
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27256, '先生に反省文を書かされました。', 'せんせいに はんせいぶんを かかされました。', 'Tôi bị thầy bắt viết bản kiểm điểm.', (SELECT coalesce(max("sortOrder"), -1) + 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27256), now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27256 AND ja = '先生に反省文を書かされました。');
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27255, '授業でみんなの前で作文を読まされました。', 'じゅぎょうで みんなの まえで さくぶんを よまされました。', 'Trong giờ học tôi bị bắt đọc bài văn trước cả lớp.', (SELECT coalesce(max("sortOrder"), -1) + 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27255), now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27255 AND ja = '授業でみんなの前で作文を読まされました。');
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27898, 'カラオケで嫌いな歌を歌わされました。', 'カラオケで きらいな うたを うたわされました。', 'Ở karaoke tôi bị bắt hát bài mình ghét.', (SELECT coalesce(max("sortOrder"), -1) + 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27898), now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27898 AND ja = 'カラオケで嫌いな歌を歌わされました。');
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27257, '店員に要らない物まで買わされました。', 'てんいんに いらないものまで かわされました。', 'Tôi bị nhân viên bán hàng ép mua cả đồ không cần.', (SELECT coalesce(max("sortOrder"), -1) + 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27257), now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27257 AND ja = '店員に要らない物まで買わされました。');
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27992, '会議で言いたくないことを言わされました。', 'かいぎで いいたくないことを いわされました。', 'Trong cuộc họp tôi bị bắt nói điều mình không muốn nói.', (SELECT coalesce(max("sortOrder"), -1) + 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27992), now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27992 AND ja = '会議で言いたくないことを言わされました。');
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27121, '若いころは毎日夜遅くまで働かされました。', 'わかいころは まいにち よる おそくまで はたらかされました。', 'Hồi trẻ ngày nào tôi cũng bị bắt làm việc đến khuya.', (SELECT coalesce(max("sortOrder"), -1) + 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27121), now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27121 AND ja = '若いころは毎日夜遅くまで働かされました。');
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27316, '子どものころ、母に書道を習わされました。', 'こどものころ、ははに しょどうを ならわされました。', 'Hồi nhỏ tôi bị mẹ bắt học thư pháp.', (SELECT coalesce(max("sortOrder"), -1) + 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27316), now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27316 AND ja = '子どものころ、母に書道を習わされました。');
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27859, '友達の食事代まで払わされました。', 'ともだちの しょくじだいまで はらわされました。', 'Tôi bị bắt trả cả tiền ăn của bạn.', (SELECT coalesce(max("sortOrder"), -1) + 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27859), now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27859 AND ja = '友達の食事代まで払わされました。');
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27713, '旅行で先輩の重い荷物を持たされました。', 'りょこうで せんぱいの おもい にもつを もたされました。', 'Trong chuyến đi tôi bị bắt xách hành lý nặng của đàn anh.', (SELECT coalesce(max("sortOrder"), -1) + 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27713), now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27713 AND ja = '旅行で先輩の重い荷物を持たされました。');
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 37685, '部活で毎日グラウンドを十周走らされました。', 'ぶかつで まいにち グラウンドを じゅうしゅう はしらされました。', 'Ở câu lạc bộ, ngày nào tôi cũng bị bắt chạy mười vòng sân.', (SELECT coalesce(max("sortOrder"), -1) + 1 FROM "VocabularyExample" WHERE "vocabularyId" = 37685), now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 37685 AND ja = '部活で毎日グラウンドを十周走らされました。');
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27189, '熱があったので、学校から家へ帰らされました。', 'ねつが あったので、がっこうから いえへ かえらされました。', 'Vì bị sốt nên tôi bị nhà trường cho về nhà.', (SELECT coalesce(max("sortOrder"), -1) + 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27189), now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27189 AND ja = '熱があったので、学校から家へ帰らされました。');
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27715, '日曜日に兄の引っ越しを手伝わされました。', 'にちようびに あにの ひっこしを てつだわされました。', 'Chủ nhật tôi bị bắt giúp anh trai chuyển nhà.', (SELECT coalesce(max("sortOrder"), -1) + 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27715), now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27715 AND ja = '日曜日に兄の引っ越しを手伝わされました。');
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27930, '毎朝、教室を掃除させられました。', 'まいあさ、きょうしつを そうじ させられました。', 'Sáng nào tôi cũng bị bắt dọn lớp học.', (SELECT coalesce(max("sortOrder"), -1) + 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27930), now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27930 AND ja = '毎朝、教室を掃除させられました。');
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27866, '上司に毎晩残業させられています。', 'じょうしに まいばん ざんぎょう させられています。', 'Tối nào tôi cũng bị sếp bắt làm thêm giờ.', (SELECT coalesce(max("sortOrder"), -1) + 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27866), now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27866 AND ja = '上司に毎晩残業させられています。');
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27250, '子どものころ、嫌いな野菜を食べさせられました。', 'こどものころ、きらいな やさいを たべさせられました。', 'Hồi nhỏ tôi bị bắt ăn rau mình ghét.', (SELECT coalesce(max("sortOrder"), -1) + 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27250), now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27250 AND ja = '子どものころ、嫌いな野菜を食べさせられました。');
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 28369, 'パーティーの後、一人で片付けさせられました。', 'パーティーの あと、ひとりで かたづけさせられました。', 'Sau bữa tiệc tôi bị bắt dọn dẹp một mình.', (SELECT coalesce(max("sortOrder"), -1) + 1 FROM "VocabularyExample" WHERE "vocabularyId" = 28369), now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 28369 AND ja = 'パーティーの後、一人で片付けさせられました。');
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 29059, '入口の前で一時間も並ばせられました。', 'いりぐちの まえで いちじかんも ならばせられました。', 'Tôi bị bắt xếp hàng trước cửa vào tận một tiếng.', (SELECT coalesce(max("sortOrder"), -1) + 1 FROM "VocabularyExample" WHERE "vocabularyId" = 29059), now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 29059 AND ja = '入口の前で一時間も並ばせられました。');
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 29309, '悪くないのに、私が謝らせられました。', 'わるくないのに、わたしが あやまらせられました。', 'Dù không có lỗi nhưng tôi vẫn bị bắt xin lỗi.', (SELECT coalesce(max("sortOrder"), -1) + 1 FROM "VocabularyExample" WHERE "vocabularyId" = 29309), now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 29309 AND ja = '悪くないのに、私が謝らせられました。');
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27896, 'キャンプでみんなの皿を洗わせられました。', 'キャンプで みんなの さらを あらわせられました。', 'Ở buổi cắm trại tôi bị bắt rửa bát cho mọi người.', (SELECT coalesce(max("sortOrder"), -1) + 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27896), now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27896 AND ja = 'キャンプでみんなの皿を洗わせられました。');
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 28838, '引っ越しで重い机を運ばせられました。', 'ひっこしで おもい つくえを はこばせられました。', 'Khi chuyển nhà tôi bị bắt khiêng chiếc bàn nặng.', (SELECT coalesce(max("sortOrder"), -1) + 1 FROM "VocabularyExample" WHERE "vocabularyId" = 28838), now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 28838 AND ja = '引っ越しで重い机を運ばせられました。');
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 27856, '小学校で漢字を百個覚えさせられました。', 'しょうがっこうで かんじを ひゃくこ おぼえさせられました。', 'Ở tiểu học tôi bị bắt nhớ một trăm chữ Hán.', (SELECT coalesce(max("sortOrder"), -1) + 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27856), now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 27856 AND ja = '小学校で漢字を百個覚えさせられました。');
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 37695, '毎日三時間もピアノを練習させられました。', 'まいにち さんじかんも ピアノを れんしゅう させられました。', 'Ngày nào tôi cũng bị bắt luyện piano tận ba tiếng.', (SELECT coalesce(max("sortOrder"), -1) + 1 FROM "VocabularyExample" WHERE "vocabularyId" = 37695), now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 37695 AND ja = '毎日三時間もピアノを練習させられました。');
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 28339, '行きたくない会議に参加させられました。', 'いきたくない かいぎに さんか させられました。', 'Tôi bị bắt tham gia cuộc họp mình không muốn đi.', (SELECT coalesce(max("sortOrder"), -1) + 1 FROM "VocabularyExample" WHERE "vocabularyId" = 28339), now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 28339 AND ja = '行きたくない会議に参加させられました。');
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 28135, 'お客様の前で新商品を説明させられました。', 'おきゃくさまの まえで しんしょうひんを せつめい させられました。', 'Tôi bị bắt giới thiệu sản phẩm mới trước khách hàng.', (SELECT coalesce(max("sortOrder"), -1) + 1 FROM "VocabularyExample" WHERE "vocabularyId" = 28135), now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 28135 AND ja = 'お客様の前で新商品を説明させられました。');
INSERT INTO "VocabularyExample" ("vocabularyId", ja, kana, vi, "sortOrder", "updatedAt")
SELECT 37694, '急に明日の会議の資料を準備させられました。', 'きゅうに あしたの かいぎの しりょうを じゅんび させられました。', 'Tôi bị bắt chuẩn bị gấp tài liệu cho cuộc họp ngày mai.', (SELECT coalesce(max("sortOrder"), -1) + 1 FROM "VocabularyExample" WHERE "vocabularyId" = 37694), now()
WHERE NOT EXISTS (SELECT 1 FROM "VocabularyExample" WHERE "vocabularyId" = 37694 AND ja = '急に明日の会議の資料を準備させられました。');
COMMIT;
