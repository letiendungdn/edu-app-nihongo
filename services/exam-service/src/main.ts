import "./tracing";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import {
  EXAM_PROTO_PATH,
  GRPC_DEFAULT_PORTS,
  GRPC_PACKAGES,
} from "@app/contracts";
import { ExamModule } from "./exam.module";
import { RpcHttpExceptionFilter } from "./filters/rpc-http-exception.filter";

async function bootstrap() {
  const port = process.env.EXAM_GRPC_PORT ?? GRPC_DEFAULT_PORTS.exam;
  const host = process.env.GRPC_BIND_HOST ?? "0.0.0.0";
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    ExamModule,
    {
      transport: Transport.GRPC,
      options: {
        package: GRPC_PACKAGES.exam,
        protoPath: EXAM_PROTO_PATH,
        url: `${host}:${port}`,
      },
    },
  );
  app.useGlobalFilters(new RpcHttpExceptionFilter());
  // SIGTERM (K8s rolling update) → đóng gRPC server, Prisma, Kafka gọn gàng
  app.enableShutdownHooks();
  await app.listen();
  const logger = new Logger("Bootstrap");
  logger.log(`Exam service listening on gRPC :${port}`);
}

void bootstrap();
