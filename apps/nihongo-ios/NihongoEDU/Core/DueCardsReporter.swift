import Foundation
import SwiftData
import UserNotifications
import WidgetKit

/// Kế hoạch nhắc ôn: lần 20:00 kế tiếp và số thẻ sẽ đến hạn lúc đó. Hàm thuần để test.
enum ReminderPlan {
    struct Plan: Equatable {
        let fireDate: Date
        let count: Int
    }

    static func next(dueDates: [Date], now: Date, hour: Int = 20, minute: Int = 0, calendar: Calendar = .current) -> Plan? {
        var comps = calendar.dateComponents([.year, .month, .day], from: now)
        comps.hour = hour
        comps.minute = minute
        guard var fire = calendar.date(from: comps) else { return nil }
        if fire <= now, let tomorrow = calendar.date(byAdding: .day, value: 1, to: fire) { fire = tomorrow }
        let count = DueDates.count(dueDates, at: fire)
        return count > 0 ? Plan(fireDate: fire, count: count) : nil
    }
}

protocol ReminderScheduling {
    func schedule(_ plan: ReminderPlan.Plan?)
}

/// iOS không cho app chạy code đúng 20:00 để đếm thẻ (chạy nền chỉ là "cơ hội", không đúng giờ).
/// Nên đếm TRƯỚC và hẹn sẵn một thông báo cục bộ với nội dung cố định; dữ liệu đổi thì hẹn lại.
struct LocalReminderScheduler: ReminderScheduling {
    static let identifier = "srs-daily-reminder"
    var center: UNUserNotificationCenter = .current()
    var calendar: Calendar = .current

    func schedule(_ plan: ReminderPlan.Plan?) {
        center.removePendingNotificationRequests(withIdentifiers: [Self.identifier])
        guard let plan else { return }
        let content = UNMutableNotificationContent()
        content.title = "Ôn tập hôm nay"
        content.body = "Bạn có \(plan.count) thẻ cần ôn. Ôn ngay để giữ chuỗi ngày học!"
        content.sound = .default
        content.userInfo = ["screen": "srs"] // PushService → AppRouter → màn SRS
        let comps = calendar.dateComponents([.year, .month, .day, .hour, .minute], from: plan.fireDate)
        let trigger = UNCalendarNotificationTrigger(dateMatching: comps, repeats: false)
        center.add(UNNotificationRequest(identifier: Self.identifier, content: content, trigger: trigger))
    }
}

/// Mỗi khi thẻ đổi (ôn xong, sync bài, mở app): cập nhật widget và hẹn lại thông báo.
@MainActor
final class DueCardsReporter {
    static let shared = DueCardsReporter()
    var reminders: ReminderScheduling = LocalReminderScheduler()
    var store: DueDatesStoring = AppGroupDueDatesStore()
    var reloadWidgets: () -> Void = { WidgetCenter.shared.reloadAllTimelines() }

    func report(from context: ModelContext, now: Date = .now) {
        var descriptor = FetchDescriptor<SRSCard>(sortBy: [SortDescriptor(\.nextReviewAt)])
        descriptor.fetchLimit = DueDates.maxStored
        descriptor.propertiesToFetch = [\.nextReviewAt]
        let dates = ((try? context.fetch(descriptor)) ?? []).map(\.nextReviewAt)
        store.save(dates)
        reloadWidgets()
        reminders.schedule(ReminderPlan.next(dueDates: dates, now: now))
    }
}
