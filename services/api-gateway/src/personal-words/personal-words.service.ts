import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "@app/prisma";
import type { CreatePersonalWordDto, ListPersonalWordsDto, UpdatePersonalWordDto } from "./dto/personal-word.dto";

// Chỉ trả cột client cần. Không trả nguyên bản ghi (userId, thời gian) ra API.
const publicFields = { id: true, kana: true, meaning: true, lesson: true } as const;

/**
 * Sổ từ vựng cá nhân. Mọi truy vấn lọc theo CẢ id và userId (chống IDOR): người khác đoán id
 * cũng không đọc/sửa/xóa được — họ nhận 404, không biết bản ghi có tồn tại.
 */
@Injectable()
export class PersonalWordsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: number, q: ListPersonalWordsDto) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 50;
    const where = { userId, ...(q.lesson ? { lesson: q.lesson } : {}) };
    // Hai câu trong một transaction: tổng và trang dữ liệu nhất quán với nhau.
    const [data, total] = await this.prisma.$transaction([
      this.prisma.personalWord.findMany({
        where,
        select: publicFields,
        orderBy: { id: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.personalWord.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async get(userId: number, id: number) {
    const word = await this.prisma.personalWord.findFirst({ where: { id, userId }, select: publicFields });
    if (!word) throw new NotFoundException("Không tìm thấy từ");
    return word;
  }

  async create(userId: number, dto: CreatePersonalWordDto) {
    try {
      return await this.prisma.personalWord.create({ data: { ...dto, userId }, select: publicFields });
    } catch (e) {
      throw this.mapUniqueError(e);
    }
  }

  async update(userId: number, id: number, dto: UpdatePersonalWordDto) {
    if (Object.keys(dto).length === 0) throw new BadRequestException("Cần ít nhất một trường để sửa");
    await this.get(userId, id); // 404 nếu không phải của mình
    try {
      return await this.prisma.personalWord.update({ where: { id }, data: dto, select: publicFields });
    } catch (e) {
      throw this.mapUniqueError(e);
    }
  }

  async remove(userId: number, id: number) {
    // Một câu SQL có điều kiện chủ sở hữu: không có khe giữa "kiểm" và "xóa".
    const { count } = await this.prisma.personalWord.deleteMany({ where: { id, userId } });
    if (count === 0) throw new NotFoundException("Không tìm thấy từ");
    return { ok: true as const };
  }

  // P2002 = vi phạm @@unique([userId, kana]) → 409 thay vì 500. Lỗi khác ném nguyên.
  private mapUniqueError(e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return new ConflictException("Từ này đã có trong sổ");
    }
    return e;
  }
}
