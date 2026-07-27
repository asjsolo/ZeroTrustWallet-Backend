const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const User = require('../models/User');

// POST /register
router.post('/register', async (req, res) => {
  try {
    const { username, email, pin, zk_public_key } = req.body;

    // Basic validation
    if (!username || !email || !pin || !zk_public_key) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      where: {
        [Op.or]: [
          { email: email.toLowerCase() },
          { username: username }
        ]
      }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'User with this email or username already exists' });
    }

    // Create new user
    const newUser = await User.create({
      username,
      email: email.toLowerCase(),
      pin, // Note: In a production app, always hash passwords/pins!
      zk_public_key
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        zk_public_key: newUser.zk_public_key,
        accountBalance: newUser.accountBalance
      }
    });

  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /login
router.post('/login', async (req, res) => {
  try {
    const { email, pin } = req.body;

    if (!email || !pin) {
      return res.status(400).json({ error: 'Email and pin are required' });
    }

    // Find user
    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or pin' });
    }

    // Verify pin
    if (user.pin !== pin) {
      return res.status(401).json({ error: 'Invalid email or pin' });
    }

    // Return user details
    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        zk_public_key: user.zk_public_key,
        accountBalance: user.accountBalance
      }
    });

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
