import { splitReadingQuestion } from '../utils/mockExam';

interface Props {
  question: string;
  /** Thẻ cho phần câu hỏi: h3 ở trang làm bài, p ở trang đáp án */
  as?: 'h3' | 'p';
  className?: string;
}

/**
 * Câu hỏi đề thi: bài đọc 【文章】 hiện trong khung riêng (giữ xuống dòng),
 * dòng hướng dẫn kiểu đề thật (「次の文の…」) hiện nhỏ phía trên câu.
 */
export default function MockExamQuestionText({ question, as: Tag = 'h3', className = '' }: Props) {
  const { passage, prompt } = splitReadingQuestion(question);
  const split = !passage ? prompt.indexOf('\n\n') : -1;
  const instruction = split > 0 ? prompt.slice(0, split) : null;
  const body = split > 0 ? prompt.slice(split + 2) : prompt;

  return (
    <>
      {passage && (
        <div className="mock-exam-passage japanese-text" tabIndex={0} aria-label="Bài đọc">
          {passage}
        </div>
      )}
      {instruction && <p className="mock-exam-instruction japanese-text">{instruction}</p>}
      <Tag className={`${className} mock-exam-prompt`.trim()}>{body}</Tag>
    </>
  );
}
