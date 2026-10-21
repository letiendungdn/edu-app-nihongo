import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'data/local/app_database.dart';
import 'data/local/token_store.dart';
import 'data/payment/premium_checkout.dart';
import 'data/payment/stripe_wallet_payer.dart';
import 'data/remote/ai_tutor_api.dart';
import 'data/remote/auth_api.dart';
import 'data/remote/dio_factory.dart';
import 'data/remote/live_api.dart';
import 'data/remote/push_service.dart';
import 'data/remote/sentence_practice_api.dart';
import 'data/remote/subscription_api.dart';
import 'data/remote/translate_api.dart';
import 'data/remote/vocabulary_api.dart';
import 'data/repository/vocabulary_repository_impl.dart';
import 'domain/entity/srs_card.dart';
import 'domain/entity/vocabulary.dart';
import 'domain/repository/vocabulary_repository.dart';
import 'domain/usecase/get_review_queue_usecase.dart';
import 'utils/network_monitor.dart';

final appDatabaseProvider = Provider<AppDatabase>((ref) {
  final db = AppDatabase();
  ref.onDispose(db.close);
  return db;
});

final tokenStoreProvider = Provider<TokenStore>((ref) => TokenStore());

final dioProvider = Provider((ref) => createDio(ref.watch(tokenStoreProvider)));

final vocabularyApiProvider =
    Provider((ref) => VocabularyApi(ref.watch(dioProvider)));

final authApiProvider = Provider(
  (ref) => AuthApi(ref.watch(dioProvider), ref.watch(tokenStoreProvider)),
);

final translateApiProvider = Provider(
  (ref) => TranslateApi(ref.watch(dioProvider)),
);

final liveApiProvider = Provider(
  (ref) => LiveApi(ref.watch(dioProvider)),
);

final networkMonitorProvider = Provider((ref) => NetworkMonitor());

final vocabRepositoryProvider = Provider<VocabularyRepository>((ref) {
  final tokenStore = ref.watch(tokenStoreProvider);
  return VocabularyRepositoryImpl(
    db: ref.watch(appDatabaseProvider),
    api: ref.watch(vocabularyApiProvider),
    networkMonitor: ref.watch(networkMonitorProvider),
    isAuthenticated: tokenStore.isLoggedIn,
  );
});

final getReviewQueueUseCaseProvider = Provider(
  (ref) => GetReviewQueueUseCase(ref.watch(vocabRepositoryProvider)),
);

final isOnlineProvider = StreamProvider<bool>((ref) {
  return ref.watch(networkMonitorProvider).onlineStream;
});

final isLoggedInProvider = FutureProvider<bool>((ref) {
  return ref.watch(tokenStoreProvider).isLoggedIn();
});

final reviewQueueProvider = StreamProvider<List<ReviewCard>>((ref) {
  return ref.watch(getReviewQueueUseCaseProvider)();
});

final vocabByLessonProvider =
    StreamProvider.family<List<Vocabulary>, int>((ref, lessonNumber) {
  return ref.watch(vocabRepositoryProvider).watchVocabByLesson(lessonNumber);
});

final selectedLessonProvider = StateProvider<int>((ref) => 1);

final aiTutorApiProvider = Provider(
  (ref) => AiTutorApi(ref.watch(dioProvider)),
);

final pushServiceProvider = Provider(
  (ref) => PushService(ref.watch(dioProvider)),
);

final sentencePracticeApiProvider = Provider(
  (ref) => SentencePracticeApi(ref.watch(dioProvider)),
);

final subscriptionApiProvider = Provider(
  (ref) => SubscriptionApi(ref.watch(dioProvider)),
);

final walletPayerProvider = Provider<WalletPayer>((ref) => StripeWalletPayer());

final premiumCheckoutProvider = Provider(
  (ref) => PremiumCheckout(ref.watch(subscriptionApiProvider), ref.watch(walletPayerProvider)),
);
