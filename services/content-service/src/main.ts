import "./tracing";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import {
  CONTENT_PROTO_PATH,
  GRPC_DEFAULT_PORTS,
  GRPC_PACKAGES,
} from "@app/contracts";
import { ContentModule } from "./content.module";

async function bootstrap() {
  const port = process.env.CONTENT_GRPC_PORT ?? GRPC_DEFAULT_PORTS.content;
  const host = process.env.GRPC_BIND_HOST ?? "0.0.0.0";
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    ContentModule,
    {
      transport: Transport.GRPC,
      options: {
        package: GRPC_PACKAGES.content,
        protoPath: CONTENT_PROTO_PATH,
        url: `${host}:${port}`,
      },
    },
  );
  // SIGTERM (K8s rolling update) → đóng gRPC server, Prisma, Kafka gọn gàng
  app.enableShutdownHooks();
  await app.listen();
  const logger = new Logger("Bootstrap");
  logger.log(`Content service listening on gRPC :${port}`);
}

void bootstrap();
