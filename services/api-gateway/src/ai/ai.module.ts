import { Module } from "@nestjs/common";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";
import { EmbeddingService } from "./grammar-qa/embedding.service";
import { GrammarQaController } from "./grammar-qa/grammar-qa.controller";
import { GrammarQaService } from "./grammar-qa/grammar-qa.service";

@Module({
  controllers: [AiController, GrammarQaController],
  providers: [AiService, EmbeddingService, GrammarQaService],
})
export class AiModule {}
