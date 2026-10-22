/**
 * Spatial Gesture Statistical Engine (Component 2 - Kalani)
 * Compares live swipe velocity and trajectory against the stored Neon DB baseline.
 * Uses variance thresholds to penalize abnormal scrolling patterns.
 */
const evaluateGestures = (baseline, liveBatch) => {
  try {
    // If baseline doesn't exist or is empty, fail securely.
    if (!baseline || !baseline.velocities || baseline.velocities.length === 0) {
      return 50;
    }

    const baselineVels = baseline.velocities;
    const liveVels = liveBatch.velocities;

    if (!liveVels || liveVels.length === 0) return 50;

    // 1. Calculate Average Velocity of Baseline
    const baselineAvgVel = baselineVels.reduce((a, b) => a + b, 0) / baselineVels.length;

    // 2. Calculate Average Velocity of Live Batch
    const liveAvgVel = liveVels.reduce((a, b) => a + b, 0) / liveVels.length;

    // 3. Calculate % Deviation in Swipe Speed
    // e.g. baseline is 2.5px/ms, live is 3.0px/ms -> 0.2 deviation (20% faster)
    const velocityDeviation = Math.abs(baselineAvgVel - liveAvgVel) / (baselineAvgVel || 1);

    // Calculate initial score: 0 deviation = 100%.
    // A 30% deviation (0.3) will drop the score to 70.
    let score = 100 - (velocityDeviation * 100);

    // 4. Calculate Average Drag Duration to cross-verify Trajectory
    const baselineAvgDur = baseline.durations.reduce((a, b) => a + b, 0) / baseline.durations.length;
    const liveAvgDur = liveBatch.durations.reduce((a, b) => a + b, 0) / liveBatch.durations.length;

    const durationDeviation = Math.abs(baselineAvgDur - liveAvgDur) / (baselineAvgDur || 1);

    // Heavily penalize the score if the duration deviates significantly alongside velocity
    // (This usually indicates someone else is holding the phone at a different angle)
    if (durationDeviation > 0.4) {
      score -= 20;
    }

    // Enforce hard boundaries
    if (score > 100) score = 100;
    if (score < 0) score = 0;

    return Math.round(score);

  } catch (error) {
    console.error("Gesture Evaluation Engine Error:", error);
    return 0; // Fail securely
  }
};

module.exports = { evaluateGestures };