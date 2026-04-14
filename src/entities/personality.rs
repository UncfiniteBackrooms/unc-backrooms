/// Five-axis personality matrix for entity behavior modeling.
///
/// Each axis is a float in [0.0, 1.0] representing the intensity
/// of that personality dimension. These values influence:
///   - Topic selection probability
///   - Response aggressiveness
///   - Likelihood of initiating vs. reacting
///   - De-escalation tendency
///
/// The matrix is NOT used for prompt generation directly — it exists
/// for analytics, speaker selection weighting, and emergent behavior tracking.
#[derive(Debug, Clone)]
pub struct PersonalityMatrix {
    /// Tendency to assert opinions without solicitation (0 = passive, 1 = dominant)
    pub assertiveness: f64,

    /// Probability of referencing personal stories or memories (0 = abstract, 1 = anecdotal)
    pub narrative_drive: f64,

    /// Likelihood of issuing judgments or corrections (0 = accepting, 1 = critical)
    pub judgment_index: f64,

    /// Tendency to prioritize group harmony (0 = confrontational, 1 = peacekeeper)
    pub harmony_coefficient: f64,

    /// Frequency of humor, roasts, or playful deflection (0 = serious, 1 = comedic)
    pub humor_quotient: f64,
}

impl PersonalityMatrix {
    pub fn new(
        assertiveness: f64,
        narrative_drive: f64,
        judgment_index: f64,
        harmony_coefficient: f64,
        humor_quotient: f64,
    ) -> Self {
        Self {
            assertiveness: assertiveness.clamp(0.0, 1.0),
            narrative_drive: narrative_drive.clamp(0.0, 1.0),
            judgment_index: judgment_index.clamp(0.0, 1.0),
            harmony_coefficient: harmony_coefficient.clamp(0.0, 1.0),
            humor_quotient: humor_quotient.clamp(0.0, 1.0),
        }
    }

    /// Compute the "volatility score" — how likely this entity is to
    /// derail a conversation into an argument or recursive loop.
    pub fn volatility(&self) -> f64 {
        let aggression = self.assertiveness * self.judgment_index;
        let dampening = self.harmony_coefficient * 0.5;
        (aggression - dampening).clamp(0.0, 1.0)
    }

    /// Compute compatibility between two personality matrices.
    /// Returns a value in [0.0, 1.0] where 1.0 = perfect compatibility.
    pub fn compatibility(&self, other: &PersonalityMatrix) -> f64 {
        let dimensions = [
            (self.assertiveness - other.assertiveness).abs(),
            (self.narrative_drive - other.narrative_drive).abs(),
            (self.judgment_index - other.judgment_index).abs(),
            (self.harmony_coefficient - other.harmony_coefficient).abs(),
            (self.humor_quotient - other.humor_quotient).abs(),
        ];

        let avg_distance: f64 = dimensions.iter().sum::<f64>() / dimensions.len() as f64;
        1.0 - avg_distance
    }

    /// Returns the dominant trait label for display purposes.
    pub fn dominant_trait(&self) -> &'static str {
        let traits = [
            (self.assertiveness, "Assertive"),
            (self.narrative_drive, "Storyteller"),
            (self.judgment_index, "Critical"),
            (self.harmony_coefficient, "Peacemaker"),
            (self.humor_quotient, "Comedic"),
        ];

        traits
            .iter()
            .max_by(|a, b| a.0.partial_cmp(&b.0).unwrap())
            .map(|(_, label)| *label)
            .unwrap_or("Unknown")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn volatility_high_for_assertive_judgmental() {
        let matrix = PersonalityMatrix::new(0.9, 0.5, 0.9, 0.1, 0.5);
        assert!(matrix.volatility() > 0.7);
    }

    #[test]
    fn volatility_low_for_peaceful() {
        let matrix = PersonalityMatrix::new(0.3, 0.5, 0.2, 0.95, 0.5);
        assert!(matrix.volatility() < 0.1);
    }

    #[test]
    fn self_compatibility_is_perfect() {
        let matrix = PersonalityMatrix::new(0.5, 0.5, 0.5, 0.5, 0.5);
        assert!((matrix.compatibility(&matrix) - 1.0).abs() < f64::EPSILON);
    }

    #[test]
    fn wei_and_raj_are_moderately_compatible() {
        let wei = PersonalityMatrix::new(0.9, 0.2, 0.7, 0.4, 0.3);
        let raj = PersonalityMatrix::new(0.85, 0.5, 0.6, 0.5, 0.6);
        let compat = wei.compatibility(&raj);
        assert!(compat > 0.6 && compat < 0.9, "Expected moderate compatibility, got {compat}");
    }
}
