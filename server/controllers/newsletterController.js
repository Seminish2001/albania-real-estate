const pool = require('../config/db');

const subscribe = async (req, res) => {
  const { email, preferences } = req.body;
  try {
    await pool.query(
      'INSERT INTO newsletter (email, preferences) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET preferences = $2',
      [email, preferences]
    );
    res.status(201).json({ message: 'Subscribed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { subscribe };