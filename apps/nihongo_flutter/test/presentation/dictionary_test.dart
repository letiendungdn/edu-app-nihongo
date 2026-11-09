import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nihongo_app/data/remote/vocabulary_api.dart';
import 'package:nihongo_app/domain/entity/vocab_entry.dart';
import 'package:nihongo_app/presentation/dictionary/dictionary_controller.dart';
import 'package:nihongo_app/presentation/dictionary/dictionary_screen.dart';

/// API giả: mỗi cấp có [total] từ, mỗi lần trả tối đa [perPage] từ (mặc định = limit).
class FakeVocabApi {
  FakeVocabApi({this.total = 100, this.perPage});
  final int total;
  final int? perPage;
  final calls = <String>[];
  Object? failWith;
  Completer<void>? hold;

  Future<VocabPage> call({required String jlptLevel, required int page, int limit = 30}) async {
    calls.add('$jlptLevel:$page');
    if (hold != null) await hold!.future;
    if (failWith != null) {
      final e = failWith!;
      failWith = null;
      throw e;
    }
    final size = perPage ?? limit;
    final start = (page - 1) * size;
    final end = (start + size).clamp(0, total);
    return VocabPage(total: total, items: [
      for (var i = start; i < end; i++)
        VocabEntry(id: jlptLevel.hashCode * 100000 + i, kana: '$jlptLevel-$i', meaning: 'nghĩa $i'),
    ]);
  }
}

ProviderContainer containerWith(FakeVocabApi api) {
  final c = ProviderContainer(overrides: [dictionaryFetchProvider.overrideWithValue(api.call)]);
  c.listen(dictionaryProvider, (_, __) {}); // giữ provider autoDispose sống trong test
  addTearDown(c.dispose);
  return c;
}

