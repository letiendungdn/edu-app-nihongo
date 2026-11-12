import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nihongo_app/presentation/widgets/vocab_reading.dart';
import 'package:nihongo_app/utils/english_speech.dart';

void main() {
  test('englishForSpeech bỏ ghi chú trong ngoặc, dấu ~, đổi ; thành ,', () {
    expect(englishForSpeech('fictional company (in textbook)'), 'fictional company');
    expect(englishForSpeech('to turn on; to switch on'), 'to turn on, to switch on');
    expect(englishForSpeech('this ~ (near the speaker)'), 'this');
  });

  testWidgets('chạm nghĩa tiếng Anh thì đọc, không kích hoạt thẻ chứa nó', (tester) async {
    final spoken = <String>[];
    var outerTaps = 0;
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: InkWell(
          onTap: () => outerTaps++,
          child: SpeakEnglishText('to eat; to have a meal', onSpeak: spoken.add),
        ),
      ),
    ));
    await tester.tap(find.byKey(const Key('speak-en')));
    expect(spoken, ['to eat; to have a meal']);
    expect(outerTaps, 0);
  });
}
