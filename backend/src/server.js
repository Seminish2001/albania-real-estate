import express from 'express';

const app = express();

app.get('/', (req, res) => {
  res.json({ status: 'Immo Albania backend running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
