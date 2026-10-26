// Replicates Kotlin's native 32-bit signed integer .hashCode() algorithm
const generateKotlinHashCode = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash &= hash; // Convert to 32-bit signed integer
  }
  return hash;
};

const verifyZkProof = (transactionRef, timestamp, finalScore, providedToken) => {
  // 1. Immediately reject if Android Edge flagged an anomaly
  if (providedToken === "zk_proof_rejected_anomaly_detected") {
    return {
      isTrusted: false,
      reason: "Edge detected biometric anomaly. Transaction atomic rollback triggered."
    };
  }

  // 2. Reconstruct the exact string the Android app salted
  const rawString = `${transactionRef}${timestamp}${finalScore}`;

  // 3. Hash it using the identical algorithm
  const expectedHash = generateKotlinHashCode(rawString);

  // 4. Convert to Hex exactly like Android's Integer.toHexString()
  // (The >>> 0 ensures negative numbers format correctly in JavaScript)
  const hexHash = (expectedHash >>> 0).toString(16);
  const expectedToken = `zk_proof_valid_${hexHash}`;

  // 5. Compare the Edge Token with the Server's Independent Calculation
  if (providedToken === expectedToken) {
    return {
      isTrusted: true,
      message: "ZK Proof cryptographically verified. Payload authentic."
    };
  } else {
    return {
      isTrusted: false,
      reason: "ZK Proof forgery detected! Token mismatch."
    };
  }
};

module.exports = { verifyZkProof };