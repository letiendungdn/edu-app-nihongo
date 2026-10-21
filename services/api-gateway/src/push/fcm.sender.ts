import { readFileSync } from "node:fs";
import { JWT } from "google-auth-library";

export type FcmResult = "sent" | "invalid-token" | "error";

export interface FcmMessage {
  title: string;
  body: string;
  data?: Record<string, string>;
}

type Fetch = typeof fetch;

/**
 * Gửi push Android qua FCM HTTP v1. Bản cũ chỉ gửi APNs (iOS): token Android (app Expo) được lưu
 * nhưng không bao giờ nhận nhắc ôn. (App Android native nhắc ôn bằng thông báo local qua WorkManager.)
 *
 * Bật bằng FCM_SERVICE_ACCOUNT_JSON (nội dung JSON) hoặc FCM_SERVICE_ACCOUNT_PATH (đường dẫn file),
 * lấy ở Firebase Console → Project settings → Service accounts.
 */
export class FcmSender {
  constructor(
    private readonly projectId: string,
    private readonly accessToken: () => Promise<string>,
    private readonly http: Fetch = fetch,
  ) {}

  static fromEnv(env: NodeJS.ProcessEnv = process.env): FcmSender | null {
    const raw =
      env.FCM_SERVICE_ACCOUNT_JSON ||
      (env.FCM_SERVICE_ACCOUNT_PATH
        ? readFileSync(env.FCM_SERVICE_ACCOUNT_PATH, "utf8")
        : "");
    if (!raw) return null;
    const account = JSON.parse(raw) as {
      project_id: string;
      client_email: string;
      private_key: string;
    };
    const jwt = new JWT({
      email: account.client_email,
      key: account.private_key,
      scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
    });
    return new FcmSender(account.project_id, async () => {
      const { token } = await jwt.getAccessToken();
      if (!token) throw new Error("Không lấy được access token FCM");
      return token;
    });
  }

  async send(deviceToken: string, message: FcmMessage): Promise<FcmResult> {
    const res = await this.http(
      `https://fcm.googleapis.com/v1/projects/${this.projectId}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${await this.accessToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token: deviceToken,
            notification: { title: message.title, body: message.body },
            data: message.data ?? {},
            // Nhắc ôn cũ quá 1 giờ thì thôi, giống expiry bên APNs
            android: { priority: "high", ttl: "3600s" },
          },
        }),
      },
    );
    if (res.ok) return "sent";
    // 404 UNREGISTERED: app đã gỡ / token hết hạn. 400 INVALID_ARGUMENT: không phải token FCM.
    if (res.status === 404) return "invalid-token";
    if (res.status === 400) {
      const text = await res.text();
      if (/UNREGISTERED|INVALID_ARGUMENT|registration token/i.test(text))
        return "invalid-token";
    }
    return "error";
  }
}
