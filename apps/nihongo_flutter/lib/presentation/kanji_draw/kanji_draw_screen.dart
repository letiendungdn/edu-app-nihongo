import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import '../../utils/tts_service.dart';

// Stroke = danh sách điểm trong 1 nét vẽ
typedef Stroke = List<Offset>;

class KanjiDrawScreen extends StatefulWidget {
  const KanjiDrawScreen({super.key, required this.kanji, required this.kana});

  final String kanji;
  final String kana;

  @override
  State<KanjiDrawScreen> createState() => _KanjiDrawScreenState();
}

class _KanjiDrawScreenState extends State<KanjiDrawScreen> {
  // Luôn thay bằng danh sách MỚI, không sửa tại chỗ: _StrokePainter.shouldRepaint so sánh theo
  // tham chiếu. Bản cũ dùng `_current.add(...)`, `_strokes.removeLast()`… → cùng một object →
  // shouldRepaint trả false → nét đang vẽ không hiện, hoàn tác / xóa không vẽ lại màn hình.
  List<Stroke> _strokes = const [];
  Stroke _current = const [];
  bool _submitted = false;
  bool _correct = false;

  void _onPanStart(DragStartDetails d) {
    setState(() {
      _current = [d.localPosition];
      _submitted = false;
    });
  }

  void _onPanUpdate(DragUpdateDetails d) {
    setState(() => _current = [..._current, d.localPosition]);
  }

  void _onPanEnd(DragEndDetails _) {
    setState(() {
      if (_current.length > 2) _strokes = [..._strokes, _current];
      _current = const [];
    });
  }

  void _clear() => setState(() {
        _strokes = const [];
        _submitted = false;
      });

  void _undo() {
    if (_strokes.isNotEmpty) {
      setState(() {
        _strokes = _strokes.sublist(0, _strokes.length - 1);
        _submitted = false;
      });
    }
  }

