package com.edu.nihongo.presentation.live

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.edu.nihongo.data.LiveNavigationStore
import com.edu.nihongo.data.remote.LiveApi
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import io.livekit.android.LiveKit
import io.livekit.android.events.RoomEvent
import io.livekit.android.events.collect
import io.livekit.android.room.Room
import io.livekit.android.room.track.LocalVideoTrack
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class LiveHostUiState(
    val connecting: Boolean = true,
    val error: String? = null,
    val localVideo: LocalVideoTrack? = null,
    val viewerCount: Int = 0,
    val micOn: Boolean = true,
    val cameraOn: Boolean = true,
    val sessionId: Int = 0,
)

@HiltViewModel
class LiveHostViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val navStore: LiveNavigationStore,
    private val liveApi: LiveApi,
) : ViewModel() {

    private val _uiState = MutableStateFlow(LiveHostUiState())
    val uiState: StateFlow<LiveHostUiState> = _uiState.asStateFlow()

    private val _finished = Channel<Unit>(Channel.BUFFERED)
    val finished: Flow<Unit> = _finished.receiveAsFlow()

    var room: Room? = null
        private set

    init {
        startStream()
    }

    private fun startStream() {
        val join = navStore.consumeJoin()
        if (join == null) {
            _uiState.update { it.copy(connecting = false, error = "Thiếu thông tin phòng") }
            return
        }

        _uiState.update { it.copy(sessionId = join.sessionId) }

        viewModelScope.launch {
            try {
                val r = LiveKit.create(context)
                room = r

                launch {
                    r.events.collect { event ->
                        when (event) {
                            is RoomEvent.ParticipantConnected,
                            is RoomEvent.ParticipantDisconnected,
                            -> {
                                _uiState.update {
                                    it.copy(viewerCount = r.remoteParticipants.size)
                                }
                            }

                            is RoomEvent.TrackPublished -> {
                                if (event.participant == r.localParticipant) {
                                    val track = event.publication.track
                                    if (track is LocalVideoTrack) {
                                        _uiState.update { it.copy(localVideo = track) }
                                    }
                                }
                            }

                            else -> Unit
                        }
                    }
                }

                r.connect(join.wsUrl, join.token)
                r.localParticipant.setCameraEnabled(true)
                r.localParticipant.setMicrophoneEnabled(true)

                _uiState.update { it.copy(connecting = false) }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(connecting = false, error = e.message ?: "Không phát live được")
                }
            }
        }
    }

    fun toggleMic() {
        viewModelScope.launch {
            val next = !_uiState.value.micOn
            room?.localParticipant?.setMicrophoneEnabled(next)
            _uiState.update { it.copy(micOn = next) }
        }
    }

    fun toggleCamera() {
        viewModelScope.launch {
            val next = !_uiState.value.cameraOn
            room?.localParticipant?.setCameraEnabled(next)
            _uiState.update { it.copy(cameraOn = next) }
        }
    }

    fun endStream() {
        viewModelScope.launch {
            val sessionId = _uiState.value.sessionId
            if (sessionId > 0) {
                try {
                    liveApi.endSession(sessionId)
                } catch (_: Exception) {
                }
            }
            room?.disconnect()
            room = null
            _finished.send(Unit)
        }
    }

    override fun onCleared() {
        room?.disconnect()
        room = null
        super.onCleared()
    }
}
