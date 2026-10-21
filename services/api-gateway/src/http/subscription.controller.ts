import { Body, Controller, Delete, Get, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  CurrentUser,
  JwtAuthGuard,
  Public,
  type AuthUserPayload,
} from "@app/common";
import { SubscriptionService } from "../../../payment-service/src/subscription/subscription.service";
import { CreateSubscriptionDto } from "./dto/subscription.dto";
import { RequestRefundDto } from "./dto/refund.dto";

@ApiTags("Subscription")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("api/subscriptions")
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post()
  @ApiOperation({ summary: "Tạo hoặc upgrade subscription" })
  subscribe(
    @CurrentUser() user: AuthUserPayload,
    @Body() dto: CreateSubscriptionDto,
  ) {
    return this.subscriptionService.createOrUpgrade(
      user.id,
      dto.plan,
      dto.paymentMethodId,
    );
  }

  @Delete()
  @ApiOperation({ summary: "Cancel subscription (hiệu lực cuối kỳ)" })
  async cancel(@CurrentUser() user: AuthUserPayload) {
    await this.subscriptionService.cancel(user.id);
    return { message: "Subscription sẽ hủy vào cuối kỳ" };
  }

  @Post("refund")
  @ApiOperation({
    summary: "Hoàn tiền subscription (trong 7 ngày) và hủy gói ngay",
  })
  requestRefund(
    @CurrentUser() user: AuthUserPayload,
    @Body() dto: RequestRefundDto,
  ) {
    return this.subscriptionService.requestRefund(user.id, dto.reason);
  }

  @Get("status")
  @ApiOperation({ summary: "Trạng thái subscription hiện tại" })
  getStatus(@CurrentUser() user: AuthUserPayload) {
    return this.subscriptionService.getStatus(user.id);
  }

  @Public()
  @Get("wallet-config")
  @ApiOperation({
    summary:
      "Publishable key + quốc gia merchant cho Apple Pay / Google Pay trên app",
  })
  getWalletConfig() {
    return this.subscriptionService.walletConfig();
  }

  @Public()
  @Get("plans")
  @ApiOperation({ summary: "Danh sách plans và giá" })
  getPlans() {
    return this.subscriptionService.getPlans();
  }
}
