# Cách viết một bài trong docs/

Tài liệu này dành cho **người viết** bài, không phải người học. Người học bắt đầu ở [README.md](./README.md).

## Người đọc là ai

Người **mới học lập trình**:

- Đã cài được phần mềm, gõ được lệnh khi được chỉ.
- Chưa vững JavaScript/TypeScript, terminal, Git.
- Chưa biết Docker, SQL, NestJS, Kubernetes…

Vì vậy:

- **Không bỏ bước.** "Chạy migrate" là chưa đủ: phải ghi lệnh, chạy ở thư mục nào, và kết quả đúng trông thế nào.
- **Từ mới phải giải thích ngay lần đầu xuất hiện**, hoặc trỏ tới bài nền tảng đã giải thích.
- **Một ý một đoạn.** Câu ngắn, ví dụ trước rồi mới lý thuyết.
- **Ví dụ lấy từ code của repo**, có link tới file thật. Không bịa ví dụ "TodoApp".
- **Mọi khẳng định phải kiểm được.** Chưa chắc thì chạy thử trước khi viết. Output trong bài là output thật.
- **Ghi cả macOS lẫn Windows** khi lệnh khác nhau. Không ghi đường dẫn máy cá nhân (`C:\Users\…`, `/Users/…`).

## Khung một bài

```markdown
# <Tên bài: nói rõ học được gì>

> **Mục tiêu:** Học xong bài này bạn làm được: … (2–4 gạch đầu dòng, động từ cụ thể)
> **Cần biết trước:** [bài A](./a.md), [bài B](./b.md)   (hoặc "Không cần gì")
> **Thời gian:** khoảng N giờ

## Từ khóa trong bài
| Từ | Nghĩa ngắn gọn |
|---|---|

## 1. <Vì sao cần cái này> — vấn đề thật mà công cụ giải quyết, tốt nhất là trong project này
## 2..n. <Từng bước> — mỗi bước: làm gì → lệnh/code → kết quả mong đợi → giải thích
## Lỗi hay gặp — | Triệu chứng | Nguyên nhân | Cách sửa |
## Tự kiểm tra — 3–7 câu hỏi, đáp án trong <details>
## Bài tập — làm trên code thật, có cách tự biết mình làm đúng

<!-- nav:start --> … <!-- nav:end -->   ← do script sinh, KHÔNG sửa tay
```

Bài tham khảo (nhóm 11 trở đi) không cần đủ mọi mục, nhưng vẫn phải có khối Mục tiêu / Cần biết trước ở đầu.

## Mục "Đi tiếp" và thứ tự bài

Thứ tự bài nằm **duy nhất** trong các bảng của [README.md](./README.md). Thêm, bớt hay đổi thứ tự bài:

1. Sửa bảng trong README.
2. Chạy `node scripts/docs-nav.mjs`.
3. Kiểm lại: `node scripts/docs-nav.mjs --check`.

## Tiến độ viết lại

Đánh dấu `[x]` khi bài đã viết lại theo khung trên và các khẳng định đã được kiểm.

**0. Nền tảng**
- [x] learn-terminal.md
- [x] setup-tools.md
- [x] learn-git.md
- [x] learn-js-ts.md
- [x] learn-web-http.md

**1. Bắt đầu**
- [ ] run-local.md
- [ ] docker.md
- [ ] accounts.md
- [ ] dev-tools-connect.md
- [ ] learn-edu-app.md

**2. Kiến trúc**
- [ ] system-design.md
- [x] learn-microservices.md (mới)
- [ ] core-flows.md
- [ ] microservices-communication.md
- [ ] media-storage.md
- [ ] learn-system-design.md
- [ ] learn-adr-design-docs.md

**3. Backend**
- [x] learn-nestjs.md (cần bổ sung khối Mục tiêu/Cần biết trước)
- [ ] redis.md
- [ ] mongodb.md
- [ ] learn-kafka.md
- [ ] learn-mqtt-flyway-ddd.md
- [ ] learn-reliability-patterns.md
- [ ] learn-stripe-idempotency.md
- [ ] learn-security-backend.md

**4. Cơ sở dữ liệu**
- [ ] learn-sql.md
- [ ] learn-postgres.md
- [ ] learn-pgadmin.md
- [ ] learn-db-design.md
- [ ] db-design.md
- [ ] db-erd.md

**5. Kiểm thử**
- [ ] learn-testing.md
- [ ] learn-jest.md
- [ ] learn-performance-k6.md

**6. DevOps**
- [ ] learn-devops-roadmap.md
- [ ] learn-docker.md
- [ ] learn-nginx.md
- [ ] learn-infra.md
- [ ] learn-kubernetes.md
- [ ] learn-release-cicd.md
- [ ] learn-observability.md
- [ ] learn-incident-postmortem.md
- [ ] learn-devsecops.md

**7. Cloud**
- [ ] learn-localstack.md
- [ ] learn-aws.md
- [ ] learn-terraform.md
- [ ] learn-aws-serverless.md
- [ ] learn-google-cloud.md

**8. Frontend**
- [x] learn-react.md (mới)
- [ ] roadmap-reactjs.md
- [ ] learn-webpack.md
- [ ] canvas-tools.md
- [ ] learn-ollama-local.md
- [ ] learn-electron.md

**9. Mobile**
- [ ] mobile-tech-stacks.md
- [ ] run-mobile.md
- [x] learn-android-fundamentals.md (Android 3/4)
- [x] learn-android-kotlin.md (Android 1/4)
- [x] learn-android-architecture.md (Android 2/4)
- [x] learn-android-features.md (Android 4/4)
- [x] learn-android-framework.md (Android nâng cao, mới)
- [ ] learn-swift-ios.md
- [ ] learn-flutter.md
- [x] learn-react-native.md (mới)
- [ ] learn-ml-mobile.md
- [ ] security-owasp-mobile.md
- [ ] mobile-qa.md

**10. Tích hợp**
- [ ] keycloak-setup.md
- [ ] keycloak-lab-30m.md
- [ ] keycloak-lab-refresh-roles.md
- [ ] google-oauth-setup.md
- [ ] brevo-mail.md
- [ ] payment-wallets.md
- [ ] payment-checklist.md

**11–14. Tham khảo**
- [ ] roadmap-android.md, roadmap-swift.md, roadmap-flutter.md, roadmap-react-native.md
- [ ] analysis-design.md, bao-cao-phan-tich-thiet-ke.md
- [ ] interview-questions.md, interview-nestjs-mqtt-db.md, interview-devops.md, interview-backend-android-rn-swift.md, interview-mobile.md, interview-android.md, interview-java-dsa.md, interview-react-native-senior.md
- [ ] senior-roadmap.md, notes-senior-study.md, learn-mobile-senior.md
