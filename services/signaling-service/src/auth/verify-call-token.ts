import { verify } from "jsonwebtoken";

interface CallTokenPayload {
  sub: number;
  sessionId: number;
  typ: string;
}

/**
 * Vé vào phòng do gateway ký (POST /api/marketplace/sessions/:id/call-token) sau khi kiểm tra người
 * xin vé là học viên/coach của buổi, buổi đã CONFIRMED và đang trong khung giờ.
 * Hợp lệ khi: chữ ký đúng, chưa hết hạn, là vé gọi, đúng phòng và đúng người đang kết nối.
 */
export function verifyCallToken(
  token: unknown,
  sessionId: number,
  userId: number,
): boolean {
  if (typeof token !== "string" || !token) return false;
  try {
    const p = verify(
      token,
      process.env.JWT_SECRET!,
    ) as unknown as CallTokenPayload;
    return (
      p.typ === "call" &&
      Number(p.sessionId) === Number(sessionId) &&
      Number(p.sub) === Number(userId)
    );
  } catch {
    return false;
  }
}
