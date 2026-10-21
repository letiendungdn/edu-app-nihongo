import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Socket } from "socket.io";
import { verifyWsToken } from "./verify-ws-token";

@Injectable()
export class WsJwtGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const client: Socket = context.switchToWs().getClient();
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) throw new UnauthorizedException("No token");
    try {
      const payload = verifyWsToken(token);
      if (!payload) throw new UnauthorizedException("Invalid token");
      client.data.userId = payload.sub;
      client.data.email = payload.email;
      return true;
    } catch {
      throw new UnauthorizedException("Invalid token");
    }
  }
}
