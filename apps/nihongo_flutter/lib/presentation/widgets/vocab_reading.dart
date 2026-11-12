import 'package:flutter/material.dart';

import '../../domain/vocab/furigana.dart';
import '../../utils/tts_service.dart';

/// Kanji có furigana nhỏ phía trên. Cách đọc đặt trong Stack (Clip.none) phía trên chữ và được tràn sang
/// hai bên, KHÔNG làm chữ rộng ra (わたし rộng hơn 私 sẽ đẩy thành "私 たち" có khoảng trống).
class FuriganaText extends StatelessWidget {
  const FuriganaText({
    super.key,
    required this.segments,
    required this.fallback,
    this.style = const TextStyle(fontSize: 20, fontWeight: FontWeight.w600, height: 1.2),
  });

  final List<FuriganaSegment> segments;
  final String fallback;
  final TextStyle style;

  @override
  Widget build(BuildContext context) {
    if (segments.isEmpty) return Text(fallback, style: style);
    final rubySize = ((style.fontSize ?? 20) * 0.5).clamp(9.0, 40.0);
    final rubyStyle = TextStyle(
      fontSize: rubySize,
      height: 1.0,
      color: Theme.of(context).colorScheme.onSurfaceVariant,
    );
    return Semantics(
      label: segments.map((s) => s.text).join(),
      excludeSemantics: true,
      child: Padding(
        // Chừa chỗ cho dòng furigana phía trên
        padding: EdgeInsets.only(top: rubySize + 2),
        child: Row(
          key: const Key('furigana'),
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            for (final s in segments)
              Stack(
                clipBehavior: Clip.none,
                alignment: Alignment.topCenter,
                children: [
                  Text(s.text, style: style),
                  if (s.ruby.isNotEmpty)
                    Positioned(
                      // Rộng hơn chữ cũng không sao: Positioned không tính vào kích thước Stack
                      top: -(rubySize + 2),
                      left: -100,
                      right: -100,
                      child: Text(s.ruby, style: rubyStyle, textAlign: TextAlign.center, maxLines: 1, softWrap: false),
                    ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}

/// Âm Hán Việt + nghĩa tiếng Anh; nguồn "ai" thì có nhãn "dịch máy". Không có gì thì không vẽ.
class VocabExtraMeanings extends StatelessWidget {
  const VocabExtraMeanings({super.key, this.hanViet, this.meaningEn, this.source});

  final String? hanViet;
  final String? meaningEn;
  final String? source;

  @override
  Widget build(BuildContext context) {
    final hv = (hanViet?.isNotEmpty ?? false) ? hanViet : null;
    final en = (meaningEn?.isNotEmpty ?? false) ? meaningEn : null;
    if (hv == null && en == null) return const SizedBox.shrink();
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(top: 2),
      child: Wrap(
        spacing: 10,
        runSpacing: 2,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          if (hv != null) Text(hv, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
          if (en != null) ...[
            Text('EN', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: scheme.primary)),
            SpeakEnglishText(en),
            if (source == 'ai')
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                decoration: BoxDecoration(
                  color: const Color(0x33F59E0B),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: const Text('dịch máy', style: TextStyle(fontSize: 10, color: Color(0xFFB45309))),
              ),
          ],
        ],
      ),
    );
  }
}

/// Nghĩa tiếng Anh dạng nút: chạm để nghe (giọng en-US). InkWell riêng nên chạm vào đây không kích hoạt
/// hành động của thẻ chứa nó. [onSpeak] để test thay bằng hàm giả.
class SpeakEnglishText extends StatelessWidget {
  const SpeakEnglishText(this.text, {super.key, this.style, this.onSpeak});

  final String text;
  final TextStyle? style;
  final void Function(String text)? onSpeak;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: 'Nghe tiếng Anh: $text',
      excludeSemantics: true,
      child: InkWell(
        key: const Key('speak-en'),
        borderRadius: BorderRadius.circular(6),
        onTap: () => (onSpeak ?? TtsService.instance.speakEnglish)(text),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 1),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Flexible(child: Text(text, style: style ?? const TextStyle(fontSize: 12))),
              const SizedBox(width: 3),
              Icon(Icons.volume_up_outlined, size: 13, color: Theme.of(context).colorScheme.onSurfaceVariant),
            ],
          ),
        ),
      ),
    );
  }
}

/// Nghĩa tiếng Anh của kanji lấy từ KANJIDIC2 (cùng giấy phép CC BY-SA 4.0 của EDRDG): phải ghi nguồn.
class KanjidicAttribution extends StatelessWidget {
  const KanjidicAttribution({super.key});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Text(
          'Nghĩa tiếng Anh của kanji: KANJIDIC2 © EDRDG, CC BY-SA 4.0 (edrdg.org)',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 11, color: Theme.of(context).colorScheme.onSurfaceVariant),
        ),
      );
}

/// Giấy phép CC BY-SA 4.0 của JMdict yêu cầu ghi nguồn nơi hiển thị dữ liệu.
class JmdictAttribution extends StatelessWidget {
  const JmdictAttribution({super.key});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Text(
          'Nghĩa tiếng Anh: JMdict © EDRDG, CC BY-SA 4.0 (edrdg.org)',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 11, color: Theme.of(context).colorScheme.onSurfaceVariant),
        ),
      );
}
