import React, { useContext, useState } from 'react'
import withAuth from '../utils/withAuth';
import { useNavigate } from 'react-router-dom';
import "../App.css"
import { IconButton, TextField, Button, Snackbar } from '@mui/material';
import { AuthContext } from '../contexts/AuthContext';
import RestoreIcon from '@mui/icons-material/Restore';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AddIcon from '@mui/icons-material/Add';
import LinkIcon from '@mui/icons-material/Link';

function generateMeetingCode() {
    const adjectives = ['swift', 'bright', 'calm', 'nova', 'clear', 'amber', 'coral', 'mint'];
    const nouns = ['room', 'hub', 'space', 'circle', 'studio', 'hall', 'nest', 'orbit'];
    const a = adjectives[Math.floor(Math.random() * adjectives.length)];
    const n = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(1000 + Math.random() * 9000);
    return `${a}-${n}-${num}`;
}

function HomeComponent() {
    const navigate = useNavigate();
    const [meetingCode, setMeetingCode] = useState("");
    const [toast, setToast] = useState("");
    const { addToUserHistory } = useContext(AuthContext);

    const handleJoinVideoCall = async () => {
        const code = meetingCode.trim();
        if (!code) {
            setToast("Enter a meeting code first");
            return;
        }
        await addToUserHistory(code);
        navigate(`/${code}`);
    };

    const handleNewMeeting = async () => {
        const code = generateMeetingCode();
        setMeetingCode(code);
        await addToUserHistory(code);
        navigate(`/${code}`);
    };

    const handleCopyLink = async () => {
        const code = meetingCode.trim();
        if (!code) {
            setToast("Enter or create a meeting code first");
            return;
        }
        const link = `${window.location.origin}/${code}`;
        try {
            await navigator.clipboard.writeText(link);
            setToast("Invite link copied");
        } catch {
            setToast(link);
        }
    };

    return (
        <div className="homePage">
            <div
                className="midnightMist"
                aria-hidden
                style={{
                    backgroundImage: `
                        radial-gradient(circle at 50% 100%, rgba(70, 85, 110, 0.5) 0%, transparent 60%),
                        radial-gradient(circle at 50% 100%, rgba(99, 102, 241, 0.4) 0%, transparent 70%),
                        radial-gradient(circle at 50% 100%, rgba(181, 184, 208, 0.3) 0%, transparent 80%)
                    `,
                }}
            />
            <nav className="navBar">
                <h2 className="logoTitle">
                    <span className="logoMark">L</span>
                    Lumina
                </h2>
                <div className="navActions">
                    <IconButton onClick={() => navigate("/history")} aria-label="Meeting history">
                        <RestoreIcon />
                    </IconButton>
                    <Button
                        onClick={() => {
                            localStorage.removeItem("token");
                            navigate("/auth");
                        }}
                    >
                        Logout
                    </Button>
                </div>
            </nav>

            <div className="heroSection">
                <div className="heroLeft">
                    <p className="brandHero" style={{ fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', marginBottom: '0.5rem' }}>
                        Lumina<span>.</span>
                    </p>
                    <h1>Your next conversation, one code away.</h1>
                    <p>
                        Start a room instantly, share the link, and jump into HD video
                        with chat and screen share built in.
                    </p>

                    <div className="meetingActions">
                        <div className="joinBox">
                            <TextField
                                label="Meeting Code"
                                variant="outlined"
                                fullWidth
                                value={meetingCode}
                                onChange={(e) => setMeetingCode(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleJoinVideoCall()}
                            />
                            <Button variant="contained" onClick={handleJoinVideoCall}>
                                Join
                            </Button>
                        </div>

                        <div className="actionRow">
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={handleNewMeeting}
                                sx={{ flex: 1, minWidth: 160 }}
                            >
                                New Meeting
                            </Button>
                            <Button
                                variant="outlined"
                                startIcon={<LinkIcon />}
                                onClick={handleCopyLink}
                                sx={{ flex: 1, minWidth: 160 }}
                            >
                                Copy Invite
                            </Button>
                            <Button
                                variant="outlined"
                                startIcon={<ContentCopyIcon />}
                                onClick={async () => {
                                    if (!meetingCode.trim()) {
                                        setToast("Nothing to copy yet");
                                        return;
                                    }
                                    try {
                                        await navigator.clipboard.writeText(meetingCode.trim());
                                        setToast("Meeting code copied");
                                    } catch {
                                        setToast(meetingCode.trim());
                                    }
                                }}
                            >
                                Copy Code
                            </Button>
                        </div>
                        <p className="copyToast">{toast && !toast.includes('/') ? toast : ''}</p>
                    </div>
                </div>

                <div className="heroRight">
                    <div className="heroRightPanel">
                        <h3>Ready when you are</h3>
                        <p>Everything you need for a clear, focused call — without the clutter.</p>
                        <ul className="featureList">
                            <li><span className="featureDot" /> Instant rooms with memorable codes</li>
                            <li><span className="featureDot" /> One-click invite links</li>
                            <li><span className="featureDot" /> Live chat & screen share</li>
                            <li><span className="featureDot" /> Meeting history at a glance</li>
                        </ul>
                    </div>
                </div>
            </div>

            <Snackbar
                open={Boolean(toast)}
                autoHideDuration={2500}
                onClose={() => setToast("")}
                message={toast}
            />
        </div>
    )
}

export default withAuth(HomeComponent);
