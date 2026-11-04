# Machine Learning trong Mobile App — Giải thích từ Project Này

## Câu trả lời ngắn

"Nhúng ML" = chạy mô hình AI **trực tiếp trên điện thoại** (không cần internet)
hoặc **gọi API ML** từ server (cần internet).

Project này đã có cả hai loại — chỉ chưa khai thác hết.

---

## Bức tranh toàn cảnh

```
┌─────────────────────────────────────────────────────────────┐
│                      Mobile App                             │
│                                                             │
│  ┌─────────────────────┐    ┌──────────────────────────┐   │
│  │   On-device ML      │    │    Cloud ML (API call)   │   │
│  │   (không cần mạng)  │    │    (cần mạng)            │   │
│  │                     │    │                          │   │
│  │  ML Kit OCR ✅      │    │  Translate API ✅        │   │
│  │  TFLite model       │    │  Claude/GPT (AI tutor)   │   │
│  │  Whisper (speech)   │    │  Whisper API             │   │
│  │  Drawing recognize  │    │  TTS (đã có Edge TTS)    │   │
│  └─────────────────────┘    └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Loại 1 — On-device ML (project đã có)

### Camera translate đang dùng ML Kit OCR

```
Camera frame (YUV420)
    ↓
cameraImageToInputImageAsync()      ← convert format
    ↓
TextRecognizer.processImage()       ← ML Kit chạy model TRÊN ĐIỆN THOẠI
    ↓  (script: japanese)
List<TextBlock>                     ← toạ độ + text nhận dạng được
    ↓
translateApi.translateJapanese()    ← gọi server (cần mạng)
    ↓
Overlay label trên camera
```

**ML Kit OCR chạy hoàn toàn offline** — model ~5MB được đóng gói trong app.
Chỉ bước dịch mới cần internet.

**Vì sao đây là "ML"?**
Model này được train trên hàng triệu ảnh chữ Nhật → biết phân biệt ひ với は,
kanji phức tạp, chữ viết tay, ánh sáng xấu. Không phải rule-based.

---

## Loại 2 — On-device ML có thể thêm

### 2a. Kanji handwriting recognition (vẽ tay)

User vẽ kanji bằng ngón tay → app nhận ra chữ gì.

```
Vẽ tay trên Canvas
    ↓
List<Offset> (tọa độ các điểm)
    ↓
Normalize → tensor [1, 64, 64, 1]   ← ảnh 64x64 grayscale
    ↓
TFLite model (kanji_recognition.tflite ~8MB)
    ↓
Top-5 candidates: [行, 後, 彳, ...]
```

**Flutter implementation:**

```dart
// pubspec.yaml
// tflite_flutter: ^0.11.0

import 'package:tflite_flutter/tflite_flutter.dart';

class KanjiRecognizer {
  late Interpreter _interpreter;

  Future<void> load() async {
    _interpreter = await Interpreter.fromAsset('models/kanji.tflite');
  }

  Future<List<KanjiCandidate>> recognize(List<Offset> strokes) async {
    // 1. Vẽ strokes ra bitmap 64x64
    final pixels = _strokesToPixels(strokes, size: 64);

    // 2. Normalize 0-255 → 0.0-1.0
    final input = pixels.map((p) => p / 255.0).toList();

    // 3. Chạy model
    final output = List.filled(3000, 0.0).reshape([1, 3000]); // 3000 kanji
    _interpreter.run(input.reshape([1, 64, 64, 1]), output);

    // 4. Top-5 results
    final scores = output[0] as List<double>;
    final indexed = scores.asMap().entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    return indexed.take(5).map((e) => KanjiCandidate(
      kanji: kanjiList[e.key],
      confidence: e.value,
    )).toList();
  }
}
```

**Model nguồn:** [KanjiVG dataset](https://kanjivg.tagaini.net/) → train với TensorFlow → export `.tflite`

---

### 2b. Pronunciation scoring (offline)

User đọc tiếng Nhật → app chấm điểm phát âm so với native speaker.

```
User nói: "おはようございます"
    ↓
