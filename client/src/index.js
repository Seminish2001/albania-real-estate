const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const propertyRoutes = require('./routes/properties');
const userRoutes = require('./routes/users');
const newsletterRoutes = require('./routes/newsletter');

dotenv.config();
const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

app.use('/api/properties', propertyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/newsletter', newsletterRoutes);

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});