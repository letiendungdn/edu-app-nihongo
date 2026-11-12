import 'package:flutter/foundation.dart';
import 'package:flutter_tts/flutter_tts.dart';

import 'english_speech.dart';

class TtsService {
  TtsService._();
  static final TtsService instance = TtsService._();

  final FlutterTts _tts = FlutterTts();
  bool _ready = false;

  Future<void> _ensureReady() async {
    if (_ready) return;
    await _tts.setLanguage('ja-JP');
    await _tts.setSpeechRate(0.7);
    await _tts.setVolume(1.0);
    await _tts.setPitch(1.0);
    // Android: chọn engine TTS tốt nhất có sẵn
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      await _tts.setQueueMode(1); // flush queue before speak
    }
    _ready = true;
  }

  Future<void> speak(String text) async {
    if (text.trim().isEmpty) return;
    await _ensureReady();
    await _tts.stop();
    // speakEnglish đổi ngôn ngữ: đặt lại tiếng Nhật mỗi lần cho chắc
    await _tts.setLanguage('ja-JP');
    await _tts.speak(text.trim());
  }

  /// Đọc nghĩa tiếng Anh (en-US), đã làm sạch bằng [englishForSpeech].
  Future<void> speakEnglish(String text) async {
    final clean = englishForSpeech(text);
    final toSay = clean.isEmpty ? text.trim() : clean;
    if (toSay.isEmpty) return;
    await _ensureReady();
    await _tts.stop();
    await _tts.setLanguage('en-US');
    await _tts.speak(toSay);
  }

  Future<void> stop() => _tts.stop();

  void dispose() => _tts.stop();
}
