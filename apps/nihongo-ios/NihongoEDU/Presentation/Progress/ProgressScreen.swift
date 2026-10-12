import Charts
import SwiftData
import SwiftUI

@Observable
@MainActor
final class ProgressViewModel {
    var isRefreshing = false
    var error: String?
    var needsLogin = false
    @ObservationIgnored var api = ProgressAPI()

    func refresh(context: ModelContext, isLoggedIn: Bool, now: Date = .now) async {
        guard isLoggedIn else { needsLogin = true; return }
        needsLogin = false
        isRefreshing = true
        defer { isRefreshing = false }
        do {
            let dto = try await api.mine()
            Self.save(dto, in: context, now: now)
            error = nil
        } catch {
            self.error = error.userMessage
        }
    }

    /// Thay toàn bộ snapshot + các ngày trong một lần save: UI không thấy nửa cũ nửa mới.
    static func save(_ dto: LearningProgressDTO, in context: ModelContext, now: Date) {
        try? context.delete(model: ProgressSnapshot.self)
        try? context.delete(model: StudyDayRecord.self)
        let s = dto.summary
        context.insert(ProgressSnapshot(
            currentStreak: s?.currentStreak ?? 0, longestStreak: s?.longestStreak ?? 0,
            totalSeconds: s?.totalSeconds ?? 0, totalCards: s?.totalCards ?? 0,
            vocabTotal: s?.vocabTotal ?? 0, kanjiTotal: s?.kanjiTotal ?? 0, fetchedAt: now
        ))
        for d in dto.recentDays ?? [] {
            guard let date = d.studyDate?.prefix(10) else { continue }
            context.insert(StudyDayRecord(date: String(date), seconds: d.seconds ?? 0, cardsReviewed: d.cardsReviewed ?? 0,
                                          vocabCount: d.vocabCount ?? 0, kanjiCount: d.kanjiCount ?? 0))
        }
        try? context.save()
    }
}

/// "1 giờ 5 phút", "12 phút". Hàm thuần để test.
func formatStudyTime(_ totalSeconds: Int) -> String {
    let minutes = totalSeconds / 60
    let hours = minutes / 60
    return hours > 0 ? "\(hours) giờ \(minutes % 60) phút" : "\(minutes) phút"
}

struct ProgressScreen: View {
    @Environment(\.modelContext) private var context
    @Environment(AuthState.self) private var auth
    @State private var vm = ProgressViewModel()
    @Query private var snapshots: [ProgressSnapshot]
    @Query(sort: \StudyDayRecord.date, order: .reverse) private var days: [StudyDayRecord]

    var body: some View {
        Group {
            if let p = snapshots.first {
                ProgressContent(progress: p, days: Array(days.prefix(14).reversed()), error: vm.error)
            } else if vm.needsLogin {
                ContentUnavailableView("Đăng nhập để xem tiến độ", systemImage: "person.crop.circle.badge.exclamationmark")
            } else if vm.isRefreshing {
                ProgressView("Đang tải…")
            } else {
                ContentUnavailableView("Chưa có dữ liệu", systemImage: "chart.bar", description: Text(vm.error ?? ""))
            }
        }
        .navigationTitle("Tiến độ học")
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await vm.refresh(context: context, isLoggedIn: auth.isLoggedIn) }
        .task { await vm.refresh(context: context, isLoggedIn: auth.isLoggedIn) }
    }
}

/// Không phụ thuộc ViewModel: preview và UI test truyền dữ liệu giả vào thẳng.
struct ProgressContent: View {
    let progress: ProgressSnapshot
    let days: [StudyDayRecord]
    let error: String?

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                if let error {
                    Text("Đang hiện dữ liệu đã lưu · \(error)").font(.caption).foregroundStyle(.red)
                }
                Grid(horizontalSpacing: 12, verticalSpacing: 12) {
                    GridRow {
                        StatCard(label: "Chuỗi hiện tại", value: "\(progress.currentStreak) ngày")
                        StatCard(label: "Dài nhất", value: "\(progress.longestStreak) ngày")
                    }
                    GridRow {
                        StatCard(label: "Từ vựng", value: "\(progress.vocabTotal)")
                        StatCard(label: "Kanji", value: "\(progress.kanjiTotal)")
                    }
                    GridRow {
                        StatCard(label: "Thẻ đã ôn", value: "\(progress.totalCards)")
                        StatCard(label: "Thời gian", value: formatStudyTime(progress.totalSeconds))
                    }
                }
                VStack(alignment: .leading, spacing: 8) {
                    Text("14 ngày gần nhất").font(.headline)
                    Text("Từ vựng + kanji + thẻ ôn mỗi ngày có học").font(.caption).foregroundStyle(.secondary)
                    if days.isEmpty {
                        Text("Chưa có ngày học nào.")
                    } else {
                        // Swift Charts tự sinh mô tả cho VoiceOver từ dữ liệu (Audio Graphs): không phải
                        // tự viết contentDescription như Canvas bên Android.
                        Chart(days, id: \.date) { day in
                            BarMark(x: .value("Ngày", String(day.date.dropFirst(5))), y: .value("Hoạt động", day.activity))
                                .foregroundStyle(.red.gradient)
                        }
                        .frame(height: 180)
                        .accessibilityIdentifier("activityChart")
                    }
                }
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(.background, in: RoundedRectangle(cornerRadius: 12))
            }
            .padding(16)
        }
        .background(Color(.systemGroupedBackground))
    }
}

private struct StatCard: View {
    let label: String
    let value: String
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label).font(.caption).foregroundStyle(.secondary)
            Text(value).font(.title2.weight(.semibold))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(.background, in: RoundedRectangle(cornerRadius: 12))
        .accessibilityElement(children: .combine)
    }
}
