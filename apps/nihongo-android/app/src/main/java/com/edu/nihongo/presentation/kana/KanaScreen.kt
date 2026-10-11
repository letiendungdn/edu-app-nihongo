package com.edu.nihongo.presentation.kana

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.edu.nihongo.presentation.common.BackScaffold
import com.edu.nihongo.utils.TtsHelper

@Composable
fun KanaScreen(
    onBack: () -> Unit,
    onPracticeWriting: (kana: String, romaji: String) -> Unit,
    viewModel: KanaViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val q = state.question ?: return

    BackScaffold("Luyện kana", onBack) { padding ->
        Column(
            Modifier.padding(padding).fillMaxSize().padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                KanaScript.entries.forEach { s ->
                    FilterChip(selected = state.script == s, onClick = { viewModel.setScript(s) }, label = { Text(s.label) })
                }
            }
            Text("Đúng ${state.correct}/${state.answered}", color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(q.kana.char, fontSize = 96.sp, color = MaterialTheme.colorScheme.primary)

            q.options.chunked(2).forEach { row ->
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                    row.forEach { option ->
                        val color = when {
                            state.picked == null -> ButtonDefaults.buttonColors()
                            option == q.kana.romaji -> ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.tertiary)
                            option == state.picked -> ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                            else -> ButtonDefaults.buttonColors()
                        }
                        Button(onClick = { viewModel.answer(option) }, colors = color, modifier = Modifier.weight(1f)) {
                            Text(option, fontSize = 20.sp)
                        }
                    }
                }
            }

            if (state.picked != null) {
                Button(onClick = viewModel::next, modifier = Modifier.fillMaxWidth()) { Text("Câu tiếp") }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = { TtsHelper.speak(q.kana.char) }) { Text("🔊 Nghe") }
                OutlinedButton(onClick = { onPracticeWriting(q.kana.char, q.kana.romaji) }) { Text("✍️ Luyện viết") }
            }
        }
    }
}
