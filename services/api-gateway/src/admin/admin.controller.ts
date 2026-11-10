import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { PaymentStatus, Role } from "@prisma/client";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  CurrentUser,
  Roles,
  RolesGuard,
  type AuthUserPayload,
} from "@app/common";
import { RefundService } from "../../../payment-service/src/refund/refund.service";
import { RequestRefundDto } from "../http/dto/refund.dto";
import { AdminService } from "./admin.service";
import { SupportChatService } from "../realtime/support-chat.service";
import { EmailTemplateService } from "../email-template/email-template.service";
import {
  PreviewEmailTemplateDto,
  TestSendEmailTemplateDto,
  UpdateEmailTemplateDto,
} from "../email-template/dto/update-email-template.dto";
import {
  BroadcastDto,
  ComposeDto,
  SendToUserDto,
} from "../email-template/dto/send-email.dto";

@ApiTags("admin")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
@Controller("api/admin")
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly refundService: RefundService,
    private readonly supportChat: SupportChatService,
    private readonly emailTemplate: EmailTemplateService,
  ) {}

  @Get("stats")
  @ApiOperation({ summary: "Dashboard thống kê (admin only)" })
  getStats() {
    return this.adminService.getDashboardStats();
  }

  @Get("users")
  @ApiOperation({ summary: "Danh sách users kèm số bài thi" })
  listUsers() {
    return this.adminService.listUsers();
  }

  @Patch("users/:id/role")
  @ApiOperation({ summary: "Đổi role user (USER | TEACHER | ADMIN)" })
  updateUserRole(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { role: Role },
  ) {
    return this.adminService.updateUserRole(id, body.role);
  }

  @Get("exam-results")
  @ApiOperation({ summary: "Danh sách kết quả thi thử" })
  listExamResults(@Query("limit") limit?: string) {
    return this.adminService.listExamResults(limit ? Number(limit) : 100);
  }

  @Delete("exam-results/:id")
  @ApiOperation({ summary: "Xoá một kết quả thi thử" })
  deleteExamResult(@Param("id", ParseIntPipe) id: number) {
    return this.adminService.deleteExamResult(id);
  }

  @Post("import/vocab")
  @ApiOperation({ summary: "Import từ vựng từ text tab-separated" })
  importVocab(@Body() body: { lessonNumber: number; text: string }) {
    return this.adminService.importVocab(body.lessonNumber, body.text);
  }

  @Get("payments")
  @ApiOperation({ summary: "Danh sách thanh toán / hoàn tiền (admin)" })
  listPayments(
    @Query("userId") userId?: string,
    @Query("status") status?: PaymentStatus,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.refundService.listPaymentsForAdmin({
      userId: userId ? Number(userId) : undefined,
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get("users/:userId/payments")
  @ApiOperation({ summary: "Lịch sử thanh toán của một user (admin)" })
  listUserPayments(@Param("userId", ParseIntPipe) userId: number) {
    return this.refundService.listUserPayments(userId);
  }

  @Post("payments/:id/refund")
  @ApiOperation({
    summary: "Admin hoàn tiền giao dịch (toàn phần hoặc một phần)",
  })
  refundPayment(
    @CurrentUser() user: AuthUserPayload,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: RequestRefundDto,
  ) {
    return this.refundService.refundPayment(id, {
      requestedByUserId: user.id,
      role: Role.ADMIN,
      reason: dto.reason,
      amountCents: dto.amountCents,
    });
  }

  @Get("support/threads")
  @ApiOperation({ summary: "Danh sách hội thoại hỗ trợ (admin)" })
  listSupportThreads() {
    return this.supportChat.listThreadsForAdmin();
  }

  @Get("support/threads/:id")
  @ApiOperation({ summary: "Chi tiết hội thoại hỗ trợ (admin)" })
  getSupportThread(@Param("id", ParseIntPipe) id: number) {
    return this.supportChat.getThreadForAdmin(id);
  }

  @Post("support/threads/:id/messages")
  @ApiOperation({ summary: "Admin trả lời hội thoại hỗ trợ" })
  async sendSupportMessage(
    @CurrentUser() user: AuthUserPayload,
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { content: string; fileUrl?: string; fileType?: string },
  ) {
    const { message } = await this.supportChat.saveMessage(
      id,
      user.id,
      body.content.trim(),
      body.fileUrl,
      body.fileType,
    );
    return { message };
  }

  @Patch("support/threads/:id/read")
  @ApiOperation({ summary: "Admin đánh dấu đã đọc hội thoại" })
  async markSupportRead(
    @CurrentUser() user: AuthUserPayload,
    @Param("id", ParseIntPipe) id: number,
  ) {
    await this.supportChat.markRead(id, user.id, Role.ADMIN);
    return { ok: true };
  }

  // ─── Email templates ───────────────────────────────────────────────────────

  @Get("email-templates")
  @ApiOperation({
    summary: "Danh sách email templates (hardcoded + DB override)",
  })
  listEmailTemplates() {
    return this.emailTemplate.listAll();
  }

  @Get("email-templates/:name")
  @ApiOperation({
    summary: "Chi tiết template (nội dung DB hoặc hardcoded default)",
  })
  getEmailTemplate(@Param("name") name: string) {
    return this.emailTemplate.findOne(name);
  }

  @Post("email-templates/:name")
  @ApiOperation({ summary: "Tạo / cập nhật DB override cho template" })
  upsertEmailTemplate(
    @CurrentUser() user: AuthUserPayload,
    @Param("name") name: string,
    @Body() dto: UpdateEmailTemplateDto,
  ) {
    return this.emailTemplate.upsert(name, dto, user.id);
  }

  @Delete("email-templates/:name")
  @ApiOperation({
    summary: "Xoá DB override — template về lại hardcoded default",
  })
  resetEmailTemplate(@Param("name") name: string) {
    return this.emailTemplate.reset(name);
  }

  @Post("email-templates/:name/preview")
  @ApiOperation({ summary: "Xem trước template với vars tuỳ chọn" })
  previewEmailTemplate(
    @Param("name") name: string,
    @Body() dto: PreviewEmailTemplateDto,
  ) {
    return this.emailTemplate.preview(name, dto.vars);
  }

  @Post("email-templates/:name/test")
  @ApiOperation({
    summary: "Gửi test email tới địa chỉ chỉ định (hoặc email admin)",
  })
  async testSendEmailTemplate(
    @CurrentUser() user: AuthUserPayload,
    @Param("name") name: string,
    @Body() dto: TestSendEmailTemplateDto,
  ) {
    const toEmail = dto.toEmail ?? user.email;
    return this.emailTemplate.testSend(name, toEmail);
  }

  @Post("email-templates/seed")
  @ApiOperation({
    summary:
      "Seed tất cả templates vào DB từ hardcoded defaults (bỏ qua nếu đã có)",
  })
  seedEmailTemplates(@CurrentUser() user: AuthUserPayload) {
    return this.emailTemplate.seedAll(user.id);
  }

  // ─── Send to user ──────────────────────────────────────────────────────────

  @Post("email-templates/:name/send")
  @ApiOperation({ summary: "Gửi template tới 1 user cụ thể (theo userId)" })
  sendTemplateToUser(
    @CurrentUser() user: AuthUserPayload,
    @Param("name") name: string,
    @Body() dto: SendToUserDto,
  ) {
    return this.emailTemplate.sendToUser(name, dto, user.id);
  }

  // ─── Broadcast ────────────────────────────────────────────────────────────

  @Post("email-templates/:name/broadcast")
  @ApiOperation({ summary: "Broadcast template tới nhóm user (queue)" })
  broadcastTemplate(
    @CurrentUser() user: AuthUserPayload,
    @Param("name") name: string,
    @Body() dto: BroadcastDto,
  ) {
    return this.emailTemplate.broadcast(name, dto.filter, user.id);
  }

  // ─── Composer ─────────────────────────────────────────────────────────────

  @Post("email/compose")
  @ApiOperation({ summary: "Soạn email tự do gửi tới danh sách địa chỉ" })
  composeEmail(@CurrentUser() user: AuthUserPayload, @Body() dto: ComposeDto) {
    return this.emailTemplate.compose(dto, user.id);
  }

  // ─── Broadcast history ────────────────────────────────────────────────────

  @Get("email/broadcasts")
  @ApiOperation({ summary: "Lịch sử các lần broadcast / compose" })
  listBroadcasts(@Query("page") page?: string, @Query("limit") limit?: string) {
    return this.emailTemplate.listBroadcasts(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Get("email/broadcasts/:id")
  @ApiOperation({ summary: "Chi tiết một broadcast job" })
  getBroadcast(@Param("id") id: string) {
    return this.emailTemplate.getBroadcast(id);
  }
}
