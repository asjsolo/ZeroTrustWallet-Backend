/**
 * Spatial Gesture Statistical Engine (Component 2 - Kalani)
 * Features Tri-State Trust Evaluation and Adaptive Baseline Updating (EMA).
 */
const LEARNING_RATE = 0.05; // 5% incremental adaptation

const evaluateGestures = (baseline, liveBatch) => {
  try {
    if (!baseline || !baseline.velocities || baseline.velocities.length === 0) {
      return { score: 50, action: "REVOKE", updatedBaseline: null };
    }

    const baselineVels = baseline.velocities;
    const liveVels = liveBatch.velocities;

    if (!liveVels || liveVels.length === 0) {
      return { score: 50, action: "REVOKE", updatedBaseline: null };
    }

    // 1. Calculate Average Velocity
    const baselineAvgVel = baselineVels.reduce((a, b) => a + b, 0) / baselineVels.length;
    const liveAvgVel = liveVels.reduce((a, b) => a + b, 0) / liveVels.length;

    // 2. Velocity Deviation
    const velocityDeviation = Math.abs(baselineAvgVel - liveAvgVel) / (baselineAvgVel || 1);
    let score = 100 - (velocityDeviation * 100);

    // 3. Duration & Trajectory Penalty
    const baselineAvgDur = baseline.durations.reduce((a, b) => a + b, 0) / baseline.durations.length;
    const liveAvgDur = liveBatch.durations.reduce((a, b) => a + b, 0) / liveBatch.durations.length;
    const durationDeviation = Math.abs(baselineAvgDur - liveAvgDur) / (baselineAvgDur || 1);

    if (durationDeviation > 0.4) {
      score -= 20;
    }

    // Boundary constraints
    score = Math.max(0, Math.min(100, Math.round(score)));

    // 4. Tri-State Action Routing
    let action = "ALLOW";
    let updatedBaseline = null;

    if (score < 75) {
      action = "REVOKE"; // Breaches lower bound -> Force Logout
    } else if (score >= 75 && score < 80) {
      action = "ADAPT"; // 5% Learning Zone -> Calibrate baseline

      // Update baseline values using Exponential Moving Average (EMA)
      updatedBaseline = {
        velocities: baselineVels.map((v, i) =>
          liveVels[i] ? (1 - LEARNING_RATE) * v + LEARNING_RATE * liveVels[i] : v
        ),
        durations: baseline.durations.map((d, i) =>
          liveBatch.durations[i] ? Math.round((1 - LEARNING_RATE) * d + LEARNING_RATE * liveBatch.durations[i]) : d
        ),
        trajectories: baseline.trajectories || []
      };
    }

    return { score, action, updatedBaseline };

  } catch (error) {
    console.error("Gesture Evaluation Engine Error:", error);
    return { score: 0, action: "REVOKE", updatedBaseline: null };
  }
};

module.exports = { evaluateGestures };
