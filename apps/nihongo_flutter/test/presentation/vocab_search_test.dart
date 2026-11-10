import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nihongo_app/domain/entity/vocabulary.dart';
import 'package:nihongo_app/domain/repository/vocabulary_repository.dart';
import 'package:nihongo_app/presentation/vocab_search/vocab_search_screen.dart';
import 'package:nihongo_app/providers.dart';

/// Repository giả: drift được thay bằng một StreamController (phát list mới = vừa sync thêm bài).
class FakeVocabRepo implements VocabularyRepository {
  final all = StreamController<List<Vocabulary>>();
  @override
  Stream<List<Vocabulary>> watchAllVocab() => all.stream;
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

Vocabulary vocab(int id, String kana, String romaji, String meaning, {int lesson = 1}) => Vocabulary(
      id: id, lessonNumber: lesson, kana: kana, meaning: meaning, romaji: romaji, sortOrder: id,
    );

Future<FakeVocabRepo> pumpScreen(WidgetTester tester) async {
  final repo = FakeVocabRepo();
  await tester.pumpWidget(ProviderScope(
    overrides: [vocabRepositoryProvider.overrideWithValue(repo)],
    child: const MaterialApp(home: VocabSearchScreen()),
  ));
  return repo;
}

void main() {
  testWidgets('máy chưa có từ: hướng dẫn mở bài khi có mạng', (tester) async {
    final repo = await pumpScreen(tester);
    repo.all.add([]);
    await tester.pump();
    expect(find.textContaining('Chưa có từ vựng trên máy'), findsOneWidget);
  });

  testWidgets('gõ romaji kiểu bàn phím ra đúng từ lưu có dấu trường âm', (tester) async {
    final repo = await pumpScreen(tester);
    repo.all.add([
      vocab(1, 'かんどうします', 'kandō shimasu', 'cảm động'),
      vocab(2, 'かんじ', 'kanji', 'chữ Hán'),
    ]);
    await tester.pump();
    expect(find.text('Tìm trong 2 từ đã có trên máy, không cần mạng.'), findsOneWidget);

    await tester.enterText(find.byKey(const Key('search_input')), 'kandou');
    await tester.pump();
    expect(find.text('cảm động'), findsOneWidget);
    expect(find.text('chữ Hán'), findsNothing);
  });

  testWidgets('bài mới sync xong thì tìm được ngay, không cần mở lại màn hình', (tester) async {
    final repo = await pumpScreen(tester);
    repo.all.add([vocab(1, 'たべます', 'tabemasu', 'ăn')]);
    await tester.pump();
    await tester.enterText(find.byKey(const Key('search_input')), 'nomi');
    await tester.pump();
    expect(find.textContaining('Không có từ nào'), findsOneWidget);

    repo.all.add([vocab(1, 'たべます', 'tabemasu', 'ăn'), vocab(2, 'のみます', 'nomimasu', 'uống', lesson: 6)]);
    await tester.pump();
    expect(find.text('uống'), findsOneWidget);
  });
}
