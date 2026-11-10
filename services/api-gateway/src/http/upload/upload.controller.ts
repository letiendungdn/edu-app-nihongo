import { Body, Controller, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {} from "@app/common";
import { GetPresignedUrlDto } from "../dto/upload.dto";
import { UploadService } from "./upload.service";

@ApiTags("Upload")
@ApiBearerAuth()
@Controller("api/upload")
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post("presigned-url")
  @ApiOperation({
    summary: "Lấy pre-signed URL để upload file trực tiếp lên S3",
  })
  getPresignedUrl(@Body() dto: GetPresignedUrlDto) {
    return this.uploadService.getPresignedUploadUrl(
      dto.contentType,
      dto.folder,
    );
  }
}
