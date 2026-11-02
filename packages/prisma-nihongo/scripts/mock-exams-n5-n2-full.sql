-- Đề thi thử đầy đủ N5–N2 + luyện nghe N5/N4 (tự soạn). Chạy lại an toàn: xoá template theo slug rồi tạo lại.
BEGIN;
-- N5 — Đề thi thử đầy đủ số 1
DELETE FROM "MockExamTemplate" WHERE slug = 'n5-day-du-1';
INSERT INTO "MockExamTemplate" ("slug","level","title","description","sourceMode","durationMinutes","lessonFrom","lessonTo","kanjiLessonFrom","kanjiLessonTo","vocabCount","grammarCount","kanjiCount","listeningWordCount","listeningSentenceCount","passThreshold","scope","isPublished","sortOrder","updatedAt") VALUES ('n5-day-du-1','n5','N5 — Đề thi thử đầy đủ số 1','Đề tự soạn theo đúng cấu trúc JLPT N5: Từ vựng – Kanji, Ngữ pháp (kể cả sắp xếp ★), Đọc hiểu và Nghe. Có câu chọn tranh và 発話表現 (tranh minh họa: OpenMoji, CC BY-SA 4.0).','CUSTOM',90,1,1,1,1,0,0,0,0,0,60,'Đề tự soạn · 57 câu · đủ các phần như đề thật',true,19,CURRENT_TIMESTAMP);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','［　］のことばは ひらがなで どう かきますか。

この ［新しい］ かばんは いくらですか。','あたらしい',NULL::text,NULL::text,1,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('あたらしい',NULL::text,0),('あらたしい',NULL::text,1),('あたらい',NULL::text,2),('あだらしい',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','［　］のことばは ひらがなで どう かきますか。

まいあさ ［九時］に がっこうへ いきます。','くじ',NULL::text,NULL::text,2,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('くじ',NULL::text,0),('きゅうじ',NULL::text,1),('くし',NULL::text,2),('きゅじ',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','［　］のことばは ひらがなで どう かきますか。

えきの ［北］に こうえんが あります。','きた',NULL::text,NULL::text,3,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('きた',NULL::text,0),('みなみ',NULL::text,1),('にし',NULL::text,2),('ひがし',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','［　］のことばは ひらがなで どう かきますか。

きのう ともだちと ［映画］を みました。','えいが',NULL::text,NULL::text,4,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('えいが',NULL::text,0),('えが',NULL::text,1),('えいか',NULL::text,2),('えいがく',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','［　］のことばは ひらがなで どう かきますか。

この ［道］を まっすぐ いって ください。','みち',NULL::text,NULL::text,5,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('みち',NULL::text,0),('どう',NULL::text,1),('まち',NULL::text,2),('みず',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','［　］のことばは ひらがなで どう かきますか。

へやに ［椅子］が よっつ あります。','いす',NULL::text,NULL::text,6,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('いす',NULL::text,0),('いず',NULL::text,1),('いしゅ',NULL::text,2),('えす',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','［　］のことばは ひらがなで どう かきますか。

あには ［会社］で はたらいて います。','かいしゃ',NULL::text,NULL::text,7,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('かいしゃ',NULL::text,0),('がいしゃ',NULL::text,1),('かいしや',NULL::text,2),('かいじゃ',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','［　］のことばは どう かきますか。

まいにち ［でんしゃ］で がっこうへ いきます。','電車',NULL::text,NULL::text,8,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('電車',NULL::text,0),('電事',NULL::text,1),('雷車',NULL::text,2),('電東',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','［　］のことばは どう かきますか。

あしたは ［やすみ］です。','休み',NULL::text,NULL::text,9,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('休み',NULL::text,0),('体み',NULL::text,1),('木み',NULL::text,2),('休すみ',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','［　］のことばは どう かきますか。

この みせの ［さかな］は おいしいです。','魚',NULL::text,NULL::text,10,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('魚',NULL::text,0),('角',NULL::text,1),('鳥',NULL::text,2),('馬',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','［　］のことばは どう かきますか。

［みみ］が いたいです。','耳',NULL::text,NULL::text,11,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('耳',NULL::text,0),('目',NULL::text,1),('口',NULL::text,2),('手',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','［　］のことばは どう かきますか。

その ［ほん］を とって ください。','本',NULL::text,NULL::text,12,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('本',NULL::text,0),('木',NULL::text,1),('休',NULL::text,2),('体',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','（　）に なにを いれますか。いちばん いい ものを えらんで ください。

さむいですから、まどを（　）ください。','しめて',NULL::text,NULL::text,13,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('しめて',NULL::text,0),('あけて',NULL::text,1),('つけて',NULL::text,2),('かけて',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','（　）に なにを いれますか。いちばん いい ものを えらんで ください。

この（　）は とても からいです。','カレー',NULL::text,NULL::text,14,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('カレー',NULL::text,0),('ケーキ',NULL::text,1),('ジュース',NULL::text,2),('アイスクリーム',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','（　）に なにを いれますか。いちばん いい ものを えらんで ください。

あした テストが ありますから、こんばん（　）します。','べんきょう',NULL::text,NULL::text,15,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('べんきょう',NULL::text,0),('さんぽ',NULL::text,1),('りょこう',NULL::text,2),('せんたく',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','（　）に なにを いれますか。いちばん いい ものを えらんで ください。

かぜを ひきましたから、（　）へ いきます。','びょういん',NULL::text,NULL::text,16,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('びょういん',NULL::text,0),('ぎんこう',NULL::text,1),('ゆうびんきょく',NULL::text,2),('としょかん',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','（　）に なにを いれますか。いちばん いい ものを えらんで ください。

わたしの へやは あまり（　）です。','ひろくない',NULL::text,NULL::text,17,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('ひろくない',NULL::text,0),('ひろいじゃない',NULL::text,1),('ひろいくない',NULL::text,2),('ひろくなかった',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','（　）に なにを いれますか。いちばん いい ものを えらんで ください。

くつしたを 二（　）かいました。','そく',NULL::text,NULL::text,18,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('そく',NULL::text,0),('ほん',NULL::text,1),('まい',NULL::text,2),('だい',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','［　］の ぶんと だいたい おなじ いみの ぶんが あります。いちばん いい ものを えらんで ください。

［あしたは よっかです。］','きょうは みっかです。',NULL::text,NULL::text,19,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('きょうは みっかです。',NULL::text,0),('きょうは いつかです。',NULL::text,1),('きのうは よっかでした。',NULL::text,2),('あさっては むいかです。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','［　］の ぶんと だいたい おなじ いみの ぶんが あります。いちばん いい ものを えらんで ください。

［この へやは くらいです。］','この へやは あかるくないです。',NULL::text,NULL::text,20,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('この へやは あかるくないです。',NULL::text,0),('この へやは ひろくないです。',NULL::text,1),('この へやは しずかです。',NULL::text,2),('この へやは あたらしいです。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','［　］の ぶんと だいたい おなじ いみの ぶんが あります。いちばん いい ものを えらんで ください。

［おととい デパートへ いきました。］','ふつか まえに デパートへ いきました。',NULL::text,NULL::text,21,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('ふつか まえに デパートへ いきました。',NULL::text,0),('きのう デパートへ いきました。',NULL::text,1),('あした デパートへ いきます。',NULL::text,2),('あさって デパートへ いきます。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','（　）に 何を 入れますか。いちばん いい ものを えらんで ください。

わたしは まいばん 九時（　）ねます。','に',NULL::text,NULL::text,22,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('に',NULL::text,0),('で',NULL::text,1),('を',NULL::text,2),('が',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','（　）に 何を 入れますか。いちばん いい ものを えらんで ください。

としょかん（　）本を よみました。','で',NULL::text,NULL::text,23,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('で',NULL::text,0),('に',NULL::text,1),('へ',NULL::text,2),('を',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','（　）に 何を 入れますか。いちばん いい ものを えらんで ください。

A「なにを のみますか。」B「コーヒー（　）おねがいします。」','を',NULL::text,NULL::text,24,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('を',NULL::text,0),('が',NULL::text,1),('に',NULL::text,2),('で',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','（　）に 何を 入れますか。いちばん いい ものを えらんで ください。

この ケーキは（　）おいしいです。','とても',NULL::text,NULL::text,25,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('とても',NULL::text,0),('あまり',NULL::text,1),('ぜんぜん',NULL::text,2),('まだ',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','（　）に 何を 入れますか。いちばん いい ものを えらんで ください。

きのうは あめでしたが、きょうは（　）。','いい てんきです',NULL::text,NULL::text,26,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('いい てんきです',NULL::text,0),('いい てんきでした',NULL::text,1),('あめでした',NULL::text,2),('さむかったです',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','（　）に 何を 入れますか。いちばん いい ものを えらんで ください。

A「いっしょに ひるごはんを たべませんか。」B「ええ、（　）。」','たべましょう',NULL::text,NULL::text,27,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('たべましょう',NULL::text,0),('たべました',NULL::text,1),('たべません',NULL::text,2),('たべて いました',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','（　）に 何を 入れますか。いちばん いい ものを えらんで ください。

テレビを（　）ながら ごはんを たべます。','み',NULL::text,NULL::text,28,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('み',NULL::text,0),('みる',NULL::text,1),('みて',NULL::text,2),('みた',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','（　）に 何を 入れますか。いちばん いい ものを えらんで ください。

わたしは あねより せが（　）です。','たかい',NULL::text,NULL::text,29,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('たかい',NULL::text,0),('たかく',NULL::text,1),('たかくて',NULL::text,2),('たかいの',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','（　）に 何を 入れますか。いちばん いい ものを えらんで ください。

しゅくだいを（　）から、あそびに いきます。','して',NULL::text,NULL::text,30,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('して',NULL::text,0),('する',NULL::text,1),('した',NULL::text,2),('しない',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','★に 入る ものは どれですか。いちばん いい ものを えらんで ください。

わたしの　＿＿　＿＿　★　＿＿　です。
（1 は　2 いぬ　3 しろい　4 とても）','とても',NULL::text,NULL::text,31,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('とても',NULL::text,0),('は',NULL::text,1),('いぬ',NULL::text,2),('しろい',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','★に 入る ものは どれですか。いちばん いい ものを えらんで ください。

つくえの　＿＿　★　＿＿　＿＿　あります。
（1 に　2 うえ　3 が　4 ほん）','に',NULL::text,NULL::text,32,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('に',NULL::text,0),('うえ',NULL::text,1),('が',NULL::text,2),('ほん',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','★に 入る ものは どれですか。いちばん いい ものを えらんで ください。

きのう　＿＿　＿＿　★　＿＿　を かいました。
（1 で　2 シャツ　3 デパート　4 あおい）','あおい',NULL::text,NULL::text,33,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('あおい',NULL::text,0),('で',NULL::text,1),('シャツ',NULL::text,2),('デパート',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','★に 入る ものは どれですか。いちばん いい ものを えらんで ください。

これは　＿＿　★　＿＿　＿＿　です。
（1 くれた　2 ともだち　3 が　4 てがみ）','が',NULL::text,NULL::text,34,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('が',NULL::text,0),('くれた',NULL::text,1),('ともだち',NULL::text,2),('てがみ',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
わたしは まいあさ 六時に おきます。それから こうえんを さんぽします。七時に あさごはんを たべて、八時に いえを でます。

質問：この 人は あさごはんの まえに なにを しますか。','こうえんを さんぽします',NULL::text,NULL::text,35,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('こうえんを さんぽします',NULL::text,0),('いえを でます',NULL::text,1),('しんぶんを よみます',NULL::text,2),('ねます',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
（メモ）
キムさんへ
あしたの パーティーは 三時からです。わたしの へやで します。のみものは わたしが かいますから、キムさんは おかしを もって きて ください。
たなか

質問：キムさんは あした なにを もって いきますか。','おかし',NULL::text,NULL::text,36,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('おかし',NULL::text,0),('のみもの',NULL::text,1),('ケーキと のみもの',NULL::text,2),('なにも もって いかない',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
わたしの すきな ところ
わたしは えきの ちかくの きっさてんが すきです。その みせは ちいさいですが、しずかで、コーヒーが とても おいしいです。わたしは にちようびの ごご、よく そこで 本を よみます。せんしゅう、ともだちの リンさんと いっしょに いきました。リンさんは コーヒーが きらいですから、こうちゃを のみました。リンさんも その みせが すきに なりました。

質問：リンさんは きっさてんで なにを のみましたか。','こうちゃ',NULL::text,NULL::text,37,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('こうちゃ',NULL::text,0),('コーヒー',NULL::text,1),('ジュース',NULL::text,2),('みず',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
わたしの すきな ところ
わたしは えきの ちかくの きっさてんが すきです。その みせは ちいさいですが、しずかで、コーヒーが とても おいしいです。わたしは にちようびの ごご、よく そこで 本を よみます。せんしゅう、ともだちの リンさんと いっしょに いきました。リンさんは コーヒーが きらいですから、こうちゃを のみました。リンさんも その みせが すきに なりました。

質問：「わたし」は にちようびの ごご、きっさてんで なにを しますか。','本を よみます',NULL::text,NULL::text,38,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('本を よみます',NULL::text,0),('ともだちと はなします',NULL::text,1),('しごとを します',NULL::text,2),('コーヒーを つくります',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
（びじゅつかんの おしらせ）
・あいて いる 日：かようび〜にちようび
・やすみ：げつようび
・じかん：ごぜん 九時〜ごご 五時
・おかね：おとな 500えん、こども（小学生）200えん

