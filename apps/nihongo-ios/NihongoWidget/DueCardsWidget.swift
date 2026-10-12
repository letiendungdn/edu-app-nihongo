import SwiftUI
import WidgetKit

struct DueEntry: TimelineEntry {
    let date: Date
    let count: Int
}

/// Widget chạy trong process riêng: không đọc được SwiftData của app. App ghi các mốc `nextReviewAt`
/// vào App Group (`DueDatesStore`), widget tự đếm số thẻ đến hạn ở từng thời điểm của timeline.
struct DueProvider: TimelineProvider {
    var store: DueDatesStoring = AppGroupDueDatesStore()

    func placeholder(in context: Context) -> DueEntry { DueEntry(date: .now, count: 3) }

    func getSnapshot(in context: Context, completion: @escaping (DueEntry) -> Void) {
        completion(DueEntry(date: .now, count: DueDates.count(store.load(), at: .now)))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<DueEntry>) -> Void) {
        let now = Date.now
        let entries = DueDates.timeline(store.load(), now: now).map { DueEntry(date: $0.date, count: $0.count) }
        // Hết 12 giờ thì xin timeline mới; app cũng gọi reloadAllTimelines() mỗi khi thẻ đổi
        completion(Timeline(entries: entries, policy: .after(now.addingTimeInterval(12 * 3600))))
    }
}

struct DueCardsView: View {
    let entry: DueEntry
    @Environment(\.widgetFamily) private var family

    var body: some View {
        switch family {
        case .accessoryCircular:
            // Màn hình khóa
            Gauge(value: Double(min(entry.count, 50)), in: 0...50) { Text("SRS") } currentValueLabel: { Text("\(entry.count)") }
                .gaugeStyle(.accessoryCircularCapacity)
        default:
            VStack(spacing: 4) {
                Text("\(entry.count)").font(.system(size: 40, weight: .bold)).foregroundStyle(.red)
                Text(entry.count > 0 ? "thẻ cần ôn" : "Đã ôn xong hôm nay").font(.caption)
            }
            .accessibilityElement(children: .combine)
        }
    }
}

struct DueCardsWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "DueCardsWidget", provider: DueProvider()) { entry in
            DueCardsView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
                // Bấm vào: app mở bằng URL này, AppRouter đưa vào màn SRS
                .widgetURL(URL(string: "nihongo://srs"))
        }
        .configurationDisplayName("Thẻ cần ôn")
        .description("Số thẻ SRS đến hạn hôm nay")
        .supportedFamilies([.systemSmall, .accessoryCircular])
    }
}

@main
struct NihongoWidgetBundle: WidgetBundle {
    var body: some Widget { DueCardsWidget() }
}
