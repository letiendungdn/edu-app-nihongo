-- Đề thi thử N1 đầy đủ (tự soạn). Chạy lại an toàn: xoá template theo slug rồi tạo lại.
BEGIN;
-- N1 — Đề thi thử đầy đủ số 1
DELETE FROM "MockExamTemplate" WHERE slug = 'n1-day-du-1';
INSERT INTO "MockExamTemplate" ("slug","level","title","description","sourceMode","durationMinutes","lessonFrom","lessonTo","kanjiLessonFrom","kanjiLessonTo","vocabCount","grammarCount","kanjiCount","listeningWordCount","listeningSentenceCount","passThreshold","scope","isPublished","sortOrder","updatedAt") VALUES ('n1-day-du-1','n1','N1 — Đề thi thử đầy đủ số 1','Đề tự soạn mô phỏng đầy đủ cấu trúc JLPT N1: Từ vựng – Kanji (đọc, ngữ cảnh, đồng nghĩa, cách dùng), Ngữ pháp (chọn mẫu, sắp xếp ★), Đọc hiểu (ngắn, trung, dài, so sánh, tìm thông tin) và Nghe (5 dạng).','CUSTOM',165,1,1,1,1,0,0,0,0,0,60,'Đề tự soạn · 83 câu · đủ 5 phần như đề thật',true,14,CURRENT_TIMESTAMP);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','次の文の［　］の言葉の読み方として最もよいものを、一つ選びなさい。

交渉は予想以上に［円滑］に進んだ。','えんかつ',NULL,1,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('えんかつ',0),('えんこつ',1),('えんがつ',2),('いんかつ',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','次の文の［　］の言葉の読み方として最もよいものを、一つ選びなさい。

政府は早急に必要な［措置］をとるべきだ。','そち',NULL,2,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('そち',0),('しょち',1),('そうち',2),('さち',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','次の文の［　］の言葉の読み方として最もよいものを、一つ選びなさい。

長年の［懸案］がようやく解決した。','けんあん',NULL,3,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('けんあん',0),('けねん',1),('かいあん',2),('けんあい',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','次の文の［　］の言葉の読み方として最もよいものを、一つ選びなさい。

彼は相手の要求をきっぱりと［拒んだ］。','こばんだ',NULL,4,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('こばんだ',0),('はばんだ',1),('いどんだ',2),('ちぢんだ',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','次の文の［　］の言葉の読み方として最もよいものを、一つ選びなさい。

今回の件は［穏便］に済ませたい。','おんびん',NULL,5,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('おんびん',0),('おんべん',1),('いんびん',2),('おんぴん',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','次の文の［　］の言葉の読み方として最もよいものを、一つ選びなさい。

駅前にはまだ昔の町の［面影］が残っている。','おもかげ',NULL,6,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('おもかげ',0),('めんえい',1),('おもえい',2),('めんかげ',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','（　）に入れるのに最もよいものを、一つ選びなさい。

新製品の売れ行きは（　）で、来月から増産することが決まった。','好調',NULL,7,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('好調',0),('低迷',1),('難航',2),('順延',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','（　）に入れるのに最もよいものを、一つ選びなさい。

彼は自分の非を認めず、最後まで（　）を張り通した。','意地',NULL,8,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('意地',0),('意図',1),('意向',2),('意義',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','（　）に入れるのに最もよいものを、一つ選びなさい。

予算が削られたため、計画の（　）を余儀なくされた。','縮小',NULL,9,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('縮小',0),('拡充',1),('達成',2),('推進',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','（　）に入れるのに最もよいものを、一つ選びなさい。

突然スピーチを頼まれて（　）したが、何とか挨拶を終えることができた。','当惑',NULL,10,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('当惑',0),('納得',1),('感心',2),('安堵',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','（　）に入れるのに最もよいものを、一つ選びなさい。

双方が少しずつ（　）、ようやく合意に達した。','歩み寄って',NULL,11,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('歩み寄って',0),('割り込んで',1),('立て込んで',2),('張り合って',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','（　）に入れるのに最もよいものを、一つ選びなさい。

転校したばかりの娘は、新しいクラスにも（　）なじんだようだ。','すんなり',NULL,12,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('すんなり',0),('ぐったり',1),('うっかり',2),('ずっしり',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','（　）に入れるのに最もよいものを、一つ選びなさい。

小さな不正を見逃すことは、結果として不正を（　）することになりかねない。','助長',NULL,13,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('助長',0),('抑制',1),('阻止',2),('是正',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','［　］の言葉に意味が最も近いものを、一つ選びなさい。

新人の田中さんは、人前に出るといつも［おどおど］している。','自信がなさそうにしている',NULL,14,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('自信がなさそうにしている',0),('楽しそうにしている',1),('怒ったようにしている',2),('忙しそうにしている',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','［　］の言葉に意味が最も近いものを、一つ選びなさい。

無駄な出費は［極力］避けたいと思っている。','できるだけ',NULL,15,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('できるだけ',0),('絶対に',1),('しばらく',2),('なんとなく',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','［　］の言葉に意味が最も近いものを、一つ選びなさい。

予算の配分をめぐって、会議は［紛糾］した。','混乱した',NULL,16,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('混乱した',0),('中止になった',1),('早く終わった',2),('延期された',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','［　］の言葉に意味が最も近いものを、一つ選びなさい。

事故の原因についての彼の説明は［曖昧］だった。','はっきりしなかった',NULL,17,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('はっきりしなかった',0),('長すぎた',1),('丁寧だった',2),('正確だった',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','［　］の言葉に意味が最も近いものを、一つ選びなさい。

引っ越しの準備は［おおむね］終わった。','だいたい',NULL,18,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('だいたい',0),('すべて',1),('やっと',2),('少しだけ',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','［　］の言葉に意味が最も近いものを、一つ選びなさい。

彼女の仕事ぶりには［そつがない］。','手落ちがない',NULL,19,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('手落ちがない',0),('やる気がない',1),('スピードがない',2),('面白みがない',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','次の言葉の使い方として最もよいものを、一つ選びなさい。

打開','両国は粘り強い話し合いによって、行き詰まった事態の打開を図った。',NULL,20,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('両国は粘り強い話し合いによって、行き詰まった事態の打開を図った。',0),('古くなった家を打開して、新しい家を建てることにした。',1),('届いた箱を打開して、中身を一つずつ確かめた。',2),('社長は会議の冒頭で、短い打開の挨拶をした。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','次の言葉の使い方として最もよいものを、一つ選びなさい。

ひとまず','雨もやんで電車も動き出したので、ひとまず安心した。',NULL,21,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('雨もやんで電車も動き出したので、ひとまず安心した。',0),('彼はひとまず毎朝ジョギングを欠かさない。',1),('この店は駅から遠いが、ひとまず人気がある。',2),('ひとまず昔、この村に一人の老人が住んでいた。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','次の言葉の使い方として最もよいものを、一つ選びなさい。

手際','彼女は手際よく、あっという間に五人分の料理を作った。',NULL,22,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('彼女は手際よく、あっという間に五人分の料理を作った。',0),('彼は手際が高いので、上の棚にも手が届く。',1),('この手際は丈夫なので、長く使えるだろう。',2),('手際のある人と一緒に暮らしたいと思っている。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','次の言葉の使い方として最もよいものを、一つ選びなさい。

見合わせる','強風の影響で、電車は現在運転を見合わせている。',NULL,23,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('強風の影響で、電車は現在運転を見合わせている。',0),('久しぶりに友人と駅の改札で見合わせた。',1),('彼は鏡に映った自分の顔を見合わせた。',2),('試験の結果を先生に見合わせてもらった。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','次の言葉の使い方として最もよいものを、一つ選びなさい。

おろそか','仕事に夢中になって、家族との時間をおろそかにしてはいけない。',NULL,24,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('仕事に夢中になって、家族との時間をおろそかにしてはいけない。',0),('このスープは薄くて、おろそかな味がする。',1),('今日はおろそかな天気で、洗濯物がよく乾いた。',2),('彼はおろそかな声で、子守歌を歌った。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','次の言葉の使い方として最もよいものを、一つ選びなさい。

踏まえる','前回の失敗を踏まえて、計画を一から立て直した。',NULL,25,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('前回の失敗を踏まえて、計画を一から立て直した。',0),('道に落ちていた空き缶をうっかり踏まえてしまった。',1),('階段を一段ずつ踏まえて、ゆっくり上った。',2),('急いでブレーキを踏まえて、車を止めた。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','次の文の（　）に入れるのに最もよいものを、一つ選びなさい。

彼の実力（　）、この程度の成功は当然のことだ。','をもってすれば',NULL,26,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('をもってすれば',0),('をよそに',1),('にひきかえ',2),('をものともせず',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','次の文の（　）に入れるのに最もよいものを、一つ選びなさい。

社長の許可がない限り、会社のお金は一円（　）使うことはできない。','たりとも',NULL,27,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('たりとも',0),('ばかりか',1),('ながらも',2),('ならでは',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','次の文の（　）に入れるのに最もよいものを、一つ選びなさい。

久しぶりに帰省すると、祖母は私の顔を見る（　）泣き出した。','なり',NULL,28,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('なり',0),('うちに',1),('ばかりに',2),('どころか',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','次の文の（　）に入れるのに最もよいものを、一つ選びなさい。

周りがどんなに反対しよう（　）、私はこの道を進むつもりだ。','と',NULL,29,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('と',0),('では',1),('なら',2),('から',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','次の文の（　）に入れるのに最もよいものを、一つ選びなさい。

彼の無責任な発言には、怒り（　）あきれてしまった。','を通り越して',NULL,30,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('を通り越して',0),('にかけては',1),('に即して',2),('をめぐって',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','次の文の（　）に入れるのに最もよいものを、一つ選びなさい。

一流の料理人（　）、素材選びの段階から決して妥協しない。','ともなれば',NULL,31,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('ともなれば',0),('ならではの',1),('あっての',2),('とはいえ',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','次の文の（　）に入れるのに最もよいものを、一つ選びなさい。

この作品は、彼女の長年の努力（　）完成しなかっただろう。','なくしては',NULL,32,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('なくしては',0),('をもって',1),('に至って',2),('を皮切りに',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','次の文の（　）に入れるのに最もよいものを、一つ選びなさい。

