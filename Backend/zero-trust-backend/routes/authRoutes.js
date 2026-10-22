const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const User = require('../models/User');
const { evaluateKeystrokes } = require('../services/keystrokeEngine');
const { evaluateGestures } = require('../services/gestureEngine');
const { BiometricBaseline } = require('../models/BiometricBaseline')


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

// POST /api/auth/enroll
// POST /enroll
router.post('/enroll', async (req, res) => {
  try {
    const { userId, keystrokeBaseline, gestureBaseline, imuBaseline } = req.body;

    // --- PIPELINE VERIFICATION LOGS ---
    console.log("\n========== INCOMING BIOMETRIC PAYLOAD ==========");
    console.log("User ID:", userId);
    console.log("Keystroke Baseline Engine Data:");
    // JSON.stringify formats the arrays nicely so they don't print as [Object]
    console.log(JSON.stringify(keystrokeBaseline, null, 2));
    console.log("Gesture Baseline Engine Data (Swipes & Taps):"); // ADD THIS
    console.log(JSON.stringify(gestureBaseline, null, 2));
    console.log("================================================\n");

    // THE LAZY-LOAD FIX: Require the model exactly when the route is triggered!
    const BiometricBaseline = require('../models/BiometricBaseline');

    // 1. Validation
    if (!userId || !keystrokeBaseline || !gestureBaseline || !imuBaseline) {
      return res.status(400).json({
        error: 'userId, keystrokeBaseline, gestureBaseline, and imuBaseline are all required.'
      });
    }

    // 2. Ensure User Exists
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 3. Upsert Baseline (Create or Update if re-training)
    const [baselineRecord, created] = await BiometricBaseline.findOrCreate({
      where: { userId },
      defaults: {
        userId,
        keystrokeBaseline,
        gestureBaseline,
        imuBaseline,
        isEnrolled: true
      }
    });

    if (!created) {
      // If profile already existed, update the vectors
      await baselineRecord.update({
        keystrokeBaseline,
        gestureBaseline,
        imuBaseline,
        isEnrolled: true
      });
    }

    res.status(201).json({
      message: 'Biometric enrollment baseline successfully saved to Neon DB',
      enrolled: true,
      userId: user.id
    });

  } catch (error) {
    console.error('Enrollment Error:', error);
    res.status(500).json({ error: 'Failed to record biometric baseline' });
  }
});

// POST /api/auth/verify-keystroke
router.post('/verify-keystroke', async (req, res) => {
  try {
    const { userId, batchData } = req.body;

    if (!userId || !batchData) {
      return res.status(400).json({ error: 'userId and batchData are required' });
    }

    const BiometricBaseline = require('../models/BiometricBaseline');

    // 1. Fetch the user's static baseline from Neon DB
    const userBaseline = await BiometricBaseline.findOne({ where: { userId } });

    if (!userBaseline || !userBaseline.keystrokeBaseline) {
      return res.status(404).json({ error: 'No biometric baseline found for this user' });
    }

    // 2. Run the continuous evaluation engine
    const trustScore = evaluateKeystrokes(userBaseline.keystrokeBaseline, batchData);

    console.log(`[ZK Fusion] User ${userId} | Live Keystroke Score: ${trustScore}%`);

    // 3. Return the dynamic score back to the Android ZK Engine
    res.status(200).json({
      verified: true,
      score: trustScore,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Verification Error:', error);
    res.status(500).json({ error: 'Failed to verify keystroke batch' });
  }
});

router.post('/verify-gesture', async (req, res) => {
  try {
    const { userId, gestureBatch } = req.body;

    if (!userId || !gestureBatch) {
      return res.status(400).json({ error: "Missing required gesture payload." });
    }

    // 1. Fetch user's baseline from Neon PostgreSQL
    const userBaseline = await BiometricBaseline.findOne({ where: { userId } });
    if (!userBaseline || !userBaseline.gestureBaseline) {
      return res.status(404).json({ error: "Gesture baseline not found." });
    }

    // 2. Run the statistical evaluation engine
    const evaluation = evaluateGestures(userBaseline.gestureBaseline, gestureBatch);

    // 3. Persist adaptive learning if the user is in the 75-79% zone
    if (evaluation.action === "ADAPT" && evaluation.updatedBaseline) {
      await BiometricBaseline.update(
        { gestureBaseline: evaluation.updatedBaseline },
        { where: { userId } }
      );
      console.log(`[ZeroTrust] User ${userId} gesture baseline adapted.`);
    }

    // 4. Return the trust score and action to the ZK Fusion Engine
    res.status(200).json({
      score: evaluation.score,
      action: evaluation.action,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error("Gesture Verification API Error:", error);
    res.status(500).json({ error: "Internal server error during gesture verification." });
  }
});

module.exports = router;

