export type PhraseItem = {
  ja: string;
  kana: string;
  romaji: string;
  vi: string;
  note?: string;
};

export type PhraseGroup = {
  id: string;
  label: string;
  hint: string;
  items: PhraseItem[];
};

export type IntroLine = {
  ja: string;
  kana: string;
  romaji: string;
  vi: string;
  tip?: string;
};

export type IntroSlot = {
  slot: string;
  question: string;
  examples: PhraseItem[];
};

/** Bài mẫu 自己紹介 — Lê Tiến Dũng, lập trình viên 30 tuổi (Đà Nẵng). */
export const SELF_INTRO_SCRIPT: IntroLine[] = [
  {
    ja: 'はじめまして。',
    kana: 'はじめまして。',
    romaji: 'Hajimemashite.',
    vi: 'Rất vui được gặp (lần đầu).',
    tip: 'Nói đầu tiên khi gặp người mới.',
  },
  {
    ja: 'レ・ティエン・ズンと申します。',
    kana: 'レ・ティエン・ズンともうします。',
    romaji: 'Re Tien Zun to mōshimasu.',
    vi: 'Tôi tên là Lê Tiến Dũng. (khiêm nhường)',
    tip: 'と申します lịch sự hơn です khi tự giới thiệu tên.',
  },
  {
    ja: '三十歳です。',
    kana: 'さんじゅっさいです。',
    romaji: 'Sanjussai desu.',
    vi: 'Tôi 30 tuổi.',
    tip: '歳（さい）= tuổi. 三十歳 đọc さんじゅっさい.',
  },
  {
    ja: 'ベトナムのダナンから来ました。',
    kana: 'ベトナムのダナンからきました。',
    romaji: 'Betonamu no Danan kara kimashita.',
    vi: 'Tôi đến từ Đà Nẵng, Việt Nam.',
  },
  {
    ja: 'ダナンの出身です。',
    kana: 'ダナンのしゅっしんです。',
    romaji: 'Danan no shusshin desu.',
    vi: 'Tôi quê ở Đà Nẵng.',
  },
  {
    ja: 'プログラマーです。',
    kana: 'プログラマーです。',
    romaji: 'Puroguramā desu.',
    vi: 'Tôi là lập trình viên.',
    tip: 'Cũng nói エンジニアです / モバイルエンジニアです.',
  },
  {
    ja: '四年以上、アプリとウェブサイトを作っています。',
    kana: 'よねんいじょう、アプリとウェブサイトをつくっています。',
    romaji: 'Yonen ijō, apuri to webusaito o tsukutte imasu.',
    vi: 'Hơn 4 năm nay tôi làm app và website.',
  },
  {
    ja: 'スマホのアプリやバックエンドの開発が得意です。',
    kana: 'スマホのアプリやバックエンドのかいはつがとくいです。',
    romaji: 'Sumaho no apuri ya bakkuendo no kaihatsu ga tokui desu.',
    vi: 'Tôi giỏi phát triển app điện thoại và backend.',
  },
  {
    ja: '日本語を勉強しています。',
    kana: 'にほんごをべんきょうしています。',
    romaji: 'Nihongo o benkyō shite imasu.',
    vi: 'Tôi đang học tiếng Nhật.',
  },
  {
    ja: 'どうぞよろしくお願いします。',
    kana: 'どうぞよろしくおねがいします。',
    romaji: 'Dōzo yoroshiku onegai shimasu.',
    vi: 'Rất mong được giúp đỡ / nhờ chiếu cố.',
    tip: 'Câu kết bắt buộc của 自己紹介.',
  },
];

