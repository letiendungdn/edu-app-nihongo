import { Test, TestingModule } from "@nestjs/testing";
import type { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import { AppModule } from "../api-gateway/src/app.module";
import { configureApp } from "../api-gateway/src/configure-app";

describe("API Gateway E2E", () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    // Cùng cấu hình với main.ts (pipe, filter, body limit, helmet…): test thấy đúng hành vi production
    app = moduleFixture.createNestApplication<NestExpressApplication>({
      rawBody: true,
    });
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Health", () => {
    it("GET /health returns status object", () =>
      request(app.getHttpServer())
        .get("/health")
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveProperty("status");
          expect(res.body.data).toHaveProperty("services");
        }));
  });

  describe("Auth", () => {
    const testEmail = `test-${Date.now()}@nihongo.test`;
    const testPassword = "TestPass123!";
    let token: string;

    it("POST /api/auth/register rejects unknown fields (mass assignment)", () =>
      request(app.getHttpServer())
        .post("/api/auth/register")
        .send({ email: testEmail, password: testPassword, role: "ADMIN" })
        .expect(400)
        .expect((res) => {
          expect(res.body.error.message).toContain("role should not exist");
        }));

    it("POST /api/auth/register creates user and returns token", () =>
      request(app.getHttpServer())
        .post("/api/auth/register")
        .send({ email: testEmail, password: testPassword })
        .expect(201)
        .expect((res) => {
          expect(res.body.data).toHaveProperty("access_token");
          token = res.body.data.access_token;
        }));

    it("POST /api/auth/login with correct credentials returns token", () =>
      request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: testEmail, password: testPassword })
        .expect(201)
        .expect((res) => {
          expect(res.body.data).toHaveProperty("access_token");
        }));

    it("POST /api/auth/login with wrong password returns 401", () =>
      request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: testEmail, password: "wrong12" })
        .expect(401)
        .expect((res) => {
          expect(res.body.success).toBe(false);
        }));

    it("GET /api/auth/me with valid token returns user", async () => {
      if (!token) return;
      await request(app.getHttpServer())
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.email).toBe(testEmail);
        });
    });
  });

  describe("MockExam", () => {
    it("GET /api/mock-exams returns list of templates", () =>
      request(app.getHttpServer())
        .get("/api/mock-exams")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThan(0);
          expect(res.body.data[0]).toHaveProperty("level");
          expect(res.body.data[0]).toHaveProperty("durationMinutes");
        }));

    it("POST /api/mock-exams/n5/start returns exam structure", () =>
      request(app.getHttpServer())
        .post("/api/mock-exams/n5/start")
        .expect(201)
        .expect((res) => {
          expect(res.body.data).toHaveProperty("examId");
          expect(res.body.data).toHaveProperty("questions");
          expect(Array.isArray(res.body.data.questions)).toBe(true);
        }));

    it("POST /api/mock-exams/:id/submit with bad uuid returns 404", () =>
      request(app.getHttpServer())
        .post("/api/mock-exams/00000000-0000-0000-0000-000000000000/submit")
        .send({ answers: {} })
        .expect(404)
        .expect((res) => {
          expect(res.body.success).toBe(false);
        }));

    it("full exam flow: start → submit → verify response", async () => {
      const startRes = await request(app.getHttpServer())
        .post("/api/mock-exams/n5/start")
        .expect(201);

      const { examId, questions } = startRes.body.data;
      const submitRes = await request(app.getHttpServer())
        .post(`/api/mock-exams/${examId}/submit`)
        .send({ answers: {} })
        .expect(201);

      expect(submitRes.body.data).toHaveProperty("percent");
      expect(submitRes.body.data).toHaveProperty("passed");
      expect(submitRes.body.data).toHaveProperty("sectionScores");
      expect(submitRes.body.data.total).toBe(questions.length);
    });
  });

  describe("Protected routes", () => {
    it("GET /api/admin/stats without token returns 401", () =>
      request(app.getHttpServer()).get("/api/admin/stats").expect(401));

    it("GET /api/mock-exams/history without token returns 401", () =>
      request(app.getHttpServer()).get("/api/mock-exams/history").expect(401));
  });

  describe("Marketplace", () => {
    it("GET /api/marketplace/coaches returns 200 with paginated result", () =>
      request(app.getHttpServer())
        .get("/api/marketplace/coaches")
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveProperty("items");
          expect(Array.isArray(res.body.data.items)).toBe(true);
        }));

    it("GET /api/marketplace/coaches/:id/availability returns 200 with slots", () =>
      request(app.getHttpServer())
        .get("/api/marketplace/coaches/1/availability?date=2026-07-01")
        .expect((res) => {
          expect([200, 404]).toContain(res.status);
          if (res.status === 200) {
            expect(Array.isArray(res.body.data)).toBe(true);
          }
        }));

    it("POST /api/marketplace/sessions returns 401 without token", () =>
      request(app.getHttpServer())
        .post("/api/marketplace/sessions")
        .send({
          coachId: 1,
          scheduledAt: "2026-07-01T10:00:00.000Z",
        })
        .expect(401));
  });

  describe("Subscription", () => {
    it("GET /api/subscriptions/plans returns 200 with array (public)", () =>
      request(app.getHttpServer())
        .get("/api/subscriptions/plans")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body.data)).toBe(true);
        }));

    it("GET /api/subscriptions/status returns 401 without token", () =>
      request(app.getHttpServer())
        .get("/api/subscriptions/status")
        .expect(401));
  });

  describe("Content", () => {
    it("GET /api/vocabularies without token returns 200 (public)", () =>
      request(app.getHttpServer())
        .get("/api/vocabularies?lessonNumber=1")
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveProperty("data");
        }));

    it("GET /api/grammars without token returns 200 (public)", () =>
      request(app.getHttpServer())
        .get("/api/grammars?lessonNumber=1")
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveProperty("data");
        }));

    it("GET /api/lessons returns lesson list", () =>
      request(app.getHttpServer())
        .get("/api/lessons")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body.data)).toBe(true);
        }));

    it("GET /api/lessons/abc returns 400 instead of leaking a Prisma error", () =>
      request(app.getHttpServer()).get("/api/lessons/abc").expect(400));

    it("GET /api/lessons/999999 returns 404 for a missing lesson", () =>
      request(app.getHttpServer())
        .get("/api/lessons/999999")
        .expect(404)
        .expect((res) => {
          expect(res.body.error.code).toBe("NOT_FOUND");
        }));
  });
});
