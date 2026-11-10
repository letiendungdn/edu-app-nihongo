import { ApiProperty } from "@nestjs/swagger";
import {
  IsObject,
  ValidationArguments,
  ValidationOptions,
  registerDecorator,
} from "class-validator";

/** Đề dài nhất (N1) khoảng 100 câu; để dư cho đề tự soạn. */
export const MAX_ANSWERS = 300;
/** Đáp án là mã lựa chọn hoặc câu trả lời ngắn (điền từ). */
export const MAX_ANSWER_LENGTH = 200;
const MAX_QUESTION_ID_LENGTH = 100;

/**
 * Object dạng { [mãCâu]: đápÁn }: mọi giá trị là chuỗi, giới hạn số câu và độ dài.
 * class-validator không có sẵn kiểu "Record<string, string>", nên viết validator riêng.
 */
function IsAnswerMap(options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: "isAnswerMap",
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: unknown) {
          if (
            typeof value !== "object" ||
            value === null ||
            Array.isArray(value)
          )
            return false;
          const entries = Object.entries(value);
          return (
            entries.length <= MAX_ANSWERS &&
            entries.every(
              ([questionId, answer]) =>
                questionId.length <= MAX_QUESTION_ID_LENGTH &&
                typeof answer === "string" &&
                answer.length <= MAX_ANSWER_LENGTH,
            )
          );
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} phải là object { mãCâu: đápÁn } với tối đa ${MAX_ANSWERS} câu, mỗi đáp án là chuỗi ≤ ${MAX_ANSWER_LENGTH} ký tự`;
        },
      },
    });
  };
}

/**
 * Body của POST /api/mock-exams/:examId/submit. Bản cũ khai báo kiểu inline
 * `{ answers: Record<string, string> }` nên ValidationPipe bỏ qua hoàn toàn (metatype là Object):
 * `answers` có thể là bất cứ thứ gì, kể cả object hàng chục MB.
 */
export class SubmitMockExamDto {
  @ApiProperty({
    example: { "q-1": "A", "q-2": "こんにちは" },
    description: "Đáp án theo mã câu hỏi",
  })
  @IsObject()
  @IsAnswerMap()
  answers!: Record<string, string>;
}