void main() {
  group('DictionaryNotifier', () {
    test('tải trang 1, rồi trang 2, nối tiếp và cập nhật total', () async {
      final api = FakeVocabApi(total: 100);
      final c = containerWith(api);
      final n = c.read(dictionaryProvider.notifier);
      await n.loadMore();
      await n.loadMore();
      final s = c.read(dictionaryProvider);
      expect(api.calls, ['N5:1', 'N5:2']);
      expect(s.items.length, 60);
      expect(s.total, 100);
      expect(s.hasMore, isTrue);
    });

    test('gọi loadMore chồng nhau khi đang tải → chỉ một request', () async {
      final api = FakeVocabApi()..hold = Completer<void>();
      final n = containerWith(api).read(dictionaryProvider.notifier);
      final first = n.loadMore();
      unawaited(n.loadMore());
      unawaited(n.loadMore());
      api.hold!.complete();
      await first;
      expect(api.calls, ['N5:1']);
    });

    test('đủ total thì dừng, không gọi thêm', () async {
      final api = FakeVocabApi(total: 45);
      final c = containerWith(api);
      final n = c.read(dictionaryProvider.notifier);
      await n.loadMore();
      await n.loadMore();
      await n.loadMore();
      expect(api.calls, ['N5:1', 'N5:2']);
      expect(c.read(dictionaryProvider).items.length, 45);
      expect(c.read(dictionaryProvider).hasMore, isFalse);
    });

    test('lỗi → dừng hẳn; Thử lại tải lại đúng trang đó', () async {
      final api = FakeVocabApi()..failWith = Exception('mất mạng');
      final c = containerWith(api);
      final n = c.read(dictionaryProvider.notifier);
      await n.loadMore();
      expect(c.read(dictionaryProvider).error, isNotNull);
      await n.loadMore(); // đang lỗi: không tự gọi lại
      expect(api.calls, ['N5:1']);
      n.retry();
      await pumpEventQueue();
      expect(api.calls, ['N5:1', 'N5:1']);
      expect(c.read(dictionaryProvider).items.length, 30);
      expect(c.read(dictionaryProvider).error, isNull);
    });

    test('đổi cấp khi trang cũ đang tải → bỏ kết quả của cấp cũ', () async {
      final api = FakeVocabApi()..hold = Completer<void>();
      final c = containerWith(api);
      final n = c.read(dictionaryProvider.notifier);
      final oldLoad = n.loadMore(); // N5 trang 1 đang treo
      n.selectLevel('N3'); // N3 trang 1 cũng treo cùng completer
      api.hold!.complete();
      await oldLoad;
      await pumpEventQueue();
      final s = c.read(dictionaryProvider);
      expect(s.level, 'N3');
      expect(s.items.every((e) => e.kana.startsWith('N3-')), isTrue);
      expect(s.items.length, 30);
    });

    test('trang sau trả lại từ đã có (dữ liệu bị đẩy) → không hiện trùng', () async {
      var call = 0;
      Future<VocabPage> shifting({required String jlptLevel, required int page, int limit = 30}) async {
        call++;
        return VocabPage(total: 4, items: call == 1
            ? const [VocabEntry(id: 1, kana: 'a', meaning: 'a'), VocabEntry(id: 2, kana: 'b', meaning: 'b')]
            : const [VocabEntry(id: 2, kana: 'b', meaning: 'b'), VocabEntry(id: 3, kana: 'c', meaning: 'c')]);
      }
      final c = ProviderContainer(overrides: [dictionaryFetchProvider.overrideWithValue(shifting)]);
      addTearDown(c.dispose);
      c.listen(dictionaryProvider, (_, __) {});
      final n = c.read(dictionaryProvider.notifier);
      await n.loadMore();
      await n.loadMore();
      expect(c.read(dictionaryProvider).items.map((e) => e.id), [1, 2, 3]);
    });
  });

  group('VocabularyApi.parseVocabPage', () {
    test('đọc body đã bọc của gateway, bỏ dòng thiếu dữ liệu', () {
      final page = VocabularyApi.parseVocabPage({
        'success': true,
        'data': {
          'data': [
            {'id': 1, 'kana': 'わたし', 'kanji': '私', 'meaning': 'tôi', 'jlptLevel': 'N5'},
            {'id': 2, 'kana': '', 'meaning': 'thiếu kana'},
          ],
          'total': 1366,
          'page': 1,
          'limit': 30,
        },
      });
      expect(page.total, 1366);
      expect(page.items.single.headword, '私');
    });
  });

  group('DictionaryScreen', () {
    Widget app(FakeVocabApi api) => ProviderScope(
          overrides: [dictionaryFetchProvider.overrideWithValue(api.call)],
          child: const MaterialApp(home: DictionaryScreen()),
        );

    testWidgets('mở màn hình thì tải trang 1, kéo xuống thì tải tiếp', (t) async {
      final api = FakeVocabApi(total: 1366);
      await t.pumpWidget(app(api));
      await t.pumpAndSettle();
      expect(api.calls, ['N5:1']);
      expect(find.text('N5-0'), findsOneWidget);
      expect(find.text('1.366 từ'), findsOneWidget);

      await t.drag(find.byType(ListView), const Offset(0, -1600));
      await t.pumpAndSettle();
      expect(api.calls, ['N5:1', 'N5:2']);
    });

    testWidgets('trang trả ít dòng, chưa lấp đầy màn hình → tự tải tiếp tới khi đầy', (t) async {
      final api = FakeVocabApi(total: 100, perPage: 3);
      await t.pumpWidget(app(api));
      await t.pumpAndSettle();
      expect(api.calls.length, greaterThan(1));
      expect(api.calls.length, lessThan(34)); // dừng khi đầy màn hình, không tải hết 100 từ
    });

    testWidgets('chọn cấp khác → danh sách mới từ trang 1', (t) async {
      final api = FakeVocabApi(total: 1366);
      await t.pumpWidget(app(api));
      await t.pumpAndSettle();
      await t.tap(find.text('N3'));
      await t.pumpAndSettle();
      expect(api.calls.last, 'N3:1');
      expect(find.text('N3-0'), findsOneWidget);
      expect(find.text('N5-0'), findsNothing);
    });

    testWidgets('lỗi mạng → hiện nút Thử lại; bấm thì tải được', (t) async {
      final api = FakeVocabApi()..failWith = Exception('mất mạng');
      await t.pumpWidget(app(api));
      await t.pumpAndSettle();
      expect(find.text('Thử lại'), findsOneWidget);
      await t.tap(find.text('Thử lại'));
      await t.pumpAndSettle();
      expect(find.text('N5-0'), findsOneWidget);
    });
  });
}
