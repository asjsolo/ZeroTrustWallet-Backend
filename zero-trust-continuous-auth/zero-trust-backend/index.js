require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const sequelize = require('./config/database');
require('./models/BiometricBaseline');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet()); // Secure HTTP headers
app.use(cors()); // Enable CORS
app.use(express.json({ limit: '50mb' })); // Increased limit for biometric arrays
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Basic Route
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Zero-Trust P2P Digital Wallet API is running',
    status: 'success'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);

// Database Connection & Sync
sequelize.authenticate()
  .then(() => {
    console.log('✅ PostgreSQL Connected successfully via Sequelize');
    // Sync models to the database (creates tables if they don't exist)
    return sequelize.sync({ alter: true });
  })
  .then(() => {
    console.log('✅ Database models synchronized');
    // Start the server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server is running on port ${PORT} (Open to Network)`);
    });
  })
  .catch((err) => {
    console.error('❌ Database Connection Error:', err);
  });

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Internal Server Error'
  });
});
