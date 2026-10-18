import { Global, Module } from "@nestjs/common";
import { ExamEventsConsumer } from "./exam-events.consumer";
import { KafkaProducerService } from "./kafka.producer";
import { OutboxRelayService } from "./outbox-relay.service";
import { ProgressUpdater } from "./progress-updater";

@Global()
@Module({
  providers: [
    KafkaProducerService,
    OutboxRelayService,
    ProgressUpdater,
    ExamEventsConsumer,
  ],
  exports: [KafkaProducerService],
})
export class KafkaModule {}
