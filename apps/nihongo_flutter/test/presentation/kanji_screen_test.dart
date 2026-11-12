import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nihongo_app/data/remote/kanji_api.dart';
import 'package:nihongo_app/domain/entity/kanji_entry.dart';
import 'package:nihongo_app/presentation/kanji/kanji_screen.dart';

void main() {
  group('KanjiApi parse', () {
    test('đọc body đã bọc envelope, bỏ dòng hỏng', () {
      final items = KanjiApi.parseEntries({
        'success': true,
        'data': [
          {'id': 1, 'character': '一', 'hanViet': 'NHẤT', 'meaningVi': 'một', 'meaningEn': 'one', 'onyomi': 'いち'},
          {'id': 'x', 'character': '二'},
          {'id': 3, 'character': ''},
        ],
      });
      expect(items, hasLength(1));
      expect(items.first.meaningEn, 'one');
      expect(items.first.kunyomi, isNull);
    });

    test('danh sách bài: ghép nhãn giáo trình, bỏ bài rỗng', () {
      final lessons = KanjiApi.parseLessons({
        'success': true,
        'data': [
          {'lessonNumber': 1, 'title': 'Bài 1', 'textbook': 'KLL', '_count': {'entries': 16}},
          {'lessonNumber': 2, 'title': 'Bài 2', '_count': {'entries': 0}},
        ],
      });
      expect(lessons, hasLength(1));
      expect(lessons.first.label, 'Bài 1 · KLL');
    });
  });

  Widget app(List<Override> overrides) =>
      ProviderScope(overrides: overrides, child: const MaterialApp(home: KanjiScreen()));

  testWidgets('hiện Hán Việt, nghĩa Việt/Anh và ghi nguồn KANJIDIC2', (tester) async {
    await tester.pumpWidget(app([
      kanjiLessonsProvider.overrideWith(
        (ref) async => const [KanjiLessonOption(lessonNumber: 1, label: 'Bài 1 · KLL', count: 1)],
      ),
      kanjiByLessonProvider(1).overrideWith(
        (ref) async => const [
          KanjiEntry(id: 1, character: '一', hanViet: 'NHẤT', meaningVi: 'một', meaningEn: 'one'),
        ],
      ),
    ]));
    await tester.pumpAndSettle();

    expect(find.text('NHẤT'), findsOneWidget);
    expect(find.text('một'), findsOneWidget);
    // Nghĩa tiếng Anh là nút chạm để nghe
    expect(find.byKey(const Key('speak-en')), findsOneWidget);
    expect(find.text('one'), findsOneWidget);
    expect(find.textContaining('KANJIDIC2'), findsOneWidget);
  });

  testWidgets('lỗi mạng thì có nút Thử lại', (tester) async {
    await tester.pumpWidget(app([
      kanjiLessonsProvider.overrideWith((ref) async => throw Exception('offline')),
    ]));
    await tester.pumpAndSettle();
    expect(find.text('Thử lại'), findsOneWidget);
  });
}
