import '../entity/srs_card.dart';
import '../entity/vocabulary.dart';
import 'result.dart';

abstract interface class VocabularyRepository {
  Stream<List<Vocabulary>> watchVocabByLesson(int lessonNumber);

  /// Mọi từ vựng đã có trên máy, cho tra từ offline.
  Stream<List<Vocabulary>> watchAllVocab();
  Stream<List<ReviewCard>> watchReviewQueue();
  Future<Result<void>> updateSrsCard(SrsCard card);
  Future<Result<void>> syncLesson(int lessonNumber);
  Future<Result<void>> syncAllPending();
}
