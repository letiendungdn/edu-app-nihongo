import SwiftUI
import SwiftData

struct SRSView: View {
    @Environment(\.modelContext) private var modelContext
    @State private var viewModel = SRSViewModel()

    var body: some View {
        // Dựng lại hàng ôn mỗi phút với `now` mới: thẻ đến hạn trong lúc đang mở màn hình cũng hiện ra.
        // Bản cũ tính Date.now một lần lúc vẽ (giống lỗi L1 bên Android).
        TimelineView(.periodic(from: .now, by: 60)) { context in
            SRSContent(now: context.date, viewModel: viewModel, modelContext: modelContext)
                .id(Int(context.date.timeIntervalSince1970 / 60))
        }
            .navigationTitle("Ôn tập SRS")
            .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Inner view owns @Query

private struct SRSContent: View {
    let viewModel: SRSViewModel
    let modelContext: ModelContext

    @Query private var dueCards: [SRSCard]

    init(now: Date, viewModel: SRSViewModel, modelContext: ModelContext) {
        self.viewModel = viewModel
        self.modelContext = modelContext
        _dueCards = Query(filter: SRSQueries.due(at: now), sort: \SRSCard.nextReviewAt)
    }

    var body: some View {
        let isDone  = dueCards.isEmpty && viewModel.sessionTotal > 0
        let isEmpty = dueCards.isEmpty && viewModel.sessionTotal == 0

        Group {
            if isDone {
                DoneView(
                    correct: viewModel.sessionCorrect,
                    total: viewModel.sessionTotal,
                    onRestart: viewModel.reset
                )
            } else if isEmpty {
                EmptyDueView()
            } else {
                let progress = Double(viewModel.sessionTotal) /
                    Double(viewModel.sessionTotal + dueCards.count)
                ReviewView(
                    card: dueCards[0],
                    viewModel: viewModel,
                    progress: progress,
                    remaining: dueCards.count,
                    modelContext: modelContext
                )
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemGroupedBackground))
    }
}

// MARK: - Review

private struct ReviewView: View {
    @Environment(AuthState.self) private var authState
    @Environment(NetworkMonitor.self) private var network
    @Environment(SyncEngine.self) private var engine
    let card: SRSCard
    let viewModel: SRSViewModel
    let progress: Double
    let remaining: Int
    let modelContext: ModelContext

    var body: some View {
        VStack(spacing: 16) {
            VStack(spacing: 6) {
                ProgressView(value: progress)
                    .tint(.red)
                    .padding(.horizontal)
                Text("\(viewModel.sessionTotal) đã ôn · \(remaining) còn lại")
                    .font(.system(size: 12))
                    .foregroundStyle(.secondary)
            }
            .padding(.top)

            CardFace(card: card, showAnswer: viewModel.showAnswer)
                .onTapGesture { if !viewModel.showAnswer { viewModel.showAnswer = true } }

            if !viewModel.showAnswer {
                Button("Xem đáp án") { viewModel.showAnswer = true }
                    .buttonStyle(.borderedProminent)
                    .tint(.red)
                    .font(.system(size: 16, weight: .semibold))
                    .controlSize(.large)
                    .padding(.horizontal)
            } else {
                RatingButtons(
                    card: card,
                    viewModel: viewModel,
                    modelContext: modelContext,
                    engine: engine,
                    network: network,
                    auth: authState
                )
                    .padding(.horizontal)
            }

            Spacer()
        }
    }
}

private struct CardFace: View {
    let card: SRSCard
    let showAnswer: Bool

    var jpText: String  { card.vocabulary?.kanji ?? card.vocabulary?.kana ?? "—" }
    var hasKanji: Bool  { card.vocabulary?.kanji != nil }
    var readText: String { card.vocabulary?.kana ?? "" }

    var body: some View {
        VStack(spacing: 12) {
            Spacer()
            Text(jpText).font(.system(size: 52, weight: .bold))
            if hasKanji {
                Text(readText).font(.system(size: 22)).foregroundStyle(.red)
            }

            if showAnswer {
                Divider().padding(.horizontal, 40)
                Text(card.vocabulary?.meaning ?? "")
                    .font(.system(size: 22))
                    .multilineTextAlignment(.center)
                if let romaji = card.vocabulary?.romaji, !romaji.isEmpty {
                    Text(romaji).font(.system(size: 14)).foregroundStyle(.secondary)
                }
            } else {
                Text("Nhấn để xem đáp án")
                    .font(.system(size: 13))
                    .foregroundStyle(.quaternary)
                    .padding(.top, 8)
            }
            Spacer()
        }
        .frame(maxWidth: .infinity)
        .padding(32)
        .background(.background, in: RoundedRectangle(cornerRadius: 24))
        .overlay(RoundedRectangle(cornerRadius: 24).stroke(.separator, lineWidth: 0.5))
        .padding(.horizontal, 16)
    }
}

private struct RatingButtons: View {
    let card: SRSCard
    let viewModel: SRSViewModel
    let modelContext: ModelContext
    let engine: SyncEngine
    let network: NetworkMonitor
    let auth: AuthState

    private struct Btn { let label: String; let emoji: String; let q: Int; let color: Color }
    private let buttons: [Btn] = [
        Btn(label: "Lại", emoji: "😵", q: 1, color: .red),
        Btn(label: "Khó", emoji: "😅", q: 2, color: .orange),
        Btn(label: "Ổn",  emoji: "🙂", q: 3, color: .green),
        Btn(label: "Dễ",  emoji: "😎", q: 4, color: .blue),
    ]

    var body: some View {
        HStack(spacing: 10) {
            ForEach(buttons, id: \.q) { btn in
                Button {
                    viewModel.rate(
                        btn.q,
                        card: card,
                        modelContext: modelContext,
                        engine: engine,
                        network: network,
                        auth: auth
                    )
                } label: {
                    VStack(spacing: 4) {
                        Text(btn.emoji).font(.system(size: 28))
                        Text(btn.label)
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(btn.color)
                        Text("\(btn.q)")
                            .font(.system(size: 11))
                            .foregroundStyle(btn.color.opacity(0.7))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(btn.color.opacity(0.1), in: RoundedRectangle(cornerRadius: 14))
                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(btn.color.opacity(0.3), lineWidth: 1))
                }
                .buttonStyle(.plain)
            }
        }
    }
}

// MARK: - Terminal states

private struct DoneView: View {
    let correct: Int
    let total: Int
    let onRestart: () -> Void

    private var pct: Int { total > 0 ? Int(Double(correct) / Double(total) * 100) : 0 }

    var body: some View {
        VStack(spacing: 16) {
            Spacer()
            Text("🎉").font(.system(size: 72))
            Text("Hoàn thành!").font(.system(size: 28, weight: .bold))
            Text("\(correct)/\(total) đúng (\(pct)%)")
                .font(.system(size: 17))
                .foregroundStyle(.secondary)
            Button("Ôn lại", action: onRestart)
                .buttonStyle(.borderedProminent)
                .tint(.red)
                .controlSize(.large)
                .padding(.top, 8)
            Spacer()
        }
        .frame(maxWidth: .infinity)
    }
}

private struct EmptyDueView: View {
    var body: some View {
        VStack(spacing: 16) {
            Spacer()
            Text("✅").font(.system(size: 72))
            Text("Không có thẻ cần ôn").font(.system(size: 22, weight: .bold))
            Text("Hẹn gặp lại ngày mai!")
                .font(.system(size: 15))
                .foregroundStyle(.secondary)
            Spacer()
        }
        .frame(maxWidth: .infinity)
    }
}
