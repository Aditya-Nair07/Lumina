import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import HomeIcon from '@mui/icons-material/Home';
import { IconButton, Snackbar } from '@mui/material';
import '../styles/history.css'; 

export default function History() {
    const { getHistoryOfUser } = useContext(AuthContext);
    const [meetings, setMeetings] = useState([]);
    const [toast, setToast] = useState('');
    const routeTo = useNavigate();

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const history = await getHistoryOfUser();
                setMeetings(history);
            } catch (err) {
                console.log(err);
            }
        };
        fetchHistory();
    }, []);

    let formatDate = (dateString) => {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const copyCode = async (code) => {
        try {
            await navigator.clipboard.writeText(code);
            setToast('Meeting code copied');
        } catch {
            setToast(code);
        }
    };

    return (
        <div className="history-container">
            <div className="history-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <IconButton 
                        className="home-btn" 
                        onClick={() => routeTo("/home")}
                        aria-label="Back home"
                    >
                        <HomeIcon />
                    </IconButton>
                    <h1>Meeting history</h1>
                </div>
            </div>

            {meetings.length !== 0 ? (
                <div className="meetings-grid">
                    {meetings.map((e, i) => (
                        <Card
                            key={i}
                            className="meeting-card"
                            variant="outlined"
                            onClick={() => routeTo(`/${e.meetingCode}`)}
                        >
                            <CardContent>
                                <Typography className="card-code" sx={{ fontSize: 14 }} gutterBottom>
                                    Code: <span>{e.meetingCode}</span>
                                </Typography>

                                <Typography className="card-date" sx={{ fontSize: 13 }}>
                                    Date: {formatDate(e.date)}
                                </Typography>

                                <div className="card-actions" onClick={(ev) => ev.stopPropagation()}>
                                    <Button
                                        size="small"
                                        variant="contained"
                                        onClick={() => routeTo(`/${e.meetingCode}`)}
                                        sx={{
                                            textTransform: 'none',
                                            background: '#e85d4c',
                                            boxShadow: 'none',
                                            '&:hover': { background: '#c94a3b', boxShadow: 'none' }
                                        }}
                                    >
                                        Rejoin
                                    </Button>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={() => copyCode(e.meetingCode)}
                                        sx={{
                                            textTransform: 'none',
                                            borderColor: '#0f766e',
                                            color: '#0f766e'
                                        }}
                                    >
                                        Copy
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="no-meetings">
                    <p>No meeting history yet. Start a call from Home.</p>
                </div>
            )}

            <Snackbar
                open={Boolean(toast)}
                autoHideDuration={2000}
                onClose={() => setToast('')}
                message={toast}
            />
        </div>
    );
}
