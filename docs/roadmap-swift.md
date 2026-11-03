# Lộ trình Swift / iOS

> **Lộ trình học**, không phải bảng status feature. Inventory: [mobile-tech-stacks.md](./mobile-tech-stacks.md). Chạy: [run-mobile.md](./run-mobile.md).

---

## GIAI ĐOẠN 1 — SWIFT LANGUAGE (tháng 1–2)

### Nền tảng Swift

```swift
// 1. Optionals — quan trọng nhất trong Swift
var name: String? = nil          // optional — có thể nil
var name: String = "Nihongo"     // non-optional — không thể nil

// Unwrap an toàn
if let name = name { print(name) }          // if let
guard let name = name else { return }       // guard let — exit early pattern
let length = name?.count ?? 0               // optional chaining + nil coalescing
let upper = name!.uppercased()              // force unwrap — crash nếu nil (tránh dùng)

// 2. Struct vs Class
struct Vocabulary {          // value type — copy khi assign
    let id: Int
    let kana: String
    let meaning: String
}

class VocabViewModel: ObservableObject {  // reference type — share reference
    @Published var vocabs: [Vocabulary] = []
}

// Rule: default dùng struct, chỉ dùng class khi cần identity hoặc inheritance

// 3. Enum với associated values — tương đương sealed class Kotlin
enum APIResult<T> {
    case success(T)
    case failure(Error)
    case loading
}

switch result {
case .success(let data):  render(data)
case .failure(let error): showError(error)
case .loading:            showSpinner()
}

// 4. Protocol — tương đương interface trong Java/Kotlin
protocol VocabularyRepository {
    func watchByLesson(_ lesson: Int) -> AsyncStream<[Vocabulary]>
    func syncAllPending() async throws
}

// 5. Closures
let sorted = vocabs.sorted { $0.kana < $1.kana }
let meanings = vocabs.map { $0.meaning }
let filtered = vocabs.filter { $0.lessonNumber == 1 }
```

---

### Memory Management — ARC

```swift
// ARC (Automatic Reference Counting) — tự quản lý memory
// Strong reference — default
class AppState {
    var user: User?   // strong — giữ User alive
}

// Weak reference — không tăng retain count, có thể nil
class VocabCell: UICollectionViewCell {
    weak var delegate: VocabCellDelegate?   // delegate thường là weak để tránh retain cycle
}

// Retain cycle — leak phổ biến nhất
class Timer {
    var callback: (() -> Void)?
    
    // BUG: Timer strong → closure strong → Timer = retain cycle
    func startBug() {
        callback = {
            print(self.description)  // strong capture
        }
    }
    
    // FIX: weak hoặc unowned
    func startFix() {
        callback = { [weak self] in
            guard let self = self else { return }
            print(self.description)
        }
    }
}

// Unowned — dùng khi CHẮC CHẮN self không nil khi closure chạy
class Request {
    var completion: (() -> Void)?
    
    init() {
        completion = { [unowned self] in  // crash nếu self đã dealloc
            self.finish()
        }
    }
}
```

---

### Async/Await (Swift 5.5+)

```swift
// Modern Swift concurrency — tương đương Dart async/await
// suspend function trong Kotlin ≈ async function trong Swift

// 1. async function
func fetchVocab(lesson: Int) async throws -> [Vocabulary] {
    let url = URL(string: "\(baseURL)/api/vocabularies?lessonNumber=\(lesson)")!
    let (data, response) = try await URLSession.shared.data(from: url)
    guard (response as? HTTPURLResponse)?.statusCode == 200 else {
        throw APIError.serverError
    }
    return try JSONDecoder().decode([Vocabulary].self, from: data)
}

// 2. Gọi async
Task {
    do {
        let vocabs = try await fetchVocab(lesson: 1)
        await MainActor.run { self.vocabs = vocabs }  // update UI trên main thread
    } catch {
        print("Error: \(error)")
    }
}

// 3. Actor — thread-safe state (tương đương synchronized trong Java)
actor SyncQueue {
    private var items: [SyncItem] = []
    
    func enqueue(_ item: SyncItem) {
        items.append(item)
    }
    
    func flushAll() async throws {
        let pending = items
        for item in pending {
            try await apiClient.sync(item)
            items.removeFirst()
        }
    }
}

// 4. AsyncStream — tương đương Flow trong Kotlin
func watchVocab() -> AsyncStream<[Vocabulary]> {
    AsyncStream { continuation in
        let observer = database.observe { vocabs in
            continuation.yield(vocabs)
        }
        continuation.onTermination = { _ in observer.cancel() }
    }
}
```

---

