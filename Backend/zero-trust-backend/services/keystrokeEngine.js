/**
 * Compares live keystroke telemetry against the stored Neon DB baseline.
 * Returns a trust score from 0 to 100.
 */
const evaluateKeystrokes = (baseline, liveBatch) => {
  try {
    // If baseline doesn't exist or is empty, we can't verify. Default to suspicious.
    if (!baseline || !baseline.flightTimes || baseline.flightTimes.length === 0) {
      return 50;
    }

    const baselineFlights = baseline.flightTimes;
    const liveFlights = liveBatch.flightTimes;

    if (!liveFlights || liveFlights.length === 0) return 50;

    // Calculate average flight time of the baseline
    const baselineAvg = baselineFlights.reduce((a, b) => a + b, 0) / baselineFlights.length;

    // Calculate average flight time of the live batch
    const liveAvg = liveFlights.reduce((a, b) => a + b, 0) / liveFlights.length;

    // Calculate the percentage deviation
    const deviation = Math.abs(baselineAvg - liveAvg) / (baselineAvg || 1);

    // Calculate score: 0 deviation = 100%. 
    // A deviation of 0.5 (50% slower/faster) will drop the score to 50%.
    let score = 100 - (deviation * 100);

    // Enforce boundaries
    if (score > 100) score = 100;
    if (score < 0) score = 0;

    // Factor in error signature (Backspace cadence)
    if (liveBatch.errorSignature && liveBatch.sequenceLength > 0) {
      const liveErrorRate = liveBatch.errorSignature.filter(e => e === 1).length / liveBatch.sequenceLength;
      // If the live user corrects mistakes wildly differently than the baseline, penalize the score.
      if (liveErrorRate > 0.3) {
        score -= 15;
      }
    }

    return Math.round(score);

  } catch (error) {
    console.error("Evaluation Engine Error:", error);
    return 0; // Fail securely
  }
};

module.exports = { evaluateKeystrokes };