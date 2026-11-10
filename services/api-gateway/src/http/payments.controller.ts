import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser, type AuthUserPayload } from "@app/common";
import { RefundService } from "../../../payment-service/src/refund/refund.service";
import { RequestRefundDto } from "./dto/refund.dto";

@ApiTags("Payments")
@ApiBearerAuth()
@Controller("api/payments")
export class PaymentsController {
  constructor(private readonly refundService: RefundService) {}

  @Get("me")
  @ApiOperation({ summary: "Lịch sử thanh toán của user hiện tại" })
  listMyPayments(@CurrentUser() user: AuthUserPayload) {
    return this.refundService.listUserPayments(user.id);
  }

  @Post(":id/refund")
  @ApiOperation({ summary: "Yêu cầu hoàn tiền giao dịch" })
  requestRefund(
    @CurrentUser() user: AuthUserPayload,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: RequestRefundDto,
  ) {
    return this.refundService.refundPayment(id, {
      requestedByUserId: user.id,
      role: user.role,
      reason: dto.reason,
      amountCents: dto.amountCents,
    });
  }
}
