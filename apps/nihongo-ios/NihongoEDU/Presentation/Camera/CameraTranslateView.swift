import AVFoundation
import SwiftUI
import Vision

struct OverlayLabel: Identifiable {
    let id = UUID()
    var rect: CGRect
    var original: String
    var translated: String
}

/// Camera preview + Japanese OCR (Vision) + /api/translate overlay.
struct CameraTranslateView: View {
    @StateObject private var model = CameraTranslateViewModel()
    @State private var viewSize: CGSize = .zero

    var body: some View {
        ZStack {
            CameraPreviewRepresentable(session: model.session)
                .ignoresSafeArea()
                .background(
                    GeometryReader { geo in
                        Color.clear.onAppear { viewSize = geo.size }
                            .onChange(of: geo.size) { _, size in viewSize = size }
                    }
                )

            ForEach(model.labels) { label in
                let mapped = OverlayMapper.mapFrame(
                    label.rect,
                    imageSize: model.imageSize,
                    viewSize: viewSize
                )
                VStack(alignment: .leading, spacing: 2) {
                    Text(label.original)
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(.white.opacity(0.85))
                    Text(label.translated)
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(.yellow)
                }
                .padding(6)
                .background(.black.opacity(0.55), in: RoundedRectangle(cornerRadius: 6))
                .position(x: mapped.midX, y: mapped.midY)
            }

            VStack {
                Spacer()
                HStack {
                    Button(model.paused ? "Tiếp tục" : "Tạm dừng") {
                        model.setPaused(!model.paused)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(model.paused ? .green : .orange)

                    if model.isProcessing {
                        ProgressView().tint(.white)
                    }
                }
                .padding()
            }
        }
        .navigationTitle("Dịch camera")
        .navigationBarTitleDisplayMode(.inline)
        .task { await model.start() }
        .onDisappear { model.stop() }
        .alert("Cần quyền camera", isPresented: $model.permissionDenied) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("Bật Camera trong Cài đặt để dùng dịch trực tiếp.")
        }
    }
}

@MainActor
final class CameraTranslateViewModel: NSObject, ObservableObject {
    @Published var labels: [OverlayLabel] = []
    @Published var paused = false
    @Published var isProcessing = false
    @Published var permissionDenied = false
    @Published var imageSize: CGSize = CGSize(width: 1280, height: 720)

    let session = AVCaptureSession()
    private let output = AVCaptureVideoDataOutput()
    nonisolated let cameraQueue = DispatchQueue(label: "com.edu.nihongo.camera")
    nonisolated let gate = FrameGate()
    private let translateAPI = TranslateAPI()
    private var started = false

    func start() async {
        guard !started else { return }
        let granted = await requestCameraAccess()
        guard granted else {
            permissionDenied = true
            return
        }
        configureSession()
        let session = self.session
        cameraQueue.async { session.startRunning() }
        started = true
    }

    func stop() {
        let session = self.session
        cameraQueue.async { session.stopRunning() }
    }

    func setPaused(_ value: Bool) {
        paused = value
        let gate = self.gate
        cameraQueue.async { gate.setPaused(value) }
    }

    private func requestCameraAccess() async -> Bool {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized: return true
        case .notDetermined:
            return await withCheckedContinuation { cont in
                AVCaptureDevice.requestAccess(for: .video) { cont.resume(returning: $0) }
            }
        default: return false
        }
    }

    private func configureSession() {
        session.beginConfiguration()
        session.sessionPreset = .hd1280x720
        defer { session.commitConfiguration() }

        guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
              let input = try? AVCaptureDeviceInput(device: device),
              session.canAddInput(input) else { return }
        session.addInput(input)

        output.alwaysDiscardsLateVideoFrames = true
        output.videoSettings = [
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
        ]
        output.setSampleBufferDelegate(self, queue: cameraQueue)
        if session.canAddOutput(output) {
            session.addOutput(output)
        }
        if let connection = output.connection(with: .video), connection.isVideoOrientationSupported {
            connection.videoOrientation = .portrait
        }
    }

    /// Kết quả OCR (đã chạy xong trên camera queue) → dịch → hiện. Chạy trên main.
    fileprivate func show(_ lines: [RecognizedLine], imageSize size: CGSize) async {
        isProcessing = true
        var next: [OverlayLabel] = []
        for line in lines {
            let translated = (try? await translateAPI.translateJapanese(line.text)) ?? line.text
            next.append(OverlayLabel(rect: line.rect, original: line.text, translated: translated))
        }
        imageSize = size
        labels = next
        isProcessing = false
    }
}