質問：おとな 一人と 小学生 一人で いきます。いくら はらいますか。','700えん',NULL::text,NULL::text,39,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('700えん',NULL::text,0),('500えん',NULL::text,1),('1000えん',NULL::text,2),('400えん',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','おんなの 人と おとこの 人が はなして います。おとこの 人は なにを かいますか。','［図］パンと たまご','おんなの 人と おとこの 人が はなして います。おとこの 人は なにを かいますか。
おんな：パンと たまごを かって きて ください。
おとこ：ぎゅうにゅうは？
おんな：ぎゅうにゅうは まだ れいぞうこに ありますから、いいです。
おとこの 人は なにを かいますか。',NULL::text,40,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('［図］パンと たまご','/media/exam/pan-tamago.svg',0),('［図］パンと ぎゅうにゅう','/media/exam/pan-gyunyu.svg',1),('［図］たまごと ぎゅうにゅう','/media/exam/tamago-gyunyu.svg',2),('［図］パンだけ','/media/exam/pan.svg',3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','せんせいが がくせいに はなして います。がくせいは あした なんじに がっこうに きますか。','八時半','せんせいが がくせいに はなして います。がくせいは あした なんじに がっこうに きますか。
せんせい：あしたは バスで びじゅつかんへ いきます。バスは 九時に でますから、八時半に がっこうに きて ください。
がくせいは あした なんじに がっこうに きますか。',NULL::text,41,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('八時半',NULL::text,0),('八時',NULL::text,1),('九時',NULL::text,2),('九時半',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','おとこの 人と おんなの 人が はなして います。ふたりは どこで あいますか。','ほんや','おとこの 人と おんなの 人が はなして います。ふたりは どこで あいますか。
おとこ：あした、えきの まえで あいましょうか。
おんな：えきの まえは 人が おおいですから、えきの ちかくの ほんやは どうですか。
おとこ：いいですね。そう しましょう。
ふたりは どこで あいますか。',NULL::text,42,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('ほんや',NULL::text,0),('えきの まえ',NULL::text,1),('えきの なか',NULL::text,2),('きっさてん',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','みせで おとこの 人と みせの 人が はなして います。おとこの 人は どれを かいますか。','あおい かさ','みせで おとこの 人と みせの 人が はなして います。おとこの 人は どれを かいますか。
おとこ：すみません、その くろい かさは いくらですか。
みせの 人：二千えんです。
おとこ：ちょっと たかいですね。その あおい かさは？
みせの 人：千二百えんです。
おとこ：じゃあ、それを ください。
おとこの 人は どれを かいますか。',NULL::text,43,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('あおい かさ',NULL::text,0),('くろい かさ',NULL::text,1),('あおい かばん',NULL::text,2),('くろい かばん',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','おんなの 人と おとこの 人が はなして います。おんなの 人は どうして きのう がっこうを やすみましたか。','はが いたかったから','おんなの 人と おとこの 人が はなして います。おんなの 人は どうして きのう がっこうを やすみましたか。
おとこ：きのう、どうして やすみましたか。かぜですか。
おんな：いいえ、げんきです。はが いたかったですから、はいしゃへ いきました。
おんなの 人は どうして きのう がっこうを やすみましたか。',NULL::text,44,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('はが いたかったから',NULL::text,0),('かぜを ひいたから',NULL::text,1),('あたまが いたかったから',NULL::text,2),('りょこうに いったから',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','おとこの 人と おんなの 人が はなして います。おとこの 人は にちようび なにを しましたか。','うちで りょうりを つくった','おとこの 人と おんなの 人が はなして います。おとこの 人は にちようび なにを しましたか。
おんな：にちようびは なにを しましたか。
おとこ：ともだちと テニスを する つもりでしたが、あめでしたから、うちで りょうりを つくりました。
おとこの 人は にちようび なにを しましたか。',NULL::text,45,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('うちで りょうりを つくった',NULL::text,0),('ともだちと テニスを した',NULL::text,1),('えいがを みた',NULL::text,2),('かいものに いった',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','おんなの 人が はなして います。おんなの 人の かぞくは なんにんですか。','四人','おんなの 人が はなして います。おんなの 人の かぞくは なんにんですか。
おんな：わたしの かぞくは ちちと ははと あにと わたしです。それから いぬが 一ぴき います。
おんなの 人の かぞくは なんにんですか。',NULL::text,46,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('四人',NULL::text,0),('三人',NULL::text,1),('五人',NULL::text,2),('六人',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','えを みながら しつもんを きいて ください。→（やじるし）の 人は なんと いいますか。いちばん いい ものを えらんで ください。','いただきます。','ごはんを たべます。なんと いいますか。','/media/exam/n5-itadakimasu.svg',47,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('いただきます。',NULL::text,0),('ごちそうさまでした。',NULL::text,1),('おやすみなさい。',NULL::text,2),('いってきます。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','えを みながら しつもんを きいて ください。→（やじるし）の 人は なんと いいますか。いちばん いい ものを えらんで ください。','いってきます。','いえを でます。なんと いいますか。','/media/exam/n5-ittekimasu.svg',48,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('いってきます。',NULL::text,0),('いってらっしゃい。',NULL::text,1),('ただいま。',NULL::text,2),('おかえりなさい。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','えを みながら しつもんを きいて ください。→（やじるし）の 人は なんと いいますか。いちばん いい ものを えらんで ください。','これは いくらですか。','みせで りんごの ねだんを ききたいです。なんと いいますか。','/media/exam/n5-ikura.svg',49,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('これは いくらですか。',NULL::text,0),('これは なんですか。',NULL::text,1),('りんごを たべます。',NULL::text,2),('いらっしゃいませ。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','えを みながら しつもんを きいて ください。→（やじるし）の 人は なんと いいますか。いちばん いい ものを えらんで ください。','ペンを かして ください。','ともだちの ペンを かりたいです。なんと いいますか。','/media/exam/n5-pen.svg',50,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('ペンを かして ください。',NULL::text,0),('ペンを かりて ください。',NULL::text,1),('ペンを どうぞ。',NULL::text,2),('ペンは ありません。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','えを みながら しつもんを きいて ください。→（やじるし）の 人は なんと いいますか。いちばん いい ものを えらんで ください。','だいじょうぶですか。','ともだちが びょうきです。なんと いいますか。','/media/exam/n5-daijobu.svg',51,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('だいじょうぶですか。',NULL::text,0),('おめでとうございます。',NULL::text,1),('おげんきで。',NULL::text,2),('しつれいしました。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','えなどは ありません。ぶんを きいて、いちばん いい こたえを えらんで ください。','おはよう。','あさ、ともだちに あいました。なんと いいますか。',NULL::text,52,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('おはよう。',NULL::text,0),('こんばんは。',NULL::text,1),('おやすみなさい。',NULL::text,2),('いただきます。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','えなどは ありません。ぶんを きいて、いちばん いい こたえを えらんで ください。','わたしのです。','これは だれの かさですか。',NULL::text,53,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('わたしのです。',NULL::text,0),('かさです。',NULL::text,1),('あそこです。',NULL::text,2),('あおいです。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','えなどは ありません。ぶんを きいて、いちばん いい こたえを えらんで ください。','ええ、みましょう。','いっしょに えいがを みませんか。',NULL::text,54,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('ええ、みましょう。',NULL::text,0),('ええ、みました。',NULL::text,1),('いいえ、えいがです。',NULL::text,2),('はい、みて ください。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','えなどは ありません。ぶんを きいて、いちばん いい こたえを えらんで ください。','あそこです。','すみません、トイレは どこですか。',NULL::text,55,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('あそこです。',NULL::text,0),('トイレです。',NULL::text,1),('はい、そうです。',NULL::text,2),('どういたしまして。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','えなどは ありません。ぶんを きいて、いちばん いい こたえを えらんで ください。','おそまつさまでした。','ごちそうさまでした。',NULL::text,56,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('おそまつさまでした。',NULL::text,0),('いただきます。',NULL::text,1),('いってきます。',NULL::text,2),('はじめまして。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','えなどは ありません。ぶんを きいて、いちばん いい こたえを えらんで ください。','六時ごろです。','なんじに いえへ かえりますか。',NULL::text,57,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('六時ごろです。',NULL::text,0),('でんしゃで かえります。',NULL::text,1),('きのう かえりました。',NULL::text,2),('いえに います。',NULL::text,3)) AS o(text, img, ord);
-- N4 — Đề thi thử đầy đủ số 1
DELETE FROM "MockExamTemplate" WHERE slug = 'n4-day-du-1';
INSERT INTO "MockExamTemplate" ("slug","level","title","description","sourceMode","durationMinutes","lessonFrom","lessonTo","kanjiLessonFrom","kanjiLessonTo","vocabCount","grammarCount","kanjiCount","listeningWordCount","listeningSentenceCount","passThreshold","scope","isPublished","sortOrder","updatedAt") VALUES ('n4-day-du-1','n4','N4 — Đề thi thử đầy đủ số 1','Đề tự soạn theo đúng cấu trúc JLPT N4: Từ vựng – Kanji, Ngữ pháp (kể cả sắp xếp ★), Đọc hiểu và Nghe. Có câu chọn tranh và 発話表現 (tranh minh họa: OpenMoji, CC BY-SA 4.0).','CUSTOM',115,1,1,1,1,0,0,0,0,0,60,'Đề tự soạn · 74 câu · đủ các phần như đề thật',true,20,CURRENT_TIMESTAMP);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','［　］の ことばは ひらがなで どう 書きますか。

この 町は ［交通］が べんりです。','こうつう',NULL::text,NULL::text,1,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('こうつう',NULL::text,0),('こうづう',NULL::text,1),('こうとう',NULL::text,2),('ごうつう',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','［　］の ことばは ひらがなで どう 書きますか。

［急いで］ えきへ 行きました。','いそいで',NULL::text,NULL::text,2,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('いそいで',NULL::text,0),('きゅういで',NULL::text,1),('おいで',NULL::text,2),('さわいで',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','［　］の ことばは ひらがなで どう 書きますか。

りょこうの ［計画］を 立てました。','けいかく',NULL::text,NULL::text,3,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('けいかく',NULL::text,0),('けいが',NULL::text,1),('けかく',NULL::text,2),('けいかつ',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','［　］の ことばは ひらがなで どう 書きますか。

この みちは 夜 ［暗い］です。','くらい',NULL::text,NULL::text,4,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('くらい',NULL::text,0),('ひくい',NULL::text,1),('ふかい',NULL::text,2),('さむい',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','［　］の ことばは ひらがなで どう 書きますか。

にもつを ［運んで］ ください。','はこんで',NULL::text,NULL::text,5,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('はこんで',NULL::text,0),('えらんで',NULL::text,1),('よんで',NULL::text,2),('あそんで',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','［　］の ことばは ひらがなで どう 書きますか。

ここに ［住所］を 書いて ください。','じゅうしょ',NULL::text,NULL::text,6,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('じゅうしょ',NULL::text,0),('じゅうじょ',NULL::text,1),('すみしょ',NULL::text,2),('じゅしょう',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','［　］の ことばは ひらがなで どう 書きますか。

ことしの 夏は とても ［暑かった］です。','あつかった',NULL::text,NULL::text,7,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('あつかった',NULL::text,0),('さむかった',NULL::text,1),('あたたかかった',NULL::text,2),('すずしかった',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','［　］の ことばは どう 書きますか。

まどを ［しめて］ ください。','閉めて',NULL::text,NULL::text,8,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('閉めて',NULL::text,0),('開めて',NULL::text,1),('問めて',NULL::text,2),('間めて',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','［　］の ことばは どう 書きますか。

えいごを ［ならって］ います。','習って',NULL::text,NULL::text,9,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('習って',NULL::text,0),('羽って',NULL::text,1),('学って',NULL::text,2),('教って',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','［　］の ことばは どう 書きますか。

この ［しなもの］は 高いです。','品物',NULL::text,NULL::text,10,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('品物',NULL::text,0),('品者',NULL::text,1),('口物',NULL::text,2),('晶物',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','［　］の ことばは どう 書きますか。

あしたの ［よてい］を おしえて ください。','予定',NULL::text,NULL::text,11,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('予定',NULL::text,0),('予走',NULL::text,1),('矛定',NULL::text,2),('子定',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','［　］の ことばは どう 書きますか。

［おもい］ にもつを もちました。','重い',NULL::text,NULL::text,12,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('重い',NULL::text,0),('動い',NULL::text,1),('軽い',NULL::text,2),('量い',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','（　）に 何を 入れますか。いちばん いい ものを えらんで ください。

友だちの たんじょうびに 花を（　）。','おくりました',NULL::text,NULL::text,13,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('おくりました',NULL::text,0),('うけました',NULL::text,1),('かりました',NULL::text,2),('ひろいました',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','（　）に 何を 入れますか。いちばん いい ものを えらんで ください。

しゅくだいを わすれて、先生に（　）。','しかられました',NULL::text,NULL::text,14,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('しかられました',NULL::text,0),('ほめられました',NULL::text,1),('たのまれました',NULL::text,2),('しょうたいされました',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','（　）に 何を 入れますか。いちばん いい ものを えらんで ください。

この くすりは ごはんを 食べた（　）に のんで ください。','あと',NULL::text,NULL::text,15,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('あと',NULL::text,0),('まえ',NULL::text,1),('あいだ',NULL::text,2),('うち',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','（　）に 何を 入れますか。いちばん いい ものを えらんで ください。

あしたの 会議の 時間を（　）して ください。','かくにん',NULL::text,NULL::text,16,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('かくにん',NULL::text,0),('せつめい',NULL::text,1),('しょうかい',NULL::text,2),('ちゅうい',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','（　）に 何を 入れますか。いちばん いい ものを えらんで ください。

かぜが（　）、まどが ガタガタ なって います。','つよくて',NULL::text,NULL::text,17,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('つよくて',NULL::text,0),('ふかくて',NULL::text,1),('おもくて',NULL::text,2),('ひろくて',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','（　）に 何を 入れますか。いちばん いい ものを えらんで ください。

この 道は 車が おおいので、（　）わたって ください。','ちゅういして',NULL::text,NULL::text,18,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('ちゅういして',NULL::text,0),('しんぱいして',NULL::text,1),('えんりょして',NULL::text,2),('がまんして',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','（　）に 何を 入れますか。いちばん いい ものを えらんで ください。

しあいに まけて、とても（　）です。','ざんねん',NULL::text,NULL::text,19,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('ざんねん',NULL::text,0),('ていねい',NULL::text,1),('ふべん',NULL::text,2),('じょうず',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','（　）に 何を 入れますか。いちばん いい ものを えらんで ください。

しりょうを 十まい（　）して ください。','コピー',NULL::text,NULL::text,20,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('コピー',NULL::text,0),('メモ',NULL::text,1),('サイン',NULL::text,2),('チェック',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','［　］の 文と だいたい 同じ いみの 文が あります。いちばん いい ものを えらんで ください。

［この りょうりは あまり おいしくないです。］','この りょうりは まずいです。',NULL::text,NULL::text,21,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('この りょうりは まずいです。',NULL::text,0),('この りょうりは からいです。',NULL::text,1),('この りょうりは あまいです。',NULL::text,2),('この りょうりは とても おいしいです。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','［　］の 文と だいたい 同じ いみの 文が あります。いちばん いい ものを えらんで ください。

［山田さんは 先生に しつもんしました。］','山田さんは 先生に ききました。',NULL::text,NULL::text,22,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('山田さんは 先生に ききました。',NULL::text,0),('山田さんは 先生に こたえました。',NULL::text,1),('先生は 山田さんに ききました。',NULL::text,2),('山田さんは 先生に おしえました。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','［　］の 文と だいたい 同じ いみの 文が あります。いちばん いい ものを えらんで ください。

［きのうは ひまでした。］','きのうは いそがしくなかったです。',NULL::text,NULL::text,23,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('きのうは いそがしくなかったです。',NULL::text,0),('きのうは いそがしかったです。',NULL::text,1),('きのうは やすみでした。',NULL::text,2),('きのうは つかれました。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','［　］の 文と だいたい 同じ いみの 文が あります。いちばん いい ものを えらんで ください。

［ここで たばこを すっては いけません。］','ここは きんえんです。',NULL::text,NULL::text,24,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('ここは きんえんです。',NULL::text,0),('ここは きつえんじょです。',NULL::text,1),('ここで たばこを すっても いいです。',NULL::text,2),('ここで たばこを うって います。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','つぎの ことばの つかいかたで いちばん いい ものを えらんで ください。

ねっしん','かれは まいばん ねっしんに 日本語を べんきょうして います。',NULL::text,NULL::text,25,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('かれは まいばん ねっしんに 日本語を べんきょうして います。',NULL::text,0),('きょうは ねっしんな 天気ですね。',NULL::text,1),('この スープは ねっしんですから、気を つけて ください。',NULL::text,2),('ねっしんが あるので、学校を 休みました。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','つぎの ことばの つかいかたで いちばん いい ものを えらんで ください。

ひきだし','ペンは つくえの ひきだしに 入って います。',NULL::text,NULL::text,26,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('ペンは つくえの ひきだしに 入って います。',NULL::text,0),('ぎんこうで お金を ひきだしに 行きます。',NULL::text,1),('かれは ピアノを ひきだしに します。',NULL::text,2),('へやの ひきだしを つけて ください。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','つぎの ことばの つかいかたで いちばん いい ものを えらんで ください。

おみまい','にゅういんして いる 友だちの おみまいに 行きました。',NULL::text,NULL::text,27,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('にゅういんして いる 友だちの おみまいに 行きました。',NULL::text,0),('あたらしい 家の おみまいに パーティーを しました。',NULL::text,1),('しけんに ごうかくして、おみまいを もらいました。',NULL::text,2),('あさ、先生に おみまいを 言いました。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','つぎの ことばの つかいかたで いちばん いい ものを えらんで ください。

こしょう','エレベーターが こしょうして いるので、かいだんを つかいます。',NULL::text,NULL::text,28,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('エレベーターが こしょうして いるので、かいだんを つかいます。',NULL::text,0),('ステーキに こしょうして 食べます。',NULL::text,1),('かれは こしょうで 学校を 休みました。',NULL::text,2),('この 時計は こしょうなので、高いです。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','（　）に 何を 入れますか。いちばん いい ものを えらんで ください。

この 本は 子ども（　）読めます。','でも',NULL::text,NULL::text,29,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('でも',NULL::text,0),('しか',NULL::text,1),('だけ',NULL::text,2),('ばかり',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','（　）に 何を 入れますか。いちばん いい ものを えらんで ください。

あめが ふり（　）ですから、かさを もって 行きましょう。','そう',NULL::text,NULL::text,30,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('そう',NULL::text,0),('よう',NULL::text,1),('らしい',NULL::text,2),('みたい',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','（　）に 何を 入れますか。いちばん いい ものを えらんで ください。

ドアに かぎが（　）あります。','かけて',NULL::text,NULL::text,31,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('かけて',NULL::text,0),('かかって',NULL::text,1),('かける',NULL::text,2),('かけ',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','（　）に 何を 入れますか。いちばん いい ものを えらんで ください。

ねる 前に はを（　）なさい。','みがき',NULL::text,NULL::text,32,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('みがき',NULL::text,0),('みがく',NULL::text,1),('みがいて',NULL::text,2),('みがいた',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','（　）に 何を 入れますか。いちばん いい ものを えらんで ください。

先生に 日本の うたを おしえて（　）。','いただきました',NULL::text,NULL::text,33,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('いただきました',NULL::text,0),('さしあげました',NULL::text,1),('あげました',NULL::text,2),('やりました',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','（　）に 何を 入れますか。いちばん いい ものを えらんで ください。

日本へ 来た（　）、すしを 食べた ことが ありません。','のに',NULL::text,NULL::text,34,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('のに',NULL::text,0),('ので',NULL::text,1),('から',NULL::text,2),('ため',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','（　）に 何を 入れますか。いちばん いい ものを えらんで ください。

母に へやを そうじ（　）。','させられました',NULL::text,NULL::text,35,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('させられました',NULL::text,0),('させました',NULL::text,1),('されました',NULL::text,2),('しました',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','（　）に 何を 入れますか。いちばん いい ものを えらんで ください。

かぜを ひかない（　）、まいにち うんどうして います。','ように',NULL::text,NULL::text,36,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('ように',NULL::text,0),('ために',NULL::text,1),('ばかりに',NULL::text,2),('うちに',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','（　）に 何を 入れますか。いちばん いい ものを えらんで ください。

この ボタンを（　）、きっぷが 出ます。','おすと',NULL::text,NULL::text,37,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('おすと',NULL::text,0),('おすなら',NULL::text,1),('おしても',NULL::text,2),('おしたり',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','（　）に 何を 入れますか。いちばん いい ものを えらんで ください。

A「社長は もう（　）か。」B「はい、さっき 帰られました。」','お帰りに なりました',NULL::text,NULL::text,38,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('お帰りに なりました',NULL::text,0),('お帰りしました',NULL::text,1),('帰られて いただきました',NULL::text,2),('お帰りいたしました',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','（　）に 何を 入れますか。いちばん いい ものを えらんで ください。

この しごとは 今日中に（　）。','おわらせなければ なりません',NULL::text,NULL::text,39,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('おわらせなければ なりません',NULL::text,0),('おわらなければ なりません',NULL::text,1),('おわらせても いいです',NULL::text,2),('おわった ことが あります',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','（　）に 何を 入れますか。いちばん いい ものを えらんで ください。

かれは 何も 言わないで、へやを 出て（　）。','いって しまいました',NULL::text,NULL::text,40,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('いって しまいました',NULL::text,0),('いって おきました',NULL::text,1),('いって みました',NULL::text,2),('いって ありました',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','★に 入る ものは どれですか。いちばん いい ものを えらんで ください。

これは　＿＿　＿＿　★　＿＿　です。
（1 に　2 母　3 もらった　4 プレゼント）','もらった',NULL::text,NULL::text,41,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('もらった',NULL::text,0),('に',NULL::text,1),('母',NULL::text,2),('プレゼント',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','★に 入る ものは どれですか。いちばん いい ものを えらんで ください。

あした　＿＿　★　＿＿　＿＿　行きません。
（1 ふったら　2 あめが　3 にも　4 どこ）','ふったら',NULL::text,NULL::text,42,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('ふったら',NULL::text,0),('あめが',NULL::text,1),('にも',NULL::text,2),('どこ',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','★に 入る ものは どれですか。いちばん いい ものを えらんで ください。

日本語を　＿＿　＿＿　★　＿＿　と 思って います。
（1 ために　2 りゅうがく　3 しよう　4 べんきょうする）','りゅうがく',NULL::text,NULL::text,43,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('りゅうがく',NULL::text,0),('ために',NULL::text,1),('しよう',NULL::text,2),('べんきょうする',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','★に 入る ものは どれですか。いちばん いい ものを えらんで ください。

この 店の ケーキは　＿＿　★　＿＿　＿＿　おいしいです。
（1 ほど　2 くらべられない　3 と　4 ほかの 店）','と',NULL::text,NULL::text,44,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('と',NULL::text,0),('ほど',NULL::text,1),('くらべられない',NULL::text,2),('ほかの 店',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
わたしの 町には 大きな こうえんが あります。春に なると、さくらが たくさん さいて、人が おおぜい 来ます。でも、わたしは 人が 少ない 秋の こうえんの ほうが すきです。木の はが 赤や 黄色に なって、とても きれいだからです。

質問：「わたし」は どうして 秋の こうえんが すきですか。','人が 少なくて、木の はが きれいだから',NULL::text,NULL::text,45,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('人が 少なくて、木の はが きれいだから',NULL::text,0),('さくらが たくさん さくから',NULL::text,1),('人が おおぜい 来るから',NULL::text,2),('大きな こうえんだから',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
（会社の けいじ）
みなさんへ
来週の 月曜日、ビルの 電気の てんけんが あります。午前十時から十二時まで、エレベーターが つかえません。また、パソコンは 十時までに 電源を 切って ください。
そうむ課

質問：月曜日の 十時までに しなければ ならない ことは 何ですか。','パソコンの 電源を 切る',NULL::text,NULL::text,46,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('パソコンの 電源を 切る',NULL::text,0),('エレベーターに のる',NULL::text,1),('てんけんを する',NULL::text,2),('そうむ課に 行く',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
わたしは 先月から 毎朝 ジョギングを して います。はじめは 十分 走るだけで つかれましたが、今は 三十分 走れるように なりました。朝 走ると、一日中 気分が いいです。これからも つづけたいと 思います。

質問：「わたし」は 今 どのくらい 走れますか。','三十分',NULL::text,NULL::text,47,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('三十分',NULL::text,0),('十分',NULL::text,1),('一時間',NULL::text,2),('十五分',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
はじめての アルバイト
わたしは 大学に 入ってから、レストランで アルバイトを はじめました。さいしょは お客さんの ちゅうもんを まちがえたり、おさらを わったり して、しっぱいばかりでした。店長に しかられて、やめたいと 思った ことも あります。
でも、先ぱいが「さいしょは だれでも しっぱいするよ」と 言って、いろいろ おしえて くれました。それから、わたしは 先ぱいの しごとを よく 見て、まねを するように しました。
今では、あたらしい アルバイトの 人に しごとを おしえて います。あの とき 先ぱいが いなかったら、わたしは もう やめて いたと 思います。

質問：「わたし」は どうして アルバイトを やめたいと 思いましたか。','しっぱいばかりで、店長に しかられたから',NULL::text,NULL::text,48,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('しっぱいばかりで、店長に しかられたから',NULL::text,0),('先ぱいが こわかったから',NULL::text,1),('しごとが つまらなかったから',NULL::text,2),('大学の べんきょうが いそがしかったから',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
はじめての アルバイト
わたしは 大学に 入ってから、レストランで アルバイトを はじめました。さいしょは お客さんの ちゅうもんを まちがえたり、おさらを わったり して、しっぱいばかりでした。店長に しかられて、やめたいと 思った ことも あります。
でも、先ぱいが「さいしょは だれでも しっぱいするよ」と 言って、いろいろ おしえて くれました。それから、わたしは 先ぱいの しごとを よく 見て、まねを するように しました。
今では、あたらしい アルバイトの 人に しごとを おしえて います。あの とき 先ぱいが いなかったら、わたしは もう やめて いたと 思います。

質問：「わたし」は 先ぱいに 言われてから 何を しましたか。','先ぱいの しごとを 見て、まねを した',NULL::text,NULL::text,49,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('先ぱいの しごとを 見て、まねを した',NULL::text,0),('店長に あやまった',NULL::text,1),('アルバイトを やめた',NULL::text,2),('あたらしい 人に しごとを おしえた',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
はじめての アルバイト
わたしは 大学に 入ってから、レストランで アルバイトを はじめました。さいしょは お客さんの ちゅうもんを まちがえたり、おさらを わったり して、しっぱいばかりでした。店長に しかられて、やめたいと 思った ことも あります。
でも、先ぱいが「さいしょは だれでも しっぱいするよ」と 言って、いろいろ おしえて くれました。それから、わたしは 先ぱいの しごとを よく 見て、まねを するように しました。
今では、あたらしい アルバイトの 人に しごとを おしえて います。あの とき 先ぱいが いなかったら、わたしは もう やめて いたと 思います。

質問：この 文章で いちばん 言いたい ことは 何ですか。','先ぱいの おかげで アルバイトを つづけられた',NULL::text,NULL::text,50,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('先ぱいの おかげで アルバイトを つづけられた',NULL::text,0),('アルバイトは しっぱいが おおい',NULL::text,1),('レストランの しごとは たいへんだ',NULL::text,2),('店長は とても きびしい',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
（市の スポーツ教室）
・水えい：火よう日 18:00〜19:00 1回 300円
・テニス：土よう日 10:00〜12:00 1回 500円 ※ラケットを かします（100円）
・ヨガ：水よう日 19:00〜20:00 1回 400円
・バドミントン：日よう日 14:00〜16:00 1回 300円

質問：会社員の リーさんは 週末の 午前に 教室に 行きたいです。ラケットを もって いません。いくら はらいますか。','600円',NULL::text,NULL::text,51,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('600円',NULL::text,0),('500円',NULL::text,1),('300円',NULL::text,2),('400円',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
（市の スポーツ教室）
・水えい：火よう日 18:00〜19:00 1回 300円
・テニス：土よう日 10:00〜12:00 1回 500円 ※ラケットを かします（100円）
・ヨガ：水よう日 19:00〜20:00 1回 400円
・バドミントン：日よう日 14:00〜16:00 1回 300円

質問：平日の 夜、七時から 始まる 教室は どれですか。','ヨガ',NULL::text,NULL::text,52,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('ヨガ',NULL::text,0),('水えい',NULL::text,1),('テニス',NULL::text,2),('バドミントン',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','会社で 男の 人と 女の 人が 話して います。男の 人は このあと まず 何を しますか。','しりょうの 数字を たしかめる','会社で 男の 人と 女の 人が 話して います。男の 人は このあと まず 何を しますか。
女：田中さん、会議の しりょう、コピーして くれましたか。
男：これから します。
女：コピーの 前に、三ページ目の 数字を もう一度 見て ください。まちがって いるかも しれません。
男：わかりました。
男の 人は このあと まず 何を しますか。',NULL::text,53,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('しりょうの 数字を たしかめる',NULL::text,0),('しりょうを コピーする',NULL::text,1),('会議に 出る',NULL::text,2),('女の 人に しりょうを わたす',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','女の 学生と 男の 学生が 話して います。女の 学生は 何で 図書館へ 行きますか。','じてんしゃ','女の 学生と 男の 学生が 話して います。女の 学生は 何で 図書館へ 行きますか。
男：図書館へ 行くなら、バスが べんりだよ。
女：でも バスは 時間が かかるでしょう。電車は？
男：電車は えきから 少し 歩くよ。じてんしゃなら 十分ぐらいだけど。
女：じゃあ、天気も いいし、じてんしゃで 行くわ。
女の 学生は 何で 図書館へ 行きますか。',NULL::text,54,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('じてんしゃ',NULL::text,0),('バス',NULL::text,1),('電車',NULL::text,2),('あるいて',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','男の 人と 女の 人が 話して います。男の 人は 何を じゅんびしますか。','［図］かさ','男の 人と 女の 人が 話して います。男の 人は 何を じゅんびしますか。
女：あしたの ハイキング、お弁当は わたしが 作るね。
男：ありがとう。じゃあ、ぼくは 飲み物を 買って おくよ。
女：飲み物は 山の 上の 店でも 買えるよ。それより、雨が ふるかも しれないから、かさを もって きて。
男：わかった。
男の 人は 何を じゅんびしますか。',NULL::text,55,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('［図］かさ','/media/exam/kasa.svg',0),('［図］お弁当','/media/exam/bento.svg',1),('［図］飲み物','/media/exam/nomimono.svg',2),('［図］ちず','/media/exam/chizu.svg',3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','店で 女の 人と 店の 人が 話して います。女の 人は いつ 店に 来ますか。','しあさって','店で 女の 人と 店の 人が 話して います。女の 人は いつ 店に 来ますか。
女：この くつ、わたしの サイズは ありますか。
店の 人：もうしわけありません。今 ありませんが、あさって とどきます。
女：あさっては しごとが いそがしいので、その つぎの 日に 来ます。
女の 人は いつ 店に 来ますか。',NULL::text,56,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('しあさって',NULL::text,0),('きょう',NULL::text,1),('あした',NULL::text,2),('あさって',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','先生が 学生に 話して います。学生は しゅくだいを どう 出しますか。','金曜日までに メールで 送る','先生が 学生に 話して います。学生は しゅくだいを どう 出しますか。
先生：しゅくだいの レポートは、紙で 出さないで ください。メールで 金曜日までに 送って ください。
学生は しゅくだいを どう 出しますか。',NULL::text,57,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('金曜日までに メールで 送る',NULL::text,0),('金曜日までに 紙で 出す',NULL::text,1),('月曜日に 紙で 出す',NULL::text,2),('月曜日までに メールで 送る',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','男の 人と 女の 人が 話して います。女の 人は どうして 引っこしますか。','となりが うるさいから','男の 人と 女の 人が 話して います。女の 人は どうして 引っこしますか。
男：引っこすんですか。今の アパート、えきから 近くて いいでしょう。
女：ええ、べんりなんですけど、となりの 部屋の 人が 夜 うるさくて、ねられないんです。
女の 人は どうして 引っこしますか。',NULL::text,58,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('となりが うるさいから',NULL::text,0),('えきから 遠いから',NULL::text,1),('やちんが 高いから',NULL::text,2),('部屋が せまいから',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','女の 人と 男の 人が 話して います。男の 人は 週末 何を しましたか。','家で 子どもと ゲームを した','女の 人と 男の 人が 話して います。男の 人は 週末 何を しましたか。
女：週末、海へ 行くと 言って いましたね。
男：ええ、でも 子どもが ねつを 出して しまって。
女：そうですか。じゃあ、ずっと 家に いたんですか。
男：はい。子どもと いっしょに 家で ゲームを しました。
男の 人は 週末 何を しましたか。',NULL::text,59,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('家で 子どもと ゲームを した',NULL::text,0),('海へ 行った',NULL::text,1),('びょういんで はたらいた',NULL::text,2),('友だちと 出かけた',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','ラジオで 女の 人が 話して います。あしたの 天気は どうですか。','くもりで、夜は さむい','ラジオで 女の 人が 話して います。あしたの 天気は どうですか。
女：あしたは 一日中 くもりですが、雨は ふらないでしょう。ただ、夜は 気温が 下がって、さむく なります。
あしたの 天気は どうですか。',NULL::text,60,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('くもりで、夜は さむい',NULL::text,0),('一日中 雨',NULL::text,1),('晴れて あたたかい',NULL::text,2),('朝は 雨で、夜は 晴れ',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','男の 人と 女の 人が 話して います。男の 人が この 会社を えらんだ いちばんの 理由は 何ですか。','外国へ 行く しごとが できるから','男の 人と 女の 人が 話して います。男の 人が この 会社を えらんだ いちばんの 理由は 何ですか。
女：あたらしい 会社は どうですか。きゅうりょうが いいんですか。
男：きゅうりょうは 前と 同じぐらいです。でも、外国へ 行く しごとが できるので、それで えらびました。
男の 人が この 会社を えらんだ いちばんの 理由は 何ですか。',NULL::text,61,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('外国へ 行く しごとが できるから',NULL::text,0),('きゅうりょうが いいから',NULL::text,1),('家から 近いから',NULL::text,2),('休みが 多いから',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','女の 人が 話して います。女の 人は 毎日 どのくらい 日本語を べんきょうして いますか。','一時間','女の 人が 話して います。女の 人は 毎日 どのくらい 日本語を べんきょうして いますか。
女：わたしは しごとが いそがしいので、毎日 少しずつ べんきょうして います。朝 三十分、夜 三十分です。週末は 二時間 べんきょうします。
女の 人は 毎日 どのくらい 日本語を べんきょうして いますか。',NULL::text,62,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('一時間',NULL::text,0),('三十分',NULL::text,1),('二時間',NULL::text,2),('三時間',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','絵を 見ながら 質問を 聞いて ください。→（やじるし）の 人は 何と 言いますか。いちばん いい ものを えらんで ください。','まどを あけても いいですか。','へやが とても あついです。まどを あけたいです。何と 言いますか。','/media/exam/n4-mado.svg',63,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('まどを あけても いいですか。',NULL::text,0),('まどを あけて いますか。',NULL::text,1),('まどを しめましょうか。',NULL::text,2),('まどが あいて いますね。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','絵を 見ながら 質問を 聞いて ください。→（やじるし）の 人は 何と 言いますか。いちばん いい ものを えらんで ください。','すみません、駅は どこですか。','道が わかりません。何と 言いますか。','/media/exam/n4-michi.svg',64,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('すみません、駅は どこですか。',NULL::text,0),('どうぞ、こちらです。',NULL::text,1),('駅まで 送りましょうか。',NULL::text,2),('道に まよいましたか。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','絵を 見ながら 質問を 聞いて ください。→（やじるし）の 人は 何と 言いますか。いちばん いい ものを えらんで ください。','お先に しつれいします。','会社で、先に 帰ります。何と 言いますか。','/media/exam/n4-osaki.svg',65,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('お先に しつれいします。',NULL::text,0),('おつかれさまでした。',NULL::text,1),('いって まいります。',NULL::text,2),('おかえりなさい。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','絵を 見ながら 質問を 聞いて ください。→（やじるし）の 人は 何と 言いますか。いちばん いい ものを えらんで ください。','手伝いましょうか。','友だちが 重い 荷物を 持って います。何と 言いますか。','/media/exam/n4-tetsudai.svg',66,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('手伝いましょうか。',NULL::text,0),('手伝って ください。',NULL::text,1),('重いですね、がんばって。',NULL::text,2),('荷物を 持ちましたか。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','絵を 見ながら 質問を 聞いて ください。→（やじるし）の 人は 何と 言いますか。いちばん いい ものを えらんで ください。','すみません、もう 一度 おねがいします。','先生の 話が よく 聞こえませんでした。何と 言いますか。','/media/exam/n4-mouichido.svg',67,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('すみません、もう 一度 おねがいします。',NULL::text,0),('はい、よく わかりました。',NULL::text,1),('しつもんは ありません。',NULL::text,2),('もう 少し しずかに して ください。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','えなどは ありません。文を 聞いて、いちばん いい 返事を えらんで ください。','ええ、どうぞ。','すみません、この 席、あいて いますか。',NULL::text,68,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('ええ、どうぞ。',NULL::text,0),('ええ、あけて ください。',NULL::text,1),('いいえ、すわりました。',NULL::text,2),('どういたしまして。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','えなどは ありません。文を 聞いて、いちばん いい 返事を えらんで ください。','ありがとうございます。','きょうは つかれたでしょう。ゆっくり 休んで ください。',NULL::text,69,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('ありがとうございます。',NULL::text,0),('はい、つかれさせました。',NULL::text,1),('いいえ、休みませんでした。',NULL::text,2),('じゃあ、休んで いきましょう。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','えなどは ありません。文を 聞いて、いちばん いい 返事を えらんで ください。','ええ、いいですよ。','この 本、来週まで かりても いいですか。',NULL::text,70,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('ええ、いいですよ。',NULL::text,0),('ええ、かりました。',NULL::text,1),('はい、かして ください。',NULL::text,2),('いいえ、来週です。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','えなどは ありません。文を 聞いて、いちばん いい 返事を えらんで ください。','ううん、まだ 半分しか して いない。','しゅくだい、もう 終わった？',NULL::text,71,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('ううん、まだ 半分しか して いない。',NULL::text,0),('うん、これから 終わるよ。',NULL::text,1),('ううん、もう 終わったよ。',NULL::text,2),('うん、まだ はじめて いない。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','えなどは ありません。文を 聞いて、いちばん いい 返事を えらんで ください。','どうしたんですか。','先生、あした じゅぎょうを 休んでも いいですか。',NULL::text,72,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('どうしたんですか。',NULL::text,0),('はい、休みました。',NULL::text,1),('いいえ、じゅぎょうです。',NULL::text,2),('じゃあ、休ませて ください。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','えなどは ありません。文を 聞いて、いちばん いい 返事を えらんで ください。','いいですね。そう しましょう。','お茶でも 飲みませんか。',NULL::text,73,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('いいですね。そう しましょう。',NULL::text,0),('はい、飲みました。',NULL::text,1),('お茶を ください、どうも。',NULL::text,2),('いいえ、飲んで ください。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','えなどは ありません。文を 聞いて、いちばん いい 返事を えらんで ください。','ありがとうございます。たすかります。','駅まで おくりましょうか。',NULL::text,74,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('ありがとうございます。たすかります。',NULL::text,0),('はい、おくって あげます。',NULL::text,1),('いいえ、駅です。',NULL::text,2),('どうぞ、おくって ください、ありがとう。',NULL::text,3)) AS o(text, img, ord);
-- N3 — Đề thi thử đầy đủ số 1
DELETE FROM "MockExamTemplate" WHERE slug = 'n3-day-du-1';
INSERT INTO "MockExamTemplate" ("slug","level","title","description","sourceMode","durationMinutes","lessonFrom","lessonTo","kanjiLessonFrom","kanjiLessonTo","vocabCount","grammarCount","kanjiCount","listeningWordCount","listeningSentenceCount","passThreshold","scope","isPublished","sortOrder","updatedAt") VALUES ('n3-day-du-1','n3','N3 — Đề thi thử đầy đủ số 1','Đề tự soạn theo đúng cấu trúc JLPT N3: Từ vựng – Kanji, Ngữ pháp (kể cả sắp xếp ★), Đọc hiểu và Nghe. Có câu chọn tranh và 発話表現 (tranh minh họa: OpenMoji, CC BY-SA 4.0).','CUSTOM',140,1,1,1,1,0,0,0,0,0,60,'Đề tự soạn · 87 câu · đủ các phần như đề thật',true,21,CURRENT_TIMESTAMP);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','［　］のことばの読み方として最もよいものを、一つえらびなさい。

駅前に新しいビルが［完成］した。','かんせい',NULL::text,NULL::text,1,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('かんせい',NULL::text,0),('かんぜい',NULL::text,1),('がんせい',NULL::text,2),('かんしょう',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','［　］のことばの読み方として最もよいものを、一つえらびなさい。

試合の［結果］を教えてください。','けっか',NULL::text,NULL::text,2,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('けっか',NULL::text,0),('けつか',NULL::text,1),('けっが',NULL::text,2),('けいか',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','［　］のことばの読み方として最もよいものを、一つえらびなさい。

この問題は［複雑］で、すぐには解けない。','ふくざつ',NULL::text,NULL::text,3,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('ふくざつ',NULL::text,0),('ふくさつ',NULL::text,1),('ふくじゃつ',NULL::text,2),('ふうざつ',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','［　］のことばの読み方として最もよいものを、一つえらびなさい。

母は毎朝、庭の花に水を［与えて］いる。','あたえて',NULL::text,NULL::text,4,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('あたえて',NULL::text,0),('あらえて',NULL::text,1),('かかえて',NULL::text,2),('ささえて',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','［　］のことばの読み方として最もよいものを、一つえらびなさい。

友達と旅行の［費用］を半分ずつ出した。','ひよう',NULL::text,NULL::text,5,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('ひよう',NULL::text,0),('ひよ',NULL::text,1),('ひいよう',NULL::text,2),('ひょう',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','［　］のことばの読み方として最もよいものを、一つえらびなさい。

彼は［汗］をかきながら走ってきた。','あせ',NULL::text,NULL::text,6,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('あせ',NULL::text,0),('なみだ',NULL::text,1),('いき',NULL::text,2),('ちから',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','［　］のことばの読み方として最もよいものを、一つえらびなさい。

会議の［準備］はもうできていますか。','じゅんび',NULL::text,NULL::text,7,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('じゅんび',NULL::text,0),('じゅんぴ',NULL::text,1),('しゅんび',NULL::text,2),('じゅうび',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','［　］のことばの読み方として最もよいものを、一つえらびなさい。

この川は［浅い］ので、子どもでも遊べる。','あさい',NULL::text,NULL::text,8,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('あさい',NULL::text,0),('ふかい',NULL::text,1),('せまい',NULL::text,2),('ほそい',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','［　］のことばを漢字で書くとき、最もよいものを、一つえらびなさい。

痛みを［とめる］薬をもらった。','止める',NULL::text,NULL::text,9,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('止める',NULL::text,0),('留める',NULL::text,1),('泊める',NULL::text,2),('停める',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','［　］のことばを漢字で書くとき、最もよいものを、一つえらびなさい。

新しい仕事に［なれる］まで時間がかかった。','慣れる',NULL::text,NULL::text,10,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('慣れる',NULL::text,0),('馴れる',NULL::text,1),('成れる',NULL::text,2),('熟れる',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','［　］のことばを漢字で書くとき、最もよいものを、一つえらびなさい。

彼の［いけん］に賛成です。','意見',NULL::text,NULL::text,11,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('意見',NULL::text,0),('異見',NULL::text,1),('意験',NULL::text,2),('意件',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','［　］のことばを漢字で書くとき、最もよいものを、一つえらびなさい。

大雨で電車が［おくれた］。','遅れた',NULL::text,NULL::text,12,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('遅れた',NULL::text,0),('送れた',NULL::text,1),('後れた',NULL::text,2),('贈れた',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','［　］のことばを漢字で書くとき、最もよいものを、一つえらびなさい。

この部屋は日当たりがよくて［あたたかい］。','暖かい',NULL::text,NULL::text,13,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('暖かい',NULL::text,0),('温かい',NULL::text,1),('援かい',NULL::text,2),('緩かい',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','［　］のことばを漢字で書くとき、最もよいものを、一つえらびなさい。

電話番号を［ひかえて］おいてください。','控えて',NULL::text,NULL::text,14,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('控えて',NULL::text,0),('引えて',NULL::text,1),('惜えて',NULL::text,2),('空えて',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','（　）に入れるのに最もよいものを、一つえらびなさい。

道が（　）いて、約束の時間に遅れてしまった。','混んで',NULL::text,NULL::text,15,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('混んで',NULL::text,0),('空いて',NULL::text,1),('並んで',NULL::text,2),('止まって',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','（　）に入れるのに最もよいものを、一つえらびなさい。

新しい商品の（　）を聞くために、アンケートをとった。','感想',NULL::text,NULL::text,16,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('感想',NULL::text,0),('感謝',NULL::text,1),('感動',NULL::text,2),('感心',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','（　）に入れるのに最もよいものを、一つえらびなさい。

雨で試合が（　）になった。','中止',NULL::text,NULL::text,17,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('中止',NULL::text,0),('中心',NULL::text,1),('中間',NULL::text,2),('中身',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','（　）に入れるのに最もよいものを、一つえらびなさい。

弟は、ゲームに（　）して、宿題を忘れていた。','夢中',NULL::text,NULL::text,18,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('夢中',NULL::text,0),('熱心',NULL::text,1),('集中',NULL::text,2),('真剣',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','（　）に入れるのに最もよいものを、一つえらびなさい。

引っ越しの荷物を（　）するのに、一週間かかった。','整理',NULL::text,NULL::text,19,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('整理',NULL::text,0),('修理',NULL::text,1),('料理',NULL::text,2),('処理',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','（　）に入れるのに最もよいものを、一つえらびなさい。

試験に合格して、（　）した。','ほっと',NULL::text,NULL::text,20,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('ほっと',NULL::text,0),('がっかり',NULL::text,1),('いらいら',NULL::text,2),('びっくり',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','（　）に入れるのに最もよいものを、一つえらびなさい。

このかばんは軽くて、（　）も多いので使いやすい。','ポケット',NULL::text,NULL::text,21,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('ポケット',NULL::text,0),('ボタン',NULL::text,1),('サイズ',NULL::text,2),('ベルト',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','（　）に入れるのに最もよいものを、一つえらびなさい。

天気予報によると、台風が（　）いるらしい。','近づいて',NULL::text,NULL::text,22,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('近づいて',NULL::text,0),('近よって',NULL::text,1),('近くなって',NULL::text,2),('近まって',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','（　）に入れるのに最もよいものを、一つえらびなさい。

約束の時間に遅れないように、（　）家を出た。','早めに',NULL::text,NULL::text,23,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('早めに',NULL::text,0),('早くて',NULL::text,1),('早さで',NULL::text,2),('早まって',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','［　］に意味が最も近いものを、一つえらびなさい。

この料理は［たちまち］なくなった。','すぐに',NULL::text,NULL::text,24,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('すぐに',NULL::text,0),('少しずつ',NULL::text,1),('やっと',NULL::text,2),('だんだん',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','［　］に意味が最も近いものを、一つえらびなさい。

彼の話は［おおげさ］だ。','実際より大きく言う',NULL::text,NULL::text,25,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('実際より大きく言う',NULL::text,0),('とても長い',NULL::text,1),('声が大きい',NULL::text,2),('とてもおもしろい',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','［　］に意味が最も近いものを、一つえらびなさい。

会議の時間を［変更］した。','変えた',NULL::text,NULL::text,26,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('変えた',NULL::text,0),('決めた',NULL::text,1),('知らせた',NULL::text,2),('確かめた',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','［　］に意味が最も近いものを、一つえらびなさい。

彼女は［ほほえんで］いた。','笑って',NULL::text,NULL::text,27,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('笑って',NULL::text,0),('泣いて',NULL::text,1),('怒って',NULL::text,2),('驚いて',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','［　］に意味が最も近いものを、一つえらびなさい。

この靴は［きつい］。','小さすぎる',NULL::text,NULL::text,28,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('小さすぎる',NULL::text,0),('大きすぎる',NULL::text,1),('重すぎる',NULL::text,2),('古すぎる',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','つぎのことばの使い方として最もよいものを、一つえらびなさい。

支度','もうすぐ出かけるので、早く支度をしなさい。',NULL::text,NULL::text,29,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('もうすぐ出かけるので、早く支度をしなさい。',NULL::text,0),('この店は支度が安くておいしい。',NULL::text,1),('彼は毎日、支度に住んでいる。',NULL::text,2),('雨の支度で、試合が中止になった。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','つぎのことばの使い方として最もよいものを、一つえらびなさい。

落ち着く','深呼吸をしたら、気持ちが落ち着いた。',NULL::text,NULL::text,30,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('深呼吸をしたら、気持ちが落ち着いた。',NULL::text,0),('階段から落ち着いて、けがをした。',NULL::text,1),('財布をどこかに落ち着いてしまった。',NULL::text,2),('木の葉が地面に落ち着いた。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','つぎのことばの使い方として最もよいものを、一つえらびなさい。

通り過ぎる','おしゃべりに夢中で、降りる駅を通り過ぎてしまった。',NULL::text,NULL::text,31,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('おしゃべりに夢中で、降りる駅を通り過ぎてしまった。',NULL::text,0),('試験に通り過ぎて、とてもうれしい。',NULL::text,1),('この道は、車がたくさん通り過ぎない。',NULL::text,2),('彼の説明は通り過ぎて、よくわかった。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','つぎのことばの使い方として最もよいものを、一つえらびなさい。

共通','二人には、音楽が好きだという共通の趣味がある。',NULL::text,NULL::text,32,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('二人には、音楽が好きだという共通の趣味がある。',NULL::text,0),('駅まで友達と共通で歩いた。',NULL::text,1),('この部屋は、家族で共通に住んでいる。',NULL::text,2),('彼は共通して、毎朝走っている。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','つぎのことばの使い方として最もよいものを、一つえらびなさい。

明らか','調査の結果、事故の原因が明らかになった。',NULL::text,NULL::text,33,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('調査の結果、事故の原因が明らかになった。',NULL::text,0),('今日は明らかな天気で、気持ちがいい。',NULL::text,1),('この部屋は電気をつけると明らかだ。',NULL::text,2),('彼女は明らかな声で歌った。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','つぎの文の（　）に入れるのに最もよいものを、一つえらびなさい。

毎日少しずつでも、勉強を続ける（　）が大切だ。','こと',NULL::text,NULL::text,34,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('こと',NULL::text,0),('もの',NULL::text,1),('ところ',NULL::text,2),('わけ',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','つぎの文の（　）に入れるのに最もよいものを、一つえらびなさい。

雨が降っている（　）、彼は傘をささずに出かけた。','のに',NULL::text,NULL::text,35,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('のに',NULL::text,0),('ので',NULL::text,1),('から',NULL::text,2),('ために',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','つぎの文の（　）に入れるのに最もよいものを、一つえらびなさい。

日本に来て（　）、もう三年になる。','から',NULL::text,NULL::text,36,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('から',NULL::text,0),('まで',NULL::text,1),('ので',NULL::text,2),('うちに',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','つぎの文の（　）に入れるのに最もよいものを、一つえらびなさい。

彼は医者（　）、病気のことをよく知らない。','のくせに',NULL::text,NULL::text,37,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('のくせに',NULL::text,0),('のおかげで',NULL::text,1),('のために',NULL::text,2),('によって',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','つぎの文の（　）に入れるのに最もよいものを、一つえらびなさい。

テストの結果（　）、クラスが決まる。','によって',NULL::text,NULL::text,38,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('によって',NULL::text,0),('について',NULL::text,1),('に対して',NULL::text,2),('にとって',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','つぎの文の（　）に入れるのに最もよいものを、一つえらびなさい。

冷めない（　）、早く食べてください。','うちに',NULL::text,NULL::text,39,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('うちに',NULL::text,0),('あいだに',NULL::text,1),('までに',NULL::text,2),('ところに',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','つぎの文の（　）に入れるのに最もよいものを、一つえらびなさい。

この仕事は、経験がない人（　）難しいだろう。','には',NULL::text,NULL::text,40,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('には',NULL::text,0),('では',NULL::text,1),('にも',NULL::text,2),('とは',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','つぎの文の（　）に入れるのに最もよいものを、一つえらびなさい。

彼が来る（　）、会議は始められない。','までは',NULL::text,NULL::text,41,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('までは',NULL::text,0),('までに',NULL::text,1),('うちは',NULL::text,2),('ところで',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','つぎの文の（　）に入れるのに最もよいものを、一つえらびなさい。

日本の生活に慣れる（　）、友達も増えてきた。','につれて',NULL::text,NULL::text,42,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('につれて',NULL::text,0),('にとって',NULL::text,1),('において',NULL::text,2),('について',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','つぎの文の（　）に入れるのに最もよいものを、一つえらびなさい。

先生がおっしゃった（　）、来週は休講です。','とおり',NULL::text,NULL::text,43,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('とおり',NULL::text,0),('ばかり',NULL::text,1),('ほど',NULL::text,2),('ため',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','つぎの文の（　）に入れるのに最もよいものを、一つえらびなさい。

A「この資料、私が（　）か。」B「ありがとう。お願いします。」','コピーしましょう',NULL::text,NULL::text,44,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('コピーしましょう',NULL::text,0),('コピーさせましょう',NULL::text,1),('コピーされましょう',NULL::text,2),('コピーしてもらいましょう',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','つぎの文の（　）に入れるのに最もよいものを、一つえらびなさい。

こんなに難しい問題が、小学生に解ける（　）。','はずがない',NULL::text,NULL::text,45,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('はずがない',NULL::text,0),('わけだ',NULL::text,1),('ことだ',NULL::text,2),('ものだ',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','つぎの文の　★　に入る最もよいものを、一つえらびなさい。

これは　＿＿　＿＿　★　＿＿　写真です。
（1 とった　2 旅行　3 で　4 京都）','で',NULL::text,NULL::text,46,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('で',NULL::text,0),('とった',NULL::text,1),('旅行',NULL::text,2),('京都',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','つぎの文の　★　に入る最もよいものを、一つえらびなさい。

この映画は　＿＿　★　＿＿　＿＿　人気がある。
（1 だけでなく　2 子ども　3 にも　4 大人）','だけでなく',NULL::text,NULL::text,47,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('だけでなく',NULL::text,0),('子ども',NULL::text,1),('にも',NULL::text,2),('大人',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','つぎの文の　★　に入る最もよいものを、一つえらびなさい。

明日の試験は　＿＿　＿＿　★　＿＿　自信がない。
（1 合格できる　2 勉強したが　3 かどうか　4 たくさん）','合格できる',NULL::text,NULL::text,48,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('合格できる',NULL::text,0),('勉強したが',NULL::text,1),('かどうか',NULL::text,2),('たくさん',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','つぎの文の　★　に入る最もよいものを、一つえらびなさい。

駅から遠い　＿＿　★　＿＿　＿＿　このアパートは人気がある。
（1 安い　2 家賃が　3 ので　4 けれど）','家賃が',NULL::text,NULL::text,49,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('家賃が',NULL::text,0),('安い',NULL::text,1),('ので',NULL::text,2),('けれど',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','つぎの文の　★　に入る最もよいものを、一つえらびなさい。

彼が会社を辞めた　＿＿　＿＿　★　＿＿　。
（1 誰も　2 理由を　3 いない　4 知る人は）','誰も',NULL::text,NULL::text,50,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('誰も',NULL::text,0),('知る人は',NULL::text,1),('理由を',NULL::text,2),('いない',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
最近、本を読む人が減っていると言われる。しかし、スマートフォンで小説を読む人は増えているそうだ。紙の本が売れなくなっても、文章を読む人が減っているとは限らない。読み方が変わってきているのだ。

質問：筆者が言いたいことは何か。','本の読み方が変わっているだけで、読む人が減ったとは言えない。',NULL::text,NULL::text,51,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('本の読み方が変わっているだけで、読む人が減ったとは言えない。',NULL::text,0),('本を読む人が減っているので、心配だ。',NULL::text,1),('スマートフォンで読むのはよくない。',NULL::text,2),('紙の本の方が読みやすい。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
（お知らせ）
マンションにお住まいの皆様
来週の水曜日、午前九時から午後三時まで、水道の工事を行います。この時間は水が使えません。必要な水は、前の日までにご用意ください。
管理会社

質問：住民は何をしなければならないか。','火曜日までに、必要な水を用意しておく。',NULL::text,NULL::text,52,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('火曜日までに、必要な水を用意しておく。',NULL::text,0),('水曜日に管理会社へ行く。',NULL::text,1),('水曜日の午後三時までに工事をする。',NULL::text,2),('水曜日の朝、水道を止める。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
私は毎日、日記を書いている。特別なことがない日でも、その日に食べたものや天気を書くようにしている。何年かたって読み返すと、忘れていた小さな出来事を思い出して、なつかしい気持ちになるからだ。

質問：「私」が毎日日記を書くのはなぜか。','後で読み返して、忘れていたことを思い出せるから',NULL::text,NULL::text,53,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('後で読み返して、忘れていたことを思い出せるから',NULL::text,0),('特別なことがたくさんあるから',NULL::text,1),('食べたものを記録する必要があるから',NULL::text,2),('天気の変化を調べているから',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
（メール）
山下さん
来週の打ち合わせですが、こちらの都合で、火曜日から木曜日に変更していただけないでしょうか。時間と場所は同じでお願いします。ご迷惑をおかけしますが、よろしくお願いします。
田中

質問：田中さんが山下さんにお願いしていることは何か。','打ち合わせの日を木曜日に変えること',NULL::text,NULL::text,54,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('打ち合わせの日を木曜日に変えること',NULL::text,0),('打ち合わせの時間を変えること',NULL::text,1),('打ち合わせの場所を変えること',NULL::text,2),('打ち合わせをやめること',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
日本では、電車の中で電話をする人はほとんどいない。電車の中で話すと、周りの人に迷惑がかかると考えられているからだ。
私は日本に来たばかりのころ、電車の中で国の友達と電話で話していて、隣の人に注意されたことがある。そのときはとても驚いたが、今では、電車の中は静かな方がいいと思うようになった。疲れて帰るとき、静かな電車の中で休めるのはありがたい。
もちろん、国によって考え方は違う。どちらが正しいということではなく、その国のルールを知って、それに合わせることが大切なのだと思う。

質問：「私」は日本に来たばかりのころ、どんな経験をしたか。','電車の中で電話をしていて、注意された。',NULL::text,NULL::text,55,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('電車の中で電話をしていて、注意された。',NULL::text,0),('電車の中で話しかけられて、驚いた。',NULL::text,1),('電車の中がうるさくて、休めなかった。',NULL::text,2),('電車の乗り方がわからなかった。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
日本では、電車の中で電話をする人はほとんどいない。電車の中で話すと、周りの人に迷惑がかかると考えられているからだ。
私は日本に来たばかりのころ、電車の中で国の友達と電話で話していて、隣の人に注意されたことがある。そのときはとても驚いたが、今では、電車の中は静かな方がいいと思うようになった。疲れて帰るとき、静かな電車の中で休めるのはありがたい。
もちろん、国によって考え方は違う。どちらが正しいということではなく、その国のルールを知って、それに合わせることが大切なのだと思う。

質問：今の「私」は電車の中についてどう思っているか。','静かな方がいいと思っている。',NULL::text,NULL::text,56,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('静かな方がいいと思っている。',NULL::text,0),('電話をしてもいいと思っている。',NULL::text,1),('もっと話をした方がいいと思っている。',NULL::text,2),('ルールが厳しすぎると思っている。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
日本では、電車の中で電話をする人はほとんどいない。電車の中で話すと、周りの人に迷惑がかかると考えられているからだ。
私は日本に来たばかりのころ、電車の中で国の友達と電話で話していて、隣の人に注意されたことがある。そのときはとても驚いたが、今では、電車の中は静かな方がいいと思うようになった。疲れて帰るとき、静かな電車の中で休めるのはありがたい。
もちろん、国によって考え方は違う。どちらが正しいということではなく、その国のルールを知って、それに合わせることが大切なのだと思う。

質問：「私」がいちばん言いたいことは何か。','その国のルールを知って、合わせることが大切だ。',NULL::text,NULL::text,57,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('その国のルールを知って、合わせることが大切だ。',NULL::text,0),('日本のルールがいちばん正しい。',NULL::text,1),('電車の中では電話をしてはいけない。',NULL::text,2),('国によって考え方が違うのは問題だ。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
ある町で、古い空き家を改装して、地域の人が自由に使える「みんなの家」が作られた。お年寄りがお茶を飲みに来たり、子どもたちが宿題をしに来たりする。
この家を始めたのは、近所に住む主婦の佐藤さんだ。「一人暮らしのお年寄りが増えて、話し相手がいない人が多いと気づいたんです」と佐藤さんは言う。
最初は人が集まらず、一日に一人も来ない日もあった。しかし、佐藤さんが毎日家の前で声をかけ続けた結果、今では毎日二十人以上が訪れる。

質問：佐藤さんが「みんなの家」を始めたきっかけは何か。','話し相手がいないお年寄りが多いことに気づいたこと',NULL::text,NULL::text,58,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('話し相手がいないお年寄りが多いことに気づいたこと',NULL::text,0),('子どもたちの勉強する場所がなかったこと',NULL::text,1),('空き家が多くて危なかったこと',NULL::text,2),('自分が一人暮らしで寂しかったこと',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
ある町で、古い空き家を改装して、地域の人が自由に使える「みんなの家」が作られた。お年寄りがお茶を飲みに来たり、子どもたちが宿題をしに来たりする。
この家を始めたのは、近所に住む主婦の佐藤さんだ。「一人暮らしのお年寄りが増えて、話し相手がいない人が多いと気づいたんです」と佐藤さんは言う。
最初は人が集まらず、一日に一人も来ない日もあった。しかし、佐藤さんが毎日家の前で声をかけ続けた結果、今では毎日二十人以上が訪れる。

質問：今、「みんなの家」に人がたくさん来るようになったのはなぜか。','佐藤さんが毎日声をかけ続けたから',NULL::text,NULL::text,59,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('佐藤さんが毎日声をかけ続けたから',NULL::text,0),('家を新しくきれいにしたから',NULL::text,1),('お茶が無料で飲めるから',NULL::text,2),('子どもたちが友達を連れてきたから',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
ある町で、古い空き家を改装して、地域の人が自由に使える「みんなの家」が作られた。お年寄りがお茶を飲みに来たり、子どもたちが宿題をしに来たりする。
この家を始めたのは、近所に住む主婦の佐藤さんだ。「一人暮らしのお年寄りが増えて、話し相手がいない人が多いと気づいたんです」と佐藤さんは言う。
最初は人が集まらず、一日に一人も来ない日もあった。しかし、佐藤さんが毎日家の前で声をかけ続けた結果、今では毎日二十人以上が訪れる。

質問：「みんなの家」について、文章の内容と合っているものはどれか。','始めたころは、人が来ない日もあった。',NULL::text,NULL::text,60,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('始めたころは、人が来ない日もあった。',NULL::text,0),('最初から毎日二十人以上来ていた。',NULL::text,1),('子どもは利用できない。',NULL::text,2),('町が作った施設である。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
（料理教室の案内）
A 和食の基本　月2回（土）10:00〜12:00　月4,000円
B パン作り　月2回（日）13:00〜15:00　月5,000円　※エプロン持参
C 夜のかんたん料理　月4回（水）19:00〜20:30　月6,000円
D 子どもと作るおやつ　月1回（土）14:00〜15:30　1回2,000円（親子1組）
※初めての方は、最初の1回だけ体験できます（体験料1,000円）

質問：平日の夜しか時間がない人が参加できるのはどれか。','C',NULL::text,NULL::text,61,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('C',NULL::text,0),('A',NULL::text,1),('B',NULL::text,2),('D',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
（料理教室の案内）
A 和食の基本　月2回（土）10:00〜12:00　月4,000円
B パン作り　月2回（日）13:00〜15:00　月5,000円　※エプロン持参
C 夜のかんたん料理　月4回（水）19:00〜20:30　月6,000円
D 子どもと作るおやつ　月1回（土）14:00〜15:30　1回2,000円（親子1組）
※初めての方は、最初の1回だけ体験できます（体験料1,000円）

質問：初めての人が、パン作りの教室を一回だけ体験したい。いくら払うか。','1,000円',NULL::text,NULL::text,62,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('1,000円',NULL::text,0),('5,000円',NULL::text,1),('2,500円',NULL::text,2),('6,000円',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','会社で男の人と女の人が話しています。男の人はこのあとまず何をしますか。','資料を印刷する','会社で男の人と女の人が話しています。男の人はこのあとまず何をしますか。
女：明日のお客さん、何人来るか確認した？
男：はい、五人です。会議室も予約しました。
女：ありがとう。お茶の用意は、明日の朝でいいわ。それより、今日中に資料を人数分印刷しておいて。
男：わかりました。すぐやります。
男の人はこのあとまず何をしますか。',NULL::text,63,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('資料を印刷する',NULL::text,0),('会議室を予約する',NULL::text,1),('お茶を用意する',NULL::text,2),('お客さんの人数を確認する',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','大学で女の学生と男の学生が話しています。女の学生は何を持っていきますか。','［図］筆記用具','大学で女の学生と男の学生が話しています。女の学生は何を持っていきますか。
女：明日の実習、何を持っていけばいいんだっけ？
男：白衣と筆記用具。教科書は使わないって先生が言ってたよ。
女：白衣、まだ買ってないんだ。
男：大学で貸してくれるらしいよ。
女：よかった。じゃあ、筆記用具だけだね。
女の学生は何を持っていきますか。',NULL::text,64,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('［図］筆記用具','/media/exam/hikki.svg',0),('［図］白衣と筆記用具','/media/exam/hakui-hikki.svg',1),('［図］教科書','/media/exam/kyokasho.svg',2),('［図］白衣と教科書','/media/exam/hakui-kyokasho.svg',3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','電話で女の人と男の人が話しています。女の人は何時に駅に行きますか。','九時四十五分','電話で女の人と男の人が話しています。女の人は何時に駅に行きますか。
男：明日、駅で十時に会う約束だったけど、少し早くしてもいい？映画が十時十五分に始まるんだ。
女：いいよ。じゃあ、九時半はどう？
男：九時半だと早すぎるかな。九時四十五分にしよう。
女：わかった。
女の人は何時に駅に行きますか。',NULL::text,65,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('九時四十五分',NULL::text,0),('九時半',NULL::text,1),('十時',NULL::text,2),('十時十五分',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','店で男の人と店員が話しています。男の人はどうしますか。','黒いパソコンを今日持って帰る','店で男の人と店員が話しています。男の人はどうしますか。
男：このパソコン、今日持って帰れますか。
店員：申し訳ありません。この色は在庫がなくて、お届けは三日後になります。黒でしたら、今日お持ち帰りいただけますが。
男：色はどちらでもいいので、黒をください。
男の人はどうしますか。',NULL::text,66,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('黒いパソコンを今日持って帰る',NULL::text,0),('三日後に届けてもらう',NULL::text,1),('別の店で買う',NULL::text,2),('買うのをやめる',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','先生が学生に話しています。学生はレポートをどうしなければなりませんか。','パソコンで作り、授業の前にメールで送る','先生が学生に話しています。学生はレポートをどうしなければなりませんか。
先生：レポートは、手で書かずに、パソコンで作ってください。長さはA4で二枚以内です。来週の授業の前までに、メールで送ってください。
学生はレポートをどうしなければなりませんか。',NULL::text,67,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('パソコンで作り、授業の前にメールで送る',NULL::text,0),('手で書いて、授業で出す',NULL::text,1),('パソコンで作り、授業で出す',NULL::text,2),('手で書いて、メールで送る',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','男の人と女の人が話しています。女の人はどうして料理教室に通い始めましたか。','一人暮らしを始めるから','男の人と女の人が話しています。女の人はどうして料理教室に通い始めましたか。
男：料理教室に通ってるんだって？料理が好きなの？
女：そうでもないんだけど、来月から一人暮らしを始めるから、自分で作れるようになりたくて。
男：なるほど。
女の人はどうして料理教室に通い始めましたか。',NULL::text,68,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('一人暮らしを始めるから',NULL::text,0),('料理が好きだから',NULL::text,1),('友達に誘われたから',NULL::text,2),('仕事で必要だから',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','女の人と男の人が話しています。男の人はどうして昨日のパーティーに行きませんでしたか。','財布を落として、交番に行っていたから','女の人と男の人が話しています。男の人はどうして昨日のパーティーに行きませんでしたか。
女：昨日のパーティー、来なかったね。仕事が忙しかったの？
男：仕事は早く終わったんだけど、帰りに財布を落としちゃって、交番に行ってたんだ。
女：えっ、それは大変だったね。
男の人はどうして昨日のパーティーに行きませんでしたか。',NULL::text,69,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('財布を落として、交番に行っていたから',NULL::text,0),('仕事が忙しかったから',NULL::text,1),('体の調子が悪かったから',NULL::text,2),('パーティーのことを忘れていたから',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','ラジオで男の人が話しています。男の人は、よく眠るために何が一番大切だと言っていますか。','毎日同じ時間に起きること','ラジオで男の人が話しています。男の人は、よく眠るために何が一番大切だと言っていますか。
男：よく眠るためには、寝る前にお風呂に入る、温かい飲み物を飲むなど、いろいろな方法があります。でも、一番大切なのは、毎日同じ時間に起きることです。そうすると、自然に夜も眠くなります。
男の人は、よく眠るために何が一番大切だと言っていますか。',NULL::text,70,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('毎日同じ時間に起きること',NULL::text,0),('寝る前にお風呂に入ること',NULL::text,1),('温かい飲み物を飲むこと',NULL::text,2),('早く寝ること',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','女の人と男の人が新しい店について話しています。女の人はこの店のどこがいいと言っていますか。','朝早くから開いていること','女の人と男の人が新しい店について話しています。女の人はこの店のどこがいいと言っていますか。
男：駅前に新しいパン屋ができたね。もう行った？
女：うん、行ったよ。値段はちょっと高いけど、朝七時から開いてるから、仕事の前に寄れるのがいいの。
男：へえ、それは便利だね。
女の人はこの店のどこがいいと言っていますか。',NULL::text,71,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('朝早くから開いていること',NULL::text,0),('値段が安いこと',NULL::text,1),('パンの種類が多いこと',NULL::text,2),('店員が親切なこと',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','男の人と女の人が話しています。男の人の旅行はどうでしたか。','楽しかったが、雨で山に登れなかった','男の人と女の人が話しています。男の人の旅行はどうでしたか。
女：北海道旅行、どうだった？
男：景色はきれいだったし、料理もおいしかったよ。でも、ずっと雨で、予定していた山登りができなかったのが残念だった。
男の人の旅行はどうでしたか。',NULL::text,72,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('楽しかったが、雨で山に登れなかった',NULL::text,0),('天気がよくて、山にも登れた',NULL::text,1),('料理がおいしくなかった',NULL::text,2),('景色が見えなかった',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','テレビで女の人が話しています。女の人は何について話していますか。','お弁当を持っていく人が増えている理由','テレビで女の人が話しています。女の人は何について話していますか。
女：最近、お弁当を持って会社に行く人が増えています。お金の節約になるだけでなく、自分で食べるものを選べるので、健康にもいいからです。前の晩の残り物を入れれば、朝の準備も簡単です。
女の人は何について話していますか。',NULL::text,73,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('お弁当を持っていく人が増えている理由',NULL::text,0),('お弁当の作り方',NULL::text,1),('会社の食堂の問題',NULL::text,2),('朝ご飯の大切さ',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','男の人が話しています。男の人は何について話していますか。','自転車で通勤するよさ','男の人が話しています。男の人は何について話していますか。
男：私は毎朝、会社まで自転車で通っています。最初は大変でしたが、体が丈夫になったし、満員電車に乗らなくていいので、ストレスも減りました。雨の日は大変ですが、これからも続けたいです。
男の人は何について話していますか。',NULL::text,74,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('自転車で通勤するよさ',NULL::text,0),('満員電車の問題',NULL::text,1),('雨の日の過ごし方',NULL::text,2),('体を丈夫にする方法',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','女の先生が学生に話しています。先生は何について話していますか。','新聞の読み方','女の先生が学生に話しています。先生は何について話していますか。
先生：日本語の新聞を読むとき、知らない言葉を全部辞書で調べていませんか。それだと、時間がかかって疲れてしまいます。まずは辞書を使わずに全体を読んで、だいたいの意味をつかむようにしましょう。
先生は何について話していますか。',NULL::text,75,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('新聞の読み方',NULL::text,0),('辞書の選び方',NULL::text,1),('新しい言葉の覚え方',NULL::text,2),('日本語の書き方',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','絵を見ながら質問を聞いてください。→（矢印）の人は何と言いますか。最もよいものを選んでください。','これ、よかったらどうぞ。','友達の家に遊びに行きました。おみやげを渡します。何と言いますか。','/media/exam/n3-omiyage.svg',76,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('これ、よかったらどうぞ。',NULL::text,0),('どうぞ、おかまいなく。',NULL::text,1),('これ、いただきます。',NULL::text,2),('おじゃましました。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','絵を見ながら質問を聞いてください。→（矢印）の人は何と言いますか。最もよいものを選んでください。','すみません、お会計をお願いします。','レストランで、食事が終わりました。お金を払いたいです。何と言いますか。','/media/exam/n3-okaikei.svg',77,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('すみません、お会計をお願いします。',NULL::text,0),('すみません、注文をお願いします。',NULL::text,1),('ごちそうさまでした、また来ます。',NULL::text,2),('いらっしゃいませ。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','絵を見ながら質問を聞いてください。→（矢印）の人は何と言いますか。最もよいものを選んでください。','今日は早く帰ったほうがいいですよ。','同僚がせきをしていて、つらそうです。何と言いますか。','/media/exam/n3-hayaku.svg',78,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('今日は早く帰ったほうがいいですよ。',NULL::text,0),('早く帰ってもいいですか。',NULL::text,1),('お大事にしてもらいました。',NULL::text,2),('かぜをひいてしまいました。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','絵を見ながら質問を聞いてください。→（矢印）の人は何と言いますか。最もよいものを選んでください。','よろしければ、ご伝言を承りましょうか。','電話で、課長はいないと伝えました。相手にどうするか聞きます。何と言いますか。','/media/exam/n3-dengon.svg',79,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('よろしければ、ご伝言を承りましょうか。',NULL::text,0),('課長にお電話していただけますか。',NULL::text,1),('伝言をお願いしてもいいですか。',NULL::text,2),('またお電話しますので、失礼します。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事をえらんでください。','ええ、どうぞ。','すみません、この荷物、ここに置いてもいいですか。',NULL::text,80,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('ええ、どうぞ。',NULL::text,0),('ええ、置きました。',NULL::text,1),('はい、置いてください、すみません。',NULL::text,2),('いいえ、ここです。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事をえらんでください。','確か、十時からだったと思うよ。','明日の会議、何時からだったっけ？',NULL::text,81,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('確か、十時からだったと思うよ。',NULL::text,0),('うん、会議だったよ。',NULL::text,1),('明日じゃなかったよ、ありがとう。',NULL::text,2),('十時までだったっけ。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事をえらんでください。','いいよ。簡単だから、すぐできるよ。','このケーキ、作り方を教えてもらえない？',NULL::text,82,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('いいよ。簡単だから、すぐできるよ。',NULL::text,0),('うん、教えてもらったよ。',NULL::text,1),('ありがとう、作ってあげる。',NULL::text,2),('ううん、食べてないよ。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事をえらんでください。','いいえ。もう体は大丈夫ですか。','先週は休んでしまって、すみませんでした。',NULL::text,83,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('いいえ。もう体は大丈夫ですか。',NULL::text,0),('はい、休みました。',NULL::text,1),('いいえ、休んでください。',NULL::text,2),('どういたしまして、また来週。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事をえらんでください。','うん、いいよ。どうぞ。','このパソコン、ちょっと使わせてもらってもいい？',NULL::text,84,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('うん、いいよ。どうぞ。',NULL::text,0),('うん、使わせてあげたよ。',NULL::text,1),('ありがとう、使わせて。',NULL::text,2),('ううん、使ってないよ。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事をえらんでください。','ええ、何度も行ったことがありますから。','駅までの道、わかりますか。',NULL::text,85,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('ええ、何度も行ったことがありますから。',NULL::text,0),('ええ、道です。',NULL::text,1),('いいえ、わかりました。',NULL::text,2),('じゃあ、教えてあげてください。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事をえらんでください。','うん、この仕事を片付けてから帰るよ。','あれ、まだ残ってたの？',NULL::text,86,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('うん、この仕事を片付けてから帰るよ。',NULL::text,0),('うん、もう帰ったよ。',NULL::text,1),('ううん、残してないよ。',NULL::text,2),('じゃあ、残っててね。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事をえらんでください。','いいね。行こう行こう。','週末、天気がよかったら、海に行かない？',NULL::text,87,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('いいね。行こう行こう。',NULL::text,0),('うん、天気がよかったね。',NULL::text,1),('海には行かなかったよ。',NULL::text,2),('じゃあ、行ったらどう？',NULL::text,3)) AS o(text, img, ord);
-- N2 — Đề thi thử đầy đủ số 1
DELETE FROM "MockExamTemplate" WHERE slug = 'n2-day-du-1';
INSERT INTO "MockExamTemplate" ("slug","level","title","description","sourceMode","durationMinutes","lessonFrom","lessonTo","kanjiLessonFrom","kanjiLessonTo","vocabCount","grammarCount","kanjiCount","listeningWordCount","listeningSentenceCount","passThreshold","scope","isPublished","sortOrder","updatedAt") VALUES ('n2-day-du-1','n2','N2 — Đề thi thử đầy đủ số 1','Đề tự soạn theo đúng cấu trúc JLPT N2: Từ vựng – Kanji, Ngữ pháp (kể cả sắp xếp ★), Đọc hiểu và Nghe.','CUSTOM',155,1,1,1,1,0,0,0,0,0,60,'Đề tự soạn · 85 câu · đủ các phần như đề thật',true,22,CURRENT_TIMESTAMP);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','［　］の言葉の読み方として最もよいものを、一つ選びなさい。

社長の［指示］に従って行動した。','しじ',NULL::text,NULL::text,1,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('しじ',NULL::text,0),('しし',NULL::text,1),('じし',NULL::text,2),('しじつ',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','［　］の言葉の読み方として最もよいものを、一つ選びなさい。

この地域は果物の［栽培］が盛んだ。','さいばい',NULL::text,NULL::text,2,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('さいばい',NULL::text,0),('さいはい',NULL::text,1),('せいばい',NULL::text,2),('さいぼく',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','［　］の言葉の読み方として最もよいものを、一つ選びなさい。

彼の意見はいつも［鋭い］。','するどい',NULL::text,NULL::text,3,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('するどい',NULL::text,0),('かしこい',NULL::text,1),('きびしい',NULL::text,2),('つよい',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','［　］の言葉の読み方として最もよいものを、一つ選びなさい。

資料を［詳しく］読んでおいてください。','くわしく',NULL::text,NULL::text,4,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('くわしく',NULL::text,0),('こまかく',NULL::text,1),('やさしく',NULL::text,2),('ただしく',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','［　］の言葉の読み方として最もよいものを、一つ選びなさい。

雨で試合の開始が［延期］された。','えんき',NULL::text,NULL::text,5,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('えんき',NULL::text,0),('えんぎ',NULL::text,1),('ていき',NULL::text,2),('えいき',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','［　］の言葉を漢字で書くとき、最もよいものを、一つ選びなさい。

新しい商品の［せんでん］に力を入れる。','宣伝',NULL::text,NULL::text,6,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('宣伝',NULL::text,0),('宣云',NULL::text,1),('宜伝',NULL::text,2),('専伝',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','［　］の言葉を漢字で書くとき、最もよいものを、一つ選びなさい。

試験に合格して、両親を［よろこばせた］。','喜ばせた',NULL::text,NULL::text,7,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('喜ばせた',NULL::text,0),('悦ばせた',NULL::text,1),('歓ばせた',NULL::text,2),('慶ばせた',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','［　］の言葉を漢字で書くとき、最もよいものを、一つ選びなさい。

交通［じこ］のニュースを見た。','事故',NULL::text,NULL::text,8,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('事故',NULL::text,0),('事古',NULL::text,1),('自故',NULL::text,2),('時故',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','［　］の言葉を漢字で書くとき、最もよいものを、一つ選びなさい。

機械の［こしょう］で、工場が止まった。','故障',NULL::text,NULL::text,9,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('故障',NULL::text,0),('故章',NULL::text,1),('古障',NULL::text,2),('故傷',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','［　］の言葉を漢字で書くとき、最もよいものを、一つ選びなさい。

友人に本を［かした］。','貸した',NULL::text,NULL::text,10,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('貸した',NULL::text,0),('借した',NULL::text,1),('化した',NULL::text,2),('課した',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','（　）に入れるのに最もよいものを、一つ選びなさい。（語形成）

この小説は、作家が亡くなったため（　）完成のままだ。','未',NULL::text,NULL::text,11,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('未',NULL::text,0),('不',NULL::text,1),('無',NULL::text,2),('非',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','（　）に入れるのに最もよいものを、一つ選びなさい。（語形成）

今年の（　）売上は、去年を上回った。','総',NULL::text,NULL::text,12,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('総',NULL::text,0),('全',NULL::text,1),('多',NULL::text,2),('満',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','（　）に入れるのに最もよいものを、一つ選びなさい。（語形成）

彼の発言は、（　）常識だと批判された。','非',NULL::text,NULL::text,13,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('非',NULL::text,0),('不',NULL::text,1),('無',NULL::text,2),('未',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','（　）に入れるのに最もよいものを、一つ選びなさい。

彼は（　）が強く、一度引き受けた仕事は最後までやり通す。','責任感',NULL::text,NULL::text,14,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('責任感',NULL::text,0),('責任者',NULL::text,1),('無責任',NULL::text,2),('責任上',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','（　）に入れるのに最もよいものを、一つ選びなさい。

彼は会議で（　）意見を述べ、皆を驚かせた。','思い切った',NULL::text,NULL::text,15,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('思い切った',NULL::text,0),('思い出した',NULL::text,1),('思い込んだ',NULL::text,2),('思いついた',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','（　）に入れるのに最もよいものを、一つ選びなさい。

体調を（　）、しばらく仕事を休むことになった。','崩して',NULL::text,NULL::text,16,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('崩して',NULL::text,0),('壊して',NULL::text,1),('倒して',NULL::text,2),('破って',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','（　）に入れるのに最もよいものを、一つ選びなさい。

彼女は細かいところにまで（　）が行き届いている。','気配り',NULL::text,NULL::text,17,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('気配り',NULL::text,0),('気分',NULL::text,1),('気味',NULL::text,2),('気配',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','（　）に入れるのに最もよいものを、一つ選びなさい。

初めての海外旅行では、言葉が通じなくてずいぶん（　）した。','苦労',NULL::text,NULL::text,18,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('苦労',NULL::text,0),('努力',NULL::text,1),('工夫',NULL::text,2),('用心',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','（　）に入れるのに最もよいものを、一つ選びなさい。

計画を（　）に移すまでに、半年かかった。','実行',NULL::text,NULL::text,19,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('実行',NULL::text,0),('実現',NULL::text,1),('実験',NULL::text,2),('実際',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','（　）に入れるのに最もよいものを、一つ選びなさい。

雪で電車が止まり、駅は帰宅する人で（　）していた。','混雑',NULL::text,NULL::text,20,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('混雑',NULL::text,0),('混乱',NULL::text,1),('混合',NULL::text,2),('混同',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','［　］の言葉に意味が最も近いものを、一つ選びなさい。

彼は［たびたび］遅刻する。','何度も',NULL::text,NULL::text,21,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('何度も',NULL::text,0),('ときどき',NULL::text,1),('いつも',NULL::text,2),('ときには',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','［　］の言葉に意味が最も近いものを、一つ選びなさい。

この問題は［ややこしい］。','複雑だ',NULL::text,NULL::text,22,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('複雑だ',NULL::text,0),('簡単だ',NULL::text,1),('重要だ',NULL::text,2),('珍しい',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','［　］の言葉に意味が最も近いものを、一つ選びなさい。

会議は［スムーズに］進んだ。','順調に',NULL::text,NULL::text,23,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('順調に',NULL::text,0),('ゆっくり',NULL::text,1),('急に',NULL::text,2),('静かに',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','［　］の言葉に意味が最も近いものを、一つ選びなさい。

彼の態度に［うんざりした］。','いやになった',NULL::text,NULL::text,24,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('いやになった',NULL::text,0),('感動した',NULL::text,1),('驚いた',NULL::text,2),('安心した',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','［　］の言葉に意味が最も近いものを、一つ選びなさい。

彼女は［とっくに］帰った。','ずっと前に',NULL::text,NULL::text,25,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('ずっと前に',NULL::text,0),('さっき',NULL::text,1),('たった今',NULL::text,2),('もうすぐ',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','次の言葉の使い方として最もよいものを、一つ選びなさい。

矛盾','彼の話には矛盾があって、信じられない。',NULL::text,NULL::text,26,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('彼の話には矛盾があって、信じられない。',NULL::text,0),('この料理は矛盾していて、とてもおいしい。',NULL::text,1),('矛盾な天気が続いて、困っている。',NULL::text,2),('彼は矛盾に仕事をこなす。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','次の言葉の使い方として最もよいものを、一つ選びなさい。

補う','足りない栄養は、サプリメントで補っている。',NULL::text,NULL::text,27,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('足りない栄養は、サプリメントで補っている。',NULL::text,0),('けがをした足を補って、病院へ行った。',NULL::text,1),('友達と駅で補って、一緒に帰った。',NULL::text,2),('古い家を補って、新しく建てた。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','次の言葉の使い方として最もよいものを、一つ選びなさい。

手がかり','事件を解決する手がかりが見つかった。',NULL::text,NULL::text,28,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('事件を解決する手がかりが見つかった。',NULL::text,0),('手がかりがよくて、料理が上手だ。',NULL::text,1),('この手がかりは、とても使いやすい。',NULL::text,2),('彼は手がかりに仕事を手伝ってくれた。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','次の言葉の使い方として最もよいものを、一つ選びなさい。

せめて','旅行は無理でも、せめて週末くらいはゆっくり休みたい。',NULL::text,NULL::text,29,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('旅行は無理でも、せめて週末くらいはゆっくり休みたい。',NULL::text,0),('彼はせめて毎日勉強している。',NULL::text,1),('せめて雨が降ってきて、困った。',NULL::text,2),('このかばんはせめて大きい。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','次の言葉の使い方として最もよいものを、一つ選びなさい。

保存','作ったデータは、こまめに保存しておいたほうがいい。',NULL::text,NULL::text,30,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('作ったデータは、こまめに保存しておいたほうがいい。',NULL::text,0),('彼は自分の意見を最後まで保存した。',NULL::text,1),('古い友人と保存して、話をした。',NULL::text,2),('病気が保存して、入院した。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','次の文の（　）に入れるのに最もよいものを、一つ選びなさい。

日本語が上手になる（　）、毎日練習するしかない。','には',NULL::text,NULL::text,31,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('には',NULL::text,0),('とは',NULL::text,1),('では',NULL::text,2),('のに',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','次の文の（　）に入れるのに最もよいものを、一つ選びなさい。

この店は、味（　）値段（　）、申し分ない。','といい／といい',NULL::text,NULL::text,32,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('といい／といい',NULL::text,0),('とか／とか',NULL::text,1),('やら／やら',NULL::text,2),('なり／なり',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','次の文の（　）に入れるのに最もよいものを、一つ選びなさい。

約束した（　）、最後まで責任を持ってやるべきだ。','以上',NULL::text,NULL::text,33,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('以上',NULL::text,0),('以来',NULL::text,1),('以外',NULL::text,2),('以内',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','次の文の（　）に入れるのに最もよいものを、一つ選びなさい。

彼は忙しい（　）、いつも笑顔で手伝ってくれる。','にもかかわらず',NULL::text,NULL::text,34,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('にもかかわらず',NULL::text,0),('にかかわらず',NULL::text,1),('に限らず',NULL::text,2),('にしたがって',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','次の文の（　）に入れるのに最もよいものを、一つ選びなさい。

この薬は、年齢（　）、誰でも飲むことができる。','を問わず',NULL::text,NULL::text,35,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('を問わず',NULL::text,0),('をめぐって',NULL::text,1),('をはじめ',NULL::text,2),('を通じて',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','次の文の（　）に入れるのに最もよいものを、一つ選びなさい。

試験の結果が心配で、夜も眠れない（　）。','ほどだ',NULL::text,NULL::text,36,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('ほどだ',NULL::text,0),('ものだ',NULL::text,1),('ことだ',NULL::text,2),('わけだ',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','次の文の（　）に入れるのに最もよいものを、一つ選びなさい。

長年住んでいた町を離れるのは、寂しい（　）。','ものがある',NULL::text,NULL::text,37,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('ものがある',NULL::text,0),('ことがある',NULL::text,1),('ものではない',NULL::text,2),('ことになる',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','次の文の（　）に入れるのに最もよいものを、一つ選びなさい。

社長の許可を得た（　）、計画を進めることにした。','うえで',NULL::text,NULL::text,38,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('うえで',NULL::text,0),('うちに',NULL::text,1),('ところ',NULL::text,2),('ばかりに',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','次の文の（　）に入れるのに最もよいものを、一つ選びなさい。

彼の話は、聞けば聞く（　）わからなくなる。','ほど',NULL::text,NULL::text,39,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('ほど',NULL::text,0),('だけ',NULL::text,1),('まで',NULL::text,2),('ばかり',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','次の文の（　）に入れるのに最もよいものを、一つ選びなさい。

子どもの教育（　）、家庭と学校の協力が欠かせない。','に関しては',NULL::text,NULL::text,40,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('に関しては',NULL::text,0),('にこたえて',NULL::text,1),('に比べて',NULL::text,2),('にわたって',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','次の文の（　）に入れるのに最もよいものを、一つ選びなさい。

こちらの資料は、ご自由にお持ち（　）。','ください',NULL::text,NULL::text,41,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('ください',NULL::text,0),('いたします',NULL::text,1),('させてください',NULL::text,2),('いただきます',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','次の文の（　）に入れるのに最もよいものを、一つ選びなさい。

彼がそんなひどいことを言う（　）。何かの間違いだろう。','わけがない',NULL::text,NULL::text,42,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('わけがない',NULL::text,0),('わけだ',NULL::text,1),('わけにはいかない',NULL::text,2),('わけではない',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','次の文の　★　に入る最もよいものを、一つ選びなさい。

この仕事は　＿＿　＿＿　★　＿＿　できるものではない。
（1 一人で　2 経験の　3 浅い　4 人が）','人が',NULL::text,NULL::text,43,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('人が',NULL::text,0),('一人で',NULL::text,1),('経験の',NULL::text,2),('浅い',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','次の文の　★　に入る最もよいものを、一つ選びなさい。

彼女は　＿＿　★　＿＿　＿＿　ピアノを習っている。
（1 ころ　2 子どもの　3 から　4 ずっと）','ころ',NULL::text,NULL::text,44,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('ころ',NULL::text,0),('子どもの',NULL::text,1),('から',NULL::text,2),('ずっと',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','次の文の　★　に入る最もよいものを、一つ選びなさい。

駅前の　＿＿　＿＿　★　＿＿　予約が取れない。
（1 人気が　2 レストランは　3 なかなか　4 あって）','あって',NULL::text,NULL::text,45,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('あって',NULL::text,0),('人気が',NULL::text,1),('レストランは',NULL::text,2),('なかなか',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','次の文の　★　に入る最もよいものを、一つ選びなさい。

先生に　＿＿　★　＿＿　＿＿　、作文がずっとよくなった。
（1 もらった　2 アドバイスの　3 おかげで　4 して）','もらった',NULL::text,NULL::text,46,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('もらった',NULL::text,0),('アドバイスの',NULL::text,1),('おかげで',NULL::text,2),('して',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','次の文の　★　に入る最もよいものを、一つ選びなさい。

このままでは、　＿＿　＿＿　★　＿＿　。
（1 間に合わない　2 締め切りに　3 かもしれない　4 計画の）','間に合わない',NULL::text,NULL::text,47,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('間に合わない',NULL::text,0),('締め切りに',NULL::text,1),('かもしれない',NULL::text,2),('計画の',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
最近、職場で「報告・連絡・相談」が大切だとよく言われる。しかし、上司が忙しそうにしていると、部下はなかなか相談できない。部下に相談してほしいなら、まず上司の側が、話しかけやすい雰囲気を作ることが必要なのではないか。

質問：筆者の考えに合うものはどれか。','部下が相談しやすい雰囲気を、上司が作るべきだ。',NULL::text,NULL::text,48,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('部下が相談しやすい雰囲気を、上司が作るべきだ。',NULL::text,0),('部下はもっと積極的に相談するべきだ。',NULL::text,1),('上司は忙しいので、相談しないほうがいい。',NULL::text,2),('報告や連絡は、相談より大切だ。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
（社内メール）
各位
来月より、出張の交通費の精算方法が変わります。これまでの紙の申請書は廃止し、社内システムから申請していただきます。領収書は、写真を撮ってシステムに添付してください。原本の提出は不要です。
経理部

質問：来月から出張の交通費を精算するとき、どうしなければならないか。','システムで申請し、領収書の写真を添付する。',NULL::text,NULL::text,49,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('システムで申請し、領収書の写真を添付する。',NULL::text,0),('紙の申請書と領収書の原本を出す。',NULL::text,1),('システムで申請し、領収書の原本を経理部に出す。',NULL::text,2),('領収書の写真を経理部にメールで送る。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
旅行の楽しみは、目的地に着いてからだけではない。どこへ行こうか、何を食べようかと計画を立てている時間も、実は旅の一部なのだ。研究によると、人は旅行そのものよりも、旅行を待つ期間に幸せを感じやすいという。

質問：筆者によると、旅行の楽しみとは何か。','旅行の計画を立てて、待っている時間も楽しみの一つだ。',NULL::text,NULL::text,50,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('旅行の計画を立てて、待っている時間も楽しみの一つだ。',NULL::text,0),('目的地に着いてからが、一番の楽しみだ。',NULL::text,1),('計画は立てずに出かけたほうが楽しい。',NULL::text,2),('旅行が終わった後に、思い出すのが楽しい。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
「失敗は成功のもと」という言葉がある。しかし、失敗しただけで、自然に成功に近づくわけではない。なぜ失敗したのかを考え、次に生かしてはじめて、失敗は意味を持つのである。

質問：筆者は失敗についてどう考えているか。','原因を考えて次に生かすことで、失敗に意味が生まれる。',NULL::text,NULL::text,51,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('原因を考えて次に生かすことで、失敗に意味が生まれる。',NULL::text,0),('失敗をすれば、自然に成功に近づく。',NULL::text,1),('失敗はできるだけ避けるべきだ。',NULL::text,2),('失敗の原因は、考えても仕方がない。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
日本では、ペットを「家族の一員」と考える人が増えている。ペットと一緒に泊まれるホテルや、ペット用の保険なども珍しくなくなった。
その一方で、飼い主が高齢になり、ペットの世話ができなくなるという問題も起きている。犬や猫の寿命は延び、二十年近く生きることもある。飼い始めたときは元気でも、最後まで面倒を見られるとは限らないのだ。
ペットを飼う前に、自分の年齢や生活の変化も考えて、最後まで責任を持てるかどうかをよく考えることが大切である。

質問：最近、どんな問題が起きているか。','飼い主が年をとって、ペットの世話ができなくなること',NULL::text,NULL::text,52,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('飼い主が年をとって、ペットの世話ができなくなること',NULL::text,0),('ペットと泊まれるホテルが少ないこと',NULL::text,1),('ペット用の保険が高すぎること',NULL::text,2),('ペットの寿命が短くなっていること',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
日本では、ペットを「家族の一員」と考える人が増えている。ペットと一緒に泊まれるホテルや、ペット用の保険なども珍しくなくなった。
その一方で、飼い主が高齢になり、ペットの世話ができなくなるという問題も起きている。犬や猫の寿命は延び、二十年近く生きることもある。飼い始めたときは元気でも、最後まで面倒を見られるとは限らないのだ。
ペットを飼う前に、自分の年齢や生活の変化も考えて、最後まで責任を持てるかどうかをよく考えることが大切である。

質問：「最後まで面倒を見られるとは限らない」のはなぜか。','ペットが長生きし、飼い主の生活や体が変わることがあるから',NULL::text,NULL::text,53,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('ペットが長生きし、飼い主の生活や体が変わることがあるから',NULL::text,0),('ペットが病気になりやすいから',NULL::text,1),('ペット用の保険がないから',NULL::text,2),('ペットが家族と考えられていないから',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
日本では、ペットを「家族の一員」と考える人が増えている。ペットと一緒に泊まれるホテルや、ペット用の保険なども珍しくなくなった。
その一方で、飼い主が高齢になり、ペットの世話ができなくなるという問題も起きている。犬や猫の寿命は延び、二十年近く生きることもある。飼い始めたときは元気でも、最後まで面倒を見られるとは限らないのだ。
ペットを飼う前に、自分の年齢や生活の変化も考えて、最後まで責任を持てるかどうかをよく考えることが大切である。

質問：筆者が最も言いたいことは何か。','ペットを飼う前に、最後まで責任を持てるかよく考えるべきだ。',NULL::text,NULL::text,54,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('ペットを飼う前に、最後まで責任を持てるかよく考えるべきだ。',NULL::text,0),('ペットは家族の一員として大切にするべきだ。',NULL::text,1),('高齢者はペットを飼うべきではない。',NULL::text,2),('ペット用のサービスをもっと増やすべきだ。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
子どものころ、私は本を読むのが苦手だった。字を追っているうちに眠くなってしまうのだ。そんな私を変えたのは、中学の国語の先生だった。
先生は授業の始めに、毎回十分間、本を読んで聞かせてくれた。続きが気になるところで必ず終わるので、私たちは次の授業を楽しみに待った。そのうち、待ちきれなくなった私は、図書館でその本を借りて、自分で読んでしまった。
今思えば、あれは先生の作戦だったのだろう。「読みなさい」と言われるよりも、「続きが知りたい」という気持ちのほうが、人を動かすのである。

質問：先生は授業の始めに何をしたか。','本を読んで聞かせた。',NULL::text,NULL::text,55,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('本を読んで聞かせた。',NULL::text,0),('本を読む時間をとった。',NULL::text,1),('図書館に連れて行った。',NULL::text,2),('本の感想を書かせた。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
子どものころ、私は本を読むのが苦手だった。字を追っているうちに眠くなってしまうのだ。そんな私を変えたのは、中学の国語の先生だった。
先生は授業の始めに、毎回十分間、本を読んで聞かせてくれた。続きが気になるところで必ず終わるので、私たちは次の授業を楽しみに待った。そのうち、待ちきれなくなった私は、図書館でその本を借りて、自分で読んでしまった。
今思えば、あれは先生の作戦だったのだろう。「読みなさい」と言われるよりも、「続きが知りたい」という気持ちのほうが、人を動かすのである。

質問：「あれは先生の作戦だった」とあるが、どんな作戦か。','続きを知りたい気持ちにさせて、自分から本を読ませる作戦',NULL::text,NULL::text,56,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('続きを知りたい気持ちにさせて、自分から本を読ませる作戦',NULL::text,0),('授業を早く終わらせる作戦',NULL::text,1),('図書館の本を借りさせる作戦',NULL::text,2),('眠くならないように話をする作戦',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
子どものころ、私は本を読むのが苦手だった。字を追っているうちに眠くなってしまうのだ。そんな私を変えたのは、中学の国語の先生だった。
先生は授業の始めに、毎回十分間、本を読んで聞かせてくれた。続きが気になるところで必ず終わるので、私たちは次の授業を楽しみに待った。そのうち、待ちきれなくなった私は、図書館でその本を借りて、自分で読んでしまった。
今思えば、あれは先生の作戦だったのだろう。「読みなさい」と言われるよりも、「続きが知りたい」という気持ちのほうが、人を動かすのである。

質問：筆者が最も言いたいことは何か。','命令されるより、知りたいという気持ちのほうが人を動かす。',NULL::text,NULL::text,57,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('命令されるより、知りたいという気持ちのほうが人を動かす。',NULL::text,0),('子どもは本を読むのが苦手だ。',NULL::text,1),('国語の授業では本を読み聞かせるべきだ。',NULL::text,2),('図書館をもっと利用するべきだ。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
A：小学生にスマートフォンを持たせることには賛成だ。何かあったときにすぐ連絡がとれるし、位置もわかるので安心だ。ただ、使う時間は家庭でルールを決める必要がある。
B：小学生にスマートフォンはまだ早いと思う。ゲームや動画に夢中になって、勉強や睡眠の時間が減ってしまうおそれがある。連絡のためなら、通話だけできる簡単な携帯電話で十分だ。

質問：AとBは、小学生とスマートフォンについてどのように述べているか。','Aは安全のために賛成し、Bは使いすぎを心配して反対している。',NULL::text,NULL::text,58,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('Aは安全のために賛成し、Bは使いすぎを心配して反対している。',NULL::text,0),('AもBも、安全のために持たせるべきだと述べている。',NULL::text,1),('Aは反対し、Bは条件つきで賛成している。',NULL::text,2),('AもBも、使う時間のルールは不要だと述べている。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
A：小学生にスマートフォンを持たせることには賛成だ。何かあったときにすぐ連絡がとれるし、位置もわかるので安心だ。ただ、使う時間は家庭でルールを決める必要がある。
B：小学生にスマートフォンはまだ早いと思う。ゲームや動画に夢中になって、勉強や睡眠の時間が減ってしまうおそれがある。連絡のためなら、通話だけできる簡単な携帯電話で十分だ。

質問：AとBのどちらも触れていることは何か。','子どもと連絡をとること',NULL::text,NULL::text,59,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('子どもと連絡をとること',NULL::text,0),('勉強の時間が減ること',NULL::text,1),('位置がわかること',NULL::text,2),('ゲームに夢中になること',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
（市民プールの利用案内）
・営業時間：9:00〜21:00（月曜休館）
・料金：大人 600円／中学生以下 300円／65歳以上 400円
・回数券（11回分）：大人 6,000円
・17:00以降は、大人料金が 400円になります

質問：会社員の木村さん（35歳）が、平日の仕事の後、18時ごろに一回泳ぐ場合、料金はいくらか。','400円',NULL::text,NULL::text,60,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('400円',NULL::text,0),('600円',NULL::text,1),('300円',NULL::text,2),('6,000円',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
（市民プールの利用案内）
・営業時間：9:00〜21:00（月曜休館）
・料金：大人 600円／中学生以下 300円／65歳以上 400円
・回数券（11回分）：大人 6,000円
・17:00以降は、大人料金が 400円になります

質問：この案内の内容と合っているものはどれか。','月曜日はプールを利用できない。',NULL::text,NULL::text,61,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('月曜日はプールを利用できない。',NULL::text,0),('65歳以上は無料である。',NULL::text,1),('回数券は中学生も大人と同じ料金だ。',NULL::text,2),('営業時間は毎日21時までで休みはない。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','会社で女の人と男の人が話しています。男の人はこのあと何をしますか。','パンフレットをブースごとに分ける','会社で女の人と男の人が話しています。男の人はこのあと何をしますか。
女：来週の展示会のパンフレット、何部届いた？
男：五百部です。
女：足りるかな。去年は七百人ぐらい来たのよ。
男：じゃあ、追加で注文しましょうか。
女：注文は私がするから、あなたは届いた分をブースごとに分けておいて。
男の人はこのあと何をしますか。',NULL::text,62,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('パンフレットをブースごとに分ける',NULL::text,0),('パンフレットを追加で注文する',NULL::text,1),('展示会に行く',NULL::text,2),('去年の来場者数を調べる',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','大学で男の学生と事務の人が話しています。男の学生はこのあとまず何をしますか。','先生に推薦状を頼む','大学で男の学生と事務の人が話しています。男の学生はこのあとまず何をしますか。
男：奨学金の申し込みをしたいんですが。
女：はい。申込書と成績証明書、それから推薦状が必要です。
男：推薦状は先生に頼めばいいんですか。
女：はい。ただ、先生に書いていただくのに一週間ほどかかりますから、締め切りに間に合うように、まずそちらをお願いしてください。
男の学生はこのあとまず何をしますか。',NULL::text,63,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('先生に推薦状を頼む',NULL::text,0),('申込書を書く',NULL::text,1),('成績証明書をもらう',NULL::text,2),('事務の人に書類を出す',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','電話で女の人と男の人が話しています。女の人は何をしなければなりませんか。','予約番号をメールで送る','電話で女の人と男の人が話しています。女の人は何をしなければなりませんか。
男：お電話ありがとうございます。○○ホテルです。
女：来週の予約を、二名から三名に変更したいんですが。
男：かしこまりました。お部屋はそのままで、追加のベッドをご用意できます。ただ、三名様ですと朝食の追加料金がかかりますが。
女：大丈夫です。
男：では、ご予約番号を後ほどメールでお送りいただけますか。
女の人は何をしなければなりませんか。',NULL::text,64,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('予約番号をメールで送る',NULL::text,0),('部屋を変更する',NULL::text,1),('追加のベッドを予約する',NULL::text,2),('朝食の料金を払いに行く',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','会社で男の人と女の人が話しています。女の人はプレゼンテーションをどう直しますか。','細かいデータは資料に入れ、要点だけ話す','会社で男の人と女の人が話しています。女の人はプレゼンテーションをどう直しますか。
男：明日のプレゼン、一度通して見せてもらったけど、ちょっと長いね。
女：二十分の予定が、三十分近くかかってしまいました。
男：説明はわかりやすいから、細かいデータのところを資料に回して、話すのは要点だけにしたら？
女：わかりました。そうします。
女の人はプレゼンテーションをどう直しますか。',NULL::text,65,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('細かいデータは資料に入れ、要点だけ話す',NULL::text,0),('説明をもっとわかりやすくする',NULL::text,1),('データを増やす',NULL::text,2),('プレゼンの時間を延ばしてもらう',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','店で女の人と店員が話しています。女の人はどのコースを選びますか。','パンのコース','店で女の人と店員が話しています。女の人はどのコースを選びますか。
女：料理教室に申し込みたいんですが、どんなコースがありますか。
店員：和食、パン、お菓子の三つです。和食は土曜日、パンとお菓子は平日の夜です。
女：週末は子どもの世話があるので、平日がいいですね。お菓子は甘いものが苦手なので…。
店員：では、こちらになりますね。
女の人はどのコースを選びますか。',NULL::text,66,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('パンのコース',NULL::text,0),('和食のコース',NULL::text,1),('お菓子のコース',NULL::text,2),('まだ選んでいない',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','男の人と女の人が話しています。男の人が引っ越しをやめた一番の理由は何ですか。','会社まで遠すぎるから','男の人と女の人が話しています。男の人が引っ越しをやめた一番の理由は何ですか。
女：引っ越すって言ってたけど、やめたの？
男：うん。新しい部屋は広いし、家賃も安かったんだけど。
女：じゃあ、どうして？
男：会社まで一時間半もかかるんだよ。毎日それは無理だと思って。
男の人が引っ越しをやめた一番の理由は何ですか。',NULL::text,67,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('会社まで遠すぎるから',NULL::text,0),('部屋が狭いから',NULL::text,1),('家賃が高いから',NULL::text,2),('大家さんが厳しいから',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','ラジオで女の人が話しています。女の人は、この町の観光客が増えた一番の理由は何だと言っていますか。','町を舞台にした映画がヒットしたから','ラジオで女の人が話しています。女の人は、この町の観光客が増えた一番の理由は何だと言っていますか。
女：この町では、ここ数年、観光客が大幅に増えています。新しい駅ができて交通が便利になったこともありますが、一番大きいのは、町の古い町並みを舞台にした映画が大ヒットしたことです。映画を見て、実際に訪れたいと思う人が多かったのです。
女の人は、この町の観光客が増えた一番の理由は何だと言っていますか。',NULL::text,68,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('町を舞台にした映画がヒットしたから',NULL::text,0),('新しい駅ができたから',NULL::text,1),('古い町並みが新しくなったから',NULL::text,2),('宿泊料金が安くなったから',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','男の人と女の人が話しています。女の人は、新しい仕事のどこが大変だと言っていますか。','出張が多いこと','男の人と女の人が話しています。女の人は、新しい仕事のどこが大変だと言っていますか。
男：新しい仕事、どう？
女：職場の人は親切だし、仕事の内容も面白いよ。
男：よかったね。
女：ただ、毎週のように出張があって、なかなか家でゆっくりできないのがね。
女の人は、新しい仕事のどこが大変だと言っていますか。',NULL::text,69,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('出張が多いこと',NULL::text,0),('職場の人が厳しいこと',NULL::text,1),('仕事がつまらないこと',NULL::text,2),('給料が安いこと',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','テレビで医者が話しています。医者は、運動を長く続けるために何が一番大切だと言っていますか。','楽しいと思える運動を選ぶこと','テレビで医者が話しています。医者は、運動を長く続けるために何が一番大切だと言っていますか。
男：運動を始めても、続かない人が多いですね。最初から目標を高くしすぎると、つらくなってやめてしまいます。大切なのは、自分が楽しいと思える運動を選ぶことです。楽しければ、自然に続けられます。
医者は、運動を長く続けるために何が一番大切だと言っていますか。',NULL::text,70,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('楽しいと思える運動を選ぶこと',NULL::text,0),('高い目標を立てること',NULL::text,1),('毎日長い時間運動すること',NULL::text,2),('友達と一緒に運動すること',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','女の人が講演で話しています。女の人は、外国語を学ぶよさは何だと言っていますか。','自分の国の言葉や文化を外から見られること','女の人が講演で話しています。女の人は、外国語を学ぶよさは何だと言っていますか。
女：外国語を学ぶと、仕事の幅が広がるとよく言われます。それも確かですが、私が一番よかったと思うのは、自分の国の言葉や文化を、外から見られるようになったことです。当たり前だと思っていたことが、実は当たり前ではないと気づけたのです。
女の人は、外国語を学ぶよさは何だと言っていますか。',NULL::text,71,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('自分の国の言葉や文化を外から見られること',NULL::text,0),('仕事の幅が広がること',NULL::text,1),('外国人の友達が増えること',NULL::text,2),('海外旅行が楽しくなること',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','テレビで専門家が話しています。専門家は何について話していますか。','災害に備えて準備しておくこと','テレビで専門家が話しています。専門家は何について話していますか。
男：最近、地震や大雨などの災害が増えています。いざというときのために、水や食料を三日分は用意しておきましょう。また、家族とどこに集まるか、どうやって連絡をとるかを、前もって話し合っておくことも大切です。
専門家は何について話していますか。',NULL::text,72,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('災害に備えて準備しておくこと',NULL::text,0),('地震が起きる理由',NULL::text,1),('大雨の予報の見方',NULL::text,2),('家族で旅行する方法',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','大学の授業で先生が話しています。先生は何について話していますか。','インターネットの情報を使うときの注意','大学の授業で先生が話しています。先生は何について話していますか。
女：レポートを書くとき、インターネットの情報をそのまま使う人がいますが、注意が必要です。誰が書いたのかわからない情報も多いからです。必ず、本や公的な機関の資料など、信頼できる情報と照らし合わせて確認するようにしてください。
先生は何について話していますか。',NULL::text,73,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('インターネットの情報を使うときの注意',NULL::text,0),('レポートの書き方の基本',NULL::text,1),('図書館の使い方',NULL::text,2),('インターネットの便利さ',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','男の人が話しています。男の人の話のテーマは何ですか。','ボランティアが自分の元気にもなること','男の人が話しています。男の人の話のテーマは何ですか。
男：私は定年退職してから、地域のボランティアを始めました。最初は時間をつぶすつもりでしたが、子どもたちに昔の遊びを教えていると、自分のほうが元気をもらっていることに気づきました。人の役に立つことは、自分のためにもなるのです。
男の人の話のテーマは何ですか。',NULL::text,74,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('ボランティアが自分の元気にもなること',NULL::text,0),('定年後の時間の使い方の問題',NULL::text,1),('昔の遊びの種類',NULL::text,2),('子どもの教育の方法',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','ラジオで女の人が話しています。女の人は何について話していますか。','「もったいない」という考え方と環境との関係','ラジオで女の人が話しています。女の人は何について話していますか。
女：「もったいない」という言葉は、海外でも知られるようになりました。物を最後まで大切に使う、という日本人の考え方を表しています。食べ物を残さない、壊れたものを直して使う。そんな小さな習慣が、環境を守ることにもつながっているのです。
女の人は何について話していますか。',NULL::text,75,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('「もったいない」という考え方と環境との関係',NULL::text,0),('日本語の言葉の覚え方',NULL::text,1),('壊れたものの直し方',NULL::text,2),('海外で人気の日本料理',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','はい、帰る前に必ずお渡しします。','この書類、今日中に部長に渡しておいてもらえる？',NULL::text,76,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('はい、帰る前に必ずお渡しします。',NULL::text,0),('はい、部長にもらいました。',NULL::text,1),('いいえ、今日はいません。',NULL::text,2),('じゃあ、渡してもらいます。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','本当だ。定休日だったみたいだね。','せっかく来たのに、お店、閉まってるね。',NULL::text,77,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('本当だ。定休日だったみたいだね。',NULL::text,0),('うん、開いててよかったね。',NULL::text,1),('じゃあ、入ろうか。',NULL::text,2),('せっかくだから、閉めておこう。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','えっ、本当ですか。全然知りませんでした。','佐藤さん、来月で会社を辞めるらしいですよ。',NULL::text,78,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('えっ、本当ですか。全然知りませんでした。',NULL::text,0),('はい、辞めさせました。',NULL::text,1),('じゃあ、来月に来ます。',NULL::text,2),('いいえ、辞めていません。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','じゃあ、業者に連絡してみます。','このコピー機、さっきから調子が悪いんだけど。',NULL::text,79,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('じゃあ、業者に連絡してみます。',NULL::text,0),('はい、とても調子がいいですね。',NULL::text,1),('コピーしておきました。',NULL::text,2),('いいえ、悪くないです、ありがとう。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','お疲れさまでした。','お先に失礼します。',NULL::text,80,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('お疲れさまでした。',NULL::text,0),('ただいま。',NULL::text,1),('いってらっしゃい。',NULL::text,2),('お先にどうぞ。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','いいですね。彼なら安心です。','今度の企画、田中さんに任せてみてはどうかな。',NULL::text,81,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('いいですね。彼なら安心です。',NULL::text,0),('はい、任せてもらいました。',NULL::text,1),('いいえ、田中さんはいません。',NULL::text,2),('じゃあ、私がやりました。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','じゃあ、キャンプは来週にしようか。','週末の天気、崩れるみたいだよ。',NULL::text,82,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('じゃあ、キャンプは来週にしようか。',NULL::text,0),('よかった、晴れるんだね。',NULL::text,1),('うん、崩しておいたよ。',NULL::text,2),('じゃあ、海に行こう。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','大変でしたね。まだ始まったばかりですから、大丈夫ですよ。','遅れて申し訳ありません。電車が止まってしまって。',NULL::text,83,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('大変でしたね。まだ始まったばかりですから、大丈夫ですよ。',NULL::text,0),('はい、遅れてください。',NULL::text,1),('じゃあ、電車を止めましょう。',NULL::text,2),('いいえ、申し訳ありません。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','三人が新しい店の場所について話しています。どこに決まりましたか。','住宅街','三人が新しい店の場所について話しています。どこに決まりましたか。
男：候補は、駅前、大学の近く、住宅街の三つだね。
女1：駅前は人が多いけど、家賃がすごく高いですよ。
女2：大学の近くなら、若いお客さんが来てくれそうです。でも、夏休みや春休みは学生がいなくなりますね。
女1：住宅街なら家賃も安いし、家族連れが一年中来てくれると思います。
男：うちの店は家族向けのメニューが多いから、そこがいいね。
どこに決まりましたか。',NULL::text,84,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('住宅街',NULL::text,0),('駅前',NULL::text,1),('大学の近く',NULL::text,2),('まだ決まっていない',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','夫婦が子どもの習い事について話しています。何を習わせることにしましたか。','ピアノ','夫婦が子どもの習い事について話しています。何を習わせることにしましたか。
妻：水泳、英会話、ピアノ、どれがいいかしら。
夫：水泳は体が丈夫になるし、いいんじゃないか。
妻：でも、あの子、水が怖いって言ってたわよ。
夫：そうか。英会話は？
妻：本人は、友達が習ってるピアノをやりたいって。
夫：本人がやりたいなら、それが一番続くだろう。そうしよう。
何を習わせることにしましたか。',NULL::text,85,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('ピアノ',NULL::text,0),('水泳',NULL::text,1),('英会話',NULL::text,2),('水泳と英会話',NULL::text,3)) AS o(text, img, ord);
-- N5 — Luyện nghe (15 câu)
DELETE FROM "MockExamTemplate" WHERE slug = 'n5-luyen-nghe';
INSERT INTO "MockExamTemplate" ("slug","level","title","description","sourceMode","durationMinutes","lessonFrom","lessonTo","kanjiLessonFrom","kanjiLessonTo","vocabCount","grammarCount","kanjiCount","listeningWordCount","listeningSentenceCount","passThreshold","scope","isPublished","sortOrder","updatedAt") VALUES ('n5-luyen-nghe','n5','N5 — Luyện nghe (15 câu)','15 câu nghe N5: hiểu nhiệm vụ, nắm ý chính và phản xạ trả lời. Mỗi đoạn được nghe tối đa 3 lần.','CUSTOM',15,1,1,1,1,0,0,0,0,0,60,'Chỉ phần Nghe · đề tự soạn',true,23,CURRENT_TIMESTAMP);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','おとこの 人と おんなの 人が はなして います。ふたりは なにで いきますか。','［図］でんしゃ','おとこの 人と おんなの 人が はなして います。ふたりは なにで いきますか。
おとこ：あした、バスで いきましょうか。
おんな：バスは じかんが かかりますから、でんしゃで いきましょう。
おとこ：はい、そう しましょう。
ふたりは なにで いきますか。',NULL::text,1,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('［図］でんしゃ','/media/exam/densha.svg',0),('［図］バス','/media/exam/basu.svg',1),('［図］タクシー','/media/exam/takushi.svg',2),('［図］じてんしゃ','/media/exam/jitensha.svg',3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','おんなの 人が はなして います。おんなの 人は きのうの ごご なにを しましたか。','かいものに いった','おんなの 人が はなして います。おんなの 人は きのうの ごご なにを しましたか。
おんな：きのうは ごぜん、へやを そうじしました。ごごは ともだちと かいものに いきました。
おんなの 人は きのうの ごご なにを しましたか。',NULL::text,2,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('かいものに いった',NULL::text,0),('へやを そうじした',NULL::text,1),('えいがを みた',NULL::text,2),('うちで ねた',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','おとこの 人と おんなの 人が はなして います。おとこの 人は なにを のみますか。','こうちゃ','おとこの 人と おんなの 人が はなして います。おとこの 人は なにを のみますか。
おんな：コーヒーと こうちゃと ジュースが ありますよ。
おとこ：コーヒーは よる ねられませんから、こうちゃを ください。
おとこの 人は なにを のみますか。',NULL::text,3,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('こうちゃ',NULL::text,0),('コーヒー',NULL::text,1),('ジュース',NULL::text,2),('みず',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','せんせいが はなして います。がくせいは あした なにを もって きますか。','えんぴつと けしゴム','せんせいが はなして います。がくせいは あした なにを もって きますか。
せんせい：あしたは えを かきます。えんぴつと けしゴムを もって きて ください。かみは がっこうに あります。
がくせいは あした なにを もって きますか。',NULL::text,4,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('えんぴつと けしゴム',NULL::text,0),('えんぴつと かみ',NULL::text,1),('かみと けしゴム',NULL::text,2),('ほんと ノート',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','おとこの 人と おんなの 人が はなして います。おんなの 人の たんじょうびは いつですか。','三月 八日','おとこの 人と おんなの 人が はなして います。おんなの 人の たんじょうびは いつですか。
おとこ：たんじょうびは いつですか。
おんな：三月 八日です。
おとこ：あ、らいしゅうですね。
おんなの 人の たんじょうびは いつですか。',NULL::text,5,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('三月 八日',NULL::text,0),('三月 四日',NULL::text,1),('四月 八日',NULL::text,2),('八月 三日',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','みせで おんなの 人と みせの 人が はなして います。おんなの 人は いくら はらいますか。','三百五十えん','みせで おんなの 人と みせの 人が はなして います。おんなの 人は いくら はらいますか。
おんな：りんごを みっつ ください。
みせの 人：ひとつ 百えんです。
おんな：じゃあ、みかんも ひとつ ください。
みせの 人：みかんは 五十えんです。
おんなの 人は いくら はらいますか。',NULL::text,6,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('三百五十えん',NULL::text,0),('三百えん',NULL::text,1),('百五十えん',NULL::text,2),('四百えん',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','おとこの 人と おんなの 人が はなして います。おとこの 人の へやは なんがいですか。','四かい','おとこの 人と おんなの 人が はなして います。おとこの 人の へやは なんがいですか。
おんな：たなかさんの へやは 三がいですか。
おとこ：いいえ、三がいは やまださんの へやです。わたしの へやは その うえです。
おとこの 人の へやは なんがいですか。',NULL::text,7,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('四かい',NULL::text,0),('三がい',NULL::text,1),('二かい',NULL::text,2),('五かい',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','おんなの 人と おとこの 人が はなして います。おとこの 人は どうして げんきが ありませんか。','ねむいから','おんなの 人と おとこの 人が はなして います。おとこの 人は どうして げんきが ありませんか。
おんな：げんきが ありませんね。びょうきですか。
おとこ：いいえ、きのう おそくまで しごとを しましたから、ねむいんです。
おとこの 人は どうして げんきが ありませんか。',NULL::text,8,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('ねむいから',NULL::text,0),('びょうきだから',NULL::text,1),('おなかが いたいから',NULL::text,2),('しごとが ないから',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','えなどは ありません。ぶんを きいて、いちばん いい こたえを えらんで ください。','こちらこそ、どうぞ よろしく。','はじめまして。どうぞ よろしく。',NULL::text,9,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('こちらこそ、どうぞ よろしく。',NULL::text,0),('いただきます。',NULL::text,1),('さようなら。',NULL::text,2),('おかげさまで。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','えなどは ありません。ぶんを きいて、いちばん いい こたえを えらんで ください。','三時はんです。','いま なんじですか。',NULL::text,10,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('三時はんです。',NULL::text,0),('三じかんです。',NULL::text,1),('すいようびです。',NULL::text,2),('あしたです。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','えなどは ありません。ぶんを きいて、いちばん いい こたえを えらんで ください。','百二十えんです。','この りんご、ひとつ いくらですか。',NULL::text,11,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('百二十えんです。',NULL::text,0),('みっつです。',NULL::text,1),('あかいです。',NULL::text,2),('おいしいです。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','えなどは ありません。ぶんを きいて、いちばん いい こたえを えらんで ください。','いってらっしゃい。','いってきます。',NULL::text,12,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('いってらっしゃい。',NULL::text,0),('おかえりなさい。',NULL::text,1),('ただいま。',NULL::text,2),('おやすみなさい。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','えなどは ありません。ぶんを きいて、いちばん いい こたえを えらんで ください。','ともだちと テニスを しました。','しゅうまつ、なにを しましたか。',NULL::text,13,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('ともだちと テニスを しました。',NULL::text,0),('テニスが すきです。',NULL::text,1),('らいしゅう します。',NULL::text,2),('ともだちは げんきです。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','えなどは ありません。ぶんを きいて、いちばん いい こたえを えらんで ください。','はい、どうぞ。','すみません、えんぴつを かして ください。',NULL::text,14,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('はい、どうぞ。',NULL::text,0),('はい、かりました。',NULL::text,1),('いいえ、えんぴつです。',NULL::text,2),('どういたしまして。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','えなどは ありません。ぶんを きいて、いちばん いい こたえを えらんで ください。','とうきょうです。','どこに すんで いますか。',NULL::text,15,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n5-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('とうきょうです。',NULL::text,0),('でんしゃで きました。',NULL::text,1),('ひとりです。',NULL::text,2),('きのう きました。',NULL::text,3)) AS o(text, img, ord);
-- N4 — Luyện nghe (15 câu)
DELETE FROM "MockExamTemplate" WHERE slug = 'n4-luyen-nghe';
INSERT INTO "MockExamTemplate" ("slug","level","title","description","sourceMode","durationMinutes","lessonFrom","lessonTo","kanjiLessonFrom","kanjiLessonTo","vocabCount","grammarCount","kanjiCount","listeningWordCount","listeningSentenceCount","passThreshold","scope","isPublished","sortOrder","updatedAt") VALUES ('n4-luyen-nghe','n4','N4 — Luyện nghe (15 câu)','15 câu nghe N4: hiểu nhiệm vụ, nắm ý chính và phản xạ trả lời. Mỗi đoạn được nghe tối đa 3 lần.','CUSTOM',20,1,1,1,1,0,0,0,0,0,60,'Chỉ phần Nghe · đề tự soạn',true,24,CURRENT_TIMESTAMP);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','会社で 女の 人と 男の 人が 話して います。男の 人は このあと 何を しますか。','いすを ならべる','会社で 女の 人と 男の 人が 話して います。男の 人は このあと まず 何を しますか。
女：すみません、会議室の いすを 十こ ならべて ください。
男：はい。テーブルも うごかしますか。
女：テーブルは もう うごかしました。いすの あとで、まどを あけて ください。
男の 人は このあと まず 何を しますか。',NULL::text,1,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('いすを ならべる',NULL::text,0),('テーブルを うごかす',NULL::text,1),('まどを あける',NULL::text,2),('会議に 出る',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','男の 学生と 女の 学生が 話して います。二人は 何時に 会いますか。','二時','男の 学生と 女の 学生が 話して います。二人は 何時に 会いますか。
男：あした、図書館の 前で 一時に 会おうか。
女：ごめん、午前中 アルバイトが あって、一時は ちょっと…。二時なら 大丈夫。
男：じゃあ、二時に しよう。
二人は 何時に 会いますか。',NULL::text,2,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('二時',NULL::text,0),('一時',NULL::text,1),('午前中',NULL::text,2),('三時',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','女の 人と 店の 人が 話して います。女の 人は どれを 買いますか。','大きい 白い セーター','女の 人と 店の 人が 話して います。女の 人は どれを 買いますか。
女：この 赤い セーター、もう少し 大きいのは ありますか。
店の 人：赤は この サイズだけです。白と 黒なら 大きいのが ございます。
女：じゃあ、白を ください。
女の 人は どれを 買いますか。',NULL::text,3,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('大きい 白い セーター',NULL::text,0),('大きい 赤い セーター',NULL::text,1),('大きい 黒い セーター',NULL::text,2),('小さい 赤い セーター',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','男の 人と 女の 人が 話して います。男の 人は 日曜日に 何を しますか。','家族と 食事を する','男の 人と 女の 人が 話して います。男の 人は 日曜日に 何を しますか。
女：日曜日、いっしょに えいがを 見に 行かない？
男：行きたいけど、日曜日は 母の たんじょうびなんだ。家族で 食事を するんだ。
女：そう。じゃあ、また 今度ね。
男の 人は 日曜日に 何を しますか。',NULL::text,4,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('家族と 食事を する',NULL::text,0),('えいがを 見に 行く',NULL::text,1),('アルバイトを する',NULL::text,2),('母と 買い物に 行く',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','先生が 学生に 話して います。あした 学生は 何時までに 学校に 来ますか。','八時四十五分','先生が 学生に 話して います。あした 学生は 何時までに 学校に 来ますか。
先生：あしたは テストが あります。テストは 九時から ですが、テストの せつめいを しますから、十五分 前までに 来て ください。
あした 学生は 何時までに 学校に 来ますか。',NULL::text,5,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('八時四十五分',NULL::text,0),('九時',NULL::text,1),('九時十五分',NULL::text,2),('八時半',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','女の 人と 男の 人が 話して います。女の 人は どうして 会社を 休みましたか。','子どもを 病院へ つれて 行ったから','女の 人と 男の 人が 話して います。女の 人は どうして 会社を 休みましたか。
男：きのう、会社を 休んだね。かぜ？
女：ううん、子どもが ねつを 出して、病院へ つれて 行ったの。
男：そう。もう 大丈夫？
女：うん、もう 元気。
女の 人は どうして 会社を 休みましたか。',NULL::text,6,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('子どもを 病院へ つれて 行ったから',NULL::text,0),('かぜを ひいたから',NULL::text,1),('りょこうに 行ったから',NULL::text,2),('けがを したから',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','男の 人と 女の 人が 話して います。男の 人は 何が いちばん 楽しかったと 言って いますか。','着物を 着て 歩いた こと','男の 人と 女の 人が 話して います。男の 人は 何が いちばん 楽しかったと 言って いますか。
女：京都の りょこう、どうだった？
男：おてらも きれいだったし、食べ物も おいしかったよ。でも、いちばん 楽しかったのは、着物を 着て 町を 歩いた ことかな。
男の 人は 何が いちばん 楽しかったと 言って いますか。',NULL::text,7,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('着物を 着て 歩いた こと',NULL::text,0),('おてらを 見た こと',NULL::text,1),('おいしい 物を 食べた こと',NULL::text,2),('しゃしんを とった こと',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','女の 人が 話して います。女の 人は 毎朝 何を しますか。','犬と さんぽを する','女の 人が 話して います。女の 人は 起きて まず 何を しますか。
女：わたしは 毎朝 六時に 起きます。起きたら、まず 犬と さんぽを します。それから シャワーを あびて、朝ごはんを 食べます。
女の 人は 起きて まず 何を しますか。',NULL::text,8,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('犬と さんぽを する',NULL::text,0),('シャワーを あびる',NULL::text,1),('朝ごはんを 食べる',NULL::text,2),('しんぶんを 読む',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','えなどは ありません。文を 聞いて、いちばん いい 返事を えらんで ください。','ええ、どうぞ。どこへ 行きたいんですか。','すみません、ちょっと 道を 聞いても いいですか。',NULL::text,9,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('ええ、どうぞ。どこへ 行きたいんですか。',NULL::text,0),('ええ、聞きました。',NULL::text,1),('いいえ、道です。',NULL::text,2),('はい、聞いて あげました。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','えなどは ありません。文を 聞いて、いちばん いい 返事を えらんで ください。','すみません、わたしも わからないんです。','この 漢字の 読み方、わかりますか。',NULL::text,10,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('すみません、わたしも わからないんです。',NULL::text,0),('はい、書きました。',NULL::text,1),('いいえ、読みました。',NULL::text,2),('その 漢字は 読みます。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','えなどは ありません。文を 聞いて、いちばん いい 返事を えらんで ください。','じゃあ、家で 映画でも 見ましょう。','明日、雨だったら、どうしますか。',NULL::text,11,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('じゃあ、家で 映画でも 見ましょう。',NULL::text,0),('ええ、雨でしたね。',NULL::text,1),('はい、晴れて よかったです。',NULL::text,2),('明日は 日曜日です。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','えなどは ありません。文を 聞いて、いちばん いい 返事を えらんで ください。','ありがとうございます。いただきます。','お茶、もう 一杯 いかがですか。',NULL::text,12,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('ありがとうございます。いただきます。',NULL::text,0),('いいえ、いかがですか。',NULL::text,1),('はい、一杯です。',NULL::text,2),('どうぞ、飲んで ください。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','えなどは ありません。文を 聞いて、いちばん いい 返事を えらんで ください。','うん、とても おもしろかったよ。','先週 かした 本、もう 読んだ？',NULL::text,13,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('うん、とても おもしろかったよ。',NULL::text,0),('うん、かして あげたよ。',NULL::text,1),('ううん、読んで あげない。',NULL::text,2),('うん、来週 読んだよ。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','えなどは ありません。文を 聞いて、いちばん いい 返事を えらんで ください。','じゃあ、きょうは わたしが はらうよ。','あ、さいふを 家に わすれて きちゃった。',NULL::text,14,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('じゃあ、きょうは わたしが はらうよ。',NULL::text,0),('よかったね。',NULL::text,1),('じゃあ、家で はらって。',NULL::text,2),('さいふは 高いね。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','えなどは ありません。文を 聞いて、いちばん いい 返事を えらんで ください。','すみません、ここは だめなんです。','すみません、ここで しゃしんを とっても いいですか。',NULL::text,15,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n4-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('すみません、ここは だめなんです。',NULL::text,0),('はい、とりました。',NULL::text,1),('いいえ、とって ください。',NULL::text,2),('しゃしんは きれいですね。',NULL::text,3)) AS o(text, img, ord);
COMMIT;
