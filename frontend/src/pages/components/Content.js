import * as React from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import VideoCamRoundedIcon from '@mui/icons-material/VideocamRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import './SignInStyle.css';

const items = [
  {
    icon: <VideoCamRoundedIcon className="content-icon" />,
    title: 'Crystal-clear video',
    description:
      'Join Lumina rooms with sharp HD video and smooth audio that feel close to in-person.',
  },
  {
    icon: <SecurityRoundedIcon className="content-icon" />,
    title: 'Private by design',
    description:
      'Your meetings stay on secure room codes — share only with the people you invite.',
  },
  {
    icon: <GroupsRoundedIcon className="content-icon" />,
    title: 'Built for collaboration',
    description:
      'Screen share and live chat keep everyone aligned without leaving the call.',
  },
  {
    icon: <LinkRoundedIcon className="content-icon" />,
    title: 'Instant invite links',
    description:
      'Create a room, copy the link, and get everyone in with a single click.',
  },
];

export default function Content() {
  return (
    <Stack
      className="content-stack"
      sx={{ flexDirection: 'column', alignSelf: 'center', gap: 3, maxWidth: 450 }}
    >
      <Box sx={{ mb: 1 }}>
        <Typography
          sx={{
            fontFamily: '"Syne", sans-serif',
            fontWeight: 800,
            fontSize: '2rem',
            letterSpacing: '-0.04em',
            color: '#f4f6fb',
          }}
        >
          Lumina<span style={{ color: '#a5b4fc' }}>.</span>
        </Typography>
        <Typography sx={{ color: 'rgba(181, 184, 208, 0.85)', mt: 0.5 }}>
          Sign in to host and join brighter meetings.
        </Typography>
      </Box>
      {items.map((item, index) => (
        <Stack key={index} direction="row" className="content-item-row" sx={{ gap: 2 }}>
          {item.icon}
          <div>
            <Typography variant="body1" className="content-title">
              {item.title}
            </Typography>
            <Typography variant="body2" className="content-description">
              {item.description}
            </Typography>
          </div>
        </Stack>
      ))}
    </Stack>
  );
}
