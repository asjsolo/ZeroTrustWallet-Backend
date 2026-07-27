const verifyBiometricTrust = (keystrokeScore, gestureScore, imuScore) => {
  const average = (keystrokeScore + gestureScore + imuScore) / 3;

  if (average >= 80) {
    return { isTrusted: true, score: average };
  } else {
    return { isTrusted: false, score: average, reason: "Multi-modal anomaly detected" };
  }
};

module.exports = { verifyBiometricTrust };
