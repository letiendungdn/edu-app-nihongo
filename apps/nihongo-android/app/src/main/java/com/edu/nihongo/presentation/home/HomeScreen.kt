package com.edu.nihongo.presentation.home

import android.Manifest
import android.os.Build
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.MenuBook
import androidx.compose.material.icons.rounded.Forum
import androidx.compose.material.icons.rounded.Insights
import androidx.compose.material.icons.rounded.NotificationsActive
import androidx.compose.material.icons.rounded.Quiz
import androidx.compose.material.icons.rounded.TextFields
import androidx.compose.material.icons.filled.CloudDone
import androidx.compose.material.icons.filled.CloudOff
import androidx.compose.material.icons.rounded.AccountCircle
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.Brush
import androidx.compose.material.icons.rounded.CameraAlt
import androidx.compose.material.icons.rounded.LibraryBooks
import androidx.compose.material.icons.rounded.Mic
import androidx.compose.material.icons.rounded.Replay
import androidx.compose.material.icons.rounded.SmartToy
import androidx.compose.material.icons.rounded.Videocam
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberPermissionState

private val OnlineGreen = Color(0xFF16A34A)
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onVocab: () -> Unit,
    onSrs: () -> Unit,
    onLogin: () -> Unit,
    onCamera: () -> Unit,
    onLive: () -> Unit,
    onSentencePractice: () -> Unit,
    onAiTutor: () -> Unit,
    onPronunciation: () -> Unit,
    onKanjiDraw: () -> Unit,
    onProgress: () -> Unit,
    onCommunity: () -> Unit,
    onReading: () -> Unit,
    onExams: () -> Unit,
    onKana: () -> Unit,
    viewModel: HomeViewModel = hiltViewModel(),
) {
    val isOnline by viewModel.isOnline.collectAsStateWithLifecycle(initialValue = true)

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Nihongo — EDU APP") },
                actions = {
                    Icon(
                        imageVector = if (isOnline) Icons.Default.CloudDone else Icons.Default.CloudOff,
                        contentDescription = if (isOnline) "Online" else "Offline",
                        modifier = Modifier.padding(end = 16.dp),
                        // primary theme đang là đỏ — không dùng primary cho online kẻo nhìn như lỗi mạng
                        tint = if (isOnline) OnlineGreen else MaterialTheme.colorScheme.error,
                    )
                },
            )
        },
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.primaryContainer,
                    ),
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Text(
                            "🇯🇵 Học tiếng Nhật",
                            style = MaterialTheme.typography.headlineSmall,
                            color = MaterialTheme.colorScheme.onPrimaryContainer,
                        )
                        Text(
                            "Offline-first · SM-2 SRS · AI Gemini",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.75f),
                        )
                    }
                }
            }

            item { NotificationPermissionCard() }

            item { SectionLabel("HỌC TẬP") }

            item {
                NavCard(
                    title = "Tiến độ học",
                    subtitle = "Chuỗi ngày học, thống kê, biểu đồ 14 ngày",
                    icon = Icons.Rounded.Insights,
                    onClick = onProgress,
                    badge = "MỚI",
                )
            }

            item {
                NavCard(
                    title = "Bài học",
                    subtitle = "Từ vựng · ngữ pháp · kanji, dùng được offline",
                    icon = Icons.Rounded.LibraryBooks,
                    onClick = onVocab,
                )
            }
            item {
                NavCard(
                    title = "Ôn tập SRS",
                    subtitle = "Spaced repetition — SM-2",
                    icon = Icons.Rounded.Replay,
                    onClick = onSrs,
                )
            }

            item {
                NavCard(
                    title = "Đọc hiểu",
                    subtitle = "Bài đọc + câu hỏi, chấm cả khi offline",
                    icon = Icons.AutoMirrored.Rounded.MenuBook,
                    onClick = onReading,
                )
            }
            item {
                NavCard(
                    title = "Thi thử JLPT",
                    subtitle = "Đếm giờ, tắt app vẫn làm tiếp được",
                    icon = Icons.Rounded.Quiz,
                    onClick = onExams,
                )
            }

            item { SectionLabel("LUYỆN TẬP") }

            item {
                NavCard(
                    title = "Luyện kana",
                    subtitle = "Hiragana · Katakana, chữ hay sai hỏi lại nhiều hơn",
                    icon = Icons.Rounded.TextFields,
                    onClick = onKana,
                )
            }

            item {
                NavCard(
                    title = "Luyện câu AI",
                    subtitle = "Phân tích câu với Gemini AI",
                    icon = Icons.Rounded.AutoAwesome,
                    onClick = onSentencePractice,
                    badge = "MỚI",
                )
            }
            item {
                NavCard(
                    title = "Dịch camera",
                    subtitle = "Nhận chữ & dịch trực tiếp trên camera",
                    icon = Icons.Rounded.CameraAlt,
                    onClick = onCamera,
                )
            }
            item {
                NavCard(
                    title = "Luyện phát âm",
                    subtitle = "Speech-to-text tiếng Nhật + điểm",
                    icon = Icons.Rounded.Mic,
                    onClick = onPronunciation,
                )
            }
            item {
                NavCard(
                    title = "Vẽ Kanji",
                    subtitle = "Luyện viết tay trên màn hình",
                    icon = Icons.Rounded.Brush,
                    onClick = onKanjiDraw,
                )
            }

            item { SectionLabel("CỘNG ĐỒNG") }

            item {
                NavCard(
                    title = "Chat cộng đồng",
                    subtitle = "Nhắn tin realtime với học viên khác",
                    icon = Icons.Rounded.Forum,
                    onClick = onCommunity,
                )
            }

            item { SectionLabel("AI & LIVESTREAM") }

            item {
                NavCard(
                    title = "AI Tutor",
                    subtitle = "Hỏi ngữ pháp / từ vựng",
                    icon = Icons.Rounded.SmartToy,
                    onClick = onAiTutor,
                )
            }
            item {
                NavCard(
                    title = "Livestream",
                    subtitle = "Xem / phát live Nihongo (LiveKit)",
                    icon = Icons.Rounded.Videocam,
                    onClick = onLive,
                )
            }
            item {
                NavCard(
                    title = "Đăng nhập",
                    subtitle = "Sync tiến độ lên server",
                    icon = Icons.Rounded.AccountCircle,
                    onClick = onLogin,
                )
            }
        }
    }
}

