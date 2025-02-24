import React from 'react';
import { Typography, Container, Button } from '@mui/material';
import { Link } from 'react-router-dom';
import NewsletterForm from '../components/NewsletterForm';

function Home() {
  return (
    <Container>
      <Typography variant="h2" gutterBottom>Welcome to Albania Real Estate</Typography>
      <Typography variant="h5">Find your dream property today!</Typography>
      <Button variant="contained" color="primary" component={Link} to="/listings" style={{ marginTop: 20 }}>
        Browse Listings
      </Button>
      <NewsletterForm />
    </Container>
  );
}

export default Home;