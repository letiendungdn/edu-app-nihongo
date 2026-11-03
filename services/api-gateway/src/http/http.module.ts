import { Module, type DynamicModule, type Type } from "@nestjs/common";
import { LessonsController } from "./lessons.controller";
import { VocabulariesController } from "./vocabularies.controller";
import { GrammarsController } from "./grammars.controller";
import { ExercisesController } from "./exercises.controller";
import { KanjiController } from "./kanji.controller";
import { ListeningController } from "./listening.controller";
import { MockExamsController } from "./mock-exams.controller";
import { ProgressController } from "./progress.controller";
import { ImportController } from "./import.controller";
import { JlptScheduleController } from "./jlpt-schedule.controller";
import { JlptScheduleService } from "./jlpt-schedule.service";
import { ReferenceController } from "./reference.controller";
import { VocabSuffixesController } from "./vocab-suffixes.controller";
import { ReadingController } from "./reading.controller";
import { DictationController } from "./dictation.controller";
import { AnalyticsController } from "./analytics.controller";
import { SubscriptionController } from "./subscription.controller";
import { PaymentsController } from "./payments.controller";
import { PaymentMethodsController } from "./payment-methods.controller";
import { MarketplaceController } from "./marketplace.controller";
import { CoachController } from "./coach.controller";
import { UploadController } from "./upload/upload.controller";
import { UploadService } from "./upload/upload.service";
import { PaymentModule } from "../../../payment-service/src/payment.module";
import { RealtimeModule } from "../realtime/realtime.module";
import { NotificationController } from "./notification.controller";
import { SupportController } from "./support.controller";
import { CommunityController } from "./community.controller";
import { TtsController } from "./tts.controller";
import { TtsService } from "./tts.service";
import { TranslateController } from "./translate.controller";
import { TranslateService } from "./translate.service";
import { KanaRomajiController } from "./kana-romaji.controller";
import { KanaRomajiService } from "./kana-romaji.service";
import { LiveController } from "./live.controller";
import { LiveService } from "./live.service";
import { BannersController } from "./banners.controller";
import { BannersService } from "./banners.service";
import { MindMapsController } from "./mind-maps.controller";
import { JlptPredictionController } from "./jlpt-prediction.controller";
import { JlptPredictionService } from "./jlpt-prediction.service";
import { MindMapsService } from "./mind-maps.service";
import { MindMapDataService } from "./mind-map-data.service";
import { FeatureFlagsController } from "./feature-flags/feature-flags.controller";
import { FeatureFlagsService } from "./feature-flags/feature-flags.service";

const httpImports: Array<Type | DynamicModule> = [
  PaymentModule,
  RealtimeModule,
];

@Module({
  imports: httpImports,
  controllers: [
    FeatureFlagsController,
    LessonsController,
    VocabulariesController,
    GrammarsController,
    ExercisesController,
    KanjiController,
    ListeningController,
    MockExamsController,
    ProgressController,
    ImportController,
    JlptScheduleController,
    ReferenceController,
    VocabSuffixesController,
    ReadingController,
    DictationController,
    AnalyticsController,
    SubscriptionController,
    PaymentsController,
    PaymentMethodsController,
    MarketplaceController,
    CoachController,
    UploadController,
    NotificationController,
    SupportController,
    CommunityController,
    TtsController,
    TranslateController,
    KanaRomajiController,
    LiveController,
    BannersController,
    MindMapsController,
    JlptPredictionController,
  ],
  providers: [
    FeatureFlagsService,
    JlptScheduleService,
    UploadService,
    TtsService,
    TranslateService,
    KanaRomajiService,
    LiveService,
    BannersService,
    MindMapsService,
    JlptPredictionService,
    MindMapDataService,
  ],
})
export class HttpModule {}
