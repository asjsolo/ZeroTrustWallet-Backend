const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const sequelize = require('../config/database');
const { evaluateKeystrokes } = require('../services/keystrokeEngine');
const { evaluateGestures } = require('../services/gestureEngine');
const { evaluateIMU } = require('../services/imuEngine');
const { verifyBiometricTrust } = require('../services/zkFusionEngine');

// POST /transfer
router.post('/transfer', async (req, res) => {
  const transactionObj = await sequelize.transaction();

  try {
    const { senderId, receiverId, amount, transferNote } = req.body;

    // Basic validation
    if (!senderId || !receiverId || amount === undefined) {
      await transactionObj.rollback();
      return res.status(400).json({ error: 'senderId, receiverId, and amount are required' });
    }

    if (amount <= 0) {
      await transactionObj.rollback();
      return res.status(400).json({ error: 'Amount must be greater than zero' });
    }

    if (senderId === receiverId) {
      await transactionObj.rollback();
      return res.status(400).json({ error: 'Cannot transfer to yourself' });
    }

    // Find users
    const sender = await User.findByPk(senderId, { transaction: transactionObj });
    const receiver = await User.findByPk(receiverId, { transaction: transactionObj });

    if (!sender) {
      await transactionObj.rollback();
      return res.status(404).json({ error: 'Sender not found' });
    }
    
    if (!receiver) {
      await transactionObj.rollback();
      return res.status(404).json({ error: 'Receiver not found' });
    }

    // Check if the sender has enough accountBalance
    if (sender.accountBalance < amount) {
      await transactionObj.rollback();
      return res.status(400).json({ error: 'Insufficient account balance' });
    }

    // Biometric Verification (Component 4)
    const biometrics = req.body.biometrics || {};
    const { typingData, touchData, sensorData } = biometrics;

    const keystrokeScore = evaluateKeystrokes(typingData);
    const gestureScore = evaluateGestures(touchData);
    const imuScore = evaluateIMU(sensorData);

    const trustResult = verifyBiometricTrust(keystrokeScore, gestureScore, imuScore);

    if (!trustResult.isTrusted) {
      await transactionObj.rollback();
      return res.status(403).json({
        error: "Zero-Trust Lockdown Initiated! Anomaly Detected.",
        score: trustResult.score,
        reason: trustResult.reason
      });
    }

    // Deduct from sender, add to receiver
    sender.accountBalance -= amount;
    receiver.accountBalance += amount;

    // Save updated balances within transaction
    await sender.save({ transaction: transactionObj });
    await receiver.save({ transaction: transactionObj });

    // Create and save new Transaction document
    const newTransaction = await Transaction.create({
      senderId,
      receiverId,
      amount,
      transferNote
    }, { transaction: transactionObj });

    await transactionObj.commit();

    res.status(200).json({
      message: 'Transfer successful',
      transaction: newTransaction
    });

  } catch (error) {
    if (!transactionObj.finished) {
      await transactionObj.rollback();
    }
    console.error('Transfer Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /history/:userId
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Fetch all transactions where userId is either sender or receiver, sorted by newest first
    const transactions = await Transaction.findAll({
      where: {
        [Op.or]: [
          { senderId: userId },
          { receiverId: userId }
        ]
      },
      order: [['timestamp', 'DESC']],
      include: [
        { model: User, as: 'sender', attributes: ['id', 'username'] },
        { model: User, as: 'receiver', attributes: ['id', 'username'] }
      ]
    });

    res.status(200).json({
      message: 'Transaction history fetched successfully',
      transactions
    });
    
  } catch (error) {
    console.error('History Fetch Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
