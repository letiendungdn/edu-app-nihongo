package com.edu.nihongo.presentation.common

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.layout
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.edu.nihongo.domain.entity.Vocabulary

/**
 * Kanji có furigana nhỏ phía trên. Compose không có thẻ <ruby> như web nên tự vẽ:
 * cách đọc được đặt phía trên chữ nhưng KHÔNG tính vào bề rộng (tràn sang hai bên như sách tiếng Nhật).
 * Nếu tính vào, わたし rộng hơn 私 sẽ đẩy chữ ra, thành "私 たち" có khoảng trống ở giữa.
 */
@Composable
fun FuriganaText(
    segments: List<Pair<String, String>>,
    fallback: String,
    style: TextStyle = MaterialTheme.typography.titleMedium,
    modifier: Modifier = Modifier,
) {
    if (segments.isEmpty()) {
        Text(fallback, style = style, modifier = modifier)
        return
    }
    val rubySize = (style.fontSize.value * 0.5f).coerceAtLeast(9f).sp
    val rubyColor = MaterialTheme.colorScheme.onSurfaceVariant
    // Chừa chỗ phía trên cho dòng furigana (cao bằng cỡ chữ furigana)
    val rubyLine = with(LocalDensity.current) { rubySize.toDp() + 2.dp }
    Row(
        modifier = modifier.testTag("furigana").padding(top = rubyLine),
        verticalAlignment = Alignment.Bottom,
    ) {
        segments.forEach { (text, ruby) ->
            Box(contentAlignment = Alignment.TopCenter) {
                Text(text, style = style)
                if (ruby.isNotEmpty()) {
                    Text(
                        ruby,
                        fontSize = rubySize,
                        lineHeight = rubySize,
                        color = rubyColor,
                        softWrap = false,
                        maxLines = 1,
                        modifier = Modifier.layout { measurable, _ ->
                            // Đo không giới hạn bề rộng, báo kích thước 0 cho Box → không đẩy chữ;
                            // đặt giữa phía trên chữ
                            val p = measurable.measure(Constraints())
                            layout(0, 0) { p.place(-p.width / 2, -p.height - 2) }
                        },
                    )
                }
            }
        }
    }
}

/** Âm Hán Việt + nghĩa tiếng Anh (kèm nhãn "dịch máy" nếu nguồn là AI). Trống hết thì không vẽ. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun VocabExtraMeanings(vocab: Vocabulary, modifier: Modifier = Modifier) {
    if (vocab.hanViet.isNullOrBlank() && vocab.meaningEn.isNullOrBlank()) return
    FlowRow(
        modifier = modifier.padding(top = 2.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        vocab.hanViet?.takeIf { it.isNotBlank() }?.let {
            Text(it, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold)
        }
        vocab.meaningEn?.takeIf { it.isNotBlank() }?.let { en ->
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                Text("EN", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                Text(en, style = MaterialTheme.typography.bodySmall)
                if (vocab.meaningEnSource == "ai") {
                    Surface(shape = RoundedCornerShape(50), color = Color(0x33F59E0B)) {
                        Text(
                            "dịch máy",
                            style = MaterialTheme.typography.labelSmall,
                            color = Color(0xFFB45309),
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 1.dp),
                        )
                    }
                }
            }
        }
    }
}

/** Giấy phép CC BY-SA 4.0 của JMdict yêu cầu ghi nguồn nơi hiển thị dữ liệu. */
@Composable
fun JmdictAttribution(modifier: Modifier = Modifier) {
    Text(
        "Nghĩa tiếng Anh: JMdict © EDRDG, CC BY-SA 4.0 (edrdg.org)",
        style = MaterialTheme.typography.labelSmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = modifier.padding(vertical = 8.dp),
    )
}
