package com.edu.nihongo.presentation.camera

import android.Manifest
import android.view.ViewGroup
import androidx.camera.view.PreviewView
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.IntOffset
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberPermissionState
import kotlin.math.roundToInt

@OptIn(ExperimentalMaterial3Api::class, ExperimentalPermissionsApi::class)
@Composable
fun CameraTranslateScreen(
    onBack: () -> Unit,
    viewModel: CameraTranslateViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val lifecycleOwner = LocalLifecycleOwner.current
    val context = LocalContext.current
    val cameraPermission = rememberPermissionState(Manifest.permission.CAMERA)

    // Không có gì để dọn → LaunchedEffect, không phải DisposableEffect với onDispose rỗng
    LaunchedEffect(Unit) {
        if (!cameraPermission.status.isGranted) {
            cameraPermission.launchPermissionRequest()
        }
    }
    val density = LocalDensity.current

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Dịch camera") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = viewModel::togglePause) {
                        Icon(
                            imageVector = if (uiState.paused) Icons.Default.PlayArrow else Icons.Default.Pause,
                            contentDescription = if (uiState.paused) "Tiếp tục" else "Tạm dừng",
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color.Black.copy(alpha = 0.85f),
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White,
                    actionIconContentColor = Color.White,
                ),
            )
        },
        containerColor = Color.Black,
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            when {
                !cameraPermission.status.isGranted -> {
                    Text(
                        text = "Cần quyền camera để dịch trực tiếp.",
                        color = Color.White,
                        modifier = Modifier.padding(24.dp),
                    )
                }

                uiState.error != null -> {
                    Text(
                        text = uiState.error.orEmpty(),
                        color = Color.White,
                        modifier = Modifier.padding(24.dp),
                    )
                }

                else -> {
                    val previewView = remember {
                        PreviewView(context).apply {
                            layoutParams = ViewGroup.LayoutParams(
                                ViewGroup.LayoutParams.MATCH_PARENT,
                                ViewGroup.LayoutParams.MATCH_PARENT,
                            )
                            implementationMode = PreviewView.ImplementationMode.COMPATIBLE
                        }
                    }

                    LaunchedEffect(lifecycleOwner, previewView) {
                        viewModel.bindCamera(lifecycleOwner, previewView)
                    }

                    AndroidView(
                        factory = { previewView },
                        modifier = Modifier.fillMaxSize(),
                        update = { view ->
                            viewModel.updatePreviewSize(view.width, view.height)
                        },
                    )

                    uiState.labels.forEach { label ->
                        // label.rect tính bằng pixel của PreviewView. Trước đây dùng `.dp` trực tiếp
                        // nên bị nhân thêm density (×2.75 trên nhiều máy) → nhãn lệch khỏi chữ.
                        val maxWidth = with(density) {
                            label.rect.width().coerceIn(48.dp.toPx(), 360.dp.toPx()).toDp()
                        }
                        Text(
                            text = label.translated,
                            color = Color.White,
                            fontSize = 13.sp,
                            modifier = Modifier
                                .offset {
                                    IntOffset(label.rect.left.roundToInt(), label.rect.top.roundToInt())
                                }
                                .widthIn(max = maxWidth)
                                .background(Color(0xCC1D4ED8))
                                .padding(horizontal = 6.dp, vertical = 4.dp),
                        )
                    }
                }
            }

            Text(
                text = uiState.hint,
                color = Color.White.copy(alpha = 0.75f),
                fontSize = 13.sp,
                modifier = Modifier
                    .align(androidx.compose.ui.Alignment.BottomCenter)
                    .fillMaxWidth()
                    .background(Color.Black.copy(alpha = 0.55f))
                    .padding(12.dp),
            )
        }
    }
}
