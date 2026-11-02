const RESULT_KEY = 'nihongo-mock-exam-result';

export interface MockExamSection {
  id: string;
  name: string;
  count: number;
}

export interface MockExamQuestion {
  id: string;
  sectionId: string;
  sectionName: string;
  type: 'multiple_choice' | 'fill_in_blank' | 'listening';
  question: string;
  options?: Array<{ text: string; imageUrl?: string }>;
  imageUrl?: string;
  audioText?: string;
  audioUrl?: string;
  lessonNumber?: number;
}

export interface MockExamSession {
  examId: string;
  level: string;
  title: string;
  durationMinutes: number;
  totalQuestions: number;
  sections: MockExamSection[];
  questions: MockExamQuestion[];
}

export interface MockExamReviewItem extends MockExamQuestion {
  correctAnswer: string;
  userAnswer: string;
  isCorrect: boolean;
}

export interface MockExamResult {
  examId: string;
  level: string;
  title: string;
  correctCount: number;
  total: number;
  percent: number;
  passThreshold: number;
  passed: boolean;
  sectionScores: Array<{
    sectionId: string;
    sectionName: string;
    correct: number;
    total: number;
  }>;
  review: MockExamReviewItem[];
  submittedAt?: string;
}

export function saveMockExamResult(result: MockExamResult): void {
  sessionStorage.setItem(RESULT_KEY, JSON.stringify(result));
}

export function loadMockExamResult(): MockExamResult | null {
  try {
    const raw = sessionStorage.getItem(RESULT_KEY);
    return raw ? (JSON.parse(raw) as MockExamResult) : null;
  } catch {
    return null;
  }
}

export function clearMockExamResult(): void {
  sessionStorage.removeItem(RESULT_KEY);
}

export function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Câu đọc hiểu soạn dạng 「【文章】…\n\n質問：…」 → tách bài đọc và câu hỏi để hiện bài đọc
 * trong khung riêng. Câu khác giữ nguyên (prompt = cả câu).
 */
export function splitReadingQuestion(question: string): { passage?: string; prompt: string } {
  const head = '【文章】';
  const marker = '\n\n質問：';
  if (!question.startsWith(head)) return { prompt: question };
  const at = question.indexOf(marker);
  if (at < 0) return { prompt: question };
  return {
    passage: question.slice(head.length, at).replace(/^\n+/, ''),
    prompt: question.slice(at + 2),
  };
}

const SPEAKER_LABEL = /^[^\s：:「」。、]{1,6}[：:]\s*/;

/**
 * Nội dung nghe nhiều dòng (hội thoại) → từng câu để đọc nối tiếp, bỏ nhãn người nói
 * (男：, 女1：, 部下A：…) vì đề thật không đọc nhãn.
 */
export function listeningLines(audioText: string): string[] {
  return audioText
    .split(/\n+/)
    .map((line) => line.replace(SPEAKER_LABEL, '').trim())
    .filter(Boolean);
}

const PICTURE_MARK = '［図］';

/**
 * Phương án chỉ có tranh được lưu dạng 「［図］パンとたまご」: khi làm bài chỉ hiện tranh
 * (hiện chữ thì thành câu đọc), khi xem đáp án hiện chữ sau dấu ［図］.
 */
export function pictureOption(text: string): { pictureOnly: boolean; label: string } {
  return text.startsWith(PICTURE_MARK)
    ? { pictureOnly: true, label: text.slice(PICTURE_MARK.length).trim() }
    : { pictureOnly: false, label: text };
}
