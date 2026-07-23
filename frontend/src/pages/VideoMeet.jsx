import React, { useRef, useState, useEffect, useCallback } from 'react'
import Button from "@mui/material/Button";
import io from "socket.io-client";
import styles from "../styles/videoComponent.module.css"
import { Badge, IconButton, TextField, Snackbar } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff'
import CallEndIcon from '@mui/icons-material/CallEnd'
import MicIcon from '@mui/icons-material/Mic'
import MicOffIcon from '@mui/icons-material/MicOff'
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare'
import ChatIcon from '@mui/icons-material/Chat'
import { serverUrl } from '../environment';
import { useParams } from 'react-router-dom';

const server_url = serverUrl;
const REACTIONS = ['👍', '👏', '❤️', '😂', '🎉', '👋'];

var connections = {};
const peerConfigConnections = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

function silence() {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const dst = oscillator.connect(ctx.createMediaStreamDestination());
    oscillator.start();
    ctx.resume();
    return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
}

function black({ width = 640, height = 480 } = {}) {
    const canvas = Object.assign(document.createElement("canvas"), { width, height });
    canvas.getContext('2d').fillRect(0, 0, width, height);
    return Object.assign(canvas.captureStream().getVideoTracks()[0], { enabled: false });
}

function isRealRemoteStream(stream) {
    if (!stream) return false;
    const tracks = stream.getTracks();
    return tracks.length > 0 && tracks.some((t) => t.readyState === 'live');
}

function looksLikeScreenShare(stream) {
    const track = stream?.getVideoTracks?.()?.[0];
    if (!track) return false;
    try {
        const settings = track.getSettings?.() || {};
        if (settings.displaySurface) return true;
        if (settings.width && settings.height && settings.width >= 1280 && settings.width / settings.height >= 1.5) {
            const label = (track.label || '').toLowerCase();
            if (/screen|window|display|monitor|tab|web/.test(label)) return true;
        }
    } catch (e) { /* ignore */ }
    const label = (track.label || '').toLowerCase();
    return /screen|window|display|monitor|tab/.test(label);
}

function playChime(kind = 'join') {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const now = ctx.currentTime;
        const notes = kind === 'join' ? [523.25, 659.25] : [392, 330];
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02 + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28 + i * 0.1);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + i * 0.08);
            osc.stop(now + 0.4 + i * 0.1);
        });
        setTimeout(() => ctx.close(), 800);
    } catch (e) { /* ignore */ }
}