一度試験に落ちたからといって、そんなに落ち込む（　）。','ことはない',NULL,33,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('ことはない',0),('わけだ',1),('ばかりだ',2),('べくもない',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','次の文の（　）に入れるのに最もよいものを、一つ選びなさい。

彼は医者に止められている（　）、毎晩お酒を飲んでいる。','にもかかわらず',NULL,34,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('にもかかわらず',0),('からには',1),('とあって',2),('ばかりか',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','次の文の（　）に入れるのに最もよいものを、一つ選びなさい。

先生が（　）本を、私もぜひ読んでみたいと思います。','お書きになった',NULL,35,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('お書きになった',0),('お書きした',1),('書かせていただいた',2),('書いてさしあげた',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','次の文の　★　に入る最もよいものを、一つ選びなさい。

彼は　＿＿　＿＿　★　＿＿　人ではない。
（1 一度の　2 失敗で　3 簡単に　4 諦める）','簡単に',NULL,36,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('簡単に',0),('一度の',1),('失敗で',2),('諦める',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','次の文の　★　に入る最もよいものを、一つ選びなさい。

環境問題は、＿＿　＿＿　★　＿＿　取り組むべき課題だ。
（1 世界全体で　2 一国　3 だけでなく　4 の問題）','だけでなく',NULL,37,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('だけでなく',0),('世界全体で',1),('一国',2),('の問題',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','次の文の　★　に入る最もよいものを、一つ選びなさい。

部長の　＿＿　★　＿＿　＿＿、来週の会議は延期された。
（1 に　2 急な　3 伴い　4 出張）','出張',NULL,38,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('出張',0),('に',1),('急な',2),('伴い',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','次の文の　★　に入る最もよいものを、一つ選びなさい。

いくら　＿＿　＿＿　★　＿＿、約束を破るのはよくない。
（1 から　2 忙しい　3 と　4 いって）','と',NULL,39,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('と',0),('から',1),('忙しい',2),('いって',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','次の文の　★　に入る最もよいものを、一つ選びなさい。

この映画は　＿＿　★　＿＿　＿＿　感動的な作品だ。
（1 涙なしには　2 見られない　3 ほど　4 大人でも）','涙なしには',NULL,40,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('涙なしには',0),('見られない',1),('ほど',2),('大人でも',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
「便利さ」は時間を生み出すと言われる。しかし、生み出された時間を私たちは何に使っているだろうか。多くの人は、浮いた時間にまた別の用事を詰め込み、以前より忙しくなっている。便利さそのものが悪いのではない。問題は、空いた時間を「埋めなければならないもの」と考えてしまう私たちの側にあるのではないだろうか。

質問：筆者の考えに合うものはどれか。','空いた時間を何かで埋めようとする考え方に問題がある。',NULL,41,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('空いた時間を何かで埋めようとする考え方に問題がある。',0),('便利な道具を使うと、かえって時間がなくなる。',1),('忙しさをなくすには、便利さを手放すべきだ。',2),('浮いた時間には、新しい用事を入れたほうがよい。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
（社内メール）
営業部各位
来週月曜日の定例会議は、会議室の工事のため、第二会議室に場所を変更して行います。開始時刻に変更はありません。なお、当日配布予定の資料は、事前に共有フォルダに掲載しますので、各自印刷のうえご持参ください。
総務課　山田

質問：このメールで最も伝えたいことは何か。','会議の場所が変わること、資料は各自で印刷して持ってくること',NULL,42,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('会議の場所が変わること、資料は各自で印刷して持ってくること',0),('会議の開始時刻と場所が変わること',1),('会議が工事のため中止になること',2),('資料は当日会議室で配布されること',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
子どもに「失敗してもいい」と言うのは簡単だ。だが、大人が失敗を笑ったり責めたりしていれば、その言葉は届かない。子どもは言葉よりも、大人の振る舞いを見て学ぶ。失敗を許す空気は、言葉ではなく、大人自身が失敗とどう向き合うかによって作られるのである。

質問：筆者によると、失敗を許す空気を作るには何が大切か。','大人自身が失敗にどう向き合うかを示すこと',NULL,43,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('大人自身が失敗にどう向き合うかを示すこと',0),('子どもに「失敗してもいい」と繰り返し伝えること',1),('子どもが失敗しないように大人が手助けすること',2),('失敗した子どもを厳しく指導すること',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
古い建物を壊して新しくすることは、一見すると合理的だ。しかし、建物には、そこで暮らした人々の記憶が刻まれている。安全性の確保は欠かせないが、何もかもを新しくすることが、町の価値を高めるとは限らない。残すべきものを見極める目が、今、求められている。

質問：筆者の主張として最も適切なものはどれか。','安全に配慮しつつ、残すべき古い建物を見極める必要がある。',NULL,44,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('安全に配慮しつつ、残すべき古い建物を見極める必要がある。',0),('古い建物はすべて保存すべきだ。',1),('安全のためには古い建物を壊すしかない。',2),('新しい建物には町の記憶がないので価値がない。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
近年、「タイパ」という言葉をよく耳にする。タイムパフォーマンス、つまり時間あたりの満足度を重視する考え方だ。映画を倍速で見たり、要約だけを読んだりするのはその典型である。
限られた時間を有効に使いたいという気持ちは理解できる。しかし、物語の「間」や、何も起こらない場面にこそ、作品の味わいがあることも少なくない。効率よく情報を得ることと、作品を味わうことは、本来別のものなのだ。
すべてを速くこなそうとすると、私たちは「結果」だけを手に入れ、「過程」を楽しむ機会を失ってしまう。時には、あえてゆっくり時間を使う贅沢があってもよいのではないか。

質問：筆者が「タイパ」を重視する見方について述べていることはどれか。','気持ちは理解できるが、作品を味わう機会を失うおそれがある。',NULL,45,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('気持ちは理解できるが、作品を味わう機会を失うおそれがある。',0),('時間を有効に使うために、もっと広めるべきだ。',1),('映画や本を楽しむためには欠かせない考え方だ。',2),('若者だけの考え方で、社会には広がっていない。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
近年、「タイパ」という言葉をよく耳にする。タイムパフォーマンス、つまり時間あたりの満足度を重視する考え方だ。映画を倍速で見たり、要約だけを読んだりするのはその典型である。
限られた時間を有効に使いたいという気持ちは理解できる。しかし、物語の「間」や、何も起こらない場面にこそ、作品の味わいがあることも少なくない。効率よく情報を得ることと、作品を味わうことは、本来別のものなのだ。
すべてを速くこなそうとすると、私たちは「結果」だけを手に入れ、「過程」を楽しむ機会を失ってしまう。時には、あえてゆっくり時間を使う贅沢があってもよいのではないか。

質問：「何も起こらない場面」について、筆者はどう考えているか。','作品の味わいが生まれる大切な部分になりうる。',NULL,46,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('作品の味わいが生まれる大切な部分になりうる。',0),('時間の無駄なので、飛ばして見てもよい。',1),('作品の内容を理解するための情報が多い。',2),('倍速で見ても、意味は変わらない。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
近年、「タイパ」という言葉をよく耳にする。タイムパフォーマンス、つまり時間あたりの満足度を重視する考え方だ。映画を倍速で見たり、要約だけを読んだりするのはその典型である。
限られた時間を有効に使いたいという気持ちは理解できる。しかし、物語の「間」や、何も起こらない場面にこそ、作品の味わいがあることも少なくない。効率よく情報を得ることと、作品を味わうことは、本来別のものなのだ。
すべてを速くこなそうとすると、私たちは「結果」だけを手に入れ、「過程」を楽しむ機会を失ってしまう。時には、あえてゆっくり時間を使う贅沢があってもよいのではないか。

質問：筆者が最も言いたいことは何か。','効率だけを求めず、ゆっくり過程を楽しむ時間も大切にしたい。',NULL,47,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('効率だけを求めず、ゆっくり過程を楽しむ時間も大切にしたい。',0),('結果を早く手に入れることが、何より重要だ。',1),('贅沢をするためには、時間を節約する必要がある。',2),('作品は要約で読むほうが内容をよく理解できる。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
ある町の図書館が、閉館時間を夜九時まで延ばしたところ、利用者が大幅に増えたという。増えたのは、仕事帰りの会社員や、部活動を終えた高校生だった。
図書館の担当者は「本を借りる人が増えただけでなく、館内で勉強したり、ただ静かに過ごしたりする人が増えた」と話す。家でも職場でも学校でもない、一人で落ち着ける場所を求める人が、それだけ多いということだろう。
図書館は本を貸す場所から、人が居場所を見つける場所へと、役割を広げつつあるのかもしれない。

質問：閉館時間を延ばした結果、どうなったか。','昼間に来られなかった人たちの利用が増えた。',NULL,48,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('昼間に来られなかった人たちの利用が増えた。',0),('本を借りる人は減ったが、勉強する人が増えた。',1),('高校生の部活動の時間が長くなった。',2),('会社員が昼休みに来るようになった。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
ある町の図書館が、閉館時間を夜九時まで延ばしたところ、利用者が大幅に増えたという。増えたのは、仕事帰りの会社員や、部活動を終えた高校生だった。
図書館の担当者は「本を借りる人が増えただけでなく、館内で勉強したり、ただ静かに過ごしたりする人が増えた」と話す。家でも職場でも学校でもない、一人で落ち着ける場所を求める人が、それだけ多いということだろう。
図書館は本を貸す場所から、人が居場所を見つける場所へと、役割を広げつつあるのかもしれない。

質問：「それだけ多い」とは、何が多いということか。','一人で落ち着いて過ごせる場所を求める人',NULL,49,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('一人で落ち着いて過ごせる場所を求める人',0),('夜遅くまで働いている会社員',1),('図書館で本を借りる高校生',2),('家で勉強できない学生',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
ある町の図書館が、閉館時間を夜九時まで延ばしたところ、利用者が大幅に増えたという。増えたのは、仕事帰りの会社員や、部活動を終えた高校生だった。
図書館の担当者は「本を借りる人が増えただけでなく、館内で勉強したり、ただ静かに過ごしたりする人が増えた」と話す。家でも職場でも学校でもない、一人で落ち着ける場所を求める人が、それだけ多いということだろう。
図書館は本を貸す場所から、人が居場所を見つける場所へと、役割を広げつつあるのかもしれない。

