import { Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser, type AuthUserPayload } from "@app/common";
import { PaymentMethodService } from "../../../payment-service/src/payment-method/payment-method.service";

@ApiTags("Payment methods")
@ApiBearerAuth()
@Controller("api/payment-methods")
export class PaymentMethodsController {
  constructor(private readonly paymentMethodService: PaymentMethodService) {}

  @Get()
  @ApiOperation({ summary: "Danh sách thẻ đã lưu" })
  listCards(@CurrentUser() user: AuthUserPayload) {
    return this.paymentMethodService.listCards(user.id);
  }

  @Post("setup")
  @ApiOperation({ summary: "Tạo SetupIntent để thêm thẻ mới" })
  createSetup(@CurrentUser() user: AuthUserPayload) {
    return this.paymentMethodService.createSetupIntent(user.id);
  }

  @Post(":id/default")
  @ApiOperation({ summary: "Đặt thẻ làm mặc định" })
  setDefault(
    @CurrentUser() user: AuthUserPayload,
    @Param("id") paymentMethodId: string,
  ) {
    return this.paymentMethodService.setDefaultCard(user.id, paymentMethodId);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Xóa thẻ đã lưu" })
  async removeCard(
    @CurrentUser() user: AuthUserPayload,
    @Param("id") paymentMethodId: string,
  ) {
    await this.paymentMethodService.detachCard(user.id, paymentMethodId);
    return { message: "Đã xóa thẻ" };
  }
}