export const INTRO_SLOTS: IntroSlot[] = [
  {
    slot: 'Tên',
    question: 'お名前は？',
    examples: [
      { ja: 'ズンです。', kana: 'ズンです。', romaji: 'Zun desu.', vi: 'Tôi là Dũng.' },
      { ja: 'ズンと申します。', kana: 'ズンともうします。', romaji: 'Zun to mōshimasu.', vi: 'Tôi tên Dũng. (khiêm)' },
      { ja: '私の名前はレ・ズンです。', kana: 'わたしのなまえはレ・ズンです。', romaji: 'Watashi no namae wa Re Zun desu.', vi: 'Tên tôi là Lê Dũng.' },
    ],
  },
  {
    slot: 'Quốc tịch / quê',
    question: 'どこの国の人ですか。',
    examples: [
      { ja: 'ベトナム人です。', kana: 'ベトナムじんです。', romaji: 'Betonamu-jin desu.', vi: 'Tôi là người Việt.' },
      { ja: 'ベトナムのダナンから来ました。', kana: 'ベトナムのダナンからきました。', romaji: 'Betonamu no Danan kara kimashita.', vi: 'Tôi đến từ Đà Nẵng, Việt Nam.' },
      { ja: 'ダナンの出身です。', kana: 'ダナンのしゅっしんです。', romaji: 'Danan no shusshin desu.', vi: 'Tôi quê Đà Nẵng.' },
      { ja: 'ダナンに住んでいます。', kana: 'ダナンにすんでいます。', romaji: 'Danan ni sunde imasu.', vi: 'Tôi đang sống ở Đà Nẵng.' },
    ],
  },
  {
    slot: 'Tuổi',
    question: 'おいくつですか。',
    examples: [
      { ja: '三十歳です。', kana: 'さんじゅっさいです。', romaji: 'Sanjussai desu.', vi: 'Tôi 30 tuổi.' },
      { ja: '二十代です。', kana: 'にじゅうだいです。', romaji: 'Nijūdai desu.', vi: 'Tôi ngoài hai mươi.' },
      { ja: '三十代です。', kana: 'さんじゅうだいです。', romaji: 'Sanjūdai desu.', vi: 'Tôi ngoài ba mươi.' },
    ],
  },
  {
    slot: 'Nghề / trường',
    question: 'お仕事は？ / 学生ですか。',
    examples: [
      { ja: 'プログラマーです。', kana: 'プログラマーです。', romaji: 'Puroguramā desu.', vi: 'Tôi là lập trình viên.' },
      { ja: 'エンジニアです。', kana: 'エンジニアです。', romaji: 'Enjinia desu.', vi: 'Tôi là kỹ sư.' },
      { ja: 'モバイルエンジニアです。', kana: 'モバイルエンジニアです。', romaji: 'Mobairu enjinia desu.', vi: 'Tôi là kỹ sư mobile.' },
      { ja: '会社員です。', kana: 'かいしゃいんです。', romaji: 'Kaishain desu.', vi: 'Tôi là nhân viên công ty.' },
      { ja: '学生です。', kana: 'がくせいです。', romaji: 'Gakusei desu.', vi: 'Tôi là học sinh / sinh viên.' },
    ],
  },
  {
    slot: 'Sở thích',
    question: '趣味は何ですか。',
    examples: [
      { ja: '趣味はプログラミングです。', kana: 'しゅみはプログラミングです。', romaji: 'Shumi wa puroguramingu desu.', vi: 'Sở thích là lập trình.' },
      { ja: '日本語の勉強が好きです。', kana: 'にほんごのべんきょうがすきです。', romaji: 'Nihongo no benkyō ga suki desu.', vi: 'Tôi thích học tiếng Nhật.' },
      { ja: '趣味は読書です。', kana: 'しゅみはどくしょです。', romaji: 'Shumi wa dokusho desu.', vi: 'Sở thích là đọc sách.' },
      { ja: '映画を見るのが好きです。', kana: 'えいがをみるのがすきです。', romaji: 'Eiga o miru no ga suki desu.', vi: 'Tôi thích xem phim.' },
    ],
  },
];

