import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:nihongo_app/presentation/app.dart';

void main() {
  // Bản cũ tìm chữ 'Nihongo — EDU APP' đã bỏ khỏi Home từ lâu → test luôn đỏ mà không ai biết,
  // vì CI không chạy test Flutter. Giờ CI có job flutter (.github/workflows/ci.yml).
  testWidgets('App smoke test: mở được Home với các mục chính', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: NihongoApp()));
    await tester.pump();

    expect(find.text('Nihongo'), findsOneWidget);
    expect(find.text('Từ vựng'), findsOneWidget);
    expect(find.text('Ôn tập SRS'), findsOneWidget);
  });
}
