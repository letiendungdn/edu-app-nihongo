import { Module } from "@nestjs/common";
import { StripeModule } from "../stripe/stripe.module";
import { PayoutScheduler } from "./payout.scheduler";
import { PayoutService } from "./payout.service";

@Module({
  imports: [StripeModule],
  providers: [PayoutService, PayoutScheduler],
  exports: [PayoutService],
})
export class PayoutModule {}