Record audio (16kHz WAV)
    ↓
MFCC feature extraction          ← biến audio → 40 số đặc trưng mỗi 25ms
    ↓
TFLite acoustic model            ← so sánh với phoneme chuẩn
    ↓
Score: 78/100
Feedback: "o" OK, "ha" cần cải thiện, "yo" tốt...
```

**Đơn giản hơn — dùng built-in speech API:**
```dart
// speech_to_text: ^6.6.0
// So sánh transcript với expected text

final recognized = await speech.listen(localeId: 'ja-JP');
final expected = "おはようございます";
final score = _calculatePronunciationScore(recognized, expected);
// Levenshtein distance / phoneme matching
```

---

### 2c. Offline Translation (mô hình nhỏ)

Dịch mà không cần internet — dùng cho người học trên xe điện ngầm.

```dart
// OPUS-MT model: Nhật → Việt ~45MB
// Hoặc dùng ML Kit Translation (Google) ~15MB/ngôn ngữ

import 'package:google_mlkit_translation/google_mlkit_translation.dart';

final translator = OnDeviceTranslator(
  sourceLanguage: TranslateLanguage.japanese,
  targetLanguage: TranslateLanguage.vietnamese,
);

// Download model lần đầu (~15MB)
await ModelManager().downloadModel(TranslateLanguage.japanese);

// Sau đó dịch offline
final result = await translator.translateText("今日は");
// → "Hôm nay"
```

**Trade-off so với cloud:**
- On-device: offline OK, chất lượng thấp hơn (~70% accuracy)
- Cloud: cần mạng, chất lượng cao (~95% accuracy)
- Senior pattern: on-device làm fallback khi offline

---

## Loại 3 — LLM API (AI tutor)

Đây là tính năng cao nhất — nhúng AI vào trải nghiệm học.

### 3a. AI Conversation Partner

```
User: "Làm ơn giải thích から vs ので"
    ↓
Claude API (claude-haiku-4-5 — nhanh + rẻ)
    ↓
"から diễn tả nguyên nhân chủ quan (ý kiến người nói)
 ので diễn tả nguyên nhân khách quan (sự thật)
 Ví dụ: 雨だから行かない (tôi không đi vì trời mưa — quyết định của tôi)
        雨なので道が濡れている (đường ướt vì trời mưa — thực tế)"
```

**Flutter implementation:**

```dart
// lib/data/remote/ai_tutor_api.dart
import 'package:dio/dio.dart';

class AiTutorApi {
  AiTutorApi(this._dio);
  final Dio _dio;

  Stream<String> askTutor(String question, List<SrsCard> recentCards) async* {
    // Gửi context về level của user
    final context = recentCards
        .where((c) => c.mastered == false)
        .take(5)
        .map((c) => c.kana)
        .join(', ');

    final response = await _dio.post(
      '/ai/tutor',
      data: {
        'question': question,
        'userContext': 'Đang học N5, chưa thuộc: $context',
        'language': 'vi',    // trả lời tiếng Việt
      },
      options: Options(responseType: ResponseType.stream),
    );

    // Stream response (SSE)
    await for (final chunk in response.data.stream) {
      yield utf8.decode(chunk);
    }
  }
}
```

**Backend — gọi Claude:**
```typescript
// services/api-gateway/src/ai/ai-tutor.service.ts
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class AiTutorService {
  private client = new Anthropic();

  async *streamAnswer(question: string, userContext: string) {
    const stream = this.client.messages.stream({
      model: 'claude-haiku-4-5-20251001',  // nhanh, rẻ ($0.25/1M tokens)
      max_tokens: 500,
      system: `Bạn là gia sư tiếng Nhật thân thiện.
Giải thích ngắn gọn, dùng ví dụ thực tế.
Context về học viên: ${userContext}
Trả lời bằng tiếng Việt, giữ nguyên tiếng Nhật khi cần.`,
      messages: [{ role: 'user', content: question }],
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        yield event.delta.text;
      }
    }
  }
}
```

---

### 3b. AI Generate Practice Sentences

Tự động tạo câu ví dụ dùng vocab user vừa học.

```typescript
// Sau khi user học vocab "行く" (đi)
async generateExamples(vocab: string, level: string): Promise<string[]> {
  const response = await this.client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `Tạo 3 câu ví dụ ngắn dùng từ "${vocab}" 
cho học viên cấp ${level}.
Format JSON: [{"japanese": "...", "romaji": "...", "vietnamese": "..."}]`,
    }],
  });

  return JSON.parse(response.content[0].text);
}