## GIAI ĐOẠN 2 — SWIFTUI (tháng 3–4)

### State Management

```swift
// 1. @State — local state trong 1 View (tương đương useState React)
struct SrsCard: View {
    @State private var isFlipped = false
    
    var body: some View {
        VStack {
            Text(isFlipped ? vocab.meaning : vocab.kana)
                .font(.largeTitle)
            Button("Lật") { isFlipped.toggle() }
        }
    }
}

// 2. @StateObject — ViewModel sống cùng View (tương đương hiltViewModel() trong Compose)
struct VocabScreen: View {
    @StateObject private var viewModel = VocabViewModel()
    
    var body: some View {
        List(viewModel.vocabs, id: \.id) { vocab in
            VocabRow(vocab: vocab)
        }
        .task { await viewModel.loadLesson(1) }
    }
}

// 3. @ObservedObject — ViewModel inject từ bên ngoài
struct VocabRow: View {
    let vocab: Vocabulary  // simple value — không cần ObservedObject
    
    var body: some View {
        HStack {
            VStack(alignment: .leading) {
                Text(vocab.kana).font(.headline)
                Text(vocab.meaning).foregroundColor(.secondary)
            }
            Spacer()
        }
    }
}

// 4. @EnvironmentObject — inject dependency vào toàn bộ view tree
@main
struct NihongoApp: App {
    @StateObject private var appState = AppState()
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
        }
    }
}

// Bất kỳ View con nào có thể dùng:
struct SomeDeepChild: View {
    @EnvironmentObject var appState: AppState
}

// 5. @AppStorage — persist nhỏ vào UserDefaults
struct SettingsView: View {
    @AppStorage("selectedVoice") private var selectedVoice = "ja-JP"
}
```

---

### Navigation

```swift
// iOS 16+ NavigationStack — tương đương GoRouter Flutter
struct AppNavigation: View {
    @State private var path = NavigationPath()
    
    var body: some View {
        NavigationStack(path: $path) {
            HomeView()
                .navigationDestination(for: Route.self) { route in
                    switch route {
                    case .vocab(let lesson):
                        VocabView(lesson: lesson)
                    case .srs:
                        SrsView()
                    case .pronunciation(let kana, let meaning):
                        PronunciationView(kana: kana, meaning: meaning)
                    case .kanjiDraw(let kanji):
                        KanjiDrawView(kanji: kanji)
                    case .live:
                        LiveView()
                    }
                }
        }
    }
}

// Enum routes — type-safe, tương đương GoRoute Flutter
enum Route: Hashable {
    case vocab(lesson: Int)
    case srs
    case pronunciation(kana: String, meaning: String)
    case kanjiDraw(kanji: String)
    case live
}

// Navigate
path.append(Route.pronunciation(kana: "おはよう", meaning: "Xin chào buổi sáng"))
```

---

### List + Custom View

```swift
// Tương đương ListView.builder Flutter
struct VocabList: View {
    let vocabs: [Vocabulary]
    
    var body: some View {
        List {
            ForEach(vocabs) { vocab in
                VocabRow(vocab: vocab)
                    .swipeActions(edge: .trailing) {
                        Button(role: .destructive) {
                            // delete
                        } label: {
                            Label("Xóa", systemImage: "trash")
                        }
                    }
            }
        }
        .listStyle(.plain)
    }
}

// Custom Canvas — tương đương CustomPainter Flutter
struct KanjiCanvas: View {
    let strokes: [[CGPoint]]
    @State private var current: [CGPoint] = []
    
    var body: some View {
        Canvas { context, size in
            // Vẽ grid
            var gridPath = Path()
            gridPath.move(to: CGPoint(x: size.width/2, y: 0))
            gridPath.addLine(to: CGPoint(x: size.width/2, y: size.height))
            gridPath.move(to: CGPoint(x: 0, y: size.height/2))
            gridPath.addLine(to: CGPoint(x: size.width, y: size.height/2))
            context.stroke(gridPath, with: .color(.gray.opacity(0.3)), lineWidth: 1)
            
            // Vẽ strokes
            for stroke in strokes + [current] {
                guard stroke.count >= 2 else { continue }
                var path = Path()
                path.move(to: stroke[0])
                stroke.dropFirst().forEach { path.addLine(to: $0) }
                context.stroke(path, with: .color(.black), style: StrokeStyle(lineWidth: 6, lineCap: .round, lineJoin: .round))
            }
        }
        .gesture(
            DragGesture(minimumDistance: 0)
                .onChanged { current.append($0.location) }
                .onEnded   { _ in /* add to strokes */ current = [] }
        )
    }
}
```

---

