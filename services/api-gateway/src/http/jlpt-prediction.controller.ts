import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser, Public, type AuthUserPayload } from "@app/common";
import { JlptPredictionService } from "./jlpt-prediction.service";

@ApiTags("jlpt-prediction")
@Controller("api/jlpt-prediction")
export class JlptPredictionController {
  constructor(private readonly prediction: JlptPredictionService) {}

  @Get("score")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Predicted JLPT score and pass chance from the user's mock exams",
  })
  score(@CurrentUser() user: AuthUserPayload, @Query("level") level?: string) {
    return this.prediction.score(user.id, level);
  }

  @Get("likely")
  @Public()
  @ApiOperation({
    summary:
      "Vocabulary, kanji and grammar most likely to appear at a JLPT level",
  })
  likely(@Query("level") level?: string, @Query("limit") limit?: string) {
    return this.prediction.likely(level, limit ? Number(limit) : undefined);
  }
}
