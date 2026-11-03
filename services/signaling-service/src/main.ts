import { config } from "dotenv";
import { resolve } from "node:path";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

config({ path: resolve(__dirname, "../../.env") });
config({ path: resolve(__dirname, "../.env") });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Không có dòng này thì SIGTERM (docker stop, rolling update) không gọi onModuleDestroy:
  // kết nối Redis không được đóng, container chờ hết 10 giây mới bị kill.
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3002);
  console.log(`Signaling service running on :${process.env.PORT ?? 3002}`);
}

bootstrap().catch((err) => {
  console.error("Signaling service failed to start:", err);
  process.exit(1);
});