## GIAI ĐOẠN 3 — DATA & NETWORK (tháng 5–6)

### CoreData / SwiftData

```swift
// SwiftData (iOS 17+) — tương đương Drift/Room
@Model
class VocabularyItem {
    var id: Int
    var kana: String
    var meaning: String
    var lessonNumber: Int
    var syncStatus: String = "pending"
    
    // SRS fields
    var easeFactor: Double = 2.5
    var interval: Int = 1
    var nextReviewAt: Date = Date()
    
    init(id: Int, kana: String, meaning: String, lessonNumber: Int) {
        self.id = id
        self.kana = kana
        self.meaning = lessonNumber
        self.lessonNumber = lessonNumber
    }
}

// Query — tương đương Drift query
struct VocabView: View {
    @Query(sort: \VocabularyItem.kana) var vocabs: [VocabularyItem]
    @Environment(\.modelContext) private var context
    
    var body: some View {
        List(vocabs) { vocab in VocabRow(vocab: vocab) }
    }
    
    func addVocab(_ vocab: Vocabulary) {
        let item = VocabularyItem(id: vocab.id, kana: vocab.kana, meaning: vocab.meaning, lessonNumber: vocab.lessonNumber)
        context.insert(item)
    }
}
```

---

### URLSession + Combine

```swift
// Modern networking với async/await
class VocabAPIClient {
    private let session = URLSession.shared
    private let decoder = JSONDecoder()
    
    func getVocab(lesson: Int) async throws -> [VocabularyDTO] {
        var components = URLComponents(string: "\(baseURL)/api/vocabularies")!
        components.queryItems = [URLQueryItem(name: "lessonNumber", value: "\(lesson)")]
        
        var request = URLRequest(url: components.url!)
        request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            throw APIError.serverError
        }
        return try decoder.decode([VocabularyDTO].self, from: data)
    }
    
    func syncReviewBank(_ items: [ReviewSyncItem]) async throws {
        var request = URLRequest(url: URL(string: "\(baseURL)/api/vocabulary/bulk-upsert")!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONEncoder().encode(items)
        
        let (_, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            throw APIError.serverError
        }
    }
}
```

---

### Offline-first Sync

```swift
// Repository — tương đương VocabularyRepositoryImpl trong Flutter
class VocabularyRepositoryImpl: VocabularyRepository {
    private let localStore: VocabLocalStore
    private let apiClient: VocabAPIClient
    private let networkMonitor: NetworkMonitor
    
    func updateSrsCard(_ card: SrsCard) async throws {
        // 1. Write local ngay — UI không lag
        try await localStore.updateSrsCard(card)
        
        // 2. Queue for sync
        try await localStore.enqueueSync(card.id, type: "srs_update")
        
        // 3. Flush nếu online
        if await networkMonitor.isConnected {
            try await syncAllPending()
        }
    }
    
    func syncAllPending() async throws {
        let pending = try await localStore.getPendingSync()
        guard !pending.isEmpty else { return }
        
        // Gọi API thật
        try await apiClient.syncReviewBank(pending.map { $0.toDTO() })
        
        // Mark synced
        try await localStore.markSynced(ids: pending.map { $0.id })
    }
}
```

---

## GIAI ĐOẠN 4 — SENIOR (tháng 7–8)

### Concurrency nâng cao

```swift
// TaskGroup — parallel calls
func loadAllLessons() async throws -> [[Vocabulary]] {
    try await withThrowingTaskGroup(of: [Vocabulary].self) { group in
        for lesson in 1...10 {
            group.addTask { try await self.apiClient.getVocab(lesson: lesson) }
        }
        var results: [[Vocabulary]] = []
        for try await lessonVocabs in group {
            results.append(lessonVocabs)
        }
        return results
    }
}

// MainActor — đảm bảo UI update trên main thread
@MainActor
class VocabViewModel: ObservableObject {
    @Published var vocabs: [Vocabulary] = []
    @Published var isLoading = false
    
    func load(lesson: Int) async {
        isLoading = true
        defer { isLoading = false }
        
        do {
            // Chạy background task
            let data = try await Task.detached { [weak self] in
                try await self?.repository.getVocab(lesson: lesson)
            }.value
            vocabs = data ?? []
        } catch {
            // handle error
        }
    }
}
```

---

### AVFoundation — TTS

