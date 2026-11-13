import { Module } from "@nestjs/common";
import { PrismaModule } from "@app/prisma";
import { PersonalWordsController } from "./personal-words.controller";
import { PersonalWordsService } from "./personal-words.service";

@Module({
  imports: [PrismaModule],
  controllers: [PersonalWordsController],
  providers: [PersonalWordsService],
})
export class PersonalWordsModule {}
