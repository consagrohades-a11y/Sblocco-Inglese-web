# Readiness v2 threshold rationale

The initial v2 contract uses conservative but non-perfectionist gates:

- overall READY: 75+
- active blocking axis: 72+
- individual blocking-outcome floor: 65
- final mock: 70+
- all required blocking outcomes must have valid evidence
- at least 85% of all required outcomes must have valid evidence

These thresholds are deliberately separated from the current learner-facing runtime and should be calibrated with shadow data before cutover. The key invariant is structural: a strong global average cannot hide a critical weakness in an active required axis.
