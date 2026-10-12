import Foundation

/// Dùng chung giữa app và widget extension (hai process khác nhau, nên đi qua App Group).
/// App ghi mốc `nextReviewAt` của các thẻ; widget tự đếm số thẻ đến hạn tại từng thời điểm trong
/// timeline, nên số trên widget vẫn đúng theo giờ dù app không chạy.
enum DueDates {
    static let appGroup = "group.com.edu.nihongo.ios"
    static let key = "srs.dueDates"
    static let maxStored = 500

    static func count(_ dates: [Date], at moment: Date) -> Int {
        dates.reduce(0) { $0 + ($1 <= moment ? 1 : 0) }
    }

    /// Các thời điểm widget cần vẽ lại: bây giờ, rồi mỗi lúc một thẻ đến hạn trong `hours` giờ tới
    /// (tối đa `limit` mốc). WidgetKit tự đổi entry đúng giờ mà không cần app chạy.
    static func timeline(_ dates: [Date], now: Date, hours: Int = 12, limit: Int = 24) -> [(date: Date, count: Int)] {
        let end = now.addingTimeInterval(TimeInterval(hours) * 3600)
        let moments = [now] + Array(Set(dates.filter { $0 > now && $0 <= end }).sorted().prefix(limit - 1))
        return moments.map { ($0, count(dates, at: $0)) }
    }
}

protocol DueDatesStoring {
    func save(_ dates: [Date])
    func load() -> [Date]
}

struct AppGroupDueDatesStore: DueDatesStoring {
    var defaults: UserDefaults? = UserDefaults(suiteName: DueDates.appGroup)

    func save(_ dates: [Date]) {
        defaults?.set(dates.sorted().prefix(DueDates.maxStored).map(\.timeIntervalSince1970), forKey: DueDates.key)
    }

    func load() -> [Date] {
        ((defaults?.array(forKey: DueDates.key) as? [Double]) ?? []).map(Date.init(timeIntervalSince1970:))
    }
}
