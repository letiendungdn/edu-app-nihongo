import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser, type AuthUserPayload } from "@app/common";
import { CreatePersonalWordDto, ListPersonalWordsDto, UpdatePersonalWordDto } from "./dto/personal-word.dto";
import { PersonalWordsService } from "./personal-words.service";

// Controller mỏng: đọc tham số (đã kiểm bởi ValidationPipe), gọi service. userId luôn lấy từ token.
@ApiTags("personal-words")
@ApiBearerAuth()
@Controller("api/personal-words")
export class PersonalWordsController {
  constructor(private readonly words: PersonalWordsService) {}

  @Get()
  @ApiOperation({ summary: "Sổ từ vựng cá nhân của người đang đăng nhập (phân trang, lọc theo bài)" })
  list(@CurrentUser() user: AuthUserPayload, @Query() query: ListPersonalWordsDto) {
    return this.words.list(user.id, query);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthUserPayload, @Param("id", ParseIntPipe) id: number) {
    return this.words.get(user.id, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUserPayload, @Body() dto: CreatePersonalWordDto) {
    return this.words.create(user.id, dto);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: AuthUserPayload,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdatePersonalWordDto,
  ) {
    return this.words.update(user.id, id, dto);
  }

  @Delete(":id")
  remove(@CurrentUser() user: AuthUserPayload, @Param("id", ParseIntPipe) id: number) {
    return this.words.remove(user.id, id);
  }
}
