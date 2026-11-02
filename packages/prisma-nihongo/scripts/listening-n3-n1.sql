-- Luyện nghe N3/N2/N1 (đề tự soạn, đọc bằng TTS) + sửa/bổ sung nguồn podcast. Chạy lại an toàn.
BEGIN;
-- N3 — Luyện nghe (20 câu)
DELETE FROM "MockExamTemplate" WHERE slug = 'n3-luyen-nghe';
INSERT INTO "MockExamTemplate" ("slug","level","title","description","sourceMode","durationMinutes","lessonFrom","lessonTo","kanjiLessonFrom","kanjiLessonTo","vocabCount","grammarCount","kanjiCount","listeningWordCount","listeningSentenceCount","passThreshold","scope","isPublished","sortOrder","updatedAt") VALUES ('n3-luyen-nghe','n3','N3 — Luyện nghe (20 câu)','20 câu nghe N3 theo các dạng trong đề thật: hiểu nhiệm vụ, nắm ý chính, hiểu khái quát và phản xạ trả lời. Mỗi đoạn được nghe tối đa 3 lần.','CUSTOM',25,1,1,1,1,0,0,0,0,0,60,'Chỉ phần Nghe · đề tự soạn',true,16,CURRENT_TIMESTAMP);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','男の人と女の人が話しています。男の人はこのあと何を買いますか。','しょうゆ','スーパーで男の人と女の人が話しています。男の人はこのあと何を買いますか。
女：卵と牛乳はもうかごに入れたよ。
男：パンも買う？
女：パンはまだ家にあるから、いらない。あ、そうだ、しょうゆがなくなりそうだった。
男：じゃあ、取ってくるよ。
男の人はこのあと何を買いますか。',NULL::text,1,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('しょうゆ',NULL::text,0),('卵',NULL::text,1),('牛乳',NULL::text,2),('パン',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','女の学生と男の学生が話しています。二人はどこで会いますか。','学校の食堂','女の学生と男の学生が話しています。二人はどこで会いますか。
女：あしたの勉強会、図書館でする？
男：図書館は話せないから、駅の前のカフェはどう？
女：あそこはいつも混んでるよ。学校の食堂なら、午後はすいてるけど。
男：じゃあ、そうしよう。
二人はどこで会いますか。',NULL::text,2,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('学校の食堂',NULL::text,0),('図書館',NULL::text,1),('駅の前のカフェ',NULL::text,2),('駅の改札',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','会社で女の人と男の人が話しています。男の人は何時に会議室に行きますか。','一時四十五分','会社で女の人と男の人が話しています。男の人は何時に会議室に行きますか。
女：会議は二時からですけど、準備があるので、三十分前に来てもらえますか。
男：わかりました。
女：あ、でも、私が一時半まで別の打ち合わせなので、四十五分でいいです。
男：はい。
男の人は何時に会議室に行きますか。',NULL::text,3,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('一時四十五分',NULL::text,0),('一時半',NULL::text,1),('二時',NULL::text,2),('二時半',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','男の人が店の人と話しています。男の人はどのシャツを買いますか。','大きいサイズの白いシャツ','男の人が店の人と話しています。男の人はどのシャツを買いますか。
男：すみません、この青いシャツ、もう少し大きいサイズはありますか。
女：申し訳ありません、青は今そのサイズしかなくて。白なら大きいサイズがございます。
男：白ですか。じゃあ、それにします。
男の人はどのシャツを買いますか。',NULL::text,4,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('大きいサイズの白いシャツ',NULL::text,0),('大きいサイズの青いシャツ',NULL::text,1),('小さいサイズの青いシャツ',NULL::text,2),('小さいサイズの白いシャツ',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','女の人と男の人が話しています。女の人はどうして元気がありませんか。','犬が病気になったから','女の人と男の人が話しています。女の人はどうして元気がありませんか。
男：元気ないね。テスト、だめだったの？
女：ううん、テストはよかったの。
男：じゃあ、どうしたの？
女：実は、かわいがっていた犬が病気になっちゃって。
女の人はどうして元気がありませんか。',NULL::text,5,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('犬が病気になったから',NULL::text,0),('テストがだめだったから',NULL::text,1),('風邪をひいたから',NULL::text,2),('友達とけんかしたから',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','男の人と女の人が話しています。男の人はどうして遅れましたか。','かぎが見つからなかったから','男の人と女の人が話しています。男の人はどうして遅れましたか。
女：遅かったね。電車が止まったの？
男：いや、電車は大丈夫だったんだけど、家を出るとき、かぎが見つからなくて。
女：そうだったんだ。
男の人はどうして遅れましたか。',NULL::text,6,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('かぎが見つからなかったから',NULL::text,0),('電車が止まったから',NULL::text,1),('寝坊したから',NULL::text,2),('道に迷ったから',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','ラジオで女の人が話しています。あしたの天気はどうですか。','［図］朝は晴れ、夕方から雨','ラジオで女の人が話しています。あしたの天気はどうですか。
女：あしたは、朝のうちは晴れますが、昼過ぎから雲が多くなり、夕方からは雨が降るでしょう。お出かけの際は、傘をお持ちください。
あしたの天気はどうですか。',NULL::text,7,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('［図］朝は晴れ、夕方から雨','/media/exam/hare-ame.svg',0),('［図］一日中晴れ','/media/exam/hare-hare.svg',1),('［図］一日中雨','/media/exam/ame-ame.svg',2),('［図］朝は雨、午後から晴れ','/media/exam/ame-hare.svg',3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','男の人と女の人が話しています。女の人が新しいアルバイトを選んだ一番の理由は何ですか。','家から近いから','男の人と女の人が話しています。女の人が新しいアルバイトを選んだ一番の理由は何ですか。
男：新しいアルバイト、始めたんだって？時給がいいの？
女：時給は前と同じくらい。でも、家から歩いて五分なの。
男：それは楽だね。
女：うん、それが一番かな。
女の人が新しいアルバイトを選んだ一番の理由は何ですか。',NULL::text,8,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('家から近いから',NULL::text,0),('時給がいいから',NULL::text,1),('仕事が楽だから',NULL::text,2),('友達がいるから',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','先生が学生に話しています。学生は来週の授業に何を持ってきますか。','好きな写真','先生が学生に話しています。学生は来週の授業に何を持ってきますか。
男：来週は、教科書は使いません。そのかわり、自分が好きな写真を一枚持ってきてください。その写真について、日本語で説明してもらいます。辞書は使ってもいいですよ。
学生は来週の授業に何を持ってきますか。',NULL::text,9,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('好きな写真',NULL::text,0),('教科書',NULL::text,1),('辞書だけ',NULL::text,2),('作文',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','女の人と男の人が話しています。男の人は週末何をしましたか。','映画を見に行った','女の人と男の人が話しています。男の人は週末何をしましたか。
女：週末、山に登るって言ってたよね。どうだった？
男：それが、雨で行けなくなって。
女：じゃあ、家にいたの？
男：ううん、友達と映画を見に行ったよ。
男の人は週末何をしましたか。',NULL::text,10,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('映画を見に行った',NULL::text,0),('山に登った',NULL::text,1),('家で休んだ',NULL::text,2),('友達の家に行った',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','ええ、いいですよ。','すみません、ちょっとこの荷物、持っていただけませんか。',NULL::text,11,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('ええ、いいですよ。',NULL::text,0),('いいえ、持っていません。',NULL::text,1),('はい、ありがとうございます。',NULL::text,2),('どうぞ、お持ちください。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','うん、午後なら大丈夫だよ。','あした、もし時間があったら、手伝ってもらえる？',NULL::text,12,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('うん、午後なら大丈夫だよ。',NULL::text,0),('うん、手伝ってもらったよ。',NULL::text,1),('あしたは時間だよ。',NULL::text,2),('ありがとう、助かったよ。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','うん、初めてだけど、がんばってみた。','このケーキ、全部一人で作ったの？',NULL::text,13,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('うん、初めてだけど、がんばってみた。',NULL::text,0),('うん、全部食べたよ。',NULL::text,1),('ううん、まだ作ってないよ。',NULL::text,2),('じゃあ、一緒に作ろう。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','いいえ、私も今来たところです。','遅くなってすみません。',NULL::text,14,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('いいえ、私も今来たところです。',NULL::text,0),('はい、すみませんでした。',NULL::text,1),('じゃあ、遅くなりましょう。',NULL::text,2),('いいえ、早いですね。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','歩いて十分ぐらいです。','駅までどのくらいかかりますか。',NULL::text,15,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('歩いて十分ぐらいです。',NULL::text,0),('駅で待っています。',NULL::text,1),('三百円です。',NULL::text,2),('まっすぐ行ってください、ありがとう。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','じゃあ、お茶をお願いします。','お茶とコーヒー、どちらがいいですか。',NULL::text,16,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('じゃあ、お茶をお願いします。',NULL::text,0),('はい、どちらもいいです、どうぞ。',NULL::text,1),('コーヒーはありません。',NULL::text,2),('お茶はおいしいですね。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','どういたしまして。また何かあったら言ってね。','今週の土曜日、引っ越しを手伝ってくれてありがとう。',NULL::text,17,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('どういたしまして。また何かあったら言ってね。',NULL::text,0),('うん、手伝ってあげるよ。',NULL::text,1),('いいえ、引っ越ししません。',NULL::text,2),('じゃあ、土曜日にね。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','うん、読み終わったら返してね。','この本、借りてもいい？',NULL::text,18,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('うん、読み終わったら返してね。',NULL::text,0),('うん、借りたよ。',NULL::text,1),('ありがとう、借りるね。',NULL::text,2),('いいえ、貸しません、ありがとう。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','ありがとう。そうさせてもらうね。','熱があるなら、きょうは早く帰ったほうがいいよ。',NULL::text,19,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('ありがとう。そうさせてもらうね。',NULL::text,0),('うん、熱くないよ。',NULL::text,1),('じゃあ、もっと働くね。',NULL::text,2),('いいえ、早く来ました。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','うん、この仕事を終わらせてから帰る。','あれ、まだ帰らないの？',NULL::text,20,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n3-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('うん、この仕事を終わらせてから帰る。',NULL::text,0),('うん、もう帰ったよ。',NULL::text,1),('じゃあ、帰らないでね。',NULL::text,2),('うん、まだ来ないよ。',NULL::text,3)) AS o(text, img, ord);
-- N2 — Luyện nghe (20 câu)
DELETE FROM "MockExamTemplate" WHERE slug = 'n2-luyen-nghe';
INSERT INTO "MockExamTemplate" ("slug","level","title","description","sourceMode","durationMinutes","lessonFrom","lessonTo","kanjiLessonFrom","kanjiLessonTo","vocabCount","grammarCount","kanjiCount","listeningWordCount","listeningSentenceCount","passThreshold","scope","isPublished","sortOrder","updatedAt") VALUES ('n2-luyen-nghe','n2','N2 — Luyện nghe (20 câu)','20 câu nghe N2 theo các dạng trong đề thật: hiểu nhiệm vụ, nắm ý chính, hiểu khái quát và phản xạ trả lời. Mỗi đoạn được nghe tối đa 3 lần.','CUSTOM',30,1,1,1,1,0,0,0,0,0,60,'Chỉ phần Nghe · đề tự soạn',true,17,CURRENT_TIMESTAMP);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','会社で男の人と女の人が話しています。男の人はこのあとまず何をしますか。','自由記述の意見をまとめる','会社で男の人と女の人が話しています。男の人はこのあとまず何をしますか。
女：新商品のアンケート、集計は終わった？
男：はい、さっき終わりました。これからグラフにしようと思っています。
女：グラフは私がやるから、先に自由記述の意見をまとめてくれない？明日の会議で一番知りたいのはそこだから。
男：わかりました。
男の人はこのあとまず何をしますか。',NULL::text,1,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('自由記述の意見をまとめる',NULL::text,0),('アンケートを集計する',NULL::text,1),('グラフを作る',NULL::text,2),('会議の資料を印刷する',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','電話で女の人と男の人が話しています。女の人はいつ歯医者に行きますか。','金曜日の午後','電話で女の人と男の人が話しています。女の人はいつ歯医者に行きますか。
女：予約の変更をお願いしたいんですが。水曜日の午後三時に予約しているんですけど。
男：はい。ご希望の日はございますか。
女：木曜日の同じ時間は空いていますか。
男：木曜日は午前中でしたら空いております。午後ですと金曜日になりますが。
女：午前は仕事なので、金曜日でお願いします。
女の人はいつ歯医者に行きますか。',NULL::text,2,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('金曜日の午後',NULL::text,0),('水曜日の午後',NULL::text,1),('木曜日の午後',NULL::text,2),('木曜日の午前',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','大学で女の学生と男の学生が話しています。女の学生はゼミの発表で何を変えますか。','データを新しいものにする','大学で女の学生と男の学生が話しています。女の学生はゼミの発表で何を変えますか。
女：昨日、ゼミの発表の練習を先生に見てもらったんだけど。
男：どうだった？
女：内容はいいって。でも、データが古いから、最新のものに入れ替えるように言われた。
男：スライドの数は？
女：それはそのままでいいって。
女の学生はゼミの発表で何を変えますか。',NULL::text,3,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('データを新しいものにする',NULL::text,0),('内容を全部変える',NULL::text,1),('スライドを減らす',NULL::text,2),('発表の時間を短くする',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','市役所の人が話しています。粗大ごみを出すとき、まず何をしなければなりませんか。','電話かインターネットで申し込む','市役所の人が話しています。粗大ごみを出すとき、まず何をしなければなりませんか。
女：粗大ごみを出すときは、まず電話かインターネットで申し込んでください。申し込みのときに料金をお知らせしますので、コンビニで処理券を買い、ごみに貼って、指定された日に出してください。
粗大ごみを出すとき、まず何をしなければなりませんか。',NULL::text,4,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('電話かインターネットで申し込む',NULL::text,0),('コンビニで処理券を買う',NULL::text,1),('ごみに処理券を貼る',NULL::text,2),('指定された日に出す',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','男の人と女の人が話しています。男の人がジムをやめた理由は何ですか。','ジムの営業時間に行けなくなったから','男の人と女の人が話しています。男の人がジムをやめた理由は何ですか。
女：ジム、やめちゃったの？
男：うん。料金は高くなかったし、設備もよかったんだけどね。
女：じゃあ、どうして？
男：仕事の時間が変わって、営業時間に間に合わなくなっちゃったんだ。
男の人がジムをやめた理由は何ですか。',NULL::text,5,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('ジムの営業時間に行けなくなったから',NULL::text,0),('料金が高かったから',NULL::text,1),('設備がよくなかったから',NULL::text,2),('仕事をやめたから',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','女の人がインタビューに答えています。女の人がこの仕事を選んだきっかけは何ですか。','祖母の入院中に看護師が優しくしてくれたこと','女の人がインタビューに答えています。女の人がこの仕事を選んだきっかけは何ですか。
男：看護師になろうと思ったきっかけは何ですか。
女：子どものころ、祖母が長く入院していたんです。そのとき、看護師さんが祖母だけでなく、家族の私たちにも優しく声をかけてくれて。それで、私もこういう仕事がしたいと思いました。
女の人がこの仕事を選んだきっかけは何ですか。',NULL::text,6,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('祖母の入院中に看護師が優しくしてくれたこと',NULL::text,0),('自分が子どものころに入院したこと',NULL::text,1),('親が看護師だったこと',NULL::text,2),('学校の先生にすすめられたこと',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','男の人と女の人が新しいレストランについて話しています。男の人はこのレストランの何が不満ですか。','料理が出るのが遅いこと','男の人と女の人が新しいレストランについて話しています。男の人はこのレストランの何が不満ですか。
女：駅前の新しいイタリアン、行ってみた？
男：うん。味はよかったし、値段も手ごろだったよ。
女：へえ、いいじゃない。
男：でも、料理が出てくるまで四十分も待たされたのはね。
男の人はこのレストランの何が不満ですか。',NULL::text,7,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('料理が出るのが遅いこと',NULL::text,0),('味がよくないこと',NULL::text,1),('値段が高いこと',NULL::text,2),('駅から遠いこと',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','テレビで医者が話しています。医者は、熱中症を防ぐために何が最も大切だと言っていますか。','のどが渇く前に水分をとること','テレビで医者が話しています。医者は、熱中症を防ぐために何が最も大切だと言っていますか。
男：熱中症を防ぐには、帽子をかぶる、涼しい服を着るなどの工夫も大切です。しかし、何よりも大切なのは、のどが渇く前にこまめに水分をとることです。のどが渇いたと感じたときには、すでに体の水分が不足していることが多いのです。
医者は、熱中症を防ぐために何が最も大切だと言っていますか。',NULL::text,8,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('のどが渇く前に水分をとること',NULL::text,0),('帽子をかぶること',NULL::text,1),('涼しい服を着ること',NULL::text,2),('外に出ないこと',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','ラジオで男の人が話しています。男の人は何について話していますか。','自転車に乗る人がルールを守る必要性','ラジオで男の人が話しています。男の人は何について話していますか。
男：最近、自転車で通勤する人が増えています。健康にいい、交通費がかからないなどの理由からです。ただ、それに伴って、自転車と歩行者の事故も増えています。自転車も車と同じ乗り物だという意識を持って、ルールを守って走ってほしいと思います。
男の人は何について話していますか。',NULL::text,9,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('自転車に乗る人がルールを守る必要性',NULL::text,0),('自転車通勤の健康への効果',NULL::text,1),('交通費を節約する方法',NULL::text,2),('新しい自転車の選び方',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','女の人が講演で話しています。女の人の話のテーマは何ですか。','日常生活の中でできる運動','女の人が講演で話しています。女の人の話のテーマは何ですか。
女：私たちはよく、忙しいから運動できないと言います。でも、エレベーターではなく階段を使う、一駅手前で降りて歩くなど、生活の中で体を動かす機会はたくさんあります。特別な時間を作らなくても、運動はできるのです。
女の人の話のテーマは何ですか。',NULL::text,10,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('日常生活の中でできる運動',NULL::text,0),('忙しい人の時間の使い方',NULL::text,1),('エレベーターの安全な使い方',NULL::text,2),('スポーツジムの選び方',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','はい、夕方までには必ずお出しします。','このレポート、今日中に仕上げてもらえるかな。',NULL::text,11,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('はい、夕方までには必ずお出しします。',NULL::text,0),('はい、今日中に仕上がりました。',NULL::text,1),('いいえ、仕上げてもらいました。',NULL::text,2),('じゃあ、明日やってもらいます。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','ええ、実は昔、レストランで働いていたそうですよ。','佐藤さんって、見かけによらず、料理が上手なんですね。',NULL::text,12,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('ええ、実は昔、レストランで働いていたそうですよ。',NULL::text,0),('ええ、見かけたことがありますよ。',NULL::text,1),('そうですね、全然できませんね。',NULL::text,2),('はい、料理を見かけました。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','はい、三時なら問題ありません。','会議の時間、三時からに変更になったんだけど、大丈夫？',NULL::text,13,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('はい、三時なら問題ありません。',NULL::text,0),('はい、三時に変更しました。',NULL::text,1),('いいえ、大丈夫じゃありませんでした。',NULL::text,2),('じゃあ、二時に行きますね。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','ううん、量が多すぎたよね。気にしないで。','せっかく作ってくれたのに、残してしまってごめんね。',NULL::text,14,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('ううん、量が多すぎたよね。気にしないで。',NULL::text,0),('うん、全部食べてくれてありがとう。',NULL::text,1),('じゃあ、もっと作るね。',NULL::text,2),('ううん、作っていないよ。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','あ、すみません。すぐもらってきます。','あれ、この書類、課長のハンコが押してないよ。',NULL::text,15,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('あ、すみません。すぐもらってきます。',NULL::text,0),('はい、押しておきました。',NULL::text,1),('いいえ、課長はいません。',NULL::text,2),('じゃあ、捨てておきます。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','うん、折りたたみ傘ならあるよ。','急に雨が降ってきたね。傘、持ってる？',NULL::text,16,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('うん、折りたたみ傘ならあるよ。',NULL::text,0),('うん、雨はやんだよ。',NULL::text,1),('いいえ、降っていないよ。',NULL::text,2),('じゃあ、傘をさしてあげたよ。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','ええ、皆さん親切なので、だいぶ慣れてきました。','新しい部署には、もう慣れた？',NULL::text,17,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('ええ、皆さん親切なので、だいぶ慣れてきました。',NULL::text,0),('ええ、慣れていただきました。',NULL::text,1),('いいえ、まだ部署がありません。',NULL::text,2),('はい、新しくなりました。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','そうですね。すぐに直します。','この資料、もう少し字を大きくしたほうが見やすいんじゃない？',NULL::text,18,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('そうですね。すぐに直します。',NULL::text,0),('はい、よく見えません。',NULL::text,1),('いいえ、字は書いていません。',NULL::text,2),('じゃあ、小さくしましょう。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','え、いいんですか。じゃあ、お言葉に甘えて。','今日は私がごちそうしますよ。',NULL::text,19,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('え、いいんですか。じゃあ、お言葉に甘えて。',NULL::text,0),('はい、ごちそうさまでした、また明日。',NULL::text,1),('いいえ、ごちそうしてください。',NULL::text,2),('じゃあ、私もごちそうになりました。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','わかった。資料をもう一度見せてくれ。','部長、この件、もう一度検討していただけないでしょうか。',NULL::text,20,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n2-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('わかった。資料をもう一度見せてくれ。',NULL::text,0),('うん、検討してもらったよ。',NULL::text,1),('いや、検討しなくていいよ、ありがとう。',NULL::text,2),('はい、もう一度お願いします。',NULL::text,3)) AS o(text, img, ord);
-- N1 — Luyện nghe (20 câu)
DELETE FROM "MockExamTemplate" WHERE slug = 'n1-luyen-nghe';
INSERT INTO "MockExamTemplate" ("slug","level","title","description","sourceMode","durationMinutes","lessonFrom","lessonTo","kanjiLessonFrom","kanjiLessonTo","vocabCount","grammarCount","kanjiCount","listeningWordCount","listeningSentenceCount","passThreshold","scope","isPublished","sortOrder","updatedAt") VALUES ('n1-luyen-nghe','n1','N1 — Luyện nghe (20 câu)','20 câu nghe N1 theo các dạng trong đề thật: hiểu nhiệm vụ, nắm ý chính, hiểu khái quát và phản xạ trả lời. Mỗi đoạn được nghe tối đa 3 lần.','CUSTOM',35,1,1,1,1,0,0,0,0,0,60,'Chỉ phần Nghe · đề tự soạn',true,18,CURRENT_TIMESTAMP);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','会社で女の人と男の人が話しています。男の人はこのあとまず何をしますか。','契約書の支払い条件を修正する','会社で女の人と男の人が話しています。男の人はこのあとまず何をしますか。
女：例の新規取引先との契約書、法務部のチェックは通った？
男：はい、昨日戻ってきました。あとは先方に送るだけです。
女：その前に、支払い条件のところ、先週の打ち合わせで変更になったでしょう。反映されてる？
男：あ、まだでした。すぐ修正して、もう一度法務部に確認してもらいます。
女：修正が軽微なら、法務部へは私から口頭で伝えておくから、直したらそのまま送って。
男の人はこのあとまず何をしますか。',NULL::text,1,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('契約書の支払い条件を修正する',NULL::text,0),('契約書を先方に送る',NULL::text,1),('法務部に確認を依頼する',NULL::text,2),('先方と打ち合わせをする',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','大学で先生と女の学生が話しています。女の学生は論文をどう直しますか。','先行研究の部分を短くし、研究の必要性を明確にする','大学で先生と女の学生が話しています。女の学生は論文をどう直しますか。
男：論文、読みましたよ。調査はしっかりしているし、結論も妥当だと思う。
女：ありがとうございます。
男：ただ、先行研究の紹介が長すぎて、あなた自身の問題意識が見えにくくなっているね。そこを半分くらいにして、なぜこの研究が必要なのかをはっきり書いてください。
女：はい、わかりました。
女の学生は論文をどう直しますか。',NULL::text,2,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('先行研究の部分を短くし、研究の必要性を明確にする',NULL::text,0),('調査をやり直す',NULL::text,1),('結論を書き直す',NULL::text,2),('先行研究の紹介を増やす',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','電話で男の人と女の人が話しています。男の人は何を持って行かなければなりませんか。','卒業証明書と身分証明書','電話で男の人と女の人が話しています。男の人は何を持って行かなければなりませんか。
男：来週の面接の件でお電話しました。当日、持参するものを確認したいのですが。
女：はい。履歴書は事前にメールでいただいておりますので、不要です。卒業証明書と、身分証明書をお持ちください。
男：作品集などは必要ですか。
女：作品については、面接の際に口頭でご説明いただければ結構です。
男の人は何を持って行かなければなりませんか。',NULL::text,3,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('卒業証明書と身分証明書',NULL::text,0),('履歴書と卒業証明書',NULL::text,1),('作品集と身分証明書',NULL::text,2),('履歴書と作品集',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','男の人と女の人が話しています。女の人が転職を決めた一番の理由は何ですか。','海外と関わる仕事がしたいから','男の人と女の人が話しています。女の人が転職を決めた一番の理由は何ですか。
男：転職するって聞いたけど、今の会社、待遇も悪くないんでしょう。
女：ええ、給料にも人間関係にも、特に不満はないの。
男：じゃあ、どうして？
女：今の会社だと、どうしても国内の仕事が中心でしょう。もっと海外と関わる仕事がしたくて。語学を生かせる場所を探してたの。
女の人が転職を決めた一番の理由は何ですか。',NULL::text,4,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('海外と関わる仕事がしたいから',NULL::text,0),('給料が安いから',NULL::text,1),('人間関係が悪いから',NULL::text,2),('語学を勉強したいから',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','テレビで経済の専門家が話しています。専門家は、物価が上がっている主な原因は何だと言っていますか。','円安で輸入の費用が増えたこと','テレビで経済の専門家が話しています。専門家は、物価が上がっている主な原因は何だと言っていますか。
男：ここ一年、食料品を中心に物価の上昇が続いています。人件費の上昇を挙げる声もありますが、影響はまだ限定的です。主な要因は、原材料の多くを輸入に頼る中で、円安が進み、輸入にかかる費用が大きく膨らんだことにあると考えられます。
専門家は、物価が上がっている主な原因は何だと言っていますか。',NULL::text,5,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('円安で輸入の費用が増えたこと',NULL::text,0),('人件費が上がったこと',NULL::text,1),('国内の生産量が減ったこと',NULL::text,2),('消費者の需要が増えたこと',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','女の人が講演で話しています。女の人は、組織を変えるために何が最も重要だと言っていますか。','現場の人と変える理由を共有すること','女の人が講演で話しています。女の人は、組織を変えるために何が最も重要だと言っていますか。
女：組織を変えようとするとき、多くの人は新しい制度や仕組みを作ることから始めます。しかし、どれほど優れた制度でも、現場の人が納得していなければ形だけのものになってしまいます。遠回りに見えても、まず現場の声に耳を傾け、変える理由を共有すること。それなしには、どんな改革も根づきません。
女の人は、組織を変えるために何が最も重要だと言っていますか。',NULL::text,6,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('現場の人と変える理由を共有すること',NULL::text,0),('新しい制度をすぐに作ること',NULL::text,1),('優れたリーダーを外から呼ぶこと',NULL::text,2),('形だけでも改革を始めること',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','男の人と女の人が話しています。男の人はこの本のどこを評価していますか。','反対の意見も丁寧に紹介している点','男の人と女の人が話しています。男の人はこの本のどこを評価していますか。
女：話題のあの本、読んだ？難しい内容をわかりやすく書いてるって評判だけど。
男：うん、確かに読みやすかった。でも、僕が感心したのは、筆者が自分と反対の立場の意見も丁寧に紹介しているところなんだ。
女：へえ、そういう本って意外と少ないよね。
男の人はこの本のどこを評価していますか。',NULL::text,7,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('反対の意見も丁寧に紹介している点',NULL::text,0),('内容がわかりやすい点',NULL::text,1),('話題になっている点',NULL::text,2),('短くて読みやすい点',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','ラジオで女の人が話しています。女の人は何について話していますか。','空気を読むことの良い面と問題点','ラジオで女の人が話しています。女の人は何について話していますか。
女：「空気を読む」ことは、日本では大切な力だとされています。確かに、場の雰囲気を察して行動できれば、無用な衝突は避けられます。しかし、全員が空気を読んで黙ってしまえば、本当に必要な意見まで出なくなる。時には、あえて空気を読まずに発言する勇気も必要なのではないでしょうか。
女の人は何について話していますか。',NULL::text,8,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('空気を読むことの良い面と問題点',NULL::text,0),('空気を読む力を伸ばす方法',NULL::text,1),('会議で発言しない人の性格',NULL::text,2),('日本と外国の会議の違い',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','大学の授業で先生が話しています。先生の話の主なテーマは何ですか。','原因を一つに決めつけることの危険性','大学の授業で先生が話しています。先生の話の主なテーマは何ですか。
男：私たちは、物事の原因を一つに絞りたがる傾向があります。ある商品が売れなかったのは広告のせいだ、というように。しかし実際には、価格、時期、競合商品など、複数の要因が絡み合っていることがほとんどです。単純な説明は理解しやすい反面、本当の原因を見誤らせる危険があるのです。
先生の話の主なテーマは何ですか。',NULL::text,9,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('原因を一つに決めつけることの危険性',NULL::text,0),('広告が売上に与える影響',NULL::text,1),('商品の価格の決め方',NULL::text,2),('競合商品の分析方法',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','男の人がスピーチをしています。男の人が最も伝えたいことは何ですか。','失敗を恐れずに挑戦してほしい','男の人がスピーチをしています。男の人が最も伝えたいことは何ですか。
男：私は入社以来、失敗を恐れて、確実にできる仕事ばかりを選んできました。評価は悪くありませんでした。でも、十年たって振り返ると、自分が何も成長していないことに気づいたのです。失敗しない道は安全ですが、そこからは何も生まれません。若い皆さんには、失敗を恐れず挑戦してほしいと思います。
男の人が最も伝えたいことは何ですか。',NULL::text,10,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('失敗を恐れずに挑戦してほしい',NULL::text,0),('確実にできる仕事を選ぶべきだ',NULL::text,1),('評価を気にして働くべきだ',NULL::text,2),('十年同じ会社で働くべきだ',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','では、人員を増やして対応しましょうか。','このままでは、納期に間に合わないことも考えられなくはないね。',NULL::text,11,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('では、人員を増やして対応しましょうか。',NULL::text,0),('はい、間に合いました。',NULL::text,1),('いえ、考えたことはありません。',NULL::text,2),('そうですね、納期はまだ決まっていません、残念ですね。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','いえいえ、どうかお気になさらないでください。','先日はとんだご迷惑をおかけしまして。',NULL::text,12,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('いえいえ、どうかお気になさらないでください。',NULL::text,0),('ええ、本当に迷惑でしたね、では。',NULL::text,1),('いいえ、迷惑をかけていません。',NULL::text,2),('こちらこそ、ごちそうさまでした。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','残念ですが、次こそは通るように頑張ります。','君の企画、いいとこまでいったんだけどなあ。',NULL::text,13,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('残念ですが、次こそは通るように頑張ります。',NULL::text,0),('ありがとうございます、通ってよかったです。',NULL::text,1),('はい、いいところへ行ってきました。',NULL::text,2),('じゃあ、企画しなくてもいいですね。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','へえ、意外だね。いつも一緒にいるのに。','あの二人、仲がいいと思いきや、実はそうでもないらしいよ。',NULL::text,14,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('へえ、意外だね。いつも一緒にいるのに。',NULL::text,0),('うん、やっぱり仲がいいよね。',NULL::text,1),('じゃあ、二人を呼ぼうか。',NULL::text,2),('そう、思ったとおりだね。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','じゃあ、私から一緒に話してみましょうか。','部長に直接言うのは、ちょっと気が引けるんですよね。',NULL::text,15,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('じゃあ、私から一緒に話してみましょうか。',NULL::text,0),('はい、気を引いてみます。',NULL::text,1),('そうですね、部長はとても気が利きますね。',NULL::text,2),('いいえ、直接言いました、どうも。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','わかりました。データを追加します。','この報告書、数字の裏付けがもう少し欲しいところだね。',NULL::text,16,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('わかりました。データを追加します。',NULL::text,0),('はい、裏を見ておきます。',NULL::text,1),('いいえ、数字は欲しくありません。',NULL::text,2),('では、もう少し短くします、ありがとう。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','そんな、皆さんのおかげですよ。','田中さんがいなかったら、このプロジェクトは成り立たなかったよ。',NULL::text,17,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('そんな、皆さんのおかげですよ。',NULL::text,0),('はい、田中さんはいませんでした。',NULL::text,1),('そうですね、もう少しで成り立ちます。',NULL::text,2),('じゃあ、田中さんに頼みましょう。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','ええ、五分ほどでしたら大丈夫ですよ。','お忙しいところ申し訳ないのですが、少しお時間をいただけないでしょうか。',NULL::text,18,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('ええ、五分ほどでしたら大丈夫ですよ。',NULL::text,0),('はい、時間をあげました。',NULL::text,1),('いいえ、お忙しくありません、どうぞ。',NULL::text,2),('では、お時間をいただきます。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','すみません。自分で何とかできると思ってしまって。','こんなことになるなら、最初から相談してくれればよかったのに。',NULL::text,19,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('すみません。自分で何とかできると思ってしまって。',NULL::text,0),('はい、最初から相談しました。',NULL::text,1),('よかったですね、相談して。',NULL::text,2),('じゃあ、これから相談しないでおきます。',NULL::text,3)) AS o(text, img, ord);
WITH qq AS (INSERT INTO "MockExamQuestion" ("templateId","sectionId","type","question","correctAnswer","audioText","imageUrl","sortOrder","updatedAt") SELECT id,'listening','listening','メモはありません。文を聞いて、最もよい返事を選んでください。','そうですね。返事を待ってから対応を考えましょう。','例の案件、先方の出方次第ってところかな。',NULL::text,20,CURRENT_TIMESTAMP FROM "MockExamTemplate" WHERE slug='n1-luyen-nghe' RETURNING id)
  INSERT INTO "MockExamQuestionOption" ("questionId","text","imageUrl","sortOrder") SELECT id, o.text, o.img, o.ord FROM qq, (VALUES ('そうですね。返事を待ってから対応を考えましょう。',NULL::text,0),('はい、先方はもう出かけました。',NULL::text,1),('いいえ、案件はありません。',NULL::text,2),('じゃあ、先に出ましょう。',NULL::text,3)) AS o(text, img, ord);
INSERT INTO "PodcastResource" ("externalKey","title","description","url","level","sortOrder","updatedAt") VALUES ('nhk-easy','NHK World — Học tiếng Nhật (bản tiếng Việt)','Bài học hội thoại ngắn có giải thích bằng tiếng Việt, có audio.','https://www3.nhk.or.jp/nhkworld/vi/learnjapanese/','N5–N4',0,CURRENT_TIMESTAMP) ON CONFLICT ("externalKey") DO UPDATE SET "title"=EXCLUDED."title","description"=EXCLUDED."description","url"=EXCLUDED."url","level"=EXCLUDED."level","sortOrder"=EXCLUDED."sortOrder","updatedAt"=CURRENT_TIMESTAMP;
INSERT INTO "PodcastResource" ("externalKey","title","description","url","level","sortOrder","updatedAt") VALUES ('nhk-learn','NHK — Learn Japanese','Tổng hợp chương trình học tiếng Nhật của NHK World.','https://www3.nhk.or.jp/nhkworld/en/learnjapanese/','N5+',1,CURRENT_TIMESTAMP) ON CONFLICT ("externalKey") DO UPDATE SET "title"=EXCLUDED."title","description"=EXCLUDED."description","url"=EXCLUDED."url","level"=EXCLUDED."level","sortOrder"=EXCLUDED."sortOrder","updatedAt"=CURRENT_TIMESTAMP;
INSERT INTO "PodcastResource" ("externalKey","title","description","url","level","sortOrder","updatedAt") VALUES ('jpod101','JapanesePod101 — Thư viện bài học','Podcast theo cấp độ, từ sơ cấp đến cao cấp.','https://www.japanesepod101.com/lesson-library/','N5–N2',2,CURRENT_TIMESTAMP) ON CONFLICT ("externalKey") DO UPDATE SET "title"=EXCLUDED."title","description"=EXCLUDED."description","url"=EXCLUDED."url","level"=EXCLUDED."level","sortOrder"=EXCLUDED."sortOrder","updatedAt"=CURRENT_TIMESTAMP;
INSERT INTO "PodcastResource" ("externalKey","title","description","url","level","sortOrder","updatedAt") VALUES ('jlpt-samples','JLPT — Đề mẫu (nghe)','Đề mẫu chính thức có file nghe cho mọi cấp.','https://www.jlpt.jp/e/samples/forlearners.html','N5–N1',4,CURRENT_TIMESTAMP) ON CONFLICT ("externalKey") DO UPDATE SET "title"=EXCLUDED."title","description"=EXCLUDED."description","url"=EXCLUDED."url","level"=EXCLUDED."level","sortOrder"=EXCLUDED."sortOrder","updatedAt"=CURRENT_TIMESTAMP;
INSERT INTO "PodcastResource" ("externalKey","title","description","url","level","sortOrder","updatedAt") VALUES ('teppei','Nihongo con Teppei','Podcast nói hoàn toàn bằng tiếng Nhật tự nhiên, chủ đề đời thường.','https://nihongoconteppei.com/','N4–N2',5,CURRENT_TIMESTAMP) ON CONFLICT ("externalKey") DO UPDATE SET "title"=EXCLUDED."title","description"=EXCLUDED."description","url"=EXCLUDED."url","level"=EXCLUDED."level","sortOrder"=EXCLUDED."sortOrder","updatedAt"=CURRENT_TIMESTAMP;
INSERT INTO "PodcastResource" ("externalKey","title","description","url","level","sortOrder","updatedAt") VALUES ('nhk-news-easy','NHK NEWS WEB EASY','Tin tức viết lại bằng tiếng Nhật dễ, có furigana và audio đọc tin.','https://www3.nhk.or.jp/news/easy/','N3–N2',6,CURRENT_TIMESTAMP) ON CONFLICT ("externalKey") DO UPDATE SET "title"=EXCLUDED."title","description"=EXCLUDED."description","url"=EXCLUDED."url","level"=EXCLUDED."level","sortOrder"=EXCLUDED."sortOrder","updatedAt"=CURRENT_TIMESTAMP;
INSERT INTO "PodcastResource" ("externalKey","title","description","url","level","sortOrder","updatedAt") VALUES ('nhk-radio-ondemand','NHK らじる★らじる — Nghe lại','Nghe lại các chương trình radio NHK: phỏng vấn, tọa đàm, văn hóa.','https://www.nhk.or.jp/radio/ondemand/','N2–N1',7,CURRENT_TIMESTAMP) ON CONFLICT ("externalKey") DO UPDATE SET "title"=EXCLUDED."title","description"=EXCLUDED."description","url"=EXCLUDED."url","level"=EXCLUDED."level","sortOrder"=EXCLUDED."sortOrder","updatedAt"=CURRENT_TIMESTAMP;
INSERT INTO "PodcastResource" ("externalKey","title","description","url","level","sortOrder","updatedAt") VALUES ('nhk-radio-news','NHK ラジオニュース','Bản tin radio tốc độ thật — luyện nghe cho N1.','https://www.nhk.or.jp/radionews/','N1',8,CURRENT_TIMESTAMP) ON CONFLICT ("externalKey") DO UPDATE SET "title"=EXCLUDED."title","description"=EXCLUDED."description","url"=EXCLUDED."url","level"=EXCLUDED."level","sortOrder"=EXCLUDED."sortOrder","updatedAt"=CURRENT_TIMESTAMP;
COMMIT;
