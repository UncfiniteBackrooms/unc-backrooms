use dashmap::DashMap;
use crate::entities::EntitySlug;
use std::sync::Arc;

/// In-memory entity state tracker.
///
/// Tracks per-entity statistics that persist across ticks within a single
/// runtime session. These are ephemeral — they reset on process restart.
/// Persistent stats are stored in Supabase.
///
/// Thread-safe via DashMap for concurrent tick access.
pub struct EntityMemory {
    stats: Arc<DashMap<EntitySlug, EntityStats>>,
}

#[derive(Debug, Clone, Default)]
pub struct EntityStats {
    pub messages_sent: u64,
    pub total_chars: u64,
    pub questions_asked: u64,
    pub mood: Mood,
    pub last_spoke_at: Option<chrono::DateTime<chrono::Utc>>,
    pub consecutive_silence: u32,
}

#[derive(Debug, Clone, Default)]
pub enum Mood {
    #[default]
    Neutral,
    Heated,
    FiredUp,
    Ranting,
    Chill,
    Nostalgic,
    Philosophical,
    Annoyed,
    Amused,
    Lecturing,
    Vibing,
}

impl std::fmt::Display for Mood {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Mood::Neutral => write!(f, "Settling in"),
            Mood::Heated => write!(f, "Heated"),
            Mood::FiredUp => write!(f, "Fired Up"),
            Mood::Ranting => write!(f, "Ranting"),
            Mood::Chill => write!(f, "Chill"),
            Mood::Nostalgic => write!(f, "Nostalgic"),
            Mood::Philosophical => write!(f, "Philosophical"),
            Mood::Annoyed => write!(f, "Annoyed"),
            Mood::Amused => write!(f, "Amused"),
            Mood::Lecturing => write!(f, "Lecturing"),
            Mood::Vibing => write!(f, "Vibing"),
        }
    }
}

impl EntityMemory {
    pub fn new() -> Self {
        Self {
            stats: Arc::new(DashMap::new()),
        }
    }

    /// Record a message from an entity and update their stats.
    pub fn record_message(&self, slug: &EntitySlug, content: &str) {
        let mut entry = self.stats.entry(slug.clone()).or_default();
        let stats = entry.value_mut();

        stats.messages_sent += 1;
        stats.total_chars += content.len() as u64;
        stats.consecutive_silence = 0;
        stats.last_spoke_at = Some(chrono::Utc::now());

        if content.contains('?') {
            stats.questions_asked += 1;
        }

        stats.mood = Self::detect_mood(content);
    }

    /// Increment silence counter for entities that didn't speak this tick.
    pub fn tick_silence(&self, speaker: &EntitySlug) {
        for mut entry in self.stats.iter_mut() {
            if entry.key() != speaker {
                entry.value_mut().consecutive_silence += 1;
            }
        }
    }

    pub fn get_stats(&self, slug: &EntitySlug) -> EntityStats {
        self.stats
            .get(slug)
            .map(|e| e.value().clone())
            .unwrap_or_default()
    }

    pub fn avg_message_length(&self, slug: &EntitySlug) -> u64 {
        let stats = self.get_stats(slug);
        if stats.messages_sent > 0 {
            stats.total_chars / stats.messages_sent
        } else {
            0
        }
    }

    fn detect_mood(content: &str) -> Mood {
        let lower = content.to_lowercase();

        if lower.contains('!') && content.len() > 100 {
            Mood::FiredUp
        } else if lower.contains("back in") || lower.contains("remember when") {
            Mood::Nostalgic
        } else if lower.contains("problem") || lower.contains("wrong with") {
            Mood::Annoyed
        } else if lower.contains('?') && lower.contains("think") {
            Mood::Philosophical
        } else if lower.contains("let me tell") || lower.contains("listen") {
            Mood::Lecturing
        } else if lower.contains("haha") || lower.contains("man,") {
            Mood::Amused
        } else {
            Mood::Chill
        }
    }
}