```swift
// Tương đương flutter_tts trong Flutter
import AVFoundation

class TTSService {
    private let synthesizer = AVSpeechSynthesizer()
    
    func speak(_ text: String, language: String = "ja-JP") {
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(language: language)
        utterance.rate = 0.4         // chậm hơn default để học từ vựng
        utterance.pitchMultiplier = 1.0
        synthesizer.speak(utterance)
    }
    
    func stop() {
        synthesizer.stopSpeaking(at: .immediate)
    }
}

// Dùng trong View
struct VocabRow: View {
    let vocab: Vocabulary
    private let tts = TTSService()
    
    var body: some View {
        Button { tts.speak(vocab.kana) } label: {
            Label(vocab.kana, systemImage: "speaker.wave.2")
        }
    }
}
```

---

### Speech Recognition — STT

```swift
// Tương đương speech_to_text Flutter
import Speech

class SpeechRecognizer: ObservableObject {
    @Published var transcript = ""
    
    private let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "ja-JP"))
    private var task: SFSpeechRecognitionTask?
    private let engine = AVAudioEngine()
    
    func startRecording() async throws {
        guard await SFSpeechRecognizer.requestAuthorization() == .authorized else {
            throw SpeechError.notAuthorized
        }
        
        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true
        
        let inputNode = engine.inputNode
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: inputNode.outputFormat(forBus: 0)) { buffer, _ in
            request.append(buffer)
        }
        
        engine.prepare()
        try engine.start()
        
        task = recognizer?.recognitionTask(with: request) { [weak self] result, _ in
            self?.transcript = result?.bestTranscription.formattedString ?? ""
        }
    }
    
    func stopRecording() {
        engine.stop()
        engine.inputNode.removeTap(onBus: 0)
        task?.cancel()
    }
}
```

---

### Testing

```swift
// Unit test với XCTest
class VocabViewModelTests: XCTestCase {
    var viewModel: VocabViewModel!
    var mockRepo: MockVocabularyRepository!
    
    override func setUp() {
        mockRepo = MockVocabularyRepository()
        viewModel = VocabViewModel(repository: mockRepo)
    }
    
    func testLoadVocabSuccess() async throws {
        // Given
        mockRepo.stubbedVocabs = [fakeVocab]
        
        // When
        await viewModel.load(lesson: 1)
        
        // Then
        XCTAssertEqual(viewModel.vocabs.count, 1)
        XCTAssertEqual(viewModel.vocabs[0].kana, "おはよう")
    }
    
    func testLoadVocabError() async {
        // Given
        mockRepo.shouldFail = true
        
        // When
        await viewModel.load(lesson: 1)
        
        // Then
        XCTAssertTrue(viewModel.vocabs.isEmpty)
        XCTAssertNotNil(viewModel.errorMessage)
    }
}

// SwiftUI Preview
#Preview {
    VocabRow(vocab: Vocabulary(id: 1, kana: "おはよう", meaning: "Xin chào buổi sáng", lessonNumber: 1))
}
```

---

## CHECKLIST

```
Giai đoạn 1 — Swift Language:
  □ Optionals: if let, guard let, ??, !
  □ Struct vs Class: khi nào dùng cái nào
  □ ARC: strong/weak/unowned, tránh retain cycle
  □ Async/Await + Actor
  □ Protocol + extension

Giai đoạn 2 — SwiftUI:
  □ @State, @StateObject, @ObservedObject, @EnvironmentObject
  □ NavigationStack với type-safe routes
  □ List, ForEach, LazyVStack
  □ Canvas custom drawing
  □ Gesture recognizers

Giai đoạn 3 — Data & Network:
  □ SwiftData @Model, @Query
  □ URLSession async/await
  □ Codable: Encodable + Decodable
  □ Offline-first repository pattern

Giai đoạn 4 — Senior:
  □ TaskGroup, MainActor, Task.detached
  □ AVFoundation: TTS + Audio
  □ Speech framework: STT
  □ Unit test + SwiftUI Preview
  □ App Store submission: provisioning, certificates
  □ Xcode Cloud hoặc Fastlane CI/CD
```

---

## RESOURCES

- **Sách**: Hacking with Swift (Paul Hudson — free online)
- **Course**: 100 Days of SwiftUI (swiftwithmajorhelpful.com — free)
- **Official**: Swift.org documentation
- **Videos**: Sean Allen, Stewart Lynch (YouTube)
- **Architecture**: Point-Free (functional Swift — nâng cao)
- **Testing**: Testing Swift (Paul Hudson)

<!-- nav:start -->

---

## Đi tiếp

Tài liệu tham khảo thuộc **11. Lộ trình theo framework mobile**. Cùng nhóm:

- [roadmap-android.md](./roadmap-android.md) — Android (Kotlin + Jetpack)
- [roadmap-flutter.md](./roadmap-flutter.md) — Flutter
- [roadmap-react-native.md](./roadmap-react-native.md) — React Native

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
