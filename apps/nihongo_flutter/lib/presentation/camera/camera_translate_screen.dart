import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:permission_handler/permission_handler.dart';

import '../../utils/overlay_mapper.dart';

class CameraTranslateScreen extends ConsumerStatefulWidget {
  const CameraTranslateScreen({super.key});

  @override
  ConsumerState<CameraTranslateScreen> createState() =>
      _CameraTranslateScreenState();
}

class _CameraTranslateScreenState extends ConsumerState<CameraTranslateScreen>
    with WidgetsBindingObserver {
  CameraController? _controller;
  bool _initializing = true;
  String? _error;
  List<OverlayLabel> _labels = [];
  bool _paused = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _initCamera();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _stopStream();
    _controller?.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final c = _controller;
    if (c == null || !c.value.isInitialized) return;

    if (state == AppLifecycleState.inactive) {
      _stopStream();
    } else if (state == AppLifecycleState.resumed && !_paused) {
      _startStream();
    }
  }

  Future<void> _initCamera() async {
    final status = await Permission.camera.request();
    if (!status.isGranted) {
      setState(() {
        _error = 'Cần quyền camera để dịch trực tiếp.';
        _initializing = false;
      });
      return;
    }

    try {
      final cameras = await availableCameras();
      final back = cameras.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.back,
        orElse: () => cameras.first,
      );

      final controller = CameraController(
        back,
        ResolutionPreset.medium,
        enableAudio: false,
        imageFormatGroup: ImageFormatGroup.yuv420,
      );

      await controller.initialize();
      _controller = controller;
      await _startStream();

      if (mounted) {
        setState(() {
          _initializing = false;
          _error = null;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Không mở được camera: $e';
          _initializing = false;
        });
      }
    }
  }

  /// Không mở luồng ảnh khi chưa có bộ nhận chữ: bản cũ nhận ~30 khung hình/giây rồi bỏ đi,
  /// chỉ tốn pin và CPU. Bật lại cùng lúc với OCR.
  Future<void> _startStream() async {}

  Future<void> _stopStream() async {
    final c = _controller;
    if (c == null || !c.value.isStreamingImages) return;
    try {
      await c.stopImageStream();
    } catch (_) {}
  }

  void _togglePause() {
    setState(() => _paused = !_paused);
    if (_paused) {
      setState(() => _labels = []);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: const Text('Dịch camera'),
        backgroundColor: Colors.black87,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            onPressed: _togglePause,
            icon: Icon(_paused ? Icons.play_arrow : Icons.pause),
            tooltip: _paused ? 'Tiếp tục' : 'Tạm dừng',
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_initializing) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(_error!, textAlign: TextAlign.center),
        ),
      );
    }

    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) {
      return const Center(child: Text('Camera chưa sẵn sàng'));
    }

    return Stack(
      fit: StackFit.expand,
      children: [
        CameraPreview(controller),
        ..._labels.map(_buildOverlay),
        Positioned(
          left: 0,
          right: 0,
          bottom: 0,
          child: Container(
            color: Colors.black54,
            padding: const EdgeInsets.all(12),
            child: Text(
              _paused
                  ? 'Đã tạm dừng'
                  : 'Nhận chữ đang TẠM TẮT trên mọi nền tảng: bản Flutter đã gỡ ML Kit để build '
                      'được trên simulator iOS. Dịch camera vẫn có ở app Android và iOS bản native.',
              style: const TextStyle(color: Colors.white70, fontSize: 13),
              textAlign: TextAlign.center,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildOverlay(OverlayLabel label) {
    return Positioned(
      left: label.rect.left.clamp(0, MediaQuery.sizeOf(context).width - 8),
      top: label.rect.top.clamp(0, MediaQuery.sizeOf(context).height - 8),
      width: label.rect.width.clamp(48, MediaQuery.sizeOf(context).width * 0.9),
      child: IgnorePointer(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
          decoration: BoxDecoration(
            color: const Color(0xCC1D4ED8),
            borderRadius: BorderRadius.circular(4),
          ),
          child: Text(
            label.translated,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 13,
              fontWeight: FontWeight.w600,
              height: 1.2,
            ),
          ),
        ),
      ),
    );
  }
}
