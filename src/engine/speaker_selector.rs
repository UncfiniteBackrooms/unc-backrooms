use crate::entities::{EntitySlug, ENTITY_ORDER};
use crate::engine::Message;
use rand::seq::SliceRandom;
use rand::thread_rng;

/// Speaker selection algorithm implementing diversity-constrained random choice.
///
/// Invariants:
///   1. The immediately previous speaker is NEVER selected (hard exclusion)
///   2. Entities who spoke in the last N messages are deprioritized (soft exclusion)
///   3. If all candidates are recent speakers, fall back to hard-exclusion-only pool
///
/// This produces naturalistic turn-taking without scripted ordering.
pub struct SpeakerSelector {
    lookback_window: usize,
}

impl SpeakerSelector {
    pub fn new(lookback_window: usize) -> Self {
        Self { lookback_window }
    }

    pub fn select(&self, history: &[Message]) -> EntitySlug {
        let mut rng = thread_rng();

        let last_speaker = history.last().map(|m| &m.entity_slug);

        // Hard exclusion: remove last speaker
        let candidates: Vec<&EntitySlug> = ENTITY_ORDER
            .iter()
            .filter(|slug| Some(*slug) != last_speaker)
            .collect();

        // Soft exclusion: prefer entities not in recent window
        let recent: Vec<&EntitySlug> = history
            .iter()
            .rev()
            .take(self.lookback_window)
            .map(|m| &m.entity_slug)
            .collect();

        let quiet_pool: Vec<&&EntitySlug> = candidates
            .iter()
            .filter(|slug| !recent.contains(slug))
            .collect();

        if let Some(&&slug) = quiet_pool.choose(&mut rng) {
            return slug.clone();
        }

        // Fallback: random from hard-exclusion pool
        candidates
            .choose(&mut rng)
            .map(|s| (*s).clone())
            .unwrap_or(EntitySlug::Rick)
    }

    /// Calculate speaker entropy over a window of messages.
    /// Returns a value between 0.0 (single speaker) and 1.0 (perfectly distributed).
    pub fn entropy(&self, history: &[Message]) -> f64 {
        if history.is_empty() {
            return 0.0;
        }

        let total = history.len() as f64;
        let mut counts = std::collections::HashMap::new();

        for msg in history {
            *counts.entry(&msg.entity_slug).or_insert(0u32) += 1;
        }

        let mut entropy = 0.0;
        for &count in counts.values() {
            let p = count as f64 / total;
            if p > 0.0 {
                entropy -= p * p.log2();
            }
        }

        // Normalize to [0, 1] using max possible entropy (log2 of entity count)
        let max_entropy = (ENTITY_ORDER.len() as f64).log2();
        if max_entropy > 0.0 {
            entropy / max_entropy
        } else {
            0.0
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;
    use chrono::Utc;

    fn make_msg(slug: EntitySlug) -> Message {
        Message {
            id: Uuid::new_v4(),
            conversation_id: Uuid::new_v4(),
            entity_slug: slug,
            entity_name: String::new(),
            content: String::new(),
            created_at: Utc::now(),
        }
    }

    #[test]
    fn never_selects_last_speaker() {
        let selector = SpeakerSelector::new(5);
        let history = vec![make_msg(EntitySlug::Rick)];

        for _ in 0..100 {
            let selected = selector.select(&history);
            assert_ne!(selected, EntitySlug::Rick);
        }
    }

    #[test]
    fn perfect_entropy_when_evenly_distributed() {
        let selector = SpeakerSelector::new(5);
        let history: Vec<Message> = ENTITY_ORDER
            .iter()
            .cycle()
            .take(50)
            .map(|s| make_msg(s.clone()))
            .collect();

        let e = selector.entropy(&history);
        assert!((e - 1.0).abs() < 0.01, "Expected ~1.0, got {e}");
    }
}
