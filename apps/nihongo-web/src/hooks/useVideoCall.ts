'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { fetchCallTicket } from '@/api';

export type CallStatus =
  | 'idle'
  | 'connecting'
  | 'waiting'
  | 'calling'
  | 'connected'
  | 'reconnecting'
  | 'ended'
  | 'error';

interface UseVideoCallOptions {
  sessionId: number;
  token: string;
  signalingUrl?: string;
}

/** Dự phòng khi server không trả ICE server. Server trả cả TURN (bản cũ chỉ có STUN ghi cứng ở đây). */
const FALLBACK_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export function useVideoCall({ sessionId, token, signalingUrl }: UseVideoCallOptions) {
  const [status, setStatus] = useState<CallStatus>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [error, setError] = useState('');

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const sessionActiveRef = useRef(false);
  const iceServersRef = useRef<RTCIceServer[]>(FALLBACK_ICE_SERVERS);

  const SIGNAL_URL =
    signalingUrl ?? process.env.NEXT_PUBLIC_SIGNALING_URL ?? 'http://localhost:3002';

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });

    pc.onicecandidate = (e) => {
      if (e.candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', {
          sessionId,
          candidate: e.candidate.toJSON(),
        });
      }
    };

    pc.ontrack = (e) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = e.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') setStatus('connected');
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setStatus('reconnecting');
      }
    };

    return pc;
  }, [sessionId]);

  const addLocalTracks = useCallback((pc: RTCPeerConnection, stream: MediaStream) => {
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
  }, []);

  const releaseMedia = useCallback(() => {
    socketRef.current?.emit('leave-room', { sessionId });
    socketRef.current?.disconnect();
    pcRef.current?.close();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    socketRef.current = null;
    pcRef.current = null;
    localStreamRef.current = null;
    screenStreamRef.current = null;
    sessionActiveRef.current = false;
  }, [sessionId]);

  const start = useCallback(async () => {
    setError('');
    setStatus('connecting');
    sessionActiveRef.current = true;

    // Vé vào phòng: server kiểm tra mình là học viên/coach của buổi này và đang trong khung giờ
    let callToken: string;
    try {
      const ticket = await fetchCallTicket(token, sessionId);
      callToken = ticket.token;
      if (ticket.iceServers?.length) iceServersRef.current = ticket.iceServers;
    } catch (e) {
      sessionActiveRef.current = false;
      setError(e instanceof Error ? e.message : 'Không vào được phòng của buổi học này.');
      setStatus('error');
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch {
      sessionActiveRef.current = false;
      setError('Không thể truy cập camera/microphone. Kiểm tra quyền trình duyệt.');
      setStatus('error');
      return;
    }

    localStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    const socket = io(`${SIGNAL_URL}/signal`, {
      auth: { token },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    // Mỗi lần (tái) kết nối đều join lại bằng vé: vé sống tới lúc phòng đóng
    socket.on('connect', () => {
      socket.emit('join-room', { sessionId, callToken });
    });

    socket.on('exception', (err: { message?: string }) => {
      setError(err?.message ?? 'Không có quyền vào phòng này.');
      setStatus('error');
    });

    socket.on('joined', () => {
      setStatus('waiting');
    });

    socket.on('peer-joined', async () => {
      setStatus('calling');
      const pc = createPeerConnection();
      pcRef.current = pc;
      addLocalTracks(pc, stream);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('offer', { sessionId, sdp: pc.localDescription });
    });

    socket.on('offer', async ({ sdp }: { sdp: RTCSessionDescriptionInit }) => {
      const pc = createPeerConnection();
      pcRef.current = pc;
      addLocalTracks(pc, stream);

      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('answer', { sessionId, sdp: pc.localDescription });
    });

    socket.on('answer', async ({ sdp }: { sdp: RTCSessionDescriptionInit }) => {
      await pcRef.current?.setRemoteDescription(new RTCSessionDescription(sdp));
    });

    socket.on('ice-candidate', async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      try {
        await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // ignore stale candidates
      }
    });

    socket.on('peer-left', () => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      setStatus('waiting');
    });

    socket.on('connect_error', (err) => {
      setError(`Không kết nối được signaling server: ${err.message}`);
      setStatus('error');
    });
  }, [sessionId, token, SIGNAL_URL, createPeerConnection, addLocalTracks]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsMuted((v) => !v);
  }, []);

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsCameraOff((v) => !v);
  }, []);

  const toggleScreenShare = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !localStreamRef.current) return;

    if (isScreenSharing) {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      const camTrack = localStreamRef.current.getVideoTracks()[0];
      const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
      if (sender && camTrack) await sender.replaceTrack(camTrack);
      if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
      setIsScreenSharing(false);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) await sender.replaceTrack(screenTrack);
        if (localVideoRef.current) {
          const mixed = new MediaStream([
            screenTrack,
            ...localStreamRef.current.getAudioTracks(),
          ]);
          localVideoRef.current.srcObject = mixed;
        }
        screenTrack.onended = () => toggleScreenShare();
        setIsScreenSharing(true);
      } catch {
        // user cancelled screen share picker
      }
    }
  }, [isScreenSharing]);

  const endCall = useCallback(() => {
    releaseMedia();
    setStatus('ended');
  }, [releaseMedia]);

  useEffect(() => {
    return () => {
      // Chỉ dọn tài nguyên khi rời trang — không setStatus('ended') để tránh Strict Mode flash UI
      if (sessionActiveRef.current) releaseMedia();
    };
  }, [releaseMedia]);

  return {
    status,
    error,
    isMuted,
    isCameraOff,
    isScreenSharing,
    localVideoRef,
    remoteVideoRef,
    start,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
    endCall,
  };
}
