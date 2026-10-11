package com.edu.nihongo.presentation.camera

import android.graphics.RectF

/**
 * Nhãn dịch vẽ chồng lên preview camera. [rect] tính bằng pixel của PreviewView.
 * Là model của UI nên nằm ở presentation; domain không phụ thuộc Android.
 */
data class OverlayLabel(
    val rect: RectF,
    val original: String,
    val translated: String,
)
