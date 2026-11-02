-- Bài đọc hiểu bổ sung N5 (6 bài) / N4 (7 bài) — đủ 12 bài mỗi cấp. Chạy lại an toàn.
BEGIN;
DELETE FROM "ReadingPassage" WHERE "source" = 'nihongo-app/reading-2' ;
WITH pp AS (INSERT INTO "ReadingPassage" ("title","content","jlptLevel","source","estimatedMin","sortOrder","updatedAt") VALUES ('わたしの一日','わたしは毎朝六時半におきます。

あさごはんはパンとたまごです。七時半に家を出て、バスで学校へ行きます。

学校は八時半から三時までです。ひるごはんは学校で友だちと食べます。

家にかえってから、しゅくだいをします。夜は十時にねます。','N5','nihongo-app/reading-2',3,7,CURRENT_TIMESTAMP) RETURNING id)
, q0 AS (INSERT INTO "ReadingQuestion" ("passageId","question","answer","explanation","sortOrder") SELECT id,'この人は何で学校へ行きますか。','バス','Bài viết: 「バスで学校へ行きます」.',1 FROM pp RETURNING id),
  q1 AS (INSERT INTO "ReadingQuestion" ("passageId","question","answer","explanation","sortOrder") SELECT id,'学校は何時までですか。','三時','「学校は八時半から三時までです」.',2 FROM pp RETURNING id),
  q2 AS (INSERT INTO "ReadingQuestion" ("passageId","question","answer","explanation","sortOrder") SELECT id,'この人は家にかえってから何をしますか。','しゅくだいをします','「家にかえってから、しゅくだいをします」.',3 FROM pp RETURNING id)
INSERT INTO "ReadingQuestionOption" ("questionId","text","sortOrder")
SELECT id,'でんしゃ',0 FROM q0 UNION ALL SELECT id,'じてんしゃ',1 FROM q0 UNION ALL SELECT id,'バス',2 FROM q0 UNION ALL SELECT id,'あるいて',3 FROM q0 UNION ALL SELECT id,'八時半',0 FROM q1 UNION ALL SELECT id,'十時',1 FROM q1 UNION ALL SELECT id,'十二時',2 FROM q1 UNION ALL SELECT id,'三時',3 FROM q1 UNION ALL SELECT id,'ひるごはんを食べます',0 FROM q2 UNION ALL SELECT id,'しゅくだいをします',1 FROM q2 UNION ALL SELECT id,'バスにのります',2 FROM q2 UNION ALL SELECT id,'すぐねます',3 FROM q2;
WITH pp AS (INSERT INTO "ReadingPassage" ("title","content","jlptLevel","source","estimatedMin","sortOrder","updatedAt") VALUES ('へやのせつめい','これはわたしのへやです。

まどのちかくにつくえがあります。つくえの上にパソコンと本があります。

つくえの右にベッドがあります。ベッドの下にはこがあります。はこの中にはふゆのふくが入っています。

へやはせまいですが、あかるくて、すきです。','N5','nihongo-app/reading-2',3,8,CURRENT_TIMESTAMP) RETURNING id)
, q0 AS (INSERT INTO "ReadingQuestion" ("passageId","question","answer","explanation","sortOrder") SELECT id,'パソコンはどこにありますか。','つくえの上','「つくえの上にパソコンと本があります」.',1 FROM pp RETURNING id),
  q1 AS (INSERT INTO "ReadingQuestion" ("passageId","question","answer","explanation","sortOrder") SELECT id,'はこの中に何がありますか。','ふゆのふく','「はこの中にはふゆのふくが入っています」.',2 FROM pp RETURNING id),
  q2 AS (INSERT INTO "ReadingQuestion" ("passageId","question","answer","explanation","sortOrder") SELECT id,'この人のへやはどんなへやですか。','せまいですが、あかるいです','「へやはせまいですが、あかるくて」.',3 FROM pp RETURNING id)
INSERT INTO "ReadingQuestionOption" ("questionId","text","sortOrder")
SELECT id,'ベッドの上',0 FROM q0 UNION ALL SELECT id,'はこの中',1 FROM q0 UNION ALL SELECT id,'つくえの上',2 FROM q0 UNION ALL SELECT id,'まどの外',3 FROM q0 UNION ALL SELECT id,'ふゆのふく',0 FROM q1 UNION ALL SELECT id,'本',1 FROM q1 UNION ALL SELECT id,'パソコン',2 FROM q1 UNION ALL SELECT id,'くつ',3 FROM q1 UNION ALL SELECT id,'せまいですが、あかるいです',0 FROM q2 UNION ALL SELECT id,'ひろくて、あかるいです',1 FROM q2 UNION ALL SELECT id,'せまくて、くらいです',2 FROM q2 UNION ALL SELECT id,'ひろいですが、くらいです',3 FROM q2;
WITH pp AS (INSERT INTO "ReadingPassage" ("title","content","jlptLevel","source","estimatedMin","sortOrder","updatedAt") VALUES ('メモ','リーさんへ

きょう、わたしはびょういんへ行きます。ですから、学校をやすみます。

あしたのテストのはんいを、メールでおしえてくださいませんか。

よろしくおねがいします。

マリア','N5','nihongo-app/reading-2',2,9,CURRENT_TIMESTAMP) RETURNING id)
, q0 AS (INSERT INTO "ReadingQuestion" ("passageId","question","answer","explanation","sortOrder") SELECT id,'マリアさんはきょうどこへ行きますか。','びょういん','「きょう、わたしはびょういんへ行きます」.',1 FROM pp RETURNING id),
  q1 AS (INSERT INTO "ReadingQuestion" ("passageId","question","answer","explanation","sortOrder") SELECT id,'マリアさんはリーさんに何をおねがいしましたか。','テストのはんいをメールでおしえること','「テストのはんいを、メールでおしえてくださいませんか」.',2 FROM pp RETURNING id),
  q2 AS (INSERT INTO "ReadingQuestion" ("passageId","question","answer","explanation","sortOrder") SELECT id,'テストはいつですか。','あした','「あしたのテスト」.',3 FROM pp RETURNING id)
INSERT INTO "ReadingQuestionOption" ("questionId","text","sortOrder")
SELECT id,'学校',0 FROM q0 UNION ALL SELECT id,'リーさんの家',1 FROM q0 UNION ALL SELECT id,'びょういん',2 FROM q0 UNION ALL SELECT id,'としょかん',3 FROM q0 UNION ALL SELECT id,'テストをかわりにうけること',0 FROM q1 UNION ALL SELECT id,'びょういんへいっしょに行くこと',1 FROM q1 UNION ALL SELECT id,'テストのはんいをメールでおしえること',2 FROM q1 UNION ALL SELECT id,'しゅくだいをもってくること',3 FROM q1 UNION ALL SELECT id,'きょう',0 FROM q2 UNION ALL SELECT id,'あした',1 FROM q2 UNION ALL SELECT id,'あさって',2 FROM q2 UNION ALL SELECT id,'らいしゅう',3 FROM q2;
WITH pp AS (INSERT INTO "ReadingPassage" ("title","content","jlptLevel","source","estimatedMin","sortOrder","updatedAt") VALUES ('デパートのおしらせ','デパートのおしらせ

・あいているじかん：あさ十時からよる八時まで
・やすみ：毎月第二水曜日
・七かい：レストラン（よる九時まで）
・一かい：くつ、かばん
・三かい：子どものふく

※土曜日と日曜日は、ちゅうしゃじょうがこみます。でんしゃやバスでおこしください。','N5','nihongo-app/reading-2',3,10,CURRENT_TIMESTAMP) RETURNING id)
, q0 AS (INSERT INTO "ReadingQuestion" ("passageId","question","answer","explanation","sortOrder") SELECT id,'子どものふくは何かいにありますか。','三かい','「三かい：子どものふく」.',1 FROM pp RETURNING id),
  q1 AS (INSERT INTO "ReadingQuestion" ("passageId","question","answer","explanation","sortOrder") SELECT id,'レストランは何時までですか。','よる九時','「七かい：レストラン（よる九時まで）」.',2 FROM pp RETURNING id),
  q2 AS (INSERT INTO "ReadingQuestion" ("passageId","question","answer","explanation","sortOrder") SELECT id,'週末は何で行ったほうがいいですか。','でんしゃかバス','Cuối tuần bãi đỗ xe đông nên đi tàu hoặc xe buýt.',3 FROM pp RETURNING id)
INSERT INTO "ReadingQuestionOption" ("questionId","text","sortOrder")
SELECT id,'一かい',0 FROM q0 UNION ALL SELECT id,'三かい',1 FROM q0 UNION ALL SELECT id,'七かい',2 FROM q0 UNION ALL SELECT id,'二かい',3 FROM q0 UNION ALL SELECT id,'よる八時',0 FROM q1 UNION ALL SELECT id,'よる九時',1 FROM q1 UNION ALL SELECT id,'あさ十時',2 FROM q1 UNION ALL SELECT id,'よる十時',3 FROM q1 UNION ALL SELECT id,'くるま',0 FROM q2 UNION ALL SELECT id,'でんしゃかバス',1 FROM q2 UNION ALL SELECT id,'タクシー',2 FROM q2 UNION ALL SELECT id,'じてんしゃ',3 FROM q2;
WITH pp AS (INSERT INTO "ReadingPassage" ("title","content","jlptLevel","source","estimatedMin","sortOrder","updatedAt") VALUES ('すきなきせつ','わたしは秋がいちばんすきです。

夏はあつくて、あまりそとに出ません。冬はさむくて、朝おきるのがたいへんです。春はきれいですが、花のこなで目がかゆくなります。

秋はすずしくて、たべものもおいしいです。秋になると、よく山へさんぽに行きます。','N5','nihongo-app/reading-2',3,11,CURRENT_TIMESTAMP) RETURNING id)
, q0 AS (INSERT INTO "ReadingQuestion" ("passageId","question","answer","explanation","sortOrder") SELECT id,'この人はどのきせつがいちばんすきですか。','秋','「わたしは秋がいちばんすきです」.',1 FROM pp RETURNING id),
  q1 AS (INSERT INTO "ReadingQuestion" ("passageId","question","answer","explanation","sortOrder") SELECT id,'この人は春のどこがいやですか。','目がかゆくなること','「花のこなで目がかゆくなります」.',2 FROM pp RETURNING id),
  q2 AS (INSERT INTO "ReadingQuestion" ("passageId","question","answer","explanation","sortOrder") SELECT id,'秋になると、この人は何をしますか。','山へさんぽに行きます','「秋になると、よく山へさんぽに行きます」.',3 FROM pp RETURNING id)
INSERT INTO "ReadingQuestionOption" ("questionId","text","sortOrder")
SELECT id,'秋',0 FROM q0 UNION ALL SELECT id,'春',1 FROM q0 UNION ALL SELECT id,'夏',2 FROM q0 UNION ALL SELECT id,'冬',3 FROM q0 UNION ALL SELECT id,'あついこと',0 FROM q1 UNION ALL SELECT id,'目がかゆくなること',1 FROM q1 UNION ALL SELECT id,'さむいこと',2 FROM q1 UNION ALL SELECT id,'花がないこと',3 FROM q1 UNION ALL SELECT id,'山へさんぽに行きます',0 FROM q2 UNION ALL SELECT id,'うみでおよぎます',1 FROM q2 UNION ALL SELECT id,'うちでねます',2 FROM q2 UNION ALL SELECT id,'スキーをします',3 FROM q2;
WITH pp AS (INSERT INTO "ReadingPassage" ("title","content","jlptLevel","source","estimatedMin","sortOrder","updatedAt") VALUES ('たんじょうびのプレゼント','きのうはわたしのたんじょうびでした。

母からはあたらしいかばんをもらいました。父はケーキをかってきました。

あねはわたしに本をくれました。わたしがほしかった本です。とてもうれしかったです。

夜、かぞくみんなでケーキを食べました。','N5','nihongo-app/reading-2',3,12,CURRENT_TIMESTAMP) RETURNING id)
, q0 AS (INSERT INTO "ReadingQuestion" ("passageId","question","answer","explanation","sortOrder") SELECT id,'この人は母から何をもらいましたか。','かばん','「母からはあたらしいかばんをもらいました」.',1 FROM pp RETURNING id),
  q1 AS (INSERT INTO "ReadingQuestion" ("passageId","question","answer","explanation","sortOrder") SELECT id,'ほしかった本をくれたのはだれですか。','あね','「あねはわたしに本をくれました。わたしがほしかった本です」.',2 FROM pp RETURNING id),
  q2 AS (INSERT INTO "ReadingQuestion" ("passageId","question","answer","explanation","sortOrder") SELECT id,'夜、何をしましたか。','かぞくでケーキを食べました','「夜、かぞくみんなでケーキを食べました」.',3 FROM pp RETURNING id)
INSERT INTO "ReadingQuestionOption" ("questionId","text","sortOrder")
SELECT id,'ケーキ',0 FROM q0 UNION ALL SELECT id,'かばん',1 FROM q0 UNION ALL SELECT id,'本',2 FROM q0 UNION ALL SELECT id,'とけい',3 FROM q0 UNION ALL SELECT id,'母',0 FROM q1 UNION ALL SELECT id,'父',1 FROM q1 UNION ALL SELECT id,'ともだち',2 FROM q1 UNION ALL SELECT id,'あね',3 FROM q1 UNION ALL SELECT id,'ひとりで本を読みました',0 FROM q2 UNION ALL SELECT id,'かいものに行きました',1 FROM q2 UNION ALL SELECT id,'レストランへ行きました',2 FROM q2 UNION ALL SELECT id,'かぞくでケーキを食べました',3 FROM q2;
WITH pp AS (INSERT INTO "ReadingPassage" ("title","content","jlptLevel","source","estimatedMin","sortOrder","updatedAt") VALUES ('日本で初めての冬','わたしはタイから来ました。日本に来て、初めての冬です。

タイは一年中あたたかいので、雪を見たことがありませんでした。先月、友だちと北海道へ行って、初めて雪を見ました。とてもきれいで、写真をたくさんとりました。

でも、寒さには困っています。朝、ふとんから出るのがたいへんです。友だちに教えてもらって、あたたかい下着を買いました。今は少し楽になりました。','N4','nihongo-app/reading-2',4,12,CURRENT_TIMESTAMP) RETURNING id)
, q0 AS (INSERT INTO "ReadingQuestion" ("passageId","question","answer","explanation","sortOrder") SELECT id,'この人は北海道で何をしましたか。','初めて雪を見て、写真をとった','「初めて雪を見ました…写真をたくさんとりました」.',1 FROM pp RETURNING id),
  q1 AS (INSERT INTO "ReadingQuestion" ("passageId","question","answer","explanation","sortOrder") SELECT id,'この人は今、何に困っていますか。','寒さ','「でも、寒さには困っています」.',2 FROM pp RETURNING id),
  q2 AS (INSERT INTO "ReadingQuestion" ("passageId","question","answer","explanation","sortOrder") SELECT id,'今、少し楽になったのはどうしてですか。','あたたかい下着を買ったから','Nhờ bạn chỉ, đã mua đồ lót giữ ấm nên đỡ hơn.',3 FROM pp RETURNING id)
INSERT INTO "ReadingQuestionOption" ("questionId","text","sortOrder")
SELECT id,'スキーを習った',0 FROM q0 UNION ALL SELECT id,'初めて雪を見て、写真をとった',1 FROM q0 UNION ALL SELECT id,'あたたかい下着を買った',2 FROM q0 UNION ALL SELECT id,'友だちに会いに行った',3 FROM q0 UNION ALL SELECT id,'雪が少ないこと',0 FROM q1 UNION ALL SELECT id,'寒さ',1 FROM q1 UNION ALL SELECT id,'写真がとれないこと',2 FROM q1 UNION ALL SELECT id,'友だちがいないこと',3 FROM q1 UNION ALL SELECT id,'タイへ帰ったから',0 FROM q2 UNION ALL SELECT id,'あたたかい下着を買ったから',1 FROM q2 UNION ALL SELECT id,'ふとんを新しくしたから',2 FROM q2 UNION ALL SELECT id,'雪がとけたから',3 FROM q2;
WITH pp AS (INSERT INTO "ReadingPassage" ("title","content","jlptLevel","source","estimatedMin","sortOrder","updatedAt") VALUES ('アルバイトのお知らせ','アルバイトをさがしています

・しごと：カフェで飲み物を作ったり、運んだりするしごと
・時間：月〜金 17:00〜21:00 ／ 土・日 10:00〜18:00（週3日以上）
・時給：1,100円（土・日は1,200円）
・日本語：かんたんな会話ができる人
・その他：しごとのあとで、店の飲み物がむりょうで飲めます

れんらく先：カフェ・ひまわり　電話 03-XXXX-XXXX','N4','nihongo-app/reading-2',4,13,CURRENT_TIMESTAMP) RETURNING id)
, q0 AS (INSERT INTO "ReadingQuestion" ("passageId","question","answer","explanation","sortOrder") SELECT id,'このアルバイトは週に何日以上はたらかなければなりませんか。','三日','「週3日以上」.',1 FROM pp RETURNING id),
  q1 AS (INSERT INTO "ReadingQuestion" ("passageId","question","answer","explanation","sortOrder") SELECT id,'土曜日にはたらくと、時給はいくらですか。','1,200円','「土・日は1,200円」.',2 FROM pp RETURNING id),
  q2 AS (INSERT INTO "ReadingQuestion" ("passageId","question","answer","explanation","sortOrder") SELECT id,'このアルバイトについて正しいものはどれですか。','しごとのあとで飲み物がむりょうで飲める','「しごとのあとで、店の飲み物がむりょうで飲めます」.',3 FROM pp RETURNING id)
INSERT INTO "ReadingQuestionOption" ("questionId","text","sortOrder")
SELECT id,'一日',0 FROM q0 UNION ALL SELECT id,'五日',1 FROM q0 UNION ALL SELECT id,'七日',2 FROM q0 UNION ALL SELECT id,'三日',3 FROM q0 UNION ALL SELECT id,'1,100円',0 FROM q1 UNION ALL SELECT id,'1,200円',1 FROM q1 UNION ALL SELECT id,'1,000円',2 FROM q1 UNION ALL SELECT id,'1,300円',3 FROM q1 UNION ALL SELECT id,'日本語が上手でなければならない',0 FROM q2 UNION ALL SELECT id,'平日は朝からはたらく',1 FROM q2 UNION ALL SELECT id,'料理を作るしごとだ',2 FROM q2 UNION ALL SELECT id,'しごとのあとで飲み物がむりょうで飲める',3 FROM q2;
WITH pp AS (INSERT INTO "ReadingPassage" ("title","content","jlptLevel","source","estimatedMin","sortOrder","updatedAt") VALUES ('図書館の新しいルール','図書館をりようするみなさんへ

来月から、本を借りられる数が五さつから十さつにふえます。借りられる期間は今までと同じ二週間です。

また、インターネットで本の予約ができるようになります。予約した本は、カウンターで受け取ってください。

雑誌は今までどおり、借りることはできません。図書館の中で読んでください。','N4','nihongo-app/reading-2',3,14,CURRENT_TIMESTAMP) RETURNING id)
, q0 AS (INSERT INTO "ReadingQuestion" ("passageId","question","answer","explanation","sortOrder") SELECT id,'来月から何がかわりますか。','借りられる本の数がふえる','Số sách được mượn tăng từ 5 lên 10.',1 FROM pp RETURNING id),
  q1 AS (INSERT INTO "ReadingQuestion" ("passageId","question","answer","explanation","sortOrder") SELECT id,'インターネットで予約した本はどうしますか。','カウンターで受け取る','「予約した本は、カウンターで受け取ってください」.',2 FROM pp RETURNING id),
  q2 AS (INSERT INTO "ReadingQuestion" ("passageId","question","answer","explanation","sortOrder") SELECT id,'雑誌について正しいものはどれですか。','図書館の中で読む','「雑誌は…借りることはできません。図書館の中で読んでください」.',3 FROM pp RETURNING id)
INSERT INTO "ReadingQuestionOption" ("questionId","text","sortOrder")
SELECT id,'借りられる期間が長くなる',0 FROM q0 UNION ALL SELECT id,'雑誌が借りられるようになる',1 FROM q0 UNION ALL SELECT id,'借りられる本の数がふえる',2 FROM q0 UNION ALL SELECT id,'図書館が休みになる',3 FROM q0 UNION ALL SELECT id,'カウンターで受け取る',0 FROM q1 UNION ALL SELECT id,'家にとどく',1 FROM q1 UNION ALL SELECT id,'インターネットで読む',2 FROM q1 UNION ALL SELECT id,'一週間後に返す',3 FROM q1 UNION ALL SELECT id,'二週間借りられる',0 FROM q2 UNION ALL SELECT id,'図書館の中で読む',1 FROM q2 UNION ALL SELECT id,'インターネットで予約できる',2 FROM q2 UNION ALL SELECT id,'十さつまで借りられる',3 FROM q2;
WITH pp AS (INSERT INTO "ReadingPassage" ("title","content","jlptLevel","source","estimatedMin","sortOrder","updatedAt") VALUES ('メール：引っこしのお知らせ','山田先生

ごぶさたしております。グエンです。

先週、大阪から東京へ引っこしました。新しい会社は駅から歩いて五分なので、とてもべんりです。

東京に来てから、まだ友だちが少なくて、すこしさびしいです。でも、週末に日本語のボランティア教室に行くことにしました。

先生が東京にいらっしゃるときは、ぜひれんらくしてください。

グエン','N4','nihongo-app/reading-2',3,15,CURRENT_TIMESTAMP) RETURNING id)
, q0 AS (INSERT INTO "ReadingQuestion" ("passageId","question","answer","explanation","sortOrder") SELECT id,'グエンさんはどこからどこへ引っこしましたか。','大阪から東京へ','「大阪から東京へ引っこしました」.',1 FROM pp RETURNING id),
  q1 AS (INSERT INTO "ReadingQuestion" ("passageId","question","answer","explanation","sortOrder") SELECT id,'グエンさんが少しさびしいのはどうしてですか。','東京にまだ友だちが少ないから','「まだ友だちが少なくて、すこしさびしいです」.',2 FROM pp RETURNING id),
  q2 AS (INSERT INTO "ReadingQuestion" ("passageId","question","answer","explanation","sortOrder") SELECT id,'グエンさんは週末に何をすることにしましたか。','日本語のボランティア教室に行く','「週末に日本語のボランティア教室に行くことにしました」.',3 FROM pp RETURNING id)
INSERT INTO "ReadingQuestionOption" ("questionId","text","sortOrder")
SELECT id,'大阪から東京へ',0 FROM q0 UNION ALL SELECT id,'東京から大阪へ',1 FROM q0 UNION ALL SELECT id,'大阪から京都へ',2 FROM q0 UNION ALL SELECT id,'ベトナムから大阪へ',3 FROM q0 UNION ALL SELECT id,'会社が遠いから',0 FROM q1 UNION ALL SELECT id,'先生に会えないから',1 FROM q1 UNION ALL SELECT id,'日本語が下手だから',2 FROM q1 UNION ALL SELECT id,'東京にまだ友だちが少ないから',3 FROM q1 UNION ALL SELECT id,'日本語のボランティア教室に行く',0 FROM q2 UNION ALL SELECT id,'大阪へ帰る',1 FROM q2 UNION ALL SELECT id,'先生に会いに行く',2 FROM q2 UNION ALL SELECT id,'会社で働く',3 FROM q2;
WITH pp AS (INSERT INTO "ReadingPassage" ("title","content","jlptLevel","source","estimatedMin","sortOrder","updatedAt") VALUES ('ごみの出し方','ごみの出し方（さくら町）

・もえるごみ：月曜日と木曜日
・プラスチック：水曜日
・びん・かん：第一・第三金曜日
・古い紙（新聞・ざっし）：第二土曜日

ごみは、朝八時までに、きめられた場所に出してください。前の日の夜に出すと、からすがごみをちらかすので、出さないでください。','N4','nihongo-app/reading-2',4,16,CURRENT_TIMESTAMP) RETURNING id)
, q0 AS (INSERT INTO "ReadingQuestion" ("passageId","question","answer","explanation","sortOrder") SELECT id,'新聞はいつ出しますか。','第二土曜日','「古い紙（新聞・ざっし）：第二土曜日」.',1 FROM pp RETURNING id),
  q1 AS (INSERT INTO "ReadingQuestion" ("passageId","question","answer","explanation","sortOrder") SELECT id,'ごみは何時までに出しますか。','朝八時','「朝八時までに」.',2 FROM pp RETURNING id),
  q2 AS (INSERT INTO "ReadingQuestion" ("passageId","question","answer","explanation","sortOrder") SELECT id,'前の日の夜にごみを出してはいけないのはどうしてですか。','からすがごみをちらかすから','「からすがごみをちらかすので」.',3 FROM pp RETURNING id)
INSERT INTO "ReadingQuestionOption" ("questionId","text","sortOrder")
SELECT id,'月曜日',0 FROM q0 UNION ALL SELECT id,'水曜日',1 FROM q0 UNION ALL SELECT id,'第二土曜日',2 FROM q0 UNION ALL SELECT id,'第一金曜日',3 FROM q0 UNION ALL SELECT id,'朝八時',0 FROM q1 UNION ALL SELECT id,'朝七時',1 FROM q1 UNION ALL SELECT id,'朝九時',2 FROM q1 UNION ALL SELECT id,'夜八時',3 FROM q1 UNION ALL SELECT id,'からすがごみをちらかすから',0 FROM q2 UNION ALL SELECT id,'ごみの車が来ないから',1 FROM q2 UNION ALL SELECT id,'においがするから',2 FROM q2 UNION ALL SELECT id,'うるさいから',3 FROM q2;
WITH pp AS (INSERT INTO "ReadingPassage" ("title","content","jlptLevel","source","estimatedMin","sortOrder","updatedAt") VALUES ('わたしのしゅみ','わたしのしゅみは料理です。

子どものころは、料理がぜんぜんできませんでした。大学に入って一人で住むようになってから、毎日自分で作るようになりました。はじめは失敗ばかりでしたが、インターネットで作り方を調べて、少しずつ上手になりました。

今は、週末に友だちを家によんで、料理を作るのが楽しみです。みんなが「おいしい」と言ってくれると、とてもうれしいです。','N4','nihongo-app/reading-2',4,17,CURRENT_TIMESTAMP) RETURNING id)
, q0 AS (INSERT INTO "ReadingQuestion" ("passageId","question","answer","explanation","sortOrder") SELECT id,'この人はいつから料理を作るようになりましたか。','大学に入って一人で住むようになってから','「大学に入って一人で住むようになってから」.',1 FROM pp RETURNING id),
  q1 AS (INSERT INTO "ReadingQuestion" ("passageId","question","answer","explanation","sortOrder") SELECT id,'この人はどうやって料理が上手になりましたか。','インターネットで作り方を調べた','「インターネットで作り方を調べて、少しずつ上手になりました」.',2 FROM pp RETURNING id),
  q2 AS (INSERT INTO "ReadingQuestion" ("passageId","question","answer","explanation","sortOrder") SELECT id,'この人が今楽しみにしていることは何ですか。','友だちをよんで料理を作ること','「週末に友だちを家によんで、料理を作るのが楽しみです」.',3 FROM pp RETURNING id)
INSERT INTO "ReadingQuestionOption" ("questionId","text","sortOrder")
SELECT id,'子どものころから',0 FROM q0 UNION ALL SELECT id,'会社に入ってから',1 FROM q0 UNION ALL SELECT id,'友だちに習ってから',2 FROM q0 UNION ALL SELECT id,'大学に入って一人で住むようになってから',3 FROM q0 UNION ALL SELECT id,'インターネットで作り方を調べた',0 FROM q1 UNION ALL SELECT id,'料理教室に通った',1 FROM q1 UNION ALL SELECT id,'母に教えてもらった',2 FROM q1 UNION ALL SELECT id,'本を読んだ',3 FROM q1 UNION ALL SELECT id,'友だちをよんで料理を作ること',0 FROM q2 UNION ALL SELECT id,'レストランへ行くこと',1 FROM q2 UNION ALL SELECT id,'料理の本を書くこと',2 FROM q2 UNION ALL SELECT id,'一人で料理を食べること',3 FROM q2;
WITH pp AS (INSERT INTO "ReadingPassage" ("title","content","jlptLevel","source","estimatedMin","sortOrder","updatedAt") VALUES ('病院の受付で','受付の人：こんにちは。はじめてですか。

キム：はい。

受付の人：では、保険証を見せてください。それから、この紙に名前と住所と、今のぐあいを書いてください。

キム：はい。あの、どのくらい待ちますか。

受付の人：今日はこんでいるので、三十分ぐらいです。順番が来たら、名前をよびますね。','N4','nihongo-app/reading-2',3,18,CURRENT_TIMESTAMP) RETURNING id)
, q0 AS (INSERT INTO "ReadingQuestion" ("passageId","question","answer","explanation","sortOrder") SELECT id,'キムさんはまず何を見せますか。','保険証','「保険証を見せてください」.',1 FROM pp RETURNING id),
  q1 AS (INSERT INTO "ReadingQuestion" ("passageId","question","answer","explanation","sortOrder") SELECT id,'キムさんは紙に何を書きませんか。','電話番号','Chỉ cần viết tên, địa chỉ và tình trạng hiện tại.',2 FROM pp RETURNING id),
  q2 AS (INSERT INTO "ReadingQuestion" ("passageId","question","answer","explanation","sortOrder") SELECT id,'どのくらい待ちますか。','三十分ぐらい','「三十分ぐらいです」.',3 FROM pp RETURNING id)
INSERT INTO "ReadingQuestionOption" ("questionId","text","sortOrder")
SELECT id,'お金',0 FROM q0 UNION ALL SELECT id,'くすり',1 FROM q0 UNION ALL SELECT id,'パスポート',2 FROM q0 UNION ALL SELECT id,'保険証',3 FROM q0 UNION ALL SELECT id,'名前',0 FROM q1 UNION ALL SELECT id,'住所',1 FROM q1 UNION ALL SELECT id,'今のぐあい',2 FROM q1 UNION ALL SELECT id,'電話番号',3 FROM q1 UNION ALL SELECT id,'十分ぐらい',0 FROM q2 UNION ALL SELECT id,'一時間ぐらい',1 FROM q2 UNION ALL SELECT id,'待ちません',2 FROM q2 UNION ALL SELECT id,'三十分ぐらい',3 FROM q2;
COMMIT;