質問：筆者は図書館についてどのように考えているか。','本を貸すだけでなく、人の居場所としての役割も持ち始めている。',NULL,50,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('本を貸すだけでなく、人の居場所としての役割も持ち始めている。',0),('本を貸す役割はもう必要なくなっている。',1),('夜遅くまで開けると、静かな環境が失われる。',2),('学生が勉強するための場所にするべきだ。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
「わかりやすさ」が求められる時代である。テレビの解説も、ビジネスの資料も、短く、簡単であることがよしとされる。確かに、わかりやすい説明は親切だ。だが、わかりやすさには落とし穴もある。
複雑な問題を単純に言い切ってしまうと、本来考えるべき細部や例外が切り捨てられる。聞き手は「わかった」と感じるが、実際には、問題の一面しか理解していないことが多い。しかも、一度わかったつもりになると、人はそれ以上考えようとしなくなる。
大切なのは、わかりにくいものを、わかりにくいまま引き受ける力ではないだろうか。すぐに答えが出ない問いを前にして、焦らずに考え続けること。それは、情報があふれる現代においてこそ、私たちに求められている態度なのである。

質問：筆者によると、「わかりやすさ」の落とし穴とは何か。','問題の一面しか理解していないのに、わかったと感じてしまうこと',NULL,51,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('問題の一面しか理解していないのに、わかったと感じてしまうこと',0),('説明が短すぎて、聞き手が理解できないこと',1),('説明する側が、細かい点まで調べなくなること',2),('わかりやすい資料を作るのに時間がかかること',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
「わかりやすさ」が求められる時代である。テレビの解説も、ビジネスの資料も、短く、簡単であることがよしとされる。確かに、わかりやすい説明は親切だ。だが、わかりやすさには落とし穴もある。
複雑な問題を単純に言い切ってしまうと、本来考えるべき細部や例外が切り捨てられる。聞き手は「わかった」と感じるが、実際には、問題の一面しか理解していないことが多い。しかも、一度わかったつもりになると、人はそれ以上考えようとしなくなる。
大切なのは、わかりにくいものを、わかりにくいまま引き受ける力ではないだろうか。すぐに答えが出ない問いを前にして、焦らずに考え続けること。それは、情報があふれる現代においてこそ、私たちに求められている態度なのである。

質問：「わかったつもり」になった人はどうなると述べられているか。','それ以上深く考えようとしなくなる。',NULL,52,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('それ以上深く考えようとしなくなる。',0),('他の人にも説明したくなる。',1),('細部や例外に注意を向けるようになる。',2),('わかりにくい説明を求めるようになる。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
「わかりやすさ」が求められる時代である。テレビの解説も、ビジネスの資料も、短く、簡単であることがよしとされる。確かに、わかりやすい説明は親切だ。だが、わかりやすさには落とし穴もある。
複雑な問題を単純に言い切ってしまうと、本来考えるべき細部や例外が切り捨てられる。聞き手は「わかった」と感じるが、実際には、問題の一面しか理解していないことが多い。しかも、一度わかったつもりになると、人はそれ以上考えようとしなくなる。
大切なのは、わかりにくいものを、わかりにくいまま引き受ける力ではないだろうか。すぐに答えが出ない問いを前にして、焦らずに考え続けること。それは、情報があふれる現代においてこそ、私たちに求められている態度なのである。

質問：この文章で筆者が最も言いたいことは何か。','すぐに答えの出ない問題を、焦らずに考え続ける態度が大切だ。',NULL,53,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('すぐに答えの出ない問題を、焦らずに考え続ける態度が大切だ。',0),('説明はできるだけ短く、簡単にするべきだ。',1),('情報が多すぎるので、必要なものだけを選ぶべきだ。',2),('わかりやすい説明をする人が信頼される。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
A：在宅勤務は、通勤時間がなくなる分、家族と過ごす時間や自分のための時間が増える。集中して作業できるという声も多い。ただし、同僚との何気ない会話が減り、相談しにくくなるという課題もある。
B：オフィスに集まることの価値は、雑談から生まれるアイデアにある。在宅勤務は効率的に見えるが、新しい発想が生まれにくい。とはいえ、毎日出社する必要はなく、目的に応じて使い分けるのが現実的だ。

質問：AとBの両方が触れている点はどれか。','在宅勤務では、人との何気ないやり取りが減ること',NULL,54,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('在宅勤務では、人との何気ないやり取りが減ること',0),('在宅勤務では、家族との時間が増えること',1),('在宅勤務は、毎日出社するより疲れること',2),('オフィスでは、集中して作業ができること',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
A：在宅勤務は、通勤時間がなくなる分、家族と過ごす時間や自分のための時間が増える。集中して作業できるという声も多い。ただし、同僚との何気ない会話が減り、相談しにくくなるという課題もある。
B：オフィスに集まることの価値は、雑談から生まれるアイデアにある。在宅勤務は効率的に見えるが、新しい発想が生まれにくい。とはいえ、毎日出社する必要はなく、目的に応じて使い分けるのが現実的だ。

質問：在宅勤務について、AとBはどのような立場をとっているか。','Aは利点と課題を挙げ、Bは目的に応じて出社と使い分けるべきだと述べている。',NULL,55,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('Aは利点と課題を挙げ、Bは目的に応じて出社と使い分けるべきだと述べている。',0),('AもBも、在宅勤務をやめるべきだと述べている。',1),('Aは反対し、Bは全面的に賛成している。',2),('AもBも、在宅勤務の利点だけを述べている。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
（市民講座のお知らせ）
①やさしい写真教室　土曜 10:00〜12:00　受講料 3,000円　定員 15名　※カメラ持参
②はじめての韓国語　水曜 19:00〜20:30　受講料 5,000円　定員 20名
③親子料理教室　日曜 13:00〜15:00　受講料 1組 2,000円　定員 10組　※小学生と保護者
④パソコン基礎　火曜 10:00〜12:00　受講料 4,000円　定員 12名　※パソコン貸出あり
申込：各講座開始日の2週間前まで（先着順）

質問：平日の夜しか時間がない会社員の林さんが受講できる講座はどれか。','②はじめての韓国語',NULL,56,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('②はじめての韓国語',0),('①やさしい写真教室',1),('③親子料理教室',2),('④パソコン基礎',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
（市民講座のお知らせ）
①やさしい写真教室　土曜 10:00〜12:00　受講料 3,000円　定員 15名　※カメラ持参
②はじめての韓国語　水曜 19:00〜20:30　受講料 5,000円　定員 20名
③親子料理教室　日曜 13:00〜15:00　受講料 1組 2,000円　定員 10組　※小学生と保護者
④パソコン基礎　火曜 10:00〜12:00　受講料 4,000円　定員 12名　※パソコン貸出あり
申込：各講座開始日の2週間前まで（先着順）

