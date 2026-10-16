/**
 * Cấu hình TTS cố định trên web.
 * Sửa tại đây khi cần đổi giọng / tốc độ — không phụ thuộc voice mặc định của OS.
 */
export const SPEECH_LANG = {
  vi: 'vi-VN',
  ja: 'ja-JP',
} as const;

export type SpeechLangCode = (typeof SPEECH_LANG)[keyof typeof SPEECH_LANG];

/** Thứ tự ưu tiên voice theo từng ngôn ngữ (khớp partial, không phân biệt hoa thường). */
export const SPEECH_VOICE_PRIORITY: Record<SpeechLangCode, readonly string[]> = {
  'vi-VN': [
    'Microsoft HoaiMy Online (Natural)',
    'Microsoft HoaiMy',
    'Google Tiếng Việt',
    'Google Vietnamese',
    'Vietnamese',
  ],
  'ja-JP': [
    'Microsoft Nanami Online (Natural)',
    'Microsoft Nanami',
    'Microsoft Ichiro',
    'Microsoft Haruka',
    'Microsoft Ayumi',
    'Google 日本語',
    'Google Japanese',
    'Japanese',
  ],
};

/** Tốc độ đọc theo ngôn ngữ. */
export const SPEECH_RATE: Record<SpeechLangCode, number> = {
  'vi-VN': 1,
  'ja-JP': 0.9,
};

/** true = ưu tiên giọng local (Kyoko/… trên macOS) — không phụ thuộc Edge TTS server. */
export const SPEECH_PREFER_LOCAL_VOICE = true;

/** Giọng Edge TTS trên server — luôn có tiếng Việt / Nhật, không phụ thuộc máy user. */
export const SPEECH_SERVER_VOICES: Record<SpeechLangCode, string> = {
  'vi-VN': 'vi-VN-HoaiMyNeural',
  'ja-JP': 'ja-JP-NanamiNeural',
};

/** Ngôn ngữ luôn đọc qua server (trình duyệt thường không có voice tiếng Việt). */
export const SPEECH_FORCE_SERVER_LANGS: readonly SpeechLangCode[] = ['vi-VN'];
