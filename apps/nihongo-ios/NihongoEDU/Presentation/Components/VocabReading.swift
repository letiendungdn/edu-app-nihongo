import SwiftUI

/// Một đoạn furigana: chữ + cách đọc (rỗng nếu đoạn không có kanji).
struct FuriganaSegment: Hashable {
    let text: String
    let ruby: String

    /// Đọc JSON [["食","た"],["べます",""]] do backend tính. Sai định dạng → mảng rỗng (hiện chữ trơn).
    static func parse(_ raw: String?) -> [FuriganaSegment] {
        guard let data = raw?.data(using: .utf8),
              let arr = try? JSONSerialization.jsonObject(with: data) as? [[String]],
              arr.allSatisfy({ $0.count == 2 })
        else { return [] }
        return arr.map { FuriganaSegment(text: $0[0], ruby: $0[1]) }
    }
}

/// Kanji có furigana nhỏ phía trên. SwiftUI không có ruby nên tự vẽ: cách đọc nằm trong overlay phía trên chữ,
/// `fixedSize` để được tràn sang hai bên mà KHÔNG làm chữ rộng ra (わたし rộng hơn 私 sẽ đẩy thành "私 たち").
struct FuriganaText: View {
    let segments: [FuriganaSegment]
    let fallback: String
    var size: CGFloat = 20

    private var rubySize: CGFloat { max(size * 0.5, 9) }
    /// Chiều cao một dòng furigana (cỡ chữ cộng khoảng cách dòng mặc định ~20%)
    private var rubyLine: CGFloat { rubySize * 1.2 }

    var body: some View {
        if segments.isEmpty {
            Text(fallback).font(.system(size: size, weight: .semibold))
        } else {
            HStack(alignment: .lastTextBaseline, spacing: 0) {
                ForEach(Array(segments.enumerated()), id: \.offset) { _, seg in
                    Text(seg.text)
                        .font(.system(size: size, weight: .semibold))
                        .overlay(alignment: .top) {
                            if !seg.ruby.isEmpty {
                                Text(seg.ruby)
                                    .font(.system(size: rubySize))
                                    .foregroundStyle(.secondary)
                                    .fixedSize()
                                    // Overlay căn theo mép trên của chữ, rồi đẩy lên trọn một dòng furigana
                                    .offset(y: -rubyLine)
                            }
                        }
                }
            }
            .padding(.top, rubyLine) // chừa chỗ cho dòng furigana
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(segments.map(\.text).joined())
            .accessibilityIdentifier("furigana")
        }
    }
}

/// Âm Hán Việt + nghĩa tiếng Anh; nguồn "ai" thì có nhãn "dịch máy". Không có gì thì không vẽ.
struct VocabExtraMeanings: View {
    let hanViet: String?
    let meaningEn: String?
    let source: String?

    var body: some View {
        let hv = hanViet?.isEmpty == false ? hanViet : nil
        let en = meaningEn?.isEmpty == false ? meaningEn : nil
        if hv != nil || en != nil {
            HStack(spacing: 8) {
                if let hv { Text(hv).font(.caption.weight(.semibold)) }
                if let en {
                    Text("EN").font(.caption2.bold()).foregroundStyle(.tint)
                    Text(en).font(.caption).lineLimit(2)
                    if source == "ai" {
                        Text("dịch máy")
                            .font(.caption2)
                            .padding(.horizontal, 6).padding(.vertical, 1)
                            .background(Color.orange.opacity(0.18), in: Capsule())
                            .foregroundStyle(Color.orange)
                    }
                }
            }
        }
    }
}

/// Giấy phép CC BY-SA 4.0 của JMdict yêu cầu ghi nguồn nơi hiển thị dữ liệu.
struct JmdictAttribution: View {
    var body: some View {
        Text("Nghĩa tiếng Anh: JMdict © EDRDG, CC BY-SA 4.0 (edrdg.org)")
            .font(.caption2)
            .foregroundStyle(.secondary)
    }
}