export const PHRASE_GROUPS: PhraseGroup[] = [
  {
    id: 'aisatsu',
    label: 'Chào hỏi',
    hint: 'Chào theo thời điểm trong ngày. Buổi tối dùng こんばんは, không dùng こんにちは.',
    items: [
      { ja: 'おはようございます。', kana: 'おはようございます。', romaji: 'Ohayō gozaimasu.', vi: 'Chào buổi sáng. (lịch sự)' },
      { ja: 'こんにちは。', kana: 'こんにちは。', romaji: 'Konnichiwa.', vi: 'Xin chào (ban ngày).' },
      { ja: 'こんばんは。', kana: 'こんばんは。', romaji: 'Konbanwa.', vi: 'Chào buổi tối.' },
      { ja: 'おやすみなさい。', kana: 'おやすみなさい。', romaji: 'Oyasuminasai.', vi: 'Chúc ngủ ngon.' },
      { ja: 'いってきます。', kana: 'いってきます。', romaji: 'Itte kimasu.', vi: 'Con đi đây. (khi ra khỏi nhà)' },
      { ja: 'いってらっしゃい。', kana: 'いってらっしゃい。', romaji: 'Itte rasshai.', vi: 'Đi nhé, về sớm.' },
      { ja: 'ただいま。', kana: 'ただいま。', romaji: 'Tadaima.', vi: 'Con về rồi.' },
      { ja: 'おかえりなさい。', kana: 'おかえりなさい。', romaji: 'Okaerinasai.', vi: 'Về rồi à.' },
    ],
  },
  {
    id: 'aisatsu-meet',
    label: 'Gặp / chia tay',
    hint: 'はじめまして chỉ dùng lần đầu. また後で dùng khi sẽ gặp lại trong ngày.',
    items: [
      { ja: 'はじめまして。', kana: 'はじめまして。', romaji: 'Hajimemashite.', vi: 'Rất vui được gặp (lần đầu).' },
      { ja: 'よろしくお願いします。', kana: 'よろしくおねがいします。', romaji: 'Yoroshiku onegai shimasu.', vi: 'Mong được giúp đỡ.' },
      { ja: 'こちらこそ。', kana: 'こちらこそ。', romaji: 'Kochira koso.', vi: 'Chính tôi mới phải nói vậy.' },
      { ja: 'お元気ですか。', kana: 'おげんきですか。', romaji: 'O-genki desu ka.', vi: 'Bạn khỏe không?' },
      { ja: '元気です。', kana: 'げんきです。', romaji: 'Genki desu.', vi: 'Tôi khỏe.' },
      { ja: 'さようなら。', kana: 'さようなら。', romaji: 'Sayōnara.', vi: 'Tạm biệt (lâu mới gặp lại).' },
      { ja: 'じゃあ、また。', kana: 'じゃあ、また。', romaji: 'Jā, mata.', vi: 'Thôi, gặp lại sau.' },
      { ja: 'また後で。', kana: 'またあとで。', romaji: 'Mata ato de.', vi: 'Gặp lại sau (trong ngày).' },
    ],
  },
  {
    id: 'thanks',
    label: 'Cảm ơn / xin lỗi',
    hint: 'すみません vừa xin lỗi vừa gọi người. どういたしまして trả lời cảm ơn.',
    items: [
      { ja: 'ありがとうございます。', kana: 'ありがとうございます。', romaji: 'Arigatō gozaimasu.', vi: 'Cảm ơn ạ.' },
      { ja: 'どうも。', kana: 'どうも。', romaji: 'Dōmo.', vi: 'Cảm ơn (ngắn).' },
      { ja: 'どういたしまして。', kana: 'どういたしまして。', romaji: 'Dō itashimashite.', vi: 'Không có gì.' },
      { ja: 'すみません。', kana: 'すみません。', romaji: 'Sumimasen.', vi: 'Xin lỗi / làm ơn / gọi nhân viên.' },
      { ja: 'ごめんなさい。', kana: 'ごめんなさい。', romaji: 'Gomen nasai.', vi: 'Xin lỗi (thân mật hơn).' },
      { ja: '失礼します。', kana: 'しつれいします。', romaji: 'Shitsurei shimasu.', vi: 'Xin phép (vào / cắt ngang / về).' },
      { ja: 'お先に失礼します。', kana: 'おさきにしつれいします。', romaji: 'Osaki ni shitsurei shimasu.', vi: 'Xin phép về trước.' },
      { ja: 'お待たせしました。', kana: 'おまたせしました。', romaji: 'Omatase shimashita.', vi: 'Xin lỗi đã để chờ.' },
    ],
  },
  {
    id: 'reply',
    label: 'Đáp lại',
    hint: 'わかりません khác 知りません: không hiểu vs không biết thông tin.',
    items: [
      { ja: 'はい。', kana: 'はい。', romaji: 'Hai.', vi: 'Vâng / dạ.' },
      { ja: 'いいえ。', kana: 'いいえ。', romaji: 'Iie.', vi: 'Không.' },
      { ja: 'そうです。', kana: 'そうです。', romaji: 'Sō desu.', vi: 'Đúng vậy.' },
      { ja: 'そうですか。', kana: 'そうですか。', romaji: 'Sō desu ka.', vi: 'Thế à.' },
      { ja: 'わかりました。', kana: 'わかりました。', romaji: 'Wakarimashita.', vi: 'Tôi hiểu rồi.' },
      { ja: 'わかりません。', kana: 'わかりません。', romaji: 'Wakarimasen.', vi: 'Tôi không hiểu.' },
      { ja: 'ちょっと待ってください。', kana: 'ちょっとまってください。', romaji: 'Chotto matte kudasai.', vi: 'Xin chờ một chút.' },
      { ja: 'もう一度お願いします。', kana: 'もういちどおねがいします。', romaji: 'Mō ichido onegai shimasu.', vi: 'Nhờ nói lại lần nữa.' },
      { ja: 'ゆっくり話してください。', kana: 'ゆっくりはなしてください。', romaji: 'Yukkuri hanashite kudasai.', vi: 'Xin nói chậm giúp.' },
    ],
  },
  {
    id: 'ask',
    label: 'Hỏi thông tin',
    hint: 'Câu hỏi N5: 何・どこ・いつ・いくら・だれ. Thêm ください khi nhờ.',
    items: [
      { ja: 'これは何ですか。', kana: 'これはなんですか。', romaji: 'Kore wa nan desu ka.', vi: 'Đây là cái gì?' },
      { ja: 'トイレはどこですか。', kana: 'トイレはどこですか。', romaji: 'Toire wa doko desu ka.', vi: 'Nhà vệ sinh ở đâu?' },
      { ja: '今、何時ですか。', kana: 'いま、なんじですか。', romaji: 'Ima, nan-ji desu ka.', vi: 'Bây giờ là mấy giờ?' },
      { ja: 'いくらですか。', kana: 'いくらですか。', romaji: 'Ikura desu ka.', vi: 'Bao nhiêu tiền?' },
      { ja: 'だれですか。', kana: 'だれですか。', romaji: 'Dare desu ka.', vi: 'Ai vậy?' },
      { ja: 'いつですか。', kana: 'いつですか。', romaji: 'Itsu desu ka.', vi: 'Khi nào?' },
      { ja: 'どうしますか。', kana: 'どうしますか。', romaji: 'Dō shimasu ka.', vi: 'Làm thế nào / chọn gì?' },
      { ja: '英語が話せますか。', kana: 'えいごがはなせますか。', romaji: 'Eigo ga hanasemasu ka.', vi: 'Bạn nói được tiếng Anh không?' },
    ],
  },
  {
    id: 'shop',
    label: 'Cửa hàng',
    hint: 'ください = cho tôi. これをください vừa chỉ vừa mua.',
    items: [
      { ja: 'これをください。', kana: 'これをください。', romaji: 'Kore o kudasai.', vi: 'Cho tôi cái này.' },
      { ja: '見せてください。', kana: 'みせてください。', romaji: 'Misete kudasai.', vi: 'Cho tôi xem với.' },
      { ja: '試着できますか。', kana: 'しちゃくできますか。', romaji: 'Shichaku dekimasu ka.', vi: 'Có thể thử đồ không?' },
      { ja: '袋をお願いします。', kana: 'ふくろをおねがいします。', romaji: 'Fukuro o onegai shimasu.', vi: 'Xin cho túi.' },
      { ja: 'カードで払えますか。', kana: 'カードではらえますか。', romaji: 'Kādo de haraemasu ka.', vi: 'Trả thẻ được không?' },
      { ja: 'レシートをお願いします。', kana: 'レシートをおねがいします。', romaji: 'Reshīto o onegai shimasu.', vi: 'Xin hóa đơn.' },
    ],
  },
  {
    id: 'food',
    label: 'Ăn uống',
    hint: 'いただきます trước khi ăn. ごちそうさまでした sau khi ăn xong.',
    items: [
      { ja: 'メニューをください。', kana: 'メニューをください。', romaji: 'Menyū o kudasai.', vi: 'Cho tôi thực đơn.' },
      { ja: '水をください。', kana: 'みずをください。', romaji: 'Mizu o kudasai.', vi: 'Cho tôi nước.' },
      { ja: 'おすすめは何ですか。', kana: 'おすすめはなんですか。', romaji: 'Osusume wa nan desu ka.', vi: 'Món nào nên thử?' },
      { ja: 'これは辛いですか。', kana: 'これはからいですか。', romaji: 'Kore wa karai desu ka.', vi: 'Cái này có cay không?' },
      { ja: 'おいしいです。', kana: 'おいしいです。', romaji: 'Oishii desu.', vi: 'Ngon quá.' },
      { ja: 'いただきます。', kana: 'いただきます。', romaji: 'Itadakimasu.', vi: 'Xin phép được ăn.' },
      { ja: 'ごちそうさまでした。', kana: 'ごちそうさまでした。', romaji: 'Gochisōsama deshita.', vi: 'Cảm ơn bữa ăn.' },
      { ja: 'お会計お願いします。', kana: 'おかいけいおねがいします。', romaji: 'O-kaikei onegai shimasu.', vi: 'Tính tiền giúp.' },
    ],
  },
  {
    id: 'travel',
    label: 'Đi lại',
    hint: 'Trong tàu: nói nhỏ. 降ります khi muốn ra.',
    items: [
      { ja: '駅はどこですか。', kana: 'えきはどこですか。', romaji: 'Eki wa doko desu ka.', vi: 'Ga ở đâu?' },
      { ja: 'この電車は新宿へ行きますか。', kana: 'このでんしゃはしんじゅくへいきますか。', romaji: 'Kono densha wa Shinjuku e ikimasu ka.', vi: 'Tàu này đi Shinjuku chứ?' },
      { ja: '次は何時ですか。', kana: 'つぎはなんじですか。', romaji: 'Tsugi wa nan-ji desu ka.', vi: 'Chuyến sau mấy giờ?' },
      { ja: '降ります。', kana: 'おります。', romaji: 'Orimasu.', vi: 'Tôi xuống đây. (trên tàu/bus)' },
      { ja: '地図を見せてください。', kana: 'ちずをみせてください。', romaji: 'Chizu o misete kudasai.', vi: 'Cho tôi xem bản đồ.' },
      { ja: 'まっすぐ行ってください。', kana: 'まっすぐいってください。', romaji: 'Massugu itte kudasai.', vi: 'Đi thẳng.' },
    ],
  },
  {
    id: 'class',
    label: 'Lớp học',
    hint: 'Dùng với giáo viên. 質問があります rất hay khi muốn hỏi.',
    items: [
      { ja: '質問があります。', kana: 'しつもんがあります。', romaji: 'Shitsumon ga arimasu.', vi: 'Tôi có câu hỏi.' },
      { ja: '黒板を見てください。', kana: 'こくばんをみてください。', romaji: 'Kokuban o mite kudasai.', vi: 'Nhìn bảng giúp.' },
      { ja: '宿題は何ですか。', kana: 'しゅくだいはなんですか。', romaji: 'Shukudai wa nan desu ka.', vi: 'Bài tập về nhà là gì?' },
      { ja: '休みます。', kana: 'やすみます。', romaji: 'Yasumimasu.', vi: 'Tôi xin nghỉ.' },
      { ja: '遅れます。', kana: 'おくれます。', romaji: 'Okuremasu.', vi: 'Tôi sẽ đến muộn.' },
      { ja: '教えてください。', kana: 'おしえてください。', romaji: 'Oshiete kudasai.', vi: 'Xin dạy / chỉ giúp.' },
    ],
  },
  {
    id: 'health',
    label: 'Sức khỏe',
    hint: 'Đau: bộ phận + が痛いです.',
    items: [
      { ja: '具合が悪いです。', kana: 'ぐあいがわるいです。', romaji: 'Guai ga warui desu.', vi: 'Tôi thấy không khỏe.' },
      { ja: '頭が痛いです。', kana: 'あたまがいたいです。', romaji: 'Atama ga itai desu.', vi: 'Tôi đau đầu.' },
      { ja: '熱があります。', kana: 'ねつがあります。', romaji: 'Netsu ga arimasu.', vi: 'Tôi bị sốt.' },
      { ja: '薬をください。', kana: 'くすりをください。', romaji: 'Kusuri o kudasai.', vi: 'Cho tôi thuốc.' },
      { ja: '大丈夫です。', kana: 'だいじょうぶです。', romaji: 'Daijōbu desu.', vi: 'Không sao.' },
      { ja: 'お大事に。', kana: 'おだいじに。', romaji: 'O-daiji ni.', vi: 'Bảo trọng / mau khỏe.' },
    ],
  },
];



