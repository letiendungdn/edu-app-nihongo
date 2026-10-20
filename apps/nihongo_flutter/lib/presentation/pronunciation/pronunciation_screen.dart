import 'dart:math';

import 'package:flutter/material.dart';
import 'package:speech_to_text/speech_to_text.dart';

class PronunciationScreen extends StatefulWidget {
  const PronunciationScreen({
    super.key,
    required this.kana,
    required this.meaning,
  });

  final String kana;
  final String meaning;

  @override
  State<PronunciationScreen> createState() => _PronunciationScreenState();
}

class _PronunciationScreenState extends State<PronunciationScreen> {
  final SpeechToText _speech = SpeechToText();

  bool _available = false;
  bool _listening = false;
  String _recognized = '';
  double? _score;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    final ok = await _speech.initialize(
      onError: (_) => setState(() => _listening = false),
      onStatus: (status) {
        if (status == 'done' || status == 'notListening') {
          setState(() => _listening = false);
        }
      },
    );
    setState(() => _available = ok);
  }

  Future<void> _startListening() async {
    if (!_available) return;
    setState(() {
      _recognized = '';
      _score = null;
      _listening = true;
    });

    await _speech.listen(
      listenOptions: SpeechListenOptions(
        localeId: 'ja-JP',
        listenFor: const Duration(seconds: 5),
        pauseFor: const Duration(seconds: 2),
      ),
      onResult: (result) {
        setState(() {
          _recognized = result.recognizedWords;
          if (result.finalResult) {
            _score = _calcScore(_recognized, widget.kana);
            _listening = false;
          }
        });
      },
    );
  }

  Future<void> _stop() async {
    await _speech.stop();
    setState(() => _listening = false);
  }

  // So sánh ký tự-by-ký tự sau khi normalize
  double _calcScore(String recognized, String expected) {
    final r = recognized.trim().replaceAll(' ', '');
    final e = expected.trim().replaceAll(' ', '');
    if (e.isEmpty) return 0;
    if (r == e) return 1.0;

    final rChars = r.characters.toList();
    final eChars = e.characters.toList();
    int matches = 0;
    for (var i = 0; i < min(rChars.length, eChars.length); i++) {
      if (rChars[i] == eChars[i]) matches++;
    }
    return matches / eChars.length;
  }

  Color _scoreColor(double score) {
    if (score >= 0.8) return Colors.green;
    if (score >= 0.5) return Colors.orange;
    return Colors.red;
  }

  String _scoreFeedback(double score) {
    if (score >= 0.9) return 'Xuất sắc! 🎉';
    if (score >= 0.7) return 'Tốt lắm! 👍';
    if (score >= 0.5) return 'Khá ổn, luyện thêm nhé!';
    return 'Thử lại nha, bạn làm được!';
  }

  @override
  void dispose() {
    _speech.stop();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Luyện phát âm')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            // Từ cần đọc
            Card(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 24),
                child: Column(
                  children: [
                    Text(
                      widget.kana,
                      style: Theme.of(context).textTheme.displayMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      widget.meaning,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 32),

            // Mic button
            if (!_available)
              const Text('Thiết bị không hỗ trợ nhận dạng giọng nói.')
            else ...[
              GestureDetector(
                onTap: _listening ? _stop : _startListening,
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  width: 88,
                  height: 88,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: _listening
                        ? Theme.of(context).colorScheme.error
                        : Theme.of(context).colorScheme.primary,
                    boxShadow: _listening
                        ? [
                            BoxShadow(
                              color: Theme.of(context)
                                  .colorScheme
                                  .error
                                  .withValues(alpha: 0.4),
                              blurRadius: 20,
                              spreadRadius: 4,
                            ),
                          ]
                        : [],
                  ),
                  child: Icon(
                    _listening ? Icons.stop : Icons.mic,
                    color: Colors.white,
                    size: 40,
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                _listening ? 'Đang nghe... (bấm để dừng)' : 'Bấm để nói',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
              ),
            ],

            const SizedBox(height: 32),

            // Kết quả
            if (_recognized.isNotEmpty) ...[
              Text('Bạn đọc:', style: Theme.of(context).textTheme.labelLarge),
              const SizedBox(height: 4),
              Text(
                _recognized,
                style: Theme.of(context)
                    .textTheme
                    .headlineSmall
                    ?.copyWith(fontWeight: FontWeight.w600),
              ),
            ],

            if (_score != null) ...[
              const SizedBox(height: 24),
              // Score ring
              Stack(
                alignment: Alignment.center,
                children: [
                  SizedBox(
                    width: 100,
                    height: 100,
                    child: CircularProgressIndicator(
                      value: _score,
                      strokeWidth: 8,
                      color: _scoreColor(_score!),
                      backgroundColor: Theme.of(context)
                          .colorScheme
                          .surfaceContainerHigh,
                    ),
                  ),
                  Text(
                    '${(_score! * 100).round()}',
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: _scoreColor(_score!),
                        ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                _scoreFeedback(_score!),
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 16),
              OutlinedButton.icon(
                onPressed: _startListening,
                icon: const Icon(Icons.refresh),
                label: const Text('Thử lại'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
