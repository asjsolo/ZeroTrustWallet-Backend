// services/imuEngine.js

function calculateMagnitude(vectorArray) {
  if (!vectorArray || vectorArray.length === 0) return 0;
  // M = sqrt(x^2 + y^2 + z^2)
  const magnitudes = vectorArray.map(v => Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]));
  const sum = magnitudes.reduce((a, b) => a + b, 0);
  return sum / magnitudes.length;
}

function calculateVariance(vectorArray, mean) {
  if (!vectorArray || vectorArray.length === 0) return 0;
  const magnitudes = vectorArray.map(v => Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]));
  const varianceSum = magnitudes.reduce((a, b) => a + Math.pow(b - mean, 2), 0);
  return varianceSum / magnitudes.length;
}

function verifyMotion(baseline, liveBatch) {
  try {
    const baseAccelMean = calculateMagnitude(baseline.accelerometerVectors);
    const liveAccelMean = calculateMagnitude(liveBatch.accelerometerVectors);

    const baseGyroVar = calculateVariance(baseline.gyroscopeVectors, calculateMagnitude(baseline.gyroscopeVectors));
    const liveGyroVar = calculateVariance(liveBatch.gyroscopeVectors, calculateMagnitude(liveBatch.gyroscopeVectors));

    // Calculate absolute deviation percentage (Tremor Shift)
    const accelDeviation = Math.abs(baseAccelMean - liveAccelMean) / (baseAccelMean || 1);
    const gyroDeviation = Math.abs(baseGyroVar - liveGyroVar) / (baseGyroVar || 1);

    let score = 100;

    // Deduct points for posture shift (Accelerometer)
    if (accelDeviation > 0.15) score -= 15;
    if (accelDeviation > 0.30) score -= 25;

    // Deduct points for abnormal tremors (Gyroscope)
    if (gyroDeviation > 0.40) score -= 20;
    if (gyroDeviation > 0.80) score -= 30;

    // Determine Tri-State Action
    let action = "ALLOW";
    if (score < 75) action = "REVOKE";
    else if (score >= 75 && score <= 85) action = "ADAPT";

    return { score: Math.max(0, score), action };

  } catch (error) {
    console.error("IMU Engine Error:", error);
    return { score: 0, action: "REVOKE" };
  }
}

module.exports = { verifyMotion };