  void _submit() {
    if (_strokes.isEmpty) return;
    // Kiểm tra đơn giản: người dùng đã vẽ ít nhất 1 nét có độ phức tạp nhất định
    // Production: thay bằng TFLite model inference tại đây
    final totalPoints = _strokes.fold(0, (sum, s) => sum + s.length);
    final ok = totalPoints > 20;
    setState(() {
      _submitted = true;
      _correct = ok;
    });
    if (ok) TtsService.instance.speak(widget.kana);
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Vẽ Kanji'),
        actions: [
          IconButton(
            icon: const Icon(Icons.undo),
            tooltip: 'Xóa nét cuối',
            onPressed: _strokes.isEmpty ? null : _undo,
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline),
            tooltip: 'Xóa tất cả',
            onPressed: _strokes.isEmpty ? null : _clear,
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Kanji cần vẽ
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  widget.kanji,
                  style: Theme.of(context).textTheme.displayLarge?.copyWith(
                        color: scheme.primary,
                      ),
                ),
                const SizedBox(width: 12),
                Text(
                  '（${widget.kana}）',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        color: scheme.onSurfaceVariant,
                      ),
                ),
              ],
            ),

            const SizedBox(height: 8),
            Text(
              'Hãy vẽ chữ trên ô bên dưới',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: scheme.onSurfaceVariant,
                  ),
            ),
            const SizedBox(height: 16),

            // Vùng vẽ
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  border: Border.all(
                    color: _submitted
                        ? (_correct ? Colors.green : Colors.red)
                        : scheme.outlineVariant,
                    width: 2,
                  ),
                  borderRadius: BorderRadius.circular(12),
                  color: scheme.surface,
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: Stack(
                    children: [
                      // Gợi ý mờ ở giữa
                      Center(
                        child: Text(
                          widget.kanji,
                          style: TextStyle(
                            fontSize: 180,
                            color: scheme.outlineVariant.withValues(alpha: 0.15),
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      // Grid lines
                      CustomPaint(
                        painter: _GridPainter(color: scheme.outlineVariant),
                        child: const SizedBox.expand(),
                      ),
                      // Nét vẽ
                      CustomPaint(
                        painter: _StrokePainter(
                          strokes: _strokes,
                          current: _current,
                          strokeColor: scheme.primary,
                        ),
                        child: const SizedBox.expand(),
                      ),
                      // Gesture detector
                      GestureDetector(
                        // BẮT BUỘC: con là SizedBox rỗng, không tự nhận hit test. Mặc định
                        // (deferToChild) thì GestureDetector không bao giờ nhận được chạm →
                        // bản cũ không vẽ được nét nào.
                        behavior: HitTestBehavior.opaque,
                        onPanStart: _onPanStart,
                        onPanUpdate: _onPanUpdate,
                        onPanEnd: _onPanEnd,
                        child: const SizedBox.expand(),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            const SizedBox(height: 16),

            // Kết quả
            if (_submitted)
              AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                decoration: BoxDecoration(
                  color: _correct
                      ? Colors.green.withValues(alpha: 0.12)
                      : Colors.red.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      _correct ? Icons.check_circle : Icons.info_outline,
                      color: _correct ? Colors.green : Colors.red,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      _correct
                          ? 'Tốt lắm! Tiếp tục luyện tập nhé 💪'
                          : 'Chưa đủ nét — hãy thử lại!',
                      style: TextStyle(
                        color: _correct ? Colors.green : Colors.red,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),

            const SizedBox(height: 12),

            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _clear,
                    icon: const Icon(Icons.refresh),
                    label: const Text('Vẽ lại'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton.icon(
                    onPressed: _strokes.isEmpty ? null : _submit,
                    icon: const Icon(Icons.check),
                    label: const Text('Kiểm tra'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// Vẽ lưới ô vuông như giấy tập viết Nhật
class _GridPainter extends CustomPainter {
  _GridPainter({required this.color});
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color.withValues(alpha: 0.3)
      ..strokeWidth = 0.5;

    // Dashed center lines
    _drawDashedLine(canvas, paint, Offset(size.width / 2, 0),
        Offset(size.width / 2, size.height));
    _drawDashedLine(canvas, paint, Offset(0, size.height / 2),
        Offset(size.width, size.height / 2));

    // Diagonal guides (faint)
    final paintDiag = Paint()
      ..color = color.withValues(alpha: 0.15)
      ..strokeWidth = 0.5;
    canvas.drawLine(Offset.zero, Offset(size.width, size.height), paintDiag);
    canvas.drawLine(
        Offset(size.width, 0), Offset(0, size.height), paintDiag);
  }

  void _drawDashedLine(Canvas c, Paint p, Offset start, Offset end) {
    const dashLen = 6.0;
    const gapLen = 4.0;
    final dx = end.dx - start.dx;
    final dy = end.dy - start.dy;
    final dist = (end - start).distance;
    var drawn = 0.0;
    while (drawn < dist) {
      final t1 = drawn / dist;
      final t2 = ((drawn + dashLen) / dist).clamp(0.0, 1.0);
      c.drawLine(
        Offset(start.dx + dx * t1, start.dy + dy * t1),
        Offset(start.dx + dx * t2, start.dy + dy * t2),
        p,
      );
      drawn += dashLen + gapLen;
    }
  }

  @override
  bool shouldRepaint(_GridPainter old) => old.color != color;
}

// Vẽ các nét người dùng đã vẽ
class _StrokePainter extends CustomPainter {
  _StrokePainter({
    required this.strokes,
    required this.current,
    required this.strokeColor,
  });

  final List<Stroke> strokes;
  final Stroke current;
  final Color strokeColor;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = strokeColor
      ..strokeWidth = 6
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..style = PaintingStyle.stroke;

    for (final stroke in [...strokes, current]) {
      if (stroke.length < 2) continue;
      final path = ui.Path()..moveTo(stroke[0].dx, stroke[0].dy);
      for (var i = 1; i < stroke.length; i++) {
        path.lineTo(stroke[i].dx, stroke[i].dy);
      }
      canvas.drawPath(path, paint);
    }
  }

  @override
  bool shouldRepaint(_StrokePainter old) =>
      old.strokes != strokes || old.current != current;
}
