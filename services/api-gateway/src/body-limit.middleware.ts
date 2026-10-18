import type { NextFunction, Request, Response } from "express";

/** Giới hạn body mặc định cho mọi route. */
export const DEFAULT_BODY_LIMIT_BYTES = 1024 * 1024; // 1 MB

/**
 * Route soạn nội dung (admin) gửi ảnh data URL trong JSON — banner, ảnh từ vựng/kanji,
 * ảnh trong sơ đồ tư duy, import từ vựng, template email. Chỉ các tiền tố này được tới 8 MB
 * (body-parser toàn cục trong main.ts); route công khai như /api/auth giữ 1 MB.
 */
export const LARGE_BODY_PREFIXES = [
  "/api/admin",
  "/api/banners",
  "/api/import",
  "/api/mind-maps",
  "/api/vocabularies",
  "/api/grammars",
  "/api/lessons",
  "/api/kanji",
  "/api/mock-exams",
  "/api/reading",
  "/api/listening",
  "/api/reference",
] as const;

export function allowsLargeBody(path: string): boolean {
  return LARGE_BODY_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

/**
 * Chặn sớm theo Content-Length (trước khi đọc body) → trả 413 thay vì đọc 8 MB vào RAM
 * cho route không cần. Body không có Content-Length (chunked) vẫn bị body-parser giới hạn 8 MB.
 */
export function bodyLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const length = Number(req.headers["content-length"] ?? 0);
  if (length > DEFAULT_BODY_LIMIT_BYTES && !allowsLargeBody(req.path)) {
    res.status(413).json({
      success: false,
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: `Body vượt quá ${DEFAULT_BODY_LIMIT_BYTES / 1024 / 1024} MB`,
      },
      path: req.path,
    });
    return;
  }
  next();
}
