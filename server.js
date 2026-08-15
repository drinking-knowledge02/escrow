require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Import routes
const escrowRoutes = require('./routes/escrow');
const contractRoutes = require('./routes/contract');

// Use routes
app.use('/api/escrow', escrowRoutes);
app.use('/api/contract', contractRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Escrow API server running on port ${PORT}`);
});