struct RecognizedLine {
    let rect: CGRect
    let text: String
}

/// Bộ chặn frame. CHỈ dùng trên camera queue (serial), nên không cần khóa.
final class FrameGate {
    private var lastScan = Date.distantPast
    private var busy = false
    private(set) var paused = false

    /// Cho qua tối đa 1 frame mỗi `minInterval` giây, và không khi frame trước chưa xong.
    func shouldProcess(at now: Date, minInterval: TimeInterval = 0.95) -> Bool {
        guard !paused, !busy, now.timeIntervalSince(lastScan) >= minInterval else { return false }
        busy = true
        lastScan = now
        return true
    }

    func finish() { busy = false }
    func setPaused(_ value: Bool) { paused = value }
}

/// OCR tiếng Nhật bằng Vision. Hàm đồng bộ, gọi trên camera queue (KHÔNG phải main).
enum JapaneseOCR {
    static func recognize(_ pixelBuffer: CVPixelBuffer) -> [RecognizedLine] {
        let width = CGFloat(CVPixelBufferGetWidth(pixelBuffer))
        let height = CGFloat(CVPixelBufferGetHeight(pixelBuffer))
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.recognitionLanguages = ["ja-JP", "ja"]
        request.usesLanguageCorrection = true
        guard (try? VNImageRequestHandler(cvPixelBuffer: pixelBuffer, orientation: .up).perform([request])) != nil else {
            return []
        }
        return (request.results ?? []).prefix(8).compactMap { obs in
            guard let text = obs.topCandidates(1).first?.string.trimmingCharacters(in: .whitespacesAndNewlines),
                  !text.isEmpty else { return nil }
            let box = obs.boundingBox // Vision: gốc ở góc DƯỚI trái, giá trị 0...1
            let rect = CGRect(x: box.minX * width, y: (1 - box.maxY) * height,
                              width: box.width * width, height: box.height * height)
            return rect.width >= 8 && rect.height >= 8 ? RecognizedLine(rect: rect, text: text) : nil
        }
    }
}

/// Bản cũ: mỗi frame (30 lần/giây) tạo một Task nhảy lên main, rồi chạy Vision `.accurate`
/// ĐỒNG BỘ TRÊN MAIN THREAD: giao diện khựng 0,1–0,5 giây mỗi giây. Giờ: chặn frame và chạy Vision
/// ngay trên camera queue; chỉ kết quả (vài dòng chữ) mới lên main.
extension CameraTranslateViewModel: AVCaptureVideoDataOutputSampleBufferDelegate {
    nonisolated func captureOutput(
        _ output: AVCaptureOutput,
        didOutput sampleBuffer: CMSampleBuffer,
        from connection: AVCaptureConnection
    ) {
        guard gate.shouldProcess(at: Date()),
              let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
        let size = CGSize(width: CVPixelBufferGetWidth(pixelBuffer), height: CVPixelBufferGetHeight(pixelBuffer))
        let lines = JapaneseOCR.recognize(pixelBuffer)
        let gate = self.gate, queue = self.cameraQueue
        Task { @MainActor in
            await self.show(lines, imageSize: size)
            queue.async { gate.finish() }
        }
    }
}

struct CameraPreviewRepresentable: UIViewRepresentable {
    let session: AVCaptureSession

    func makeUIView(context: Context) -> PreviewView {
        let view = PreviewView()
        view.previewLayer.session = session
        view.previewLayer.videoGravity = .resizeAspectFill
        return view
    }

    func updateUIView(_ uiView: PreviewView, context: Context) {}

    final class PreviewView: UIView {
        override class var layerClass: AnyClass { AVCaptureVideoPreviewLayer.self }
        var previewLayer: AVCaptureVideoPreviewLayer { layer as! AVCaptureVideoPreviewLayer }
    }
}