export default function VideoMeetComponent() {
    const socketRef = useRef();
    const socketIdRef = useRef();
    const localVideoRef = useRef();
    const cameraStreamRef = useRef(null);
    const videoRef = useRef([]);
    const usernameRef = useRef("");

    const [videoAvailable, setVideoAvailable] = useState(true);
    const [audioAvailable, setAudioAvailable] = useState(true);
    const [video, setVideo] = useState();
    const [audio, setAudio] = useState();
    const [screen, setScreen] = useState(false);
    const [showModal, setModal] = useState(false);
    const [screenAvailable, setScreenAvailable] = useState(false);
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState([]);
    const [newMessages, setNewMessages] = useState(0);
    const [askForUsername, setAskForUsername] = useState(true);
    const [username, setUsername] = useState("");
    const [videos, setVideos] = useState([]);
    const [callSeconds, setCallSeconds] = useState(0);
    const [toast, setToast] = useState("");
    const [peerNames, setPeerNames] = useState({});
    const [floatingReactions, setFloatingReactions] = useState([]);
    const [showShortcuts, setShowShortcuts] = useState(false);
    const [lobbyCamOn, setLobbyCamOn] = useState(true);
    const [lobbyMicOn, setLobbyMicOn] = useState(true);
    const [screenSharerId, setScreenSharerId] = useState(null);
    const [shareViewMode, setShareViewMode] = useState('full'); // 'full' | 'grid'

    const { url: meetingCode } = useParams();

    useEffect(() => {
        usernameRef.current = username;
    }, [username]);

    useEffect(() => {
        if (askForUsername) return undefined;
        const id = setInterval(() => setCallSeconds((s) => s + 1), 1000);
        return () => clearInterval(id);
    }, [askForUsername]);

    const formatDuration = (total) => {
        const m = Math.floor(total / 60).toString().padStart(2, '0');
        const s = (total % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const copyInvite = async () => {
        const link = `${window.location.origin}/${meetingCode || ''}`;
        try {
            await navigator.clipboard.writeText(link);
            setToast("Invite link copied");
        } catch {
            setToast(link);
        }
    };

    const renegotiatePeers = useCallback(() => {
        for (let id in connections) {
            if (id === socketIdRef.current) continue;
            try {
                connections[id].addStream(window.localStream);
            } catch (e) { /* ignore */ }
            connections[id].createOffer()
                .then((description) => connections[id].setLocalDescription(description))
                .then(() => {
                    socketRef.current.emit(
                        "signal",
                        id,
                        JSON.stringify({ sdp: connections[id].localDescription })
                    );
                })
                .catch((e) => console.log(e));
        }
    }, []);

    const showLocalPreview = useCallback((stream) => {
        if (localVideoRef.current && stream) {
            localVideoRef.current.srcObject = stream;
        }
    }, []);

    useEffect(() => {
        getPermissions();
        return () => {
            try {
                Object.keys(connections).forEach((id) => {
                    try { connections[id].close(); } catch (e) { /* ignore */ }
                    delete connections[id];
                });
                if (socketRef.current) socketRef.current.disconnect();
                if (cameraStreamRef.current) {
                    cameraStreamRef.current.getTracks().forEach((t) => t.stop());
                }
                if (window.localStream) {
                    window.localStream.getTracks().forEach((t) => t.stop());
                }
            } catch (e) { /* ignore */ }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const getPermissions = async () => {
        try {
            let hasVideo = false;
            let hasAudio = false;

            try {
                const v = await navigator.mediaDevices.getUserMedia({ video: true });
                hasVideo = true;
                v.getTracks().forEach((t) => t.stop());
            } catch (e) {
                hasVideo = false;
            }

            try {
                const a = await navigator.mediaDevices.getUserMedia({ audio: true });
                hasAudio = true;
                a.getTracks().forEach((t) => t.stop());
            } catch (e) {
                hasAudio = false;
            }

            setVideoAvailable(hasVideo);
            setAudioAvailable(hasAudio);
            setLobbyCamOn(hasVideo);
            setLobbyMicOn(hasAudio);
            setScreenAvailable(Boolean(navigator.mediaDevices.getDisplayMedia));

            if (hasVideo || hasAudio) {
                const userMediaStream = await navigator.mediaDevices.getUserMedia({
                    video: hasVideo,
                    audio: hasAudio
                });
                cameraStreamRef.current = userMediaStream;
                window.localStream = userMediaStream;
                showLocalPreview(userMediaStream);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const toggleLobbyCam = () => {
        const next = !lobbyCamOn;
        setLobbyCamOn(next);
        const stream = cameraStreamRef.current;
        if (stream) {
            stream.getVideoTracks().forEach((t) => { t.enabled = next; });
        }
    };

    const toggleLobbyMic = () => {
        const next = !lobbyMicOn;
        setLobbyMicOn(next);
        const stream = cameraStreamRef.current;
        if (stream) {
            stream.getAudioTracks().forEach((t) => { t.enabled = next; });
        }
    };

    const getUserMediaSuccess = (stream) => {
        try {
            if (cameraStreamRef.current && cameraStreamRef.current !== stream) {
                cameraStreamRef.current.getTracks().forEach((track) => track.stop());
            }
        } catch (e) {
            console.log(e);
        }

        cameraStreamRef.current = stream;
        window.localStream = stream;
        showLocalPreview(stream);
        renegotiatePeers();
    };

    const getUserMedia = useCallback(() => {
        const wantVideo = video && videoAvailable;
        const wantAudio = audio && audioAvailable;

        if (wantVideo || wantAudio) {
            navigator.mediaDevices.getUserMedia({ video: Boolean(wantVideo), audio: Boolean(wantAudio) })
                .then(getUserMediaSuccess)
                .catch((e) => console.log(e));
        } else {
            try {
                if (cameraStreamRef.current) {
                    cameraStreamRef.current.getTracks().forEach((track) => track.stop());
                }
            } catch (e) { /* ignore */ }

            const placeholder = new MediaStream([black(), silence()]);
            cameraStreamRef.current = placeholder;
            window.localStream = placeholder;
            showLocalPreview(placeholder);
            renegotiatePeers();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [video, audio, videoAvailable, audioAvailable, renegotiatePeers, showLocalPreview]);

    useEffect(() => {
        if (video !== undefined && audio !== undefined && !screen) {
            getUserMedia();
        }
    }, [video, audio, screen, getUserMedia]);

    const stopScreenShare = useCallback(() => {
        try {
            if (window.localStream && window.localStream !== cameraStreamRef.current) {
                window.localStream.getTracks().forEach((track) => track.stop());
            }
        } catch (e) {
            console.log(e);
        }

        const cam = cameraStreamRef.current;
        const camLive = cam && cam.getTracks().some((t) => t.readyState === 'live');

        if (camLive) {
            window.localStream = cam;
            showLocalPreview(cam);
            renegotiatePeers();
        } else {
            getUserMedia();
        }

        setScreen(false);
        if (socketRef.current) {
            socketRef.current.emit('screen-share', { sharing: false });
        }
        setScreenSharerId((prev) => (prev === socketIdRef.current ? null : prev));
    }, [getUserMedia, renegotiatePeers, showLocalPreview]);

    const getDisplayMediaSuccess = (stream) => {
        if (!cameraStreamRef.current && window.localStream) {
            cameraStreamRef.current = window.localStream;
        }

        try {
            if (window.localStream && window.localStream !== cameraStreamRef.current) {
                window.localStream.getTracks().forEach((track) => track.stop());
            }
        } catch (e) {
            console.log(e);
        }

        window.localStream = stream;

        if (cameraStreamRef.current) {
            showLocalPreview(cameraStreamRef.current);
        } else {
            showLocalPreview(stream);
        }

        renegotiatePeers();

        stream.getTracks().forEach((track) => {
            track.onended = () => stopScreenShare();
        });

        if (socketRef.current) {
            socketRef.current.emit('screen-share', { sharing: true });
        }
        setScreenSharerId(socketIdRef.current);
        setShareViewMode('full');
        setToast("Sharing screen — share a window/app, not this tab, to avoid mirror effect");
    };

    const startScreenShare = () => {
        if (!navigator.mediaDevices.getDisplayMedia) return;
        navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
            .then((stream) => {
                setScreen(true);
                getDisplayMediaSuccess(stream);
            })
            .catch((e) => {
                console.log(e);
                setScreen(false);
                setToast("Screen share cancelled");
            });
    };

    const handleScreen = () => {
        if (screen) stopScreenShare();
        else startScreenShare();
    };

    const gotMessageFromServer = (fromId, message) => {
        const signal = JSON.parse(message);
        if (fromId === socketIdRef.current) return;
        if (!connections[fromId]) return;

        if (signal.sdp) {
            connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp))
                .then(() => {
                    if (signal.sdp.type === "offer") {
                        connections[fromId].createAnswer()
                            .then((description) => connections[fromId].setLocalDescription(description))
                            .then(() => {
                                socketRef.current.emit(
                                    "signal",
                                    fromId,
                                    JSON.stringify({ sdp: connections[fromId].localDescription })
                                );
                            })
                            .catch((e) => console.log(e));
                    }
                })
                .catch((e) => console.log(e));
        }
        if (signal.ice) {
            connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch((e) => console.log(e));
        }
    };

    const addMessage = (data, sender, socketIdSender) => {
        setMessages((prevMessages) => [...prevMessages, { sender, data }]);
        if (socketIdSender !== socketIdRef.current) {
            setNewMessages((prev) => prev + 1);
        }
    };

    const pushReaction = useCallback((payload) => {
        setFloatingReactions((prev) => [...prev, { ...payload, left: 12 + Math.random() * 76 }]);
        setTimeout(() => {
            setFloatingReactions((prev) => prev.filter((r) => r.id !== payload.id));
        }, 2400);
    }, []);

    const sendReaction = (emoji) => {
        if (!socketRef.current) return;
        socketRef.current.emit('reaction', emoji);
    };

    const connectToSocketServer = () => {
        socketRef.current = io.connect(server_url, { secure: false });

        socketRef.current.on('signal', gotMessageFromServer);

        socketRef.current.on('connect', () => {
            socketIdRef.current = socketRef.current.id;
            socketRef.current.emit('join-call', window.location.href, usernameRef.current);

            socketRef.current.on('chat-message', addMessage);

            socketRef.current.on('reaction', (payload) => {
                pushReaction(payload);
            });

            socketRef.current.on('screen-share', ({ from, sharing, name }) => {
                if (sharing) {
                    setScreenSharerId(from);
                    setShareViewMode('full');
                    if (from !== socketIdRef.current) {
                        setToast(`${name || 'Someone'} is sharing their screen`);
                    }
                } else {
                    setScreenSharerId((prev) => (prev === from ? null : prev));
                }
            });

            socketRef.current.on('user-left', (id) => {
                if (connections[id]) {
                    try { connections[id].close(); } catch (e) { /* ignore */ }
                    delete connections[id];
                }
                setVideos((prev) => prev.filter((v) => v.socketId !== id));
                videoRef.current = videoRef.current.filter((v) => v.socketId !== id);
                setPeerNames((prev) => {
                    const next = { ...prev };
                    delete next[id];
                    return next;
                });
                setScreenSharerId((prev) => (prev === id ? null : prev));
                playChime('leave');
            });

            socketRef.current.on('user-joined', (id, clients, nameMap = {}) => {
                if (nameMap && typeof nameMap === 'object') {
                    setPeerNames((prev) => ({ ...prev, ...nameMap }));
                }

                if (id !== socketIdRef.current) {
                    playChime('join');
                    const who = nameMap?.[id] || 'Someone';
                    setToast(`${who} joined the call`);
                }

                clients.forEach((socketListId) => {
                    if (socketListId === socketIdRef.current) return;
                    if (connections[socketListId]) return;

                    connections[socketListId] = new RTCPeerConnection(peerConfigConnections);

                    connections[socketListId].onicecandidate = (event) => {
                        if (event.candidate != null) {
                            socketRef.current.emit(
                                'signal',
                                socketListId,
                                JSON.stringify({ ice: event.candidate })
                            );
                        }
                    };

                    connections[socketListId].onaddstream = (event) => {
                        if (socketListId === socketIdRef.current) return;
                        if (!isRealRemoteStream(event.stream)) return;

                        if (looksLikeScreenShare(event.stream)) {
                            setScreenSharerId(socketListId);
                            setShareViewMode('full');
                        }

                        const videoExists = videoRef.current.find((v) => v.socketId === socketListId);

                        if (videoExists) {
                            setVideos((prev) => {
                                const updated = prev.map((v) =>
                                    v.socketId === socketListId ? { ...v, stream: event.stream } : v
                                );
                                videoRef.current = updated;
                                return updated;
                            });
                        } else {
                            const newVideo = {
                                socketId: socketListId,
                                stream: event.stream,
                                autoplay: true,
                                playsinline: true
                            };
                            setVideos((prev) => {
                                const updated = [...prev.filter((v) => v.socketId !== socketListId), newVideo];
                                videoRef.current = updated;
                                return updated;
                            });
                        }
                    };

                    if (window.localStream) {
                        connections[socketListId].addStream(window.localStream);
                    }
                });

                if (id === socketIdRef.current) {
                    for (let id2 in connections) {
                        if (id2 === socketIdRef.current) continue;
                        try {
                            connections[id2].addStream(window.localStream);
                        } catch (e) { /* ignore */ }

                        connections[id2].createOffer()
                            .then((description) => connections[id2].setLocalDescription(description))
                            .then(() => {
                                socketRef.current.emit(
                                    'signal',
                                    id2,
                                    JSON.stringify({ sdp: connections[id2].localDescription })
                                );
                            })
                            .catch((e) => console.log(e));
                    }
                }
            });
        });
    };

    const getMedia = () => {
        setVideo(lobbyCamOn && videoAvailable);
        setAudio(lobbyMicOn && audioAvailable);
        connectToSocketServer();
    };

    const handleVideo = () => setVideo((v) => !v);
    const handleAudio = () => setAudio((a) => !a);

    const handleEndCall = () => {
        try {
            if (localVideoRef.current?.srcObject) {
                localVideoRef.current.srcObject.getTracks().forEach((track) => track.stop());
            }
            if (cameraStreamRef.current) {
                cameraStreamRef.current.getTracks().forEach((track) => track.stop());
            }
            if (window.localStream) {
                window.localStream.getTracks().forEach((track) => track.stop());
            }
        } catch (e) { /* ignore */ }
        window.location.href = "/home";
    };

    const sendMessage = () => {
        if (!message || !message.trim()) return;
        socketRef.current.emit('chat-message', message, username);
        setMessage("");
    };

    const connect = () => {
        if (!username.trim()) {
            setToast("Please enter a display name");
            return;
        }
        setAskForUsername(false);
        getMedia();
    };

    // Keyboard shortcuts during call
    useEffect(() => {
        if (askForUsername) return undefined;

        const onKey = (e) => {
            const tag = e.target?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;

            const key = e.key.toLowerCase();
            if (key === 'm') {
                e.preventDefault();
                setAudio((a) => !a);
            } else if (key === 'v') {
                e.preventDefault();
                setVideo((v) => !v);
            } else if (key === 'c') {
                e.preventDefault();
                setModal((m) => {
                    if (!m) setNewMessages(0);
                    return !m;
                });
            } else if (key === '?' || (e.shiftKey && key === '/')) {
                e.preventDefault();
                setShowShortcuts((s) => !s);
            } else if (key === 'escape') {
                setShowShortcuts(false);
                setModal(false);
            }
        };

        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [askForUsername]);

    // Re-attach local preview when layout switches (grid ↔ full share)
    useEffect(() => {
        if (askForUsername) return;
        const preview = cameraStreamRef.current || window.localStream;
        if (localVideoRef.current && preview) {
            localVideoRef.current.srcObject = preview;
        }
    }, [askForUsername, shareViewMode, screenSharerId, screen]);

    const remoteVideos = videos.filter(
        (v) => v.socketId !== socketIdRef.current && isRealRemoteStream(v.stream)
    );
    const totalParticipants = remoteVideos.length + 1;
    const layoutClass = styles[`count${Math.min(totalParticipants, 6)}`] || styles.countMany;

    const isShareActive = Boolean(screenSharerId);
    const useFullShareView = isShareActive && shareViewMode === 'full';
    const spotlightRemote = useFullShareView
        ? remoteVideos.find((v) => v.socketId === screenSharerId)
        : null;
    // When someone else shares, spotlight their stream. When I share, remotes see me — locally keep camera grid/strip.
    const showRemoteSpotlight = Boolean(spotlightRemote && screenSharerId !== socketIdRef.current);
    const stripRemotes = showRemoteSpotlight
        ? remoteVideos.filter((v) => v.socketId !== screenSharerId)
        : remoteVideos;

    const bindRemoteVideo = (remote) => (ref) => {
        if (ref && remote.stream && ref.srcObject !== remote.stream) {
            ref.srcObject = remote.stream;
        }
    };

    const renderRemoteTile = (remote, extraClass = '') => (
        <div
            key={remote.socketId}
            className={`${styles.videoTile} ${extraClass} ${remote.socketId === screenSharerId ? styles.screenTile : ''}`}
        >
            <video
                data-socket={remote.socketId}
                ref={bindRemoteVideo(remote)}
                autoPlay
                playsInline
                className={`${styles.videoElement} ${remote.socketId === screenSharerId ? styles.screenFit : ''}`}
            />
            <span className={styles.tileLabel}>
                {peerNames[remote.socketId] || 'Participant'}
                {remote.socketId === screenSharerId ? ' · Screen' : ''}
            </span>
        </div>
    );

    return (
        <div>
            {askForUsername ? (
                <div className={styles.lobbyContainer}>
                    <div
                        className={styles.midnightMist}
                        aria-hidden
                        style={{
                            backgroundImage: `
                                radial-gradient(circle at 50% 100%, rgba(70, 85, 110, 0.5) 0%, transparent 60%),
                                radial-gradient(circle at 50% 100%, rgba(99, 102, 241, 0.4) 0%, transparent 70%),
                                radial-gradient(circle at 50% 100%, rgba(181, 184, 208, 0.3) 0%, transparent 80%)
                            `,
                        }}
                    />
                    <div className={styles.lobbyCard}>
                        <h2>Welcome to Lumina</h2>
                        <p className={styles.lobbySubtitle}>
                            Check your camera, pick a name, and connect instantly.
                        </p>
                        <div className={styles.lobbyMeta}>
                            <span>Room <code>{meetingCode || '—'}</code></span>
                            <button type="button" onClick={copyInvite}>Copy invite</button>
                        </div>

                        <div className={styles.lobbyVideoWrap}>
                            <video className={styles.lobbyVideo} ref={localVideoRef} autoPlay muted playsInline />
                            {!lobbyCamOn && (
                                <div className={styles.lobbyCamOff}>
                                    <span>{(username || 'You').slice(0, 1).toUpperCase()}</span>
                                    Camera off
                                </div>
                            )}
                            <div className={styles.lobbyControls}>
                                <button
                                    type="button"
                                    className={!lobbyMicOn ? styles.lobbyCtrlOff : ''}
                                    onClick={toggleLobbyMic}
                                    aria-label="Toggle microphone"
                                >
                                    {lobbyMicOn ? <MicIcon fontSize="small" /> : <MicOffIcon fontSize="small" />}
                                </button>
                                <button
                                    type="button"
                                    className={!lobbyCamOn ? styles.lobbyCtrlOff : ''}
                                    onClick={toggleLobbyCam}
                                    aria-label="Toggle camera"
                                >
                                    {lobbyCamOn ? <VideocamIcon fontSize="small" /> : <VideocamOffIcon fontSize="small" />}
                                </button>
                            </div>
                        </div>

                        <TextField
                            className={styles.lobbyInput}
                            label="Your name"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && connect()}
                            variant="outlined"
                        />
                        <Button className={styles.lobbyButton} variant="contained" onClick={connect}>
                            Join Meeting
                        </Button>
                    </div>
                </div>
            ) : (
                <div className={styles.meetVideoContainer}>
                    <div className={styles.meetTopBar}>
                        <strong>Lumina</strong>
                        <span>{formatDuration(callSeconds)}</span>
                        <span>{totalParticipants} in call</span>
                        {(screen || isShareActive) && <span className={styles.sharingBadge}>Sharing screen</span>}
                        {isShareActive && (
                            <button
                                type="button"
                                onClick={() => setShareViewMode((m) => (m === 'full' ? 'grid' : 'full'))}
                            >
                                {shareViewMode === 'full' ? 'Normal view' : 'Full share'}
                            </button>
                        )}
                        <button type="button" onClick={copyInvite}>Copy invite</button>
                        <button type="button" onClick={() => setShowShortcuts((s) => !s)} title="Shortcuts">
                            ?
                        </button>
                    </div>

                    {showShortcuts && (
                        <div className={styles.shortcutsPanel}>
                            <h4>Shortcuts</h4>
                            <p><kbd>M</kbd> Mute / unmute</p>
                            <p><kbd>V</kbd> Camera on / off</p>
                            <p><kbd>C</kbd> Toggle chat</p>
                            <p><kbd>?</kbd> Show shortcuts</p>
                            <p><kbd>Esc</kbd> Close panels</p>
                        </div>
                    )}

                    <div className={styles.reactionLayer} aria-hidden>
                        {floatingReactions.map((r) => (
                            <div
                                key={r.id}
                                className={styles.floatingReaction}
                                style={{ left: `${r.left}%` }}
                            >
                                <span>{r.emoji}</span>
                                <small>{r.sender}</small>
                            </div>
                        ))}
                    </div>

                    {showModal && (
                        <div className={styles.chatRoom}>
                            <div className={styles.chatContainer}>
                                <h1>Chat</h1>
                                <div className={styles.chattingDisplay}>
                                    {messages.length !== 0 ? messages.map((item, index) => (
                                        <div className={styles.chatBubble} key={index}>
                                            <strong>{item.sender}</strong>
                                            <p style={{ margin: 0 }}>{item.data}</p>
                                        </div>
                                    )) : <p>No messages yet — say hello.</p>}
                                </div>
                                <div className={styles.chattingArea}>
                                    <TextField
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                        label="Message"
                                        variant="outlined"
                                        fullWidth
                                    />
                                    <Button
                                        variant="contained"
                                        onClick={sendMessage}
                                        style={{ backgroundColor: "#6366f1", textTransform: 'none', fontWeight: 600 }}
                                    >
                                        Send
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className={styles.reactionBar}>
                        {REACTIONS.map((emoji) => (
                            <button key={emoji} type="button" onClick={() => sendReaction(emoji)}>
                                {emoji}
                            </button>
                        ))}
                    </div>

                    <div className={styles.buttonContainers}>
                        <IconButton onClick={handleVideo} style={{ color: "white" }}>
                            {video === true ? <VideocamIcon /> : <VideocamOffIcon />}
                        </IconButton>
                        <IconButton onClick={handleEndCall} style={{ color: "white" }}>
                            <CallEndIcon />
                        </IconButton>
                        <IconButton onClick={handleAudio} style={{ color: "white" }}>
                            {audio === true ? <MicIcon /> : <MicOffIcon />}
                        </IconButton>
                        {screenAvailable && (
                            <IconButton onClick={handleScreen} style={{ color: screen ? "#a5b4fc" : "white" }}>
                                {screen ? <StopScreenShareIcon /> : <ScreenShareIcon />}
                            </IconButton>
                        )}
                        <Badge badgeContent={newMessages} max={999} color="error">
                            <IconButton
                                onClick={() => {
                                    setModal((m) => !m);
                                    setNewMessages(0);
                                }}
                                style={{ color: "white" }}
                            >
                                <ChatIcon />
                            </IconButton>
                        </Badge>
                    </div>

                    {showRemoteSpotlight ? (
                        <div className={styles.spotlightLayout}>
                            <div className={`${styles.videoTile} ${styles.spotlightMain} ${styles.screenTile}`}>
                                <video
                                    key={`spot-${spotlightRemote.socketId}`}
                                    data-socket={spotlightRemote.socketId}
                                    ref={bindRemoteVideo(spotlightRemote)}
                                    autoPlay
                                    playsInline
                                    className={`${styles.videoElement} ${styles.screenFit}`}
                                />
                                <span className={styles.tileLabel}>
                                    {peerNames[spotlightRemote.socketId] || 'Participant'} · Screen
                                </span>
                            </div>
                            <div className={styles.spotlightStrip}>
                                <div className={`${styles.videoTile} ${styles.localTile} ${styles.stripTile}`}>
                                    <video
                                        ref={localVideoRef}
                                        autoPlay
                                        muted
                                        playsInline
                                        className={`${styles.videoElement} ${styles.mirror}`}
                                    />
                                    <span className={styles.tileLabel}>
                                        {username || 'You'} (You){screen ? ' · Sharing' : ''}
                                    </span>
                                </div>
                                {stripRemotes.map((remote) => renderRemoteTile(remote, styles.stripTile))}
                            </div>
                        </div>
                    ) : (
                        <div className={`${styles.conferenceView} ${layoutClass}`}>
                            <div className={`${styles.videoTile} ${styles.localTile}`}>
                                <video
                                    ref={localVideoRef}
                                    autoPlay
                                    muted
                                    playsInline
                                    className={`${styles.videoElement} ${styles.mirror}`}
                                />
                                <span className={styles.tileLabel}>
                                    {username || 'You'} (You){screen ? ' · Sharing' : ''}
                                </span>
                            </div>
                            {remoteVideos.map((remote) => renderRemoteTile(remote))}
                        </div>
                    )}
                </div>
            )}

            <Snackbar
                open={Boolean(toast)}
                autoHideDuration={3500}
                onClose={() => setToast("")}
                message={toast}
            />
        </div>
    );
}
