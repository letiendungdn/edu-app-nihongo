package com.edu.nihongo.presentation.camera

import android.content.Context
import android.graphics.RectF
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.edu.nihongo.domain.repository.TranslateRepository
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.Text
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.japanese.JapaneseTextRecognizerOptions
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean
import javax.inject.Inject

@HiltViewModel
class CameraTranslateViewModel @Inject constructor(
    @ApplicationContext private val appContext: Context,
    private val translateRepo: TranslateRepository,
) : ViewModel() {

    data class UiState(
        val labels: List<OverlayLabel> = emptyList(),
        val paused: Boolean = false,
        val error: String? = null,
        val hint: String = "Hướng camera vào chữ tiếng Nhật — dịch hiện trên khung hình (cần mạng).",
    )

    private val _uiState = MutableStateFlow(UiState())
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    private val recognizer =
        TextRecognition.getClient(JapaneseTextRecognizerOptions.Builder().build())
    private val cameraExecutor = Executors.newSingleThreadExecutor()
    // Đọc/ghi từ luồng camera, luồng main (callback ML Kit) và coroutine → phải atomic
    private val processing = AtomicBoolean(false)
    @Volatile private var lastProcessedAt = 0L
    private var previewWidth = 1
    private var previewHeight = 1

    fun bindCamera(lifecycleOwner: LifecycleOwner, previewView: PreviewView) {
        previewView.post {
            updatePreviewSize(previewView.width, previewView.height)
        }

        val cameraProviderFuture = ProcessCameraProvider.getInstance(appContext)
        cameraProviderFuture.addListener({
            val cameraProvider = cameraProviderFuture.get()

            val preview = Preview.Builder().build().also {
                it.surfaceProvider = previewView.surfaceProvider
            }

            val analysis = ImageAnalysis.Builder()
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .build()

            analysis.setAnalyzer(cameraExecutor) { imageProxy ->
                if (_uiState.value.paused) {
                    imageProxy.close()
                    return@setAnalyzer
                }

                val now = System.currentTimeMillis()
                // compareAndSet: chỉ một frame được "giành" quyền xử lý
                if (now - lastProcessedAt < 900 || !processing.compareAndSet(false, true)) {
                    imageProxy.close()
                    return@setAnalyzer
                }
                lastProcessedAt = now

                val mediaImage = imageProxy.image
                if (mediaImage == null) {
                    processing.set(false)
                    imageProxy.close()
                    return@setAnalyzer
                }

                val rotation = imageProxy.imageInfo.rotationDegrees
                val image = InputImage.fromMediaImage(mediaImage, rotation)
                val imageW = imageProxy.width
                val imageH = imageProxy.height

                recognizer.process(image)
                    .addOnSuccessListener { result ->
                        viewModelScope.launch {
                            processOcrResult(result, imageW, imageH, rotation)
                        }
                    }
                    .addOnFailureListener {
                        processing.set(false)
                    }
                    .addOnCompleteListener {
                        imageProxy.close()
                    }
            }

            try {
                cameraProvider.unbindAll()
                cameraProvider.bindToLifecycle(
                    lifecycleOwner,
                    CameraSelector.DEFAULT_BACK_CAMERA,
                    preview,
                    analysis,
                )
            } catch (e: Exception) {
                _uiState.update { it.copy(error = "Không mở được camera: ${e.message}") }
            }
        }, ContextCompat.getMainExecutor(appContext))
    }

    private suspend fun processOcrResult(
        result: Text,
        imageW: Int,
        imageH: Int,
        rotation: Int,
    ) {
        try {
            val lines = result.textBlocks
                .flatMap { it.lines }
                .filter { it.text.isNotBlank() }
                .take(8)

            if (lines.isEmpty()) {
                _uiState.update { it.copy(labels = emptyList()) }
                return
            }

            val labels = withContext(Dispatchers.IO) {
                lines.mapNotNull { line ->
                    val box = line.boundingBox ?: return@mapNotNull null
                    if (box.width() < 8 || box.height() < 8) return@mapNotNull null

                    val translated = try {
                        translateRepo.translateJapanese(line.text)
                    } catch (_: Exception) {
                        line.text
                    }

                    OverlayLabel(
                        rect = mapRect(box, imageW, imageH, previewWidth, previewHeight, rotation),
                        original = line.text,
                        translated = translated,
                    )
                }
            }

            _uiState.update { it.copy(labels = labels, error = null) }
        } finally {
            processing.set(false)
        }
    }

    fun togglePause() {
        _uiState.update {
            if (!it.paused) {
                it.copy(paused = true, labels = emptyList(), hint = "Đã tạm dừng")
            } else {
                it.copy(
                    paused = false,
                    hint = "Hướng camera vào chữ tiếng Nhật — dịch hiện trên khung hình (cần mạng).",
                )
            }
        }
    }

    fun updatePreviewSize(width: Int, height: Int) {
        previewWidth = width.coerceAtLeast(1)
        previewHeight = height.coerceAtLeast(1)
    }

    override fun onCleared() {
        super.onCleared()
        recognizer.close()
        cameraExecutor.shutdown()
    }

    private fun mapRect(
        box: android.graphics.Rect,
        imageW: Int,
        imageH: Int,
        previewW: Int,
        previewH: Int,
        rotation: Int,
    ): RectF {
        val srcW = if (rotation == 90 || rotation == 270) imageH.toFloat() else imageW.toFloat()
        val srcH = if (rotation == 90 || rotation == 270) imageW.toFloat() else imageH.toFloat()

        val scale = maxOf(previewW / srcW, previewH / srcH)
        val offsetX = (previewW - srcW * scale) / 2f
        val offsetY = (previewH - srcH * scale) / 2f

        fun mapX(x: Float) = x * scale + offsetX
        fun mapY(y: Float) = y * scale + offsetY

        return when (rotation) {
            90 -> RectF(
                mapX(box.top.toFloat()),
                mapY(imageW - box.right.toFloat()),
                mapX((box.top + box.height()).toFloat()),
                mapY(imageW - box.left.toFloat()),
            )

            270 -> RectF(
                mapX((imageH - box.bottom).toFloat()),
                mapY(box.left.toFloat()),
                mapX((imageH - box.top).toFloat()),
                mapY(box.right.toFloat()),
            )

            else -> RectF(
                mapX(box.left.toFloat()),
                mapY(box.top.toFloat()),
                mapX(box.right.toFloat()),
                mapY(box.bottom.toFloat()),
            )
        }
    }
}
