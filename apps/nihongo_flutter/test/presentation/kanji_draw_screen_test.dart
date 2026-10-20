import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nihongo_app/presentation/kanji_draw/kanji_draw_screen.dart';

/// Painter vẽ nét người dùng (lớp private nên tìm theo tên kiểu).
CustomPainter strokePainter(WidgetTester tester) => tester
    .widgetList<CustomPaint>(find.byType(CustomPaint))
    .map((w) => w.painter)
    .whereType<CustomPainter>()
    .firstWhere((p) => p.runtimeType.toString() == '_StrokePainter');

void main() {
  testWidgets('đang vẽ, nhấc tay, hoàn tác, xóa: lần nào canvas cũng được vẽ lại', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: KanjiDrawScreen(kanji: '日', kana: 'にち')));
    final canvas = find.byWidgetPredicate(
      (w) => w is CustomPaint && w.painter?.runtimeType.toString() == '_StrokePainter',
    );
    final start = tester.getCenter(canvas);

    final gesture = await tester.startGesture(start);
    // Vượt ngưỡng "touch slop" (~18 px) để Flutter nhận đây là cử chỉ kéo (onPanStart chạy)
    await gesture.moveBy(const Offset(30, 0));
    await tester.pump();
    var before = strokePainter(tester);
    for (var i = 1; i <= 5; i++) {
      await gesture.moveBy(const Offset(12, 8));
      await tester.pump();
      final now = strokePainter(tester);
      expect(now.shouldRepaint(before), isTrue, reason: 'nét đang vẽ phải hiện ngay (lần di chuyển $i)');
      before = now;
    }
    await gesture.up();
    await tester.pump();
    expect(strokePainter(tester).shouldRepaint(before), isTrue, reason: 'nhấc tay: nét chuyển vào danh sách');

    before = strokePainter(tester);
    await tester.tap(find.byTooltip('Xóa nét cuối'));
    await tester.pump();
    expect(strokePainter(tester).shouldRepaint(before), isTrue, reason: 'hoàn tác phải vẽ lại');

    // vẽ thêm một nét rồi xóa tất cả
    final g2 = await tester.startGesture(start);
    await g2.moveBy(const Offset(-30, 0));
    for (var i = 0; i < 5; i++) {
      await g2.moveBy(const Offset(-10, 10));
    }
    await g2.up();
    await tester.pump();
    before = strokePainter(tester);
    await tester.tap(find.byTooltip('Xóa tất cả'));
    await tester.pump();
    expect(strokePainter(tester).shouldRepaint(before), isTrue, reason: 'xóa tất cả phải vẽ lại');
  });
}
