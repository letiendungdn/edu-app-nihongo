# Apple Pay / Google Pay cho gói Premium

> Danh sách việc cần làm để thanh toán chạy được (khóa, webhook, Apple/Google): [payment-checklist.md](./payment-checklist.md).

Năm app mobile (iOS native, Android native, Flutter, Expo, React Native CLI) mua gói Premium bằng ví qua Stripe. Thẻ không đi qua server của mình: ví tạo PaymentMethod, Stripe SDK xác nhận intent mà server đã tạo.

## Luồng (giống nhau ở cả 5 app)

```
App                          Gateway (/api)                 Stripe
 │ GET subscriptions/wallet-config ──► publishableKey, merchantCountryCode, currency
 │ GET subscriptions/plans  ─────────► gói trả phí (có stripePriceId)
 │ POST subscriptions {plan} ────────► tạo/lấy subscription ───► intent
 │ ◄── clientSecret + intentType ("payment" | "setup")
 │ Apple Pay / Google Pay ─────────────────────────────────────► xác nhận intent
 │                                    ◄── webhook invoice.paid / subscription.updated
 │ GET subscriptions/status (mỗi 2 giây, tối đa ~30 giây) tới khi plan đúng + ACTIVE/TRIALING
```

| Server trả | Nghĩa | App làm |
|---|---|---|
| `409` | đang dùng đúng gói này | báo "Bạn đang dùng gói này rồi", không mở ví |
| `401` | chưa đăng nhập | chuyển sang màn đăng nhập |
| `clientSecret: null` | đổi gói trên subscription đang chạy (Stripe tự tính chênh lệch) | báo xong, không mở ví |
| `intentType: "setup"` | gói có dùng thử: hôm nay trừ 0, chỉ lưu ví | bảng ví hiện tổng 0.00 và giá các kỳ sau |
| `intentType: "payment"` | trừ tiền kỳ đầu | bảng ví hiện giá gói |

Hết thời gian chờ mà webhook chưa về thì app báo "Thanh toán xong, gói sẽ được kích hoạt trong ít phút", **không báo lỗi**, vì tiền đã trừ.

## Code

| App | Luồng (test được) | Ví | Màn hình |
|---|---|---|---|
| iOS | `Presentation/Premium/PremiumCheckout.swift` | `ApplePayWallet.swift` (`STPApplePayContext`) | `PremiumView.swift` |
| Android | `presentation/premium/PremiumViewModel.kt` | `GooglePayLauncher` trong `PremiumScreen.kt` | `PremiumScreen.kt` |
| Flutter | `lib/data/payment/premium_checkout.dart` | `stripe_wallet_payer.dart` | `presentation/premium/premium_screen.dart` |
| Expo | `src/data/premiumCheckout.ts` | `src/payment/stripeWallet.ts` | `app/premium.tsx` |
| React Native CLI | `src/payment/premiumCheckout.ts` | `src/payment/stripeWallet.ts` | `src/screens/PremiumScreen.tsx` |

Mọi app đều dùng **nút chính thức** của Apple Pay / Google Pay. Apple từ chối app tự vẽ nút Apple Pay.

## Cấu hình phải làm thủ công

**Server**
- `STRIPE_PUBLISHABLE_KEY` (pk_test_… / pk_live_…) cạnh `STRIPE_SECRET_KEY`. Thiếu thì `wallet-config` trả 503.
- Docker: đặt `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` trong `.env` ở thư mục gốc (mẫu: `.env.docker.example`). Không đặt thì gateway chạy bằng khóa giả.
- Webhook phải tới được server, nếu không gói không bao giờ kích hoạt. Khi dev: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.

**Apple Pay (iOS native, Flutter, Expo)**
1. Apple Developer → Identifiers → Merchant IDs: tạo `merchant.com.edu.nihongo`.
2. Stripe Dashboard → Settings → Payment methods → Apple Pay → thêm ứng dụng iOS: tải CSR của Stripe, tạo *Apple Pay Payment Processing Certificate* trên Apple Developer, rồi tải chứng chỉ lên Stripe.
3. Bật capability Apple Pay cho App ID của từng app (`com.edu.nihongo.ios`, `com.edu.nihongoApp`, `com.edu.nihongo`; app RN CLI vẫn dùng bundle ID mẫu `org.reactjs.native.example.NihongoCLI`, cần đổi sang ID thật trước) và chọn merchant ID ở trên. Entitlement đã có trong repo.
4. Simulator: Apple Pay chạy được với thẻ test của Wallet. Máy thật cần thẻ thật trong Wallet; ở test mode, Stripe không trừ tiền.
5. Trang quản lý gói (`managementURL`, Apple bắt buộc cho thanh toán định kỳ) mặc định là `http://nihongo.localhost:8080/payments`. Bản phát hành phải đổi sang URL https thật (iOS native: biến `WEB_BASE_URL`; Expo: `extra.webBaseUrl`).

**Google Pay (Android native, Flutter, Expo)**
- Bản debug dùng môi trường **TEST** của Google Pay: không cần hồ sơ merchant, thẻ giả. Máy hoặc emulator cần Google Play services và đã đăng nhập tài khoản Google.
- Bản release dùng PRODUCTION: cần đăng ký Google Pay & Wallet Console và gửi app để Google duyệt.

**Expo:** ví **không chạy trong Expo Go**. Cần development build (`npx expo run:ios` / `run:android` hoặc EAS Build).

**React Native CLI:** `ios/Podfile` đặt `$StripeDisableSPM = true` để lấy Stripe iOS SDK qua CocoaPods. Lý do: từ bản 0.80, Stripe RN lấy SDK qua SPM, bắt buộc cả app dùng dynamic framework. Stripe đánh dấu cờ này là deprecated; khi nâng Stripe lên bản bỏ cờ thì phải chuyển app sang `use_frameworks! :linkage => :dynamic`. Sau khi đổi Podfile: `cd ios && pod install`.

## Lưu ý chính sách App Store / Google Play

Gói Premium là nội dung số. Theo App Store Review Guideline 3.1.1, Apple yêu cầu nội dung số mở khóa trong app phải mua bằng **In-App Purchase**. Google Play cũng yêu cầu Play Billing cho hàng số. Bản dùng Apple Pay / Google Pay này phù hợp để demo, học tập, hoặc phân phối ngoài store. Muốn lên App Store / Google Play với gói Premium thì phải thêm StoreKit / Play Billing. Apple Pay / Google Pay vẫn dùng hợp lệ cho dịch vụ 1-1 thời gian thực, như đặt buổi học với coach (guideline 3.1.3(d)).

Web (`nihongo-web`) dùng Stripe Payment Element: Apple Pay / Google Pay tự hiện khi bật trong Stripe Dashboard và đã đăng ký domain (Settings → Payment method domains). Không cần sửa code.
