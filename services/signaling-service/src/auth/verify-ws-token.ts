import { verify } from "jsonwebtoken";

export interface WsTokenPayload {
  sub: number;
  email: string;
}

export function verifyWsToken(token: string): WsTokenPayload | null {
  try {
    return verify(token, process.env.JWT_SECRET!) as unknown as WsTokenPayload;
  } catch {
    return null;
  }
}