質問：小学3年生の子どもと一緒に、週末に参加したい。費用はいくらか。','2,000円',NULL,57,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('2,000円',0),('3,000円',1),('4,000円',2),('5,000円',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','会社で男の人と女の人が話しています。男の人はこのあとまず何をしなければなりませんか。','資料の宛名を直す','会社で男の人と女の人が話しています。男の人はこのあとまず何をしなければなりませんか。
男：部長、明日のプレゼンの資料、できました。
女：ありがとう。あ、でも、先方の担当者が変わったって連絡があったの。宛名だけ直してくれる？
男：わかりました。印刷はそのあとでいいですか。
女：印刷は私がやっておくから、直したらデータを送って。それから、会議室の予約も確認しておいてね。
男：会議室は昨日予約しました。
女：そう、じゃあ大丈夫ね。
男の人はこのあとまず何をしなければなりませんか。',58,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('資料の宛名を直す',0),('資料を印刷する',1),('会議室を予約する',2),('先方に電話する',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','大学で女の学生と先生が話しています。女の学生は何を準備しなければなりませんか。','参考文献のリスト','大学で女の学生と先生が話しています。女の学生は何を準備しなければなりませんか。
女：先生、来週の発表のことなんですが、グラフは配布資料に入れたほうがいいでしょうか。
男：そうだね、スライドで見せるなら、資料には入れなくていいよ。それより、参考文献のリストは必ずつけてね。
女：はい。発表の原稿も提出しますか。
男：原稿はいらない。発表時間は十五分だから、それだけ守ってください。
女の学生は何を準備しなければなりませんか。',59,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('参考文献のリスト',0),('グラフを入れた配布資料',1),('発表の原稿',2),('十五分のビデオ',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','市役所で男の人と係の人が話しています。男の人はこのあとどこへ行きますか。','二階の市民課','市役所で男の人と係の人が話しています。男の人はこのあとどこへ行きますか。
男：すみません、住所変更の手続きをしたいんですが。
女：はい、転入届ですね。こちらは二階の市民課になります。
男：あ、それと、子どもの保育園の申し込みもしたいんですが。
女：保育園のほうは三階の子ども課ですが、転入届が済んでからでないと申し込めないんです。
男：わかりました。じゃあ、先にそっちを済ませます。
男の人はこのあとどこへ行きますか。',60,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('二階の市民課',0),('三階の子ども課',1),('一階の受付',2),('保育園',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','電話で女の人と男の人が話しています。女の人は何時に店に行きますか。','十二時半ごろ','電話で女の人と男の人が話しています。女の人は何時に店に行きますか。
女：もしもし、修理をお願いしていた時計なんですが、今日受け取れますか。
男：はい、もう仕上がっております。本日は午後七時まで営業しております。
女：仕事が六時に終わるので、六時半ごろでも大丈夫ですか。
男：申し訳ございません、受け取りの受付は閉店の一時間前までとなっておりまして。
女：そうですか。じゃあ、昼休みに行きます。十二時半ごろに。
男：かしこまりました。
女の人は何時に店に行きますか。',61,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('十二時半ごろ',0),('六時ごろ',1),('六時半ごろ',2),('七時ごろ',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','会社で女の人と男の人が話しています。女の人は企画書をどう直しますか。','目的のすぐ後に費用の説明を入れる','会社で女の人と男の人が話しています。女の人は企画書をどう直しますか。
女：課長、企画書を見ていただけましたか。
男：うん、内容はいいと思う。ただ、費用の説明が最後のほうにあって、見落とされそうだね。
女：では、費用を最初のページに移しましょうか。
男：いや、最初は目的のままでいい。目的のすぐ後に費用を持ってきて。
女：わかりました。
女の人は企画書をどう直しますか。',62,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('目的のすぐ後に費用の説明を入れる',0),('最初のページに費用の説明を入れる',1),('目的の説明を最後に移す',2),('費用の説明を削る',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','男の人と女の人が話しています。女の人はどうして引っ越すことにしましたか。','仕事をするための部屋が欲しいから','男の人と女の人が話しています。女の人はどうして引っ越すことにしましたか。
男：引っ越すんだって？今のマンション、駅から近くて便利だったのに。
女：うん、便利なのはよかったんだけどね。家賃が上がるわけでもないし。
男：じゃあ、どうして？
女：在宅勤務が増えたでしょう。仕事用の部屋がどうしても欲しくて。
男：なるほどね。
女の人はどうして引っ越すことにしましたか。',63,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('仕事をするための部屋が欲しいから',0),('駅から遠かったから',1),('家賃が上がるから',2),('会社が遠くなったから',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','ラジオで料理研究家が話しています。料理研究家は、おいしいご飯を炊くために最も大切なことは何だと言っていますか。','炊く前にお米に十分水を吸わせること','ラジオで料理研究家が話しています。料理研究家は、おいしいご飯を炊くために最も大切なことは何だと言っていますか。
女：おいしいご飯というと、お米の種類や炊飯器が気になる方が多いと思います。もちろんそれも大事ですが、私が一番大切だと思うのは、お米に水を十分吸わせることです。洗ったらすぐ炊くのではなく、夏なら三十分、冬なら一時間ほど水につけておく。これだけで、驚くほど味が変わりますよ。
料理研究家は、おいしいご飯を炊くために最も大切なことは何だと言っていますか。',64,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('炊く前にお米に十分水を吸わせること',0),('高いお米を選ぶこと',1),('性能のいい炊飯器を使うこと',2),('洗ったらすぐに炊くこと',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','男の人と女の人が映画について話しています。男の人はこの映画のどこが一番よかったと言っていますか。','言葉なしで気持ちが伝わる場面','男の人と女の人が映画について話しています。男の人はこの映画のどこが一番よかったと言っていますか。
女：昨日の映画、どうだった？映像がきれいだって評判だけど。
男：うん、確かに映像はきれいだったし、音楽もよかった。でも、僕が一番心に残ったのは、主人公の父親が最後に何も言わずに息子を見送る場面かな。セリフがないのに、気持ちが全部伝わってきたんだ。
女：へえ、私も見に行こうかな。
男の人はこの映画のどこが一番よかったと言っていますか。',65,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('言葉なしで気持ちが伝わる場面',0),('映像の美しさ',1),('音楽',2),('主人公のセリフ',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','会社で男の人と女の人が話しています。新しいシステムの導入が遅れている一番の理由は何ですか。','データを移す作業に時間がかかっているから','会社で男の人と女の人が話しています。新しいシステムの導入が遅れている一番の理由は何ですか。
男：新しいシステム、まだ使えないんですか。予定では先月からでしたよね。
女：ええ。予算は通っているし、業者の準備もできているんです。
男：じゃあ何が問題なんですか。
女：今のシステムからデータを移すのに、思ったより時間がかかっていて。古いデータの形式がばらばらなんですよ。
男：そうでしたか。
新しいシステムの導入が遅れている一番の理由は何ですか。',66,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('データを移す作業に時間がかかっているから',0),('予算が足りないから',1),('業者の準備ができていないから',2),('社員が使い方を知らないから',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','女の人が講演会で話しています。女の人は、ボランティアを続けられた理由は何だと言っていますか。','一緒に活動する仲間がいたから','女の人が講演会で話しています。女の人は、ボランティアを続けられた理由は何だと言っていますか。
女：私が地域の子どもたちの学習支援を始めて、もう十年になります。最初は、時間がない、自分に教えられるのかと不安ばかりでした。それでも続けられたのは、同じ思いを持つ仲間がいたからです。一人だったら、きっと途中でやめていたと思います。
女の人は、ボランティアを続けられた理由は何だと言っていますか。',67,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('一緒に活動する仲間がいたから',0),('時間に余裕があったから',1),('教えることに自信があったから',2),('子どもたちの成績が上がったから',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','テレビで専門家が話しています。専門家は何について話していますか。','寝る前の画面の光が睡眠に与える影響','テレビで専門家が話しています。
男：最近、夜遅くまでスマートフォンを見ている人が増えています。画面の光は、脳に昼間だと勘違いさせ、眠りに必要なホルモンの分泌を妨げます。その結果、寝つきが悪くなったり、眠りが浅くなったりするのです。寝る一時間前には画面を見るのをやめ、部屋の明かりも少し暗くすることをおすすめします。
専門家は何について話していますか。',68,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('寝る前の画面の光が睡眠に与える影響',0),('スマートフォンの新しい機能',1),('部屋の明かりの選び方',2),('昼寝の効果',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','大学の授業で先生が話しています。先生の話のテーマは何ですか。','多数決の問題点と少数意見を聞く大切さ','大学の授業で先生が話しています。
女：私たちは「多数決」を公平な決め方だと考えがちです。しかし、多数決では、少数の人の強い意見が反映されにくいという問題があります。例えば、三人がわずかに賛成し、二人が強く反対している場合、多数決では賛成に決まります。大切なのは、結論を出す前に、少数意見を十分に聞く過程なのです。
先生の話のテーマは何ですか。',69,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('多数決の問題点と少数意見を聞く大切さ',0),('多数決が最も公平な理由',1),('少数意見を無視してよい場合',2),('会議を短くする方法',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','男の人が会社の朝礼で話しています。男の人が最も伝えたいことは何ですか。','忙しくても基本的な確認を怠らないでほしい','男の人が会社の朝礼で話しています。
男：先月、取引先から苦情がありました。原因を調べると、小さな確認漏れが重なったことがわかりました。一人ひとりは「これくらい大丈夫だろう」と思っていたのです。忙しいときこそ、基本の確認を省かないでください。小さなミスは、重なると大きな問題になります。
男の人が最も伝えたいことは何ですか。',70,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('忙しくても基本的な確認を怠らないでほしい',0),('取引先を変えるべきだ',1),('苦情の担当者を決めたい',2),('仕事をもっと速く進めてほしい',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','ラジオで女の人が話しています。女の人は、読書についてどう考えていますか。','合わない本は途中でやめてもいい','ラジオで女の人が話しています。
女：本を読むなら、最後まで読み通さなければいけないと思っていませんか。私は、合わないと感じたら途中でやめてもいいと思っています。無理に読み続けて本が嫌いになるよりも、面白いと思える一冊に出会うことのほうが、ずっと大切ですから。
女の人は、読書についてどう考えていますか。',71,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('合わない本は途中でやめてもいい',0),('本は必ず最後まで読むべきだ',1),('一冊を何度も読み返すべきだ',2),('人にすすめられた本を読むべきだ',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','それが、急に今日中に必要になったらしいんです。','この書類、明日まででいいって言ってなかったっけ？',72,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('それが、急に今日中に必要になったらしいんです。',0),('はい、明日お持ちします。',1),('いいえ、言ってもいいですよ。',2),('じゃあ、昨日出しておきました。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','そうですか。では、また改めて伺います。','せっかく来てもらったのに、あいにく部長は外出しておりまして。',73,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('そうですか。では、また改めて伺います。',0),('いえいえ、せっかくですから。',1),('それはよかったですね。',2),('じゃあ、部長と一緒に行きましょう。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','ええ、教えたことをすぐ実践できるんですよ。','新人の佐藤さん、思ったよりずっと飲み込みが早いね。',74,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('ええ、教えたことをすぐ実践できるんですよ。',0),('ええ、食べるのも早いんですよ。',1),('すみません、すぐ注意しておきます。',2),('そうですね、もう少し時間がかかりそうです。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','でも、週末だから念のため予約しておこうよ。','あの店、予約しないと入れないこともないんじゃない？',75,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('でも、週末だから念のため予約しておこうよ。',0),('うん、絶対に入れないよね。',1),('じゃあ、予約しないでおこうか、残念だね。',2),('そうだね、もう閉店したらしいよ。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','申し訳ありません。次回から前日までにお送りします。','会議の資料、もう少し早くいただけると助かるんですが。',76,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('申し訳ありません。次回から前日までにお送りします。',0),('どういたしまして。',1),('いえ、もう少し遅くても大丈夫ですよ。',2),('よかったです。お役に立てて。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','そうだよね。何かあったのかな。','山田さんに限って、約束を忘れるなんてことはないと思うけど。',77,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('そうだよね。何かあったのかな。',0),('うん、山田さんはよく忘れるからね。',1),('じゃあ、山田さんだけ呼ぼうか。',2),('限られた人しか来ないんだね。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','ありがとうございます。精一杯やらせていただきます。','このプロジェクト、君に任せようと思うんだが、どうかな。',78,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('ありがとうございます。精一杯やらせていただきます。',0),('いえ、任せていただいたことはありません。',1),('はい、課長にお任せします。',2),('そうですね、どうなったか聞いてみます。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','いえいえ、こちらこそお時間をいただいてありがとうございます。','雨の中、わざわざお越しいただいて恐縮です。',79,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('いえいえ、こちらこそお時間をいただいてありがとうございます。',0),('ええ、本当にひどい雨でしたね、困りました。',1),('いいえ、雨は降っていませんでしたよ。',2),('はい、またお越しください。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','そうなんだ。評判ほどじゃなかったんだね。','あのレストラン、高いばかりで大しておいしくなかったよ。',80,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('そうなんだ。評判ほどじゃなかったんだね。',0),('高くておいしいなら最高だね。',1),('じゃあ、今度みんなで行こうよ。',2),('うん、安いのにおいしいよね。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','もう一度、こちらから確認の連絡を入れてみましょうか。','例の件、先方からまだ返事がないんだけど、どうしたものかね。',81,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('もう一度、こちらから確認の連絡を入れてみましょうか。',0),('はい、もう返事しておきました。',1),('いいえ、どうもしていません。',2),('それはよかったですね。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','家族三人が旅行の行き先について話しています。三人はどこへ行くことにしましたか。','山の温泉','家族三人が旅行の行き先について話しています。
父：今年の夏休み、どこに行こうか。候補は、海の近くのホテル、山の温泉、それから都会のテーマパークだね。
母：海はいいけど、去年も行ったわよね。
娘：私はテーマパークがいい！でも、夏は混んでて暑いかな。
父：温泉なら涼しいし、ゆっくりできるよ。近くに川遊びができる場所もあるらしい。
娘：川遊びできるなら、そこでもいいよ。
母：じゃあ決まりね。
三人はどこへ行くことにしましたか。',82,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('山の温泉',0),('海の近くのホテル',1),('都会のテーマパーク',2),('川の近くのキャンプ場',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','会社で上司と部下二人が、新入社員の研修方法について話しています。どの方法に決めましたか。','先輩社員が一対一で教える','会社で上司と部下二人が、新入社員の研修方法について話しています。
上司：今年の研修、どうしようか。案は三つ。外部の講師を呼ぶ、先輩社員が一対一で教える、オンライン教材を使う。
部下A：外部講師は質が高いですが、費用がかかりますね。
部下B：オンライン教材は安いですけど、質問しにくいという声がありました。
部下A：先輩が教える方法なら、職場にもすぐなじめると思います。先輩の負担は増えますが。
上司：負担は業務を調整して減らそう。職場になじむことを一番に考えたいからね。それでいこう。
どの方法に決めましたか。',83,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-1' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('先輩社員が一対一で教える',0),('外部の講師を呼ぶ',1),('オンライン教材を使う',2),('外部講師とオンライン教材を組み合わせる',3)) AS o(text, ord);
-- N1 — Đề thi thử đầy đủ số 2
DELETE FROM "MockExamTemplate" WHERE slug = 'n1-day-du-2';
INSERT INTO "MockExamTemplate" ("slug","level","title","description","sourceMode","durationMinutes","lessonFrom","lessonTo","kanjiLessonFrom","kanjiLessonTo","vocabCount","grammarCount","kanjiCount","listeningWordCount","listeningSentenceCount","passThreshold","scope","isPublished","sortOrder","updatedAt") VALUES ('n1-day-du-2','n1','N1 — Đề thi thử đầy đủ số 2','Đề tự soạn mô phỏng đầy đủ cấu trúc JLPT N1: Từ vựng – Kanji (đọc, ngữ cảnh, đồng nghĩa, cách dùng), Ngữ pháp (chọn mẫu, sắp xếp ★), Đọc hiểu (ngắn, trung, dài, so sánh, tìm thông tin) và Nghe (5 dạng).','CUSTOM',165,1,1,1,1,0,0,0,0,0,60,'Đề tự soạn · 83 câu · đủ 5 phần như đề thật',true,15,CURRENT_TIMESTAMP);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','次の文の［　］の言葉の読み方として最もよいものを、一つ選びなさい。

景気の回復は依然として［緩慢］だ。','かんまん',NULL,1,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('かんまん',0),('えんまん',1),('かんばん',2),('だんまん',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','次の文の［　］の言葉の読み方として最もよいものを、一つ選びなさい。

彼の提案は会議で［一蹴］された。','いっしゅう',NULL,2,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('いっしゅう',0),('いっけり',1),('いちしゅう',2),('いっそく',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','次の文の［　］の言葉の読み方として最もよいものを、一つ選びなさい。

社長は記者の質問に［憤然］と席を立った。','ふんぜん',NULL,3,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('ふんぜん',0),('ふんねん',1),('ぶんぜん',2),('ふくぜん',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','次の文の［　］の言葉の読み方として最もよいものを、一つ選びなさい。

彼女の演技には観客も［圧倒］された。','あっとう',NULL,4,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('あっとう',0),('あつどう',1),('あっとく',2),('おうとう',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','次の文の［　］の言葉の読み方として最もよいものを、一つ選びなさい。

経費を［賄う］ために、寄付を募った。','まかなう',NULL,5,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('まかなう',0),('つくなう',1),('おぎなう',2),('あがなう',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'kanji','multiple_choice','次の文の［　］の言葉の読み方として最もよいものを、一つ選びなさい。

彼は人の意見に［惑わされる］ことがない。','まどわされる',NULL,6,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('まどわされる',0),('まよわされる',1),('わずらわされる',2),('まぎらわされる',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','（　）に入れるのに最もよいものを、一つ選びなさい。

会議では、賛成と反対の意見が（　）し、結論が出なかった。','拮抗',NULL,7,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('拮抗',0),('相殺',1),('統合',2),('一致',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','（　）に入れるのに最もよいものを、一つ選びなさい。

新しい法律の（　）は来年四月の予定だ。','施行',NULL,8,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('施行',0),('履行',1),('遂行',2),('進行',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','（　）に入れるのに最もよいものを、一つ選びなさい。

彼は細かい作業を（　）こなすので、上司からの信頼も厚い。','黙々と',NULL,9,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('黙々と',0),('堂々と',1),('悠々と',2),('転々と',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','（　）に入れるのに最もよいものを、一つ選びなさい。

事故の原因は、まだ（　）されていない。','解明',NULL,10,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('解明',0),('解散',1),('解約',2),('解禁',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','（　）に入れるのに最もよいものを、一つ選びなさい。

長引く不況で、多くの中小企業が（　）に立たされている。','苦境',NULL,11,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('苦境',0),('環境',1),('佳境',2),('心境',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','（　）に入れるのに最もよいものを、一つ選びなさい。

彼の話はいつも（　）が長く、なかなか本題に入らない。','前置き',NULL,12,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('前置き',0),('前売り',1),('前払い',2),('前向き',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','（　）に入れるのに最もよいものを、一つ選びなさい。

計画の細部については、担当者の（　）に任せることにした。','裁量',NULL,13,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('裁量',0),('分量',1),('器量',2),('度量',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','［　］の言葉に意味が最も近いものを、一つ選びなさい。

彼は［とっさに］ハンドルを右に切った。','瞬間的に',NULL,14,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('瞬間的に',0),('ゆっくりと',1),('迷った末に',2),('計画どおりに',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','［　］の言葉に意味が最も近いものを、一つ選びなさい。

この件については、すでに［了承］を得ています。','承知してもらうこと',NULL,15,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('承知してもらうこと',0),('反対されること',1),('提案すること',2),('質問されること',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','［　］の言葉に意味が最も近いものを、一つ選びなさい。

彼の言うことは、いつも［つじつまが合わない］。','話の筋が通らない',NULL,16,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('話の筋が通らない',0),('声が小さい',1),('話が長い',2),('相手に合わせない',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','［　］の言葉に意味が最も近いものを、一つ選びなさい。

彼女は［ひたむきに］練習を続けた。','一生懸命に',NULL,17,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('一生懸命に',0),('嫌々ながら',1),('時々',2),('楽しそうに',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','［　］の言葉に意味が最も近いものを、一つ選びなさい。

会社の業績は［にわかに］悪化した。','急に',NULL,18,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('急に',0),('少しずつ',1),('予想どおり',2),('一時的に',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','［　］の言葉に意味が最も近いものを、一つ選びなさい。

その説明では、どうも［腑に落ちない］。','納得できない',NULL,19,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('納得できない',0),('聞き取れない',1),('覚えられない',2),('終わらない',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','次の言葉の使い方として最もよいものを、一つ選びなさい。

発足','地域の高齢者を支援するための新しい団体が発足した。',NULL,20,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('地域の高齢者を支援するための新しい団体が発足した。',0),('朝早く家を発足して、空港へ向かった。',1),('彼は長い入院生活から発足して、仕事に戻った。',2),('新しい商品が来月発足される予定だ。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','次の言葉の使い方として最もよいものを、一つ選びなさい。

まちまち','同じ質問をしても、人によって答えはまちまちだった。',NULL,21,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('同じ質問をしても、人によって答えはまちまちだった。',0),('彼はまちまちと歩いて、駅に向かった。',1),('店の前には、客がまちまち並んでいた。',2),('雨がまちまち降ってきたので、急いで帰った。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','次の言葉の使い方として最もよいものを、一つ選びなさい。

心当たり','財布をなくしたが、どこで落としたのか心当たりがない。',NULL,22,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('財布をなくしたが、どこで落としたのか心当たりがない。',0),('彼女の優しい心当たりに、思わず涙が出た。',1),('試験の前日は心当たりで眠れなかった。',2),('心当たりに満ちた手紙を受け取った。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','次の言葉の使い方として最もよいものを、一つ選びなさい。

取り留める','事故に遭ったが、すぐに手術を受けて一命を取り留めた。',NULL,23,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('事故に遭ったが、すぐに手術を受けて一命を取り留めた。',0),('会議の内容を取り留めて、メモにまとめた。',1),('逃げた犬をやっと取り留めることができた。',2),('散らかった部屋の物を取り留めて片付けた。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','次の言葉の使い方として最もよいものを、一つ選びなさい。

おおらか','彼はおおらかな性格で、細かいことは気にしない。',NULL,24,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('彼はおおらかな性格で、細かいことは気にしない。',0),('今日はおおらかな雨が一日中降っていた。',1),('このかばんはおおらかで、たくさん入る。',2),('彼女はおおらかな声で、こっそりささやいた。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'vocab','multiple_choice','次の言葉の使い方として最もよいものを、一つ選びなさい。

一環','今回の植樹は、町の緑化計画の一環として行われた。',NULL,25,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('今回の植樹は、町の緑化計画の一環として行われた。',0),('彼は一環として、毎朝五時に起きている。',1),('この一環の本は、全部で十巻ある。',2),('会議は一環して、午後まで続いた。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','次の文の（　）に入れるのに最もよいものを、一つ選びなさい。

雨の中、傘も差さず（　）、彼は駅まで走っていった。','に',NULL,26,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('に',0),('で',1),('て',2),('と',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','次の文の（　）に入れるのに最もよいものを、一つ選びなさい。

試合に負けた悔しさ（　）、選手たちは涙を流した。','のあまり',NULL,27,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('のあまり',0),('にかまけて',1),('をよそに',2),('ともなく',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','次の文の（　）に入れるのに最もよいものを、一つ選びなさい。

この病気は、早期に発見（　）、治療は難しくない。','しさえすれば',NULL,28,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('しさえすれば',0),('するにつけ',1),('したところで',2),('するや否や',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','次の文の（　）に入れるのに最もよいものを、一つ選びなさい。

子どもでも（　）、こんな簡単な問題が解けないはずがない。','あるまいし',NULL,29,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('あるまいし',0),('あるにせよ',1),('あるからには',2),('あるとはいえ',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','次の文の（　）に入れるのに最もよいものを、一つ選びなさい。

彼女の歌声は、聞く人の心を癒やさず（　）。','にはおかない',NULL,30,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('にはおかない',0),('にはいられない',1),('にすむ',2),('じまいだ',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','次の文の（　）に入れるのに最もよいものを、一つ選びなさい。

長年の研究（　）、ついに新しい薬が完成した。','の末に',NULL,31,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('の末に',0),('の手前',1),('の矢先に',2),('のかたわら',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','次の文の（　）に入れるのに最もよいものを、一つ選びなさい。

彼は会社を経営する（　）、大学で講師も務めている。','かたわら',NULL,32,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('かたわら',0),('とたん',1),('あげく',2),('しまつ',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','次の文の（　）に入れるのに最もよいものを、一つ選びなさい。

開会式は、市長のあいさつ（　）始まった。','をもって',NULL,33,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('をもって',0),('をおして',1),('をよそに',2),('をものともせず',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','次の文の（　）に入れるのに最もよいものを、一つ選びなさい。

弟は、さんざん遊んだ（　）、宿題を一つもやっていなかった。','あげく',NULL,34,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('あげく',0),('かたわら',1),('ついでに',2),('うちに',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','次の文の（　）に入れるのに最もよいものを、一つ選びなさい。

お忙しいところ恐縮ですが、ご確認（　）幸いです。','いただければ',NULL,35,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('いただければ',0),('させていただければ',1),('くださいましたら',2),('さしあげれば',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','次の文の　★　に入る最もよいものを、一つ選びなさい。

この仕事は　＿＿　＿＿　★　＿＿　できるものではない。
（1 経験の　2 人に　3 簡単に　4 浅い）','人に',NULL,36,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('人に',0),('経験の',1),('簡単に',2),('浅い',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','次の文の　★　に入る最もよいものを、一つ選びなさい。

彼女は　＿＿　★　＿＿　＿＿　黙ってうなずいた。
（1 何か　2 そうに　3 言いた　4 しながらも）','言いた',NULL,37,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('言いた',0),('何か',1),('そうに',2),('しながらも',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','次の文の　★　に入る最もよいものを、一つ選びなさい。

駅前に　＿＿　＿＿　★　＿＿　町の雰囲気が大きく変わった。
（1 ができた　2 大型の　3 ことで　4 商業施設）','ができた',NULL,38,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('ができた',0),('ことで',1),('大型の',2),('商業施設',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','次の文の　★　に入る最もよいものを、一つ選びなさい。

社長の　＿＿　★　＿＿　＿＿　計画は実現しなかった。
（1 なくしては　2 決断　3 この　4 思い切った）','決断',NULL,39,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('決断',0),('なくしては',1),('この',2),('思い切った',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'grammar','multiple_choice','次の文の　★　に入る最もよいものを、一つ選びなさい。

新しい企画は　＿＿　★　＿＿　＿＿　予想以上の反響を呼んだ。
（1 発表される　2 SNSを中心に　3 や否や　4 たちまち）','や否や',NULL,40,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('や否や',0),('発表される',1),('SNSを中心に',2),('たちまち',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
「若いうちは苦労を買ってでもせよ」と言われる。だが、苦労そのものに価値があるわけではない。価値があるのは、苦労をどう乗り越えたか、そこから何を学んだかである。意味もなく人に苦労を強いることは、成長の機会ではなく、ただの負担でしかない。

質問：筆者の考えに合うものはどれか。','苦労は、そこから何を学ぶかによって価値が決まる。',NULL,41,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('苦労は、そこから何を学ぶかによって価値が決まる。',0),('若いうちは、できるだけ多くの苦労をすべきだ。',1),('苦労はすべて無駄なので、避けるべきだ。',2),('人に苦労をさせることは、成長につながる。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
（マンションの掲示）
住民の皆様へ
来月一日から、資源ごみの回収日が毎週水曜日から木曜日に変わります。回収時刻は従来どおり午前八時までです。なお、段ボールはひもで縛ってから出してください。ひもで縛られていないものは回収されませんので、ご注意ください。
管理組合

質問：来月から住民がしなければならないことは何か。','資源ごみを木曜日の午前八時までに出す。',NULL,42,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('資源ごみを木曜日の午前八時までに出す。',0),('資源ごみを水曜日の午前八時までに出す。',1),('段ボールを管理組合に直接持っていく。',2),('資源ごみをひもで縛らずに出す。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
仕事が速い人は、必ずしも手を動かすのが速い人ではない。むしろ、取りかかる前に、何をどの順番でやるかを考える時間を惜しまない人である。いきなり始めて途中でやり直すより、最初に少し立ち止まるほうが、結果的に早く終わるのだ。

質問：筆者によると、仕事が速い人とはどんな人か。','始める前に、手順をよく考える人',NULL,43,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('始める前に、手順をよく考える人',0),('手を動かすのが誰よりも速い人',1),('やり直しを恐れず、すぐに始める人',2),('一度に多くの仕事を引き受ける人',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
方言を「正しくない日本語」と考える人がいる。しかし、方言はその土地の暮らしや歴史の中で育まれてきた言葉である。共通語が全国の人と話すための道具だとすれば、方言は、その土地の人と心を通わせるための言葉だと言えるだろう。

質問：筆者は方言をどのようなものだと考えているか。','その土地の人どうしが心を通わせるための言葉',NULL,44,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('その土地の人どうしが心を通わせるための言葉',0),('共通語より劣った言葉',1),('全国の人と話すための道具',2),('いずれ消えていく古い言葉',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
ある企業が、社員の会議時間を半分にする取り組みを始めた。会議は原則三十分、資料は事前に配り、当日は意見交換だけを行う。
当初は「時間が足りない」という不満の声もあった。しかし、数か月たつと、社員は事前に資料を読み、自分の意見をまとめてから会議に臨むようになった。その結果、会議の時間は短くなったにもかかわらず、議論の中身はむしろ深まったという。
時間を減らすことは、単なる効率化ではない。限られた時間をどう使うかを、一人ひとりに考えさせるきっかけになるのである。

質問：取り組みを始めた当初、社員はどう感じていたか。','時間が足りないと不満に思っていた。',NULL,45,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('時間が足りないと不満に思っていた。',0),('会議が短くなって喜んでいた。',1),('資料を事前に読むのは当然だと思っていた。',2),('議論が深まったと感じていた。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
ある企業が、社員の会議時間を半分にする取り組みを始めた。会議は原則三十分、資料は事前に配り、当日は意見交換だけを行う。
当初は「時間が足りない」という不満の声もあった。しかし、数か月たつと、社員は事前に資料を読み、自分の意見をまとめてから会議に臨むようになった。その結果、会議の時間は短くなったにもかかわらず、議論の中身はむしろ深まったという。
時間を減らすことは、単なる効率化ではない。限られた時間をどう使うかを、一人ひとりに考えさせるきっかけになるのである。

質問：会議の時間を短くした結果、どうなったか。','社員が準備してから会議に臨むようになり、議論が深まった。',NULL,46,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('社員が準備してから会議に臨むようになり、議論が深まった。',0),('議論の時間が足りず、結論が出なくなった。',1),('資料を配らなくなり、会議が早く終わった。',2),('会議の回数が増え、全体の時間は変わらなかった。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
ある企業が、社員の会議時間を半分にする取り組みを始めた。会議は原則三十分、資料は事前に配り、当日は意見交換だけを行う。
当初は「時間が足りない」という不満の声もあった。しかし、数か月たつと、社員は事前に資料を読み、自分の意見をまとめてから会議に臨むようになった。その結果、会議の時間は短くなったにもかかわらず、議論の中身はむしろ深まったという。
時間を減らすことは、単なる効率化ではない。限られた時間をどう使うかを、一人ひとりに考えさせるきっかけになるのである。

質問：筆者は、時間を減らすことについてどう考えているか。','時間の使い方を一人ひとりが考えるきっかけになる。',NULL,47,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('時間の使い方を一人ひとりが考えるきっかけになる。',0),('効率化のためだけに行うべきだ。',1),('議論が浅くなるので、慎重に行うべきだ。',2),('社員の不満が大きいので、やめたほうがよい。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
「褒めて伸ばす」という子育ての方法が広く知られるようになった。確かに、褒められた子どもは自信を持ち、意欲的になる。
ただし、注意したいのは褒め方である。「頭がいいね」と能力を褒められ続けた子どもは、失敗を恐れ、難しい課題を避けるようになるという研究がある。一方、「よく頑張ったね」と努力を褒められた子どもは、失敗しても挑戦を続ける傾向があるそうだ。
褒めること自体よりも、何を褒めるかが、子どもの成長を左右するのである。

質問：能力を褒められ続けた子どもはどうなる傾向があるか。','失敗を恐れて、難しいことに挑戦しなくなる。',NULL,48,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('失敗を恐れて、難しいことに挑戦しなくなる。',0),('自信がついて、どんなことにも挑戦する。',1),('努力することの大切さを学ぶ。',2),('褒められないと勉強しなくなる。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
「褒めて伸ばす」という子育ての方法が広く知られるようになった。確かに、褒められた子どもは自信を持ち、意欲的になる。
ただし、注意したいのは褒め方である。「頭がいいね」と能力を褒められ続けた子どもは、失敗を恐れ、難しい課題を避けるようになるという研究がある。一方、「よく頑張ったね」と努力を褒められた子どもは、失敗しても挑戦を続ける傾向があるそうだ。
褒めること自体よりも、何を褒めるかが、子どもの成長を左右するのである。

質問：筆者が最も言いたいことは何か。','子どもの成長には、何を褒めるかが重要だ。',NULL,49,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('子どもの成長には、何を褒めるかが重要だ。',0),('子どもはできるだけたくさん褒めるべきだ。',1),('子どもを褒めることはよくない。',2),('子どもの能力を正しく評価するべきだ。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
「褒めて伸ばす」という子育ての方法が広く知られるようになった。確かに、褒められた子どもは自信を持ち、意欲的になる。
ただし、注意したいのは褒め方である。「頭がいいね」と能力を褒められ続けた子どもは、失敗を恐れ、難しい課題を避けるようになるという研究がある。一方、「よく頑張ったね」と努力を褒められた子どもは、失敗しても挑戦を続ける傾向があるそうだ。
褒めること自体よりも、何を褒めるかが、子どもの成長を左右するのである。

質問：「よく頑張ったね」と褒められた子どもについて、文章の内容に合うものはどれか。','失敗しても挑戦を続けることが多い。',NULL,50,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('失敗しても挑戦を続けることが多い。',0),('失敗を恐れるようになる。',1),('難しい課題を避けるようになる。',2),('自分は頭がいいと思うようになる。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
私たちは毎日、膨大な量の情報に囲まれて暮らしている。スマートフォンを開けば、世界中のニュースや他人の意見が次々と流れてくる。情報が多いことは、一見すると豊かなことのように思える。
しかし、情報が増えるほど、人は自分に都合のよい情報だけを選ぶようになる。自分と同じ意見ばかりに触れていると、それが世の中の多数派であるかのように錯覚してしまう。異なる意見に出会う機会は、かえって減っているのかもしれない。
こうした状況の中で大切なのは、あえて自分と違う意見に耳を傾けることだ。それは心地よいことではない。だが、自分の考えを疑い、確かめる機会を持たなければ、私たちは情報の多さの中で、かえって視野を狭めてしまうだろう。

質問：筆者によると、情報が増えると人はどうなるか。','自分に都合のよい情報だけを選ぶようになる。',NULL,51,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('自分に都合のよい情報だけを選ぶようになる。',0),('あらゆる意見を公平に比べるようになる。',1),('情報を信用しなくなる。',2),('スマートフォンを使わなくなる。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
私たちは毎日、膨大な量の情報に囲まれて暮らしている。スマートフォンを開けば、世界中のニュースや他人の意見が次々と流れてくる。情報が多いことは、一見すると豊かなことのように思える。
しかし、情報が増えるほど、人は自分に都合のよい情報だけを選ぶようになる。自分と同じ意見ばかりに触れていると、それが世の中の多数派であるかのように錯覚してしまう。異なる意見に出会う機会は、かえって減っているのかもしれない。
こうした状況の中で大切なのは、あえて自分と違う意見に耳を傾けることだ。それは心地よいことではない。だが、自分の考えを疑い、確かめる機会を持たなければ、私たちは情報の多さの中で、かえって視野を狭めてしまうだろう。

質問：「錯覚してしまう」とあるが、何を錯覚するのか。','自分と同じ意見が、世の中の多数派であること',NULL,52,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('自分と同じ意見が、世の中の多数派であること',0),('自分が多くの情報を持っていること',1),('他人の意見がすべて間違っていること',2),('ニュースがすべて正しいこと',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
私たちは毎日、膨大な量の情報に囲まれて暮らしている。スマートフォンを開けば、世界中のニュースや他人の意見が次々と流れてくる。情報が多いことは、一見すると豊かなことのように思える。
しかし、情報が増えるほど、人は自分に都合のよい情報だけを選ぶようになる。自分と同じ意見ばかりに触れていると、それが世の中の多数派であるかのように錯覚してしまう。異なる意見に出会う機会は、かえって減っているのかもしれない。
こうした状況の中で大切なのは、あえて自分と違う意見に耳を傾けることだ。それは心地よいことではない。だが、自分の考えを疑い、確かめる機会を持たなければ、私たちは情報の多さの中で、かえって視野を狭めてしまうだろう。

質問：筆者の主張として最も適切なものはどれか。','自分の考えを確かめるために、異なる意見にも耳を傾けるべきだ。',NULL,53,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('自分の考えを確かめるために、異なる意見にも耳を傾けるべきだ。',0),('情報はできるだけ少ないほうがよい。',1),('心地よい情報だけを選んで生活するべきだ。',2),('スマートフォンでニュースを見るのはやめるべきだ。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
A：小学校での英語教育は、早ければ早いほどよい。子どもは音を聞き分ける力が高く、発音も自然に身につく。英語に親しむことで、外国の文化への関心も広がるだろう。
B：英語を早く始めること自体は否定しない。ただ、母語である日本語の力が十分でないうちに英語の時間を増やすと、考える力の土台が弱くなるおそれがある。英語教育と同時に、日本語の力を育てることも忘れてはならない。

質問：AとBのどちらも認めていることは何か。','早いうちから英語を学ぶことには意味がある。',NULL,54,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('早いうちから英語を学ぶことには意味がある。',0),('英語の授業時間をもっと増やすべきだ。',1),('日本語の力が弱くなるおそれがある。',2),('英語よりも日本語を優先するべきだ。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
A：小学校での英語教育は、早ければ早いほどよい。子どもは音を聞き分ける力が高く、発音も自然に身につく。英語に親しむことで、外国の文化への関心も広がるだろう。
B：英語を早く始めること自体は否定しない。ただ、母語である日本語の力が十分でないうちに英語の時間を増やすと、考える力の土台が弱くなるおそれがある。英語教育と同時に、日本語の力を育てることも忘れてはならない。

質問：Bが心配していることは何か。','日本語の力が育たないうちに英語の時間を増やすこと',NULL,55,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('日本語の力が育たないうちに英語の時間を増やすこと',0),('子どもの発音がよくならないこと',1),('外国の文化に関心を持たなくなること',2),('英語を始める時期が遅すぎること',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
（スポーツクラブ料金表）
・一般会員：月 8,000円（全日利用可）
・平日会員：月 6,000円（月〜金 終日）
・夜間会員：月 5,000円（全日 18:00以降）
・学生会員：月 4,000円（全日利用可・学生証が必要）
※入会金 3,000円（キャンペーン中につき、今月入会の方は無料）

質問：会社員の森さんは、土曜日の午前と平日の夜に通いたい。どの会員になるのがよいか。','一般会員',NULL,56,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('一般会員',0),('平日会員',1),('夜間会員',2),('学生会員',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'reading','multiple_choice','【文章】
（スポーツクラブ料金表）
・一般会員：月 8,000円（全日利用可）
・平日会員：月 6,000円（月〜金 終日）
・夜間会員：月 5,000円（全日 18:00以降）
・学生会員：月 4,000円（全日利用可・学生証が必要）
※入会金 3,000円（キャンペーン中につき、今月入会の方は無料）

質問：大学生の小川さんが来月入会し、学生会員になる場合、最初の月に払う金額はいくらか。','7,000円',NULL,57,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('7,000円',0),('4,000円',1),('3,000円',2),('8,000円',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','会社で女の人と男の人が話しています。女の人はこのあと何をしますか。','先方に打ち合わせの時間を確認する','会社で女の人と男の人が話しています。女の人はこのあと何をしますか。
女：課長、来週の出張の件ですが、ホテルはもう予約しました。
男：ありがとう。新幹線のほうは？
女：新幹線は、先方との打ち合わせの時間が決まってから取ろうと思っています。
男：そうか。先方には連絡した？
女：いえ、まだです。
男：じゃあ、まずそれを確認して。時間が決まらないと何も進まないから。
女の人はこのあと何をしますか。',58,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('先方に打ち合わせの時間を確認する',0),('ホテルを予約する',1),('新幹線の切符を取る',2),('課長に報告書を出す',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','病院で受付の人と男の人が話しています。男の人は次に何をしますか。','問診票を書く','病院で受付の人と男の人が話しています。男の人は次に何をしますか。
女：こんにちは。初めての方ですか。
男：はい。
女：では、保険証をお預かりします。それから、こちらの問診票にご記入ください。
男：はい。あ、保険証、今日は家に忘れてしまって。
女：そうですか。では本日は、いったん全額をお支払いいただいて、後日保険証をお持ちいただければ差額をお返しします。まずは問診票のほうをお願いします。
男の人は次に何をしますか。',59,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('問診票を書く',0),('保険証を取りに家に帰る',1),('全額を支払う',2),('診察室に入る',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','大学で男の学生と女の学生が話しています。男の学生はいつまでにレポートを出しますか。','木曜日','大学で男の学生と女の学生が話しています。男の学生はいつまでにレポートを出しますか。
男：経済学のレポート、締め切りっていつだっけ。
女：金曜日だよ。でも、先生が、提出は事務室じゃなくてオンラインでって言ってた。
男：そうなんだ。金曜日はバイトで忙しいから、前の日に出しておこう。
女：それがいいよ。
男の学生はいつまでにレポートを出しますか。',60,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('木曜日',0),('水曜日',1),('金曜日',2),('土曜日',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','電話で男の人と女の人が話しています。女の人は何を持っていきますか。','飲み物','電話で男の人と女の人が話しています。女の人は何を持っていきますか。
男：あした、うちでバーベキューするんだけど、来られる？
女：うん、行く行く。何か持っていこうか。
男：肉と野菜はこっちで用意するから、飲み物をお願いできる？
女：いいよ。お皿とかは？
男：紙皿はあるから大丈夫。
女：じゃあ、飲み物だけね。
女の人は何を持っていきますか。',61,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('飲み物',0),('肉',1),('野菜',2),('紙皿',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','会社で男の人と女の人が話しています。男の人は会議の資料をどうしますか。','十部用意し、グラフのページだけカラーにする','会社で男の人と女の人が話しています。男の人は会議の資料をどうしますか。
男：明日の会議の資料、十部印刷すればいいですか。
女：出席者は八人だけど、念のため二部多く用意しておいて。
男：わかりました。カラーで印刷しますか。
女：グラフのページだけカラーにして、ほかは白黒でいいわ。
男の人は会議の資料をどうしますか。',62,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('十部用意し、グラフのページだけカラーにする',0),('八部用意し、すべてカラーにする',1),('十部用意し、すべて白黒にする',2),('八部用意し、グラフのページだけカラーにする',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','男の人と女の人が話しています。男の人が仕事を辞めた一番の理由は何ですか。','自分の店を開きたいから','男の人と女の人が話しています。男の人が仕事を辞めた一番の理由は何ですか。
女：会社、辞めたんだって？給料もよかったのに。
男：うん。給料に不満はなかったし、人間関係も悪くなかったんだ。
女：じゃあ、どうして？
男：昔から、自分の店を開くのが夢だったんだよ。年齢的にも、今始めないともうできないと思って。
男の人が仕事を辞めた一番の理由は何ですか。',63,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('自分の店を開きたいから',0),('給料が安かったから',1),('人間関係が悪かったから',2),('体を壊したから',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','テレビでアナウンサーが話しています。今年の桜の開花が早い理由は何だと言っていますか。','三月に暖かい日が続いたから','テレビでアナウンサーが話しています。今年の桜の開花が早い理由は何だと言っていますか。
女：今年は、各地で桜の開花が例年より一週間ほど早くなっています。冬の寒さが厳しかったため、つぼみが十分に目を覚まし、その後、三月に入ってから気温の高い日が続いたことが主な原因と考えられています。
今年の桜の開花が早い理由は何だと言っていますか。',64,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('三月に暖かい日が続いたから',0),('冬が暖かかったから',1),('雨が多かったから',2),('日照時間が短かったから',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','女の人と男の人が新しいカフェについて話しています。女の人はこのカフェの何が一番気に入っていますか。','ゆっくり本が読めること','女の人と男の人が新しいカフェについて話しています。女の人はこのカフェの何が一番気に入っていますか。
男：駅前の新しいカフェ、よく行ってるんだって？コーヒーがおいしいの？
女：コーヒーも悪くないけど、それより、席と席の間が広くて、ゆっくり本が読めるのがいいのよ。
男：へえ。値段は？
女：ちょっと高めかな。
女の人はこのカフェの何が一番気に入っていますか。',65,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('ゆっくり本が読めること',0),('コーヒーがおいしいこと',1),('値段が安いこと',2),('駅から近いこと',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','会社で上司と部下が話しています。上司は部下の報告書の何が問題だと言っていますか。','結論がわかりにくいこと','会社で上司と部下が話しています。上司は部下の報告書の何が問題だと言っていますか。
女：課長、報告書、いかがでしたか。
男：うん、よく調べてあるし、誤字もない。ただね、結論がどこに書いてあるのかわかりにくいんだ。読む人は忙しいから、最初に結論を書いてほしい。
女：わかりました。すぐ直します。
上司は部下の報告書の何が問題だと言っていますか。',66,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('結論がわかりにくいこと',0),('調査が足りないこと',1),('誤字が多いこと',2),('分量が少ないこと',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','男の人が講演で話しています。男の人は、外国語の上達に最も必要なことは何だと言っていますか。','間違いを恐れずに話すこと','男の人が講演で話しています。男の人は、外国語の上達に最も必要なことは何だと言っていますか。
男：外国語を学ぶとき、多くの人は単語や文法の知識を増やすことに力を入れます。もちろんそれも大切ですが、私の経験では、間違いを恐れずに実際に話してみることが何より重要です。間違えて、直して、また話す。その繰り返しの中でしか、言葉は身につかないのです。
男の人は、外国語の上達に最も必要なことは何だと言っていますか。',67,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('間違いを恐れずに話すこと',0),('単語の数を増やすこと',1),('文法を正確に覚えること',2),('その国に住むこと',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','ラジオで専門家が話しています。専門家は何について話していますか。','家庭でできる食品ロスの減らし方','ラジオで専門家が話しています。
女：食品ロスの多くは、実は家庭から出ています。買いすぎて使い切れなかった野菜や、賞味期限が切れた食品などです。賞味期限は「おいしく食べられる期限」であって、過ぎたらすぐ食べられなくなるわけではありません。買い物の前に冷蔵庫の中を確認する、それだけでも食品ロスは減らせます。
専門家は何について話していますか。',68,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('家庭でできる食品ロスの減らし方',0),('賞味期限の決め方',1),('冷蔵庫の選び方',2),('野菜の保存方法',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','大学の授業で先生が話しています。先生は何について話していますか。','最初の情報が判断に与える影響','大学の授業で先生が話しています。
男：人は、最初に見た情報に判断を引きずられる傾向があります。例えば、最初に一万円という値段を見せられた後で五千円の商品を見ると、安く感じてしまう。これを心理学では「アンカリング効果」と呼びます。買い物だけでなく、交渉や評価の場面でも、この効果は私たちの判断に影響しているのです。
先生は何について話していますか。',69,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('最初の情報が判断に与える影響',0),('上手な値段の決め方',1),('交渉で勝つための方法',2),('買い物で節約するコツ',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','女の人がスピーチをしています。女の人が伝えたいことは何ですか。','小さな声かけが人の支えになる','女の人がスピーチをしています。
女：私は三年前、留学先で言葉が通じず、毎日が不安でした。そんなとき、隣の部屋の学生が、毎朝あいさつをしてくれたんです。たった一言でしたが、そのおかげで、ここにいていいんだと思えました。小さな声かけが、誰かの支えになることがある。今度は私が、そういう存在になりたいと思っています。
女の人が伝えたいことは何ですか。',70,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('小さな声かけが人の支えになる',0),('留学では言葉の勉強が一番大切だ',1),('隣の人とは仲良くするべきだ',2),('外国での生活はとても不安だ',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','テレビで男の人が話しています。男の人は、町の商店街についてどう考えていますか。','人とのつながりを生かせば生き残れる','テレビで男の人が話しています。
男：大型のショッピングモールができてから、町の商店街は客が減りました。でも、商店街には、店の人と話しながら買い物ができる良さがあります。値段や品ぞろえで勝負するのではなく、人とのつながりを大切にした店づくりをすれば、商店街はまだまだ生き残れると思います。
男の人は、町の商店街についてどう考えていますか。',71,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('人とのつながりを生かせば生き残れる',0),('値段を下げなければ生き残れない',1),('ショッピングモールと合併するべきだ',2),('もう役割を終えたので閉じるべきだ',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','ううん、私も今来たところ。','ごめん、待った？道が思った以上に混んでて。',72,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('ううん、私も今来たところ。',0),('うん、道は空いてたよ。',1),('じゃあ、待っててね。',2),('いいえ、混んでいません。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','では、もう少し内容を練り直します。','この企画、今のままだと、通るかどうか微妙だね。',73,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('では、もう少し内容を練り直します。',0),('はい、もう通りました。',1),('そうですね、とても微笑ましいです。',2),('じゃあ、別の道を通りましょう。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','えっ、そうなんですか。寂しくなりますね。','田中さん、来月から大阪に転勤だそうですよ。',74,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('えっ、そうなんですか。寂しくなりますね。',0),('はい、来月行ってきました。',1),('では、大阪まで送ります。',2),('いえ、転勤はしていません。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','お疲れさまでした。','お先に失礼します。',75,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('お疲れさまでした。',0),('いってらっしゃい。',1),('お先にどうぞ。',2),('ただいま。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','はい、こちらにご用意しております。','例の資料、まだできてないとは言わせないよ。',76,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('はい、こちらにご用意しております。',0),('はい、言いませんでした。',1),('まだ言っていません。',2),('では、私が言っておきます。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','あ、ここを押してから、枚数を選んでください。','あのう、このコピー機、使い方がよくわからないんですが。',77,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('あ、ここを押してから、枚数を選んでください。',0),('はい、私もよくわかります。',1),('じゃあ、使わないでおきます。',2),('コピー機は便利ですよね。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','家で映画でも見て過ごそうか。','せっかくの休みなのに、雨じゃどこにも行けないね。',78,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('家で映画でも見て過ごそうか。',0),('うん、晴れてよかったね。',1),('じゃあ、海に行こうか。',2),('せっかくだから、雨を降らせよう。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','確かに、少しつじつまが合わない気がします。','彼の話、どうも腑に落ちないところがあるんだよね。',79,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('確かに、少しつじつまが合わない気がします。',0),('はい、よく落ちますね。',1),('そうですね、とても納得できます。',2),('じゃあ、拾っておきます。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','ありがとうございます。よろしくお願いします。','この件については、私のほうから先方に伝えておきます。',80,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('ありがとうございます。よろしくお願いします。',0),('いいえ、伝えないでください、どうも。',1),('はい、先方から聞きました。',2),('では、伝えてもらいました。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','そうですね。何か悩みでもあるんでしょうか。','最近、山本さん、ずいぶん元気がないみたいだけど。',81,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('そうですね。何か悩みでもあるんでしょうか。',0),('ええ、とても元気ですね。',1),('はい、山本さんは来ません。',2),('じゃあ、元気を出しましょう。',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','男の人と女の人がパソコンを買うことについて話しています。男の人はどのパソコンを買いますか。','B','男の人と女の人がパソコンを買うことについて話しています。
女：パソコン、どれにするか決めた？
男：まだ迷ってて。Aは画面が大きくて仕事しやすいけど、重いんだ。Bは軽くて持ち運びに便利だけど、値段が高い。Cは安いけど、性能がちょっとね。
女：出張が多いんでしょう？毎日持ち歩くなら、重いのはつらいよ。
男：そうなんだよね。値段は少し高くても、毎日使うものだから、それにするよ。
男の人はどのパソコンを買いますか。',82,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('B',0),('A',1),('C',2),('まだ決めていない',3)) AS o(text, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","sortOrder","updatedAt") SELECT id,'listening','listening','会社で三人が社員旅行の行き先について話しています。行き先はどこに決まりましたか。','京都','会社で三人が社員旅行の行き先について話しています。
女1：候補は、京都、北海道、沖縄の三つですね。
男：北海道は料理がおいしいけど、移動に時間がかかるなあ。一泊二日だからね。
女2：沖縄も飛行機代が高いし、台風の季節が心配です。
女1：京都なら新幹線ですぐだし、歴史のある場所も多いですよね。
男：そうだね。短い日程なら、移動が楽なところがいい。そこにしよう。
行き先はどこに決まりましたか。',83,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-day-du-2' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","sortOrder") SELECT id, o.text, o.ord FROM qq, (VALUES ('京都',0),('北海道',1),('沖縄',2),('まだ決まっていない',3)) AS o(text, ord);
COMMIT;
