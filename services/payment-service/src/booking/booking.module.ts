import { Module } from "@nestjs/common";
import { StripeModule } from "../stripe/stripe.module";
import { RefundModule } from "../refund/refund.module";
import { BookingService } from "./booking.service";
import { CallTokenService } from "./call-token.service";
import { SessionChatService } from "./session-chat.service";

@Module({
  imports: [StripeModule, RefundModule],
  providers: [BookingService, SessionChatService, CallTokenService],
  exports: [BookingService, SessionChatService, CallTokenService],
})
export class BookingModule {}
