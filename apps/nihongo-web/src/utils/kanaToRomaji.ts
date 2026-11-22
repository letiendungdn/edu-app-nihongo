/** Chuyển kana → romaji (Hepburn đơn giản) cho dòng phân tích câu ví dụ. */

const BASE: Record<string, string> = {
  あ: 'a',
  い: 'i',
  う: 'u',
  え: 'e',
  お: 'o',
  か: 'ka',
  き: 'ki',
  く: 'ku',
  け: 'ke',
  こ: 'ko',
  が: 'ga',
  ぎ: 'gi',
  ぐ: 'gu',
  げ: 'ge',
  ご: 'go',
  さ: 'sa',
  し: 'shi',
  す: 'su',
  せ: 'se',
  そ: 'so',
  ざ: 'za',
  じ: 'ji',
  ず: 'zu',
  ぜ: 'ze',
  ぞ: 'zo',
  た: 'ta',
  ち: 'chi',
  つ: 'tsu',
  て: 'te',
  と: 'to',
  だ: 'da',
  ぢ: 'ji',
  づ: 'zu',
  で: 'de',
  ど: 'do',
  な: 'na',
  に: 'ni',
  ぬ: 'nu',
  ね: 'ne',
  の: 'no',
  は: 'ha',
  ひ: 'hi',
  ふ: 'fu',
  へ: 'he',
  ほ: 'ho',
  ば: 'ba',
  び: 'bi',
  ぶ: 'bu',
  べ: 'be',
  ぼ: 'bo',
  ぱ: 'pa',
  ぴ: 'pi',
  ぷ: 'pu',
  ぺ: 'pe',
  ぽ: 'po',
  ま: 'ma',
  み: 'mi',
  む: 'mu',
  め: 'me',
  も: 'mo',
  や: 'ya',
  ゆ: 'yu',
  よ: 'yo',
  ら: 'ra',
  り: 'ri',
  る: 'ru',
  れ: 're',
  ろ: 'ro',
  わ: 'wa',
  ゐ: 'i',
  ゑ: 'e',
  を: 'o',
  ん: 'n',
  ぁ: 'a',
  ぃ: 'i',
  ぅ: 'u',
  ぇ: 'e',
  ぉ: 'o',
  ゔ: 'vu',
};

const DIGRAPH: Record<string, string> = {
  きゃ: 'kya',
  きゅ: 'kyu',
  きょ: 'kyo',
  ぎゃ: 'gya',
  ぎゅ: 'gyu',
  ぎょ: 'gyo',
  しゃ: 'sha',
  しゅ: 'shu',
  しょ: 'sho',
  しぇ: 'she',
  じゃ: 'ja',
  じゅ: 'ju',
  じょ: 'jo',
  じぇ: 'je',
  ちゃ: 'cha',
  ちゅ: 'chu',
  ちょ: 'cho',
  ちぇ: 'che',
  ぢゃ: 'ja',
  ぢゅ: 'ju',
  ぢょ: 'jo',
  にゃ: 'nya',
  にゅ: 'nyu',
  にょ: 'nyo',
  ひゃ: 'hya',
  ひゅ: 'hyu',
  ひょ: 'hyo',
  びゃ: 'bya',
  びゅ: 'byu',
  びょ: 'byo',
  ぴゃ: 'pya',
  ぴゅ: 'pyu',
  ぴょ: 'pyo',
  みゃ: 'mya',
  みゅ: 'myu',
  みょ: 'myo',
  りゃ: 'rya',
  りゅ: 'ryu',
  りょ: 'ryo',
  ふぁ: 'fa',
  ふぃ: 'fi',
  ふぇ: 'fe',
  ふぉ: 'fo',
  てぃ: 'ti',
  でぃ: 'di',
  とぅ: 'tu',
  どぅ: 'du',
  うぃ: 'wi',
  うぇ: 'we',
  うぉ: 'wo',
  ゔぁ: 'va',
  ゔぃ: 'vi',
  ゔぇ: 've',
  ゔぉ: 'vo',
};

function toHiragana(text: string): string {
  return text.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

export function kanaToRomaji(input: string): string {
  const s = toHiragana(input.normalize('NFKC'));
  let out = '';
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    const pair = s.slice(i, i + 2);

    if (ch === 'っ') {
      const next = DIGRAPH[s.slice(i + 1, i + 3)] ?? BASE[s[i + 1]] ?? '';
      if (next.startsWith('ch')) out += 't';
      else if (next && !/^[aeiou]/.test(next)) out += next[0];
      i += 1;
      continue;
    }
    if (ch === 'ー') {
      const lastVowel = /[aeiou](?=[^aeiou]*$)/.exec(out)?.[0] ?? '';
      out += lastVowel;
      i += 1;
      continue;
    }
    if (DIGRAPH[pair]) {
      out += DIGRAPH[pair];
      i += 2;
      continue;
    }
    if (ch === 'ん') {
      const next = DIGRAPH[s.slice(i + 1, i + 3)] ?? BASE[s[i + 1]] ?? '';
      out += /^[aeiouy]/.test(next) ? "n'" : 'n';
      i += 1;
      continue;
    }
    if (BASE[ch] !== undefined) {
      out += BASE[ch];
      i += 1;
      continue;
    }
    out += ch === '　' ? ' ' : ch === '〜' ? '~' : ch;
    i += 1;
  }
  return out;
}
