import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

if (process.env.OTEL_SDK_DISABLED !== "true") {
  const sdk = new NodeSDK({
    // Tên service trong Jaeger (không có → "unknown_service:node"); SERVICE_NAME đặt trong docker-compose / K8s
    serviceName: process.env.OTEL_SERVICE_NAME ?? process.env.SERVICE_NAME,
    traceExporter: new OTLPTraceExporter({
      url:
        process.env.OTEL_EXPORTER_OTLP_ENDPOINT ??
        "http://localhost:4318/v1/traces",
    }),
    instrumentations: [getNodeAutoInstrumentations()],
  });

  sdk.start();
}
