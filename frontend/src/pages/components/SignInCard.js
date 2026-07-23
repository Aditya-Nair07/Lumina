import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MuiCard from '@mui/material/Card';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import FormLabel from '@mui/material/FormLabel';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';
import { SitemarkIcon } from './CustomIcons';
import { AuthContext } from '../../contexts/AuthContext';
import { Snackbar } from '@mui/material';
import './SignInStyle.css'; // Importing your custom dark & purple styling

const Card = styled(MuiCard)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignSelf: 'center',
  width: '100%',
  padding: theme.spacing(4),
  gap: theme.spacing(2),
  [theme.breakpoints.up('sm')]: {
    width: '450px',
  },
}));

export default function SignInCard() {
  const [usernameError, setusernameError] = React.useState(false);
  const [usernameErrorMessage, setusernameErrorMessage] = React.useState('');
  const [passwordError, setPasswordError] = React.useState(false);
  const [passwordErrorMessage, setPasswordErrorMessage] = React.useState('');

  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');

  const [error, setError] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [formState, setFormState] = React.useState(0);
  const [open2, setOpen2] = React.useState(false);

  const { handleRegister, handleLogin } = React.useContext(AuthContext);

  let handleAuth = async () => {
    try {
      if (formState === 0) {
        await handleLogin(username, password);
      }
      if (formState === 1) {
        let result = await handleRegister(name, username, password);
        setMessage(result);
        setOpen2(true);
        setError('');
        setFormState(0);
        setPassword('');
      }
    } catch (error) {
      let message = error.response?.data?.message || 'Something went wrong';
      setError(message);
    }
  };

  const handlebutton = async (event) => {
    event.preventDefault();
    if (!validateInputs()) return;
    await handleAuth();
  };

  const validateInputs = () => {
    let isValid = true;

    if (!username) {
      setusernameError(true);
      setusernameErrorMessage('Please enter a valid username address.');
      isValid = false;
    } else {
      setusernameError(false);
      setusernameErrorMessage('');
    }

    if (!password) {
      setPasswordError(true);
      setPasswordErrorMessage('Password must be at least 3 characters long.');
      isValid = false;
    } else {
      setPasswordError(false);
      setPasswordErrorMessage('');
    }

    return isValid;
  };

  return (
    <Card variant="outlined" className="auth-card">
      <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
        <SitemarkIcon />
      </Box>
      <Typography
        component="h1"
        variant="h4"
        sx={{ width: '100%', fontSize: 'clamp(2rem, 10vw, 2.15rem)', fontWeight: 600 }}
      >
        {formState === 0 ? 'Sign In' : 'Sign Up'}
      </Typography>

      <div className="toggle-btn-container">
        <Button 
          variant="text" 
          sx={{ color: formState === 0 ? '#6366f1' : '#8aa0ab', fontWeight: 600 }} 
          onClick={() => setFormState(0)}
        >
          Sign In
        </Button>
        <Button 
          variant="text" 
          sx={{ color: formState === 1 ? '#6366f1' : '#8aa0ab', fontWeight: 600 }} 
          onClick={() => setFormState(1)}
        >
          Sign Up
        </Button>
      </div>

      <Box
        component="form"
        onSubmit={handlebutton}
        noValidate
        sx={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 2 }}
      >
        {formState === 1 && (
          <FormControl>
            <FormLabel htmlFor="name">Name</FormLabel>
            <TextField
              id="name"
              type="text"
              name="name"
              value={name}
              placeholder="Your full name"
              required
              fullWidth
              variant="outlined"
              onChange={(e) => setName(e.target.value)}
            />
          </FormControl>
        )}

        <FormControl>
          <FormLabel htmlFor="username">Username</FormLabel>
          <TextField
            error={usernameError}
            helperText={usernameErrorMessage}
            id="username"
            type="text"
            name="username"
            value={username}
            placeholder="username"
            required
            fullWidth
            variant="outlined"
            onChange={(e) => setUsername(e.target.value)}
          />
        </FormControl>

        <FormControl>
          <FormLabel htmlFor="password">Password</FormLabel>
          <TextField
            error={passwordError}
            helperText={passwordErrorMessage}
            name="password"
            value={password}
            placeholder="••••••"
            type="password"
            id="password"
            required
            fullWidth
            variant="outlined"
            onChange={(e) => setPassword(e.target.value)}
          />
        </FormControl>

        <FormControlLabel
          control={<Checkbox value="remember" />}
          label="Remember me"
        />

        {error && <p className="form-error-text">{error}</p>}

        <Button
          type="submit"
          fullWidth
          variant="contained"
          className="auth-action-btn"
          sx={{ mt: 2, mb: 1 }}
        >
          {formState === 0 ? 'Sign In' : 'Sign Up'}
        </Button>
      </Box>
      <Snackbar open={open2} autoHideDuration={4000} message={message} onClose={() => setOpen2(false)} />
    </Card>
  );
}