import React, { useState } from 'react';
import { TextField, Button, Box } from '@mui/material';
import axios from 'axios';

function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [preferences, setPreferences] = useState({ price: '', location: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await axios.post('http://localhost:5000/api/newsletter', { email, preferences });
    alert('Subscribed successfully!');
    setEmail('');
    setPreferences({ price: '', location: '' });
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 4 }}>
      <Typography variant="h6">Subscribe to Property Updates</Typography>
      <TextField
        label="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Max Price (ALL)"
        value={preferences.price}
        onChange={(e) => setPreferences({ ...preferences, price: e.target.value })}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Preferred Location"
        value={preferences.location}
        onChange={(e) => setPreferences({ ...preferences, location: e.target.value })}
        fullWidth
        margin="normal"
      />
      <Button type="submit" variant="contained" color="primary">Subscribe</Button>
    </Box>
  );
}

export default NewsletterForm;