/**
 * Android 13+ phải xin quyền thông báo lúc chạy. Xin trong ngữ cảnh (người dùng hiểu để làm gì)
 * thay vì bật hộp thoại ngay khi mở app: tỉ lệ đồng ý cao hơn, và từ chối 2 lần là hệ thống không hỏi nữa.
 */
@OptIn(ExperimentalPermissionsApi::class)
@Composable
private fun NotificationPermissionCard() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
    val permission = rememberPermissionState(Manifest.permission.POST_NOTIFICATIONS)
    if (permission.status.isGranted) return
    NavCard(
        title = "Bật nhắc ôn tập",
        subtitle = "Mỗi tối 20:00 nhắc khi có thẻ SRS đến hạn",
        icon = Icons.Rounded.NotificationsActive,
        onClick = { permission.launchPermissionRequest() },
    )
}

@Composable
private fun SectionLabel(text: String) {
    Text(
        text = text,
        style = MaterialTheme.typography.labelLarge,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.padding(top = 4.dp, bottom = 2.dp),
    )
}

@Composable
private fun NavCard(
    title: String,
    subtitle: String,
    icon: ImageVector,
    onClick: () -> Unit,
    badge: String? = null,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(36.dp),
            )
            Spacer(Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(text = title, style = MaterialTheme.typography.titleMedium)
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            badge?.let {
                Surface(
                    color = MaterialTheme.colorScheme.primary,
                    shape = MaterialTheme.shapes.small,
                ) {
                    Text(
                        text = it,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onPrimary,
                    )
                }
            }
        }
    }
}
