# Việc cần làm để app thanh toán được (Apple Pay / Google Pay)

Code đã xong ở 5 app mobile và backend. Những việc dưới đây code không tự làm được: tài khoản, chứng chỉ, khóa, chạy webhook. Làm theo thứ tự. Phần A đủ để thử ở **test mode** (không mất tiền thật). Phần B là việc cần khi phát hành.

Cách hoạt động và vị trí code: [payment-wallets.md](./payment-wallets.md).

**Tình trạng lúc viết (20/10/2026)**
- Gateway Docker (`edu-gateway`) chạy bản build cũ, chưa có `GET /api/subscriptions/wallet-config`.
- Gateway Docker dùng khóa Stripe **giả** (`whsec_placeholder`): `.env` ở gốc repo chưa có dòng `STRIPE_*`. Khóa test thật nằm ở `services/.env`.
- DB đã có 3 gói trả phí, cả 3 gắn giá Stripe test. **Cả 3 đều có dùng thử** (BASIC, PRO 7 ngày; PRO_ANNUAL 14 ngày), nên lần mua đầu trừ **$0** và gói ở trạng thái `TRIALING`.
- Chưa thử thanh toán thật từ đầu tới cuối trên app nào.

---

## A. Chạy thử ở test mode

### 1. Đưa khóa Stripe vào gateway Docker
- [ ] Mở `.env` ở **gốc repo** (không phải `services/.env`). Chép 3 dòng từ `services/.env` sang, thêm dòng thứ tư:
  ```
  STRIPE_SECRET_KEY=sk_test_...
  STRIPE_PUBLISHABLE_KEY=pk_test_...
  STRIPE_WEBHOOK_SECRET=whsec_...     # sẽ thay ở bước 2
  STRIPE_MERCHANT_COUNTRY=US           # quốc gia của tài khoản Stripe
  ```
- [ ] Build lại gateway (bắt buộc: bản đang chạy chưa có code mới):
  ```bash
  docker compose up -d --build api-gateway
  ```
- [ ] Kiểm tra. Endpoint phải trả `publishableKey` bắt đầu bằng `pk_test_`:
  ```bash
  curl -s localhost:3000/api/subscriptions/wallet-config
  ```
  Nếu nhận 503 "chưa được cấu hình" thì gateway chưa nhận được `STRIPE_PUBLISHABLE_KEY`.

### 2. Cho webhook của Stripe chạy tới máy
Gói **chỉ được kích hoạt khi webhook về server**. Thiếu bước này thì app trả tiền xong vẫn báo "đang kích hoạt" mãi.

`npm run stripe:listen` gọi `stripe.cmd`, chỉ chạy trên Windows. Trên Mac:
- [ ] Cài Stripe CLI: `brew install stripe/stripe-cli/stripe`.
- [ ] Đăng nhập **đúng tài khoản** có khóa ở bước 1: `stripe login`.
- [ ] Mở một terminal riêng, để chạy suốt lúc thử:
  ```bash
  stripe listen --forward-to localhost:3000/api/webhooks/stripe
  ```
- [ ] Lệnh trên in ra `whsec_...`. Dán giá trị này vào `STRIPE_WEBHOOK_SECRET` trong `.env` gốc, rồi chạy `docker compose up -d api-gateway`.

### 3. Kiểm tra giá trong DB có tồn tại trên Stripe
Giá trong DB là `price_1TmsXH…` / `price_1TmsXI…`. Nếu khóa ở bước 1 thuộc tài khoản Stripe khác thì `POST /subscriptions` sẽ lỗi.
- [ ] `stripe prices retrieve price_1TmsXIR9EzTwyHwwq8rmK0NB` (giá gói PRO). Phải ra một price, không phải lỗi `No such price`.
- [ ] Nếu lỗi: tạo lại sản phẩm và giá trên Stripe Dashboard (test mode), rồi cập nhật cột `stripePriceId` trong bảng `SubscriptionPlanConfig`.

### 4. Apple Pay (iOS native, Flutter, Expo, RN CLI)
Cần tài khoản **Apple Developer Program** trả phí.
- [ ] Apple Developer → Certificates, Identifiers & Profiles → Identifiers → **Merchant IDs**: tạo `merchant.com.edu.nihongo`. Entitlement trong code đã dùng sẵn ID này.
- [ ] Stripe Dashboard (test mode) → Settings → Payment methods → **Apple Pay** → *Add new application*: tải file CSR của Stripe về.
- [ ] Apple Developer → Merchant ID ở trên → *Apple Pay Payment Processing Certificate* → *Create*: tải CSR lên, tải file `.cer` về, rồi tải `.cer` lên lại Stripe.
- [ ] Bật capability **Apple Pay** cho App ID của từng app, chọn merchant ID ở trên:

  | App | Bundle ID |
  |---|---|
  | iOS native | `com.edu.nihongo.ios` |
  | Flutter | `com.edu.nihongoApp` |
  | Expo | `com.edu.nihongo` |
  | RN CLI | **đổi trước:** đang là ID mẫu `org.reactjs.native.example.NihongoCLI` |

- [ ] Đặt Team để Xcode ký app. iOS native: `DEVELOPMENT_TEAM` trong `apps/nihongo-ios/project.yml` (đang để trống), rồi chạy `xcodegen generate`. Các app khác: chọn Team trong Xcode → Signing & Capabilities.
- [ ] Thử trên **simulator** trước (Wallet của simulator có sẵn thẻ test). Máy thật cần thẻ thật trong Wallet; ở test mode Stripe không trừ tiền.

