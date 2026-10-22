import { Module } from "@nestjs/common";
import { PrismaModule } from "@app/prisma";
import { MailModule } from "@app/common/mail/mail.module";
import {
  InsightsAdminController,
  InsightsInternalController,
} from "./insights.controller";
import { InsightsService } from "./insights.service";
import { InternalTokenGuard } from "./internal-token.guard";

@Module({
  imports: [PrismaModule, MailModule],
  controllers: [InsightsInternalController, InsightsAdminController],
  providers: [InsightsService, InternalTokenGuard],
})
export class InsightsModule {}
