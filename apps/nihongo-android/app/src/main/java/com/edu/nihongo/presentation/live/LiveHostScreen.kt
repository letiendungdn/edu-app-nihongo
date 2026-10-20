package com.edu.nihongo.presentation.live

import android.Manifest
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CallEnd
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.MicOff
import androidx.compose.material.icons.filled.Videocam
import androidx.compose.material.icons.filled.VideocamOff
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberMultiplePermissionsState
import io.livekit.android.compose.ui.VideoTrackView

@OptIn(ExperimentalMaterial3Api::class, ExperimentalPermissionsApi::class)
@Composable
fun LiveHostScreen(
    onBack: () -> Unit,
    viewModel: LiveHostViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val permissions = rememberMultiplePermissionsState(
        listOf(Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO),
    )

    DisposableEffect(Unit) {
        if (!permissions.allPermissionsGranted) {
            permissions.launchMultiplePermissionRequest()
        }
        onDispose { }
    }

    LaunchedEffect(Unit) {
        viewModel.finished.collect { onBack() }
    }

    LaunchedEffect(permissions.allPermissionsGranted) {
        viewModel.onPermissionsChanged(permissions.allPermissionsGranted)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Phát live") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .background(Color.Black),
                contentAlignment = Alignment.Center,
            ) {
                when {
                    !permissions.allPermissionsGranted -> {
                        Text(
                            text = "Cần quyền camera và micro để phát live",
                            color = Color.White,
                            modifier = Modifier.padding(16.dp),
                        )
                    }

                    uiState.connecting -> CircularProgressIndicator(color = Color.White)

                    uiState.error != null -> Text(
                        text = uiState.error ?: "",
                        color = Color.White,
                        modifier = Modifier.padding(16.dp),
                    )

                    uiState.localVideo != null && viewModel.room != null -> {
                        VideoTrackView(
                            videoTrack = uiState.localVideo,
                            passedRoom = viewModel.room,
                            modifier = Modifier.fillMaxSize(),
                            mirror = true,
                        )
                    }

                    else -> Text("Đang bật camera…", color = Color.White)
                }

                Text(
                    text = "${uiState.viewerCount} người xem",
                    color = Color.White,
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(8.dp)
                        .background(Color.Black.copy(alpha = 0.5f))
                        .padding(horizontal = 8.dp, vertical = 4.dp),
                    style = MaterialTheme.typography.labelSmall,
                )
            }

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                FilledTonalIconButton(onClick = viewModel::toggleMic) {
                    Icon(
                        imageVector = if (uiState.micOn) Icons.Default.Mic else Icons.Default.MicOff,
                        contentDescription = "Micro",
                    )
                }
                FilledTonalIconButton(onClick = viewModel::toggleCamera) {
                    Icon(
                        imageVector = if (uiState.cameraOn) {
                            Icons.Default.Videocam
                        } else {
                            Icons.Default.VideocamOff
                        },
                        contentDescription = "Camera",
                    )
                }
                FilledTonalIconButton(onClick = viewModel::endStream) {
                    Icon(
                        imageVector = Icons.Default.CallEnd,
                        contentDescription = "Kết thúc",
                        tint = MaterialTheme.colorScheme.error,
                    )
                }
            }
        }
    }
}