// Output:
// [
//   { japanese: "学校に行く", romaji: "gakkou ni iku", vietnamese: "Đi học" },
//   { japanese: "どこに行きますか", romaji: "...", vietnamese: "Bạn đi đâu?" },
//   ...
// ]
```

---

## Loại 4 — Adaptive ML (SRS thông minh hơn)

### SM-2 hiện tại vs ML-enhanced

```
SM-2 (hiện tại — rule-based):
  easeFactor mới = easeFactor + 0.1 * (quality - 5)
  → Công thức cố định, giống nhau cho mọi user

ML-enhanced SRS:
  → Học từ pattern của từng user
  → Biết: user này hay quên từ Kanji, nhớ tốt Hiragana
  → Biết: user hay review vào 8pm → remind đúng giờ đó
  → Predict: vocab này user sẽ quên sau bao nhiêu ngày
```

**Architecture đơn giản (không cần deep learning):**

```typescript
// Collaborative Filtering — dựa trên pattern của users tương tự
// User A và User B cùng hay quên 行, 後, 時 → dự đoán User C sẽ quên cái gì

// Feature vector cho mỗi SRS review:
// [hour_of_day, day_of_week, interval, repetitions, previous_quality,
//  vocab_lesson, vocab_complexity, time_since_last_review]

// Model: Gradient Boosting (LightGBM) → predict P(forget)
// Train offline → export → serve qua API
// Mobile dùng prediction để adjust interval
```

**Đơn giản hơn — rule-based enhancement:**
```dart
// Thêm context vào SM-2 hiện tại
int adjustInterval(SrsCard card, int baseInterval, ReviewHistory history) {
  var adjusted = baseInterval;

  // User thường review vào buổi tối → interval ngắn hơn ban ngày
  final hour = DateTime.now().hour;
  if (hour >= 20 && history.averageReviewHour < 12) {
    adjusted = (adjusted * 0.8).round();  // review sớm hơn
  }

  // Vocab loại Kanji → khó hơn → giảm interval
  if (card.contentType == 'kanji' && history.kanjiErrorRate > 0.4) {
    adjusted = (adjusted * 0.7).round();
  }

  return adjusted.clamp(1, 180);
}
```

---

## Loại 5 — Speech ML

### Text-to-Speech (đã có — Edge TTS)

Project đã có server-side TTS. Thêm on-device TTS cho offline:

```dart
// flutter_tts: ^4.2.0
import 'package:flutter_tts/flutter_tts.dart';

final tts = FlutterTts();
await tts.setLanguage('ja-JP');
await tts.setSpeechRate(0.8);  // chậm hơn cho người học
await tts.speak('おはようございます');
```

### Speech-to-Text (chưa có — pronunciation practice)

```dart
// speech_to_text: ^6.6.0
final speech = SpeechToText();

Future<void> practiceReading(String target) async {
  await speech.initialize();
  speech.listen(
    localeId: 'ja-JP',
    onResult: (result) {
      final recognized = result.recognizedWords;
      final score = _compareText(recognized, target);
      
      showScore(score);  // 0-100
    },
  );
}

