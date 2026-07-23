import CssBaseline from '@mui/material/CssBaseline';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import SignInCard from './components/SignInCard';
import Content from './components/Content';
import React from 'react';
import '../App.css';

const midnightMistStyle = {
  backgroundImage: `
    radial-gradient(circle at 50% 100%, rgba(70, 85, 110, 0.5) 0%, transparent 60%),
    radial-gradient(circle at 50% 100%, rgba(99, 102, 241, 0.4) 0%, transparent 70%),
    radial-gradient(circle at 50% 100%, rgba(181, 184, 208, 0.3) 0%, transparent 80%)
  `,
};

export default function Authentication(props) {
  return (
    <>
      <CssBaseline enableColorScheme />
      
      <Stack
        direction="column"
        component="main"
        sx={{
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          width: '100vw',
          backgroundColor: '#000',
          position: 'relative',
          overflowX: 'hidden',
          fontFamily: '"DM Sans", sans-serif',
        }}
      >
        <Box className="midnightMist" aria-hidden sx={midnightMistStyle} />
        <Stack
          direction={{ xs: 'column-reverse', md: 'row' }}
          sx={{
            justifyContent: 'center',
            alignItems: 'center',
            gap: { xs: 4, sm: 8, md: 10 },
            p: { xs: 2, sm: 4 },
            m: 'auto',
            maxWidth: '1100px',
            width: '100%',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <Content />
          <SignInCard />
        </Stack>
      </Stack>
    </>
  );
}