### 5. Google Pay (Android native, Flutter, Expo, RN CLI)
Bản debug tự dùng môi trường **TEST** của Google Pay: không cần đăng ký merchant.
- [ ] Emulator phải dùng image có **Google Play** (không phải "Google APIs"), và đã đăng nhập một tài khoản Google.
- [ ] Thêm thẻ vào Google Wallet trên máy. Ở môi trường TEST, Google trả thẻ giả, không trừ tiền. Muốn dùng bộ thẻ test của Google thì tham gia nhóm Google Pay test card suite bằng tài khoản Google đó.

### 6. Chạy từng app

| App | Lệnh | Lưu ý |
|---|---|---|
| iOS native | mở `apps/nihongo-ios/NihongoEDU.xcodeproj` trong Xcode, Run | gọi `localhost:3000` (simulator) |
| Android native | `cd apps/nihongo-android && ./gradlew installDebug` | gọi `10.0.2.2:3000` (emulator) |
| Flutter | `cd apps/nihongo_flutter && flutter run` | |
| Expo | `cd apps/nihongo-mobile && npx expo run:ios` / `run:android` | **Không dùng Expo Go**: ví không chạy trong đó. `extra.apiBaseUrl` trong `app.json` là `10.0.2.2`, chỉ đúng cho emulator Android. Chạy simulator iOS thì đổi thành `http://localhost:3000/api`. |
| RN CLI | `cd apps/nihongo-cli && (cd ios && pod install) && npx react-native run-ios` / `run-android` | |

Máy thật không gọi được `localhost` / `10.0.2.2`: đổi base URL sang IP LAN của Mac (ví dụ `http://192.168.1.10:3000/api`).

### 7. Thử mua
- [ ] Đăng nhập trong app (chưa đăng nhập thì app chuyển sang màn đăng nhập).
- [ ] Trang chủ → **Nâng cấp Premium** → bấm nút Apple Pay / Google Pay ở một gói.
- [ ] Kết quả đúng:
  - bảng ví hiện **$0.00 hôm nay** và giá các kỳ sau (vì gói có dùng thử);
  - terminal `stripe listen` hiện các event `customer.subscription.*`;
  - app báo "Đã kích hoạt gói …".
- [ ] Đối chiếu trên Stripe Dashboard (test mode) → Subscriptions: subscription mới ở trạng thái *Trialing*.
- [ ] Muốn thử **trừ tiền ngay** (PaymentIntent thay vì SetupIntent): đặt `trialDays = 0` cho một gói trong bảng `SubscriptionPlanConfig`, rồi mua bằng một tài khoản chưa từng có subscription.
- [ ] Bấm mua lại đúng gói đang dùng → app phải báo "Bạn đang dùng gói này rồi".

**Lỗi hay gặp**

| Triệu chứng | Nguyên nhân |
|---|---|
| "Không tải được gói" | gateway chưa build lại (bước 1), hoặc app gọi sai base URL |
| Nút ví mờ / "Máy này chưa có Apple Pay / Google Pay" | thiếu merchant ID hoặc capability (bước 4); emulator không có Google Play hoặc chưa có thẻ (bước 5) |
| "Không tạo được thanh toán" | khóa bí mật sai, hoặc giá không thuộc tài khoản Stripe đó (bước 3) |
| Trả xong mà app báo "sẽ được kích hoạt trong ít phút" mãi | webhook không tới: `stripe listen` không chạy, hoặc `STRIPE_WEBHOOK_SECRET` không khớp (bước 2) |

---

## B. Trước khi phát hành

- [ ] **Chính sách store.** Gói Premium là nội dung số. Apple (guideline 3.1.1) và Google Play yêu cầu dùng **In-App Purchase / Play Billing**; gửi bản dùng Apple Pay / Google Pay cho Premium lên store sẽ bị từ chối. Cần thêm StoreKit 2 / Play Billing (việc riêng, chưa làm). Apple Pay vẫn hợp lệ cho đặt buổi học 1-1 với coach (guideline 3.1.3(d)).
- [ ] Khóa **live**: thay `sk_live_` / `pk_live_` trên server. App không cần build lại, vì khóa công khai lấy từ server.
- [ ] **Webhook production:** Stripe Dashboard → Developers → Webhooks → thêm endpoint `https://<domain>/api/webhooks/stripe`, chọn đủ các event server xử lý: `customer.subscription.updated`, `customer.subscription.deleted`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `invoice.paid`, `invoice.payment_failed`, `charge.refunded`. Lấy *signing secret* của endpoint này làm `STRIPE_WEBHOOK_SECRET`.
- [ ] Làm lại bước A4 (Apple Pay) ở **live mode** của Stripe: chứng chỉ test và live tách riêng.
- [ ] **Google Pay production:** đăng ký Google Pay & Wallet Console, gửi app cho Google duyệt. Bản release tự chuyển sang môi trường PRODUCTION.
- [ ] **Trang quản lý gói** (Apple bắt buộc cho thanh toán định kỳ) phải là URL https thật. Hiện mặc định là `http://nihongo.localhost:8080/payments`. Đổi ở:
  - iOS native: biến `WEB_BASE_URL`;
  - Expo: `extra.webBaseUrl` trong `app.json`;
  - RN CLI: `MANAGEMENT_URL` trong `src/payment/stripeWallet.ts`;
  - Flutter: chưa khai báo trang quản lý (bảng Apple Pay chỉ hiện khoản định kỳ).
- [ ] **RN CLI:** đổi bundle ID và `applicationId` (`com.nihongocli`) sang ID thật. Khi nâng Stripe RN lên bản bỏ cờ `$StripeDisableSPM`, chuyển app sang dynamic framework (ghi chú trong `ios/Podfile`).
- [ ] **Web:** Stripe Dashboard → Settings → Payment method domains → thêm domain của nihongo-web, để Apple Pay / Google Pay hiện ở trang thanh toán web (không cần sửa code).