double _compareText(String recognized, String expected) {
  // Chuẩn hóa về hiragana → so sánh
  final normalizedR = toHiragana(recognized);
  final normalizedE = toHiragana(expected);
  
  // Levenshtein distance / % ký tự đúng
  return similarity(normalizedR, normalizedE);
}
```

---

## Tóm tắt — 5 loại ML trong app này

```
┌───────────────────────────────────────────────────────────────┐
│  Loại          │ Đã có  │ Cần thêm   │ Khó  │ Impact        │
├───────────────────────────────────────────────────────────────┤
│ OCR (camera)   │  ✅    │     —      │  —   │ đã done       │
│ Offline dịch   │        │ ML Kit     │  ★   │ offline UX    │
│ Kanji vẽ tay   │        │ TFLite     │  ★★★ │ wow factor    │
│ LLM AI tutor   │        │ Claude API │  ★★  │ high value    │
│ Gen sentences  │        │ Claude API │  ★   │ học sâu hơn   │
│ TTS offline    │        │ flutter_tts│  ★   │ offline audio │
│ Phát âm (STT)  │        │ speech_to_text│★★ │ pronunciation │
│ Adaptive SRS   │        │ rule-based │  ★★  │ retention ↑   │
└───────────────────────────────────────────────────────────────┘
```

---

## Thứ tự làm (dễ → khó, impact cao trước)

**Bước 1 — 1 ngày làm xong:**
```
Offline TTS (flutter_tts)
→ User nghe phát âm khuôn từ mà không cần mạng
→ 5 dòng code
```

**Bước 2 — 2-3 ngày:**
```
Offline translation fallback (ML Kit Translation)
→ Camera translate vẫn chạy khi mất mạng (chất lượng thấp hơn)
→ Download model lần đầu ~15MB
```

**Bước 3 — 1 tuần:**
```
AI Tutor (Claude API)
→ Backend: endpoint /ai/tutor với streaming
→ Flutter: streaming chat UI
→ User hỏi "から vs ので" → giải thích ngay trong app
```

**Bước 4 — 1 tuần:**
```
Pronunciation practice (speech_to_text)
→ SRS screen: nút mic → user đọc → chấm điểm
→ Không cần train model — dùng OS speech API + Levenshtein
```

**Bước 5 — 2-3 tuần (đây mới là "nhúng ML" theo nghĩa kỹ thuật):**
```
Kanji drawing recognition (TFLite)
→ Tìm pretrained model (ETL9G dataset)
→ Convert sang .tflite
→ Flutter: Canvas widget cho user vẽ
→ Inference on-device
```

---

## Câu hỏi phỏng vấn senior về ML mobile

```
Q: On-device ML vs Cloud ML — khi nào dùng cái nào?
A: On-device khi: cần offline, latency < 100ms, data nhạy cảm (không muốn gửi lên server)
   Cloud ML khi: model > 50MB, cần accuracy cao, computational heavy (LLM)

Q: ML Kit là gì?
A: Google's on-device ML SDK — bao gồm: OCR, face detection, barcode scan,
   translation, pose estimation. Model được đóng gói hoặc download runtime.
   Không cần Google account, không gửi data lên cloud.

Q: TFLite là gì?
A: TensorFlow Lite — runtime để chạy ML model trên mobile.
   Model được quantize từ float32 → int8 (nhỏ hơn 4x, nhanh hơn 2-3x, accuracy giảm ~1%)
   Flutter: tflite_flutter package
   Android: built-in ML Model Binding

Q: Làm sao tránh app bị chậm khi chạy ML inference?
A: Chạy inference trên background isolate (Flutter) hoặc background thread (Android)
   Camera translate trong project đúng rồi: _processing flag tránh concurrent inference
   Throttle 900ms (_scanIntervalMs) — không process mọi frame

Q: Adaptive SRS khác gì SM-2 thông thường?
A: SM-2: công thức cố định cho mọi user
   Adaptive: học từ pattern cá nhân — thời gian review, error rate theo loại vocab,
   điều chỉnh interval theo context (giờ trong ngày, chuỗi learning streak)
```

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **9. Mobile** — bài 8/9.

- Bài trước: [learn-flutter.md](./learn-flutter.md) — Lộ trình 8 tuần học Flutter từ code thật của nihongo_flutter
- **Bài tiếp: [security-owasp-mobile.md](./security-owasp-mobile.md)** — Bảo mật mobile theo OWASP

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
