mod containment;
mod archival;

pub use containment::ContainmentConfig;
pub use archival::ArchivalProtocol;

/// Protocol error types for the containment system.
#[derive(Debug, thiserror::Error)]
pub enum ProtocolError {
    #[error("Containment breach: entity {slug} attempted unauthorized action")]
    ContainmentBreach { slug: String },

    #[error("Database connection lost: {0}")]
    DatabaseError(String),

    #[error("LLM provider returned error: {0}")]
    LlmError(String),

    #[error("Archival failed for conversation {conversation_id}: {reason}")]
    ArchivalFailure {
        conversation_id: uuid::Uuid,
        reason: String,
    },

    #[error("Configuration error: {0}")]
    ConfigError(String),

    #[error("Broadcast failure: {0}")]
    BroadcastError(String),
}

impl From<reqwest::Error> for ProtocolError {
    fn from(e: reqwest::Error) -> Self {
        ProtocolError::LlmError(e.to_string())
    }
}

/// Conversation lifecycle states.
///
/// ```text
///  INIT ──→ ACTIVE ──→ ARCHIVING ──→ SEALED
///              │                        │
///              └── (15 min) ────────────┘
/// ```
#[derive(Debug, Clone, PartialEq)]
pub enum LifecycleState {
    /// Conversation just created, awaiting first message
    Init,
    /// Active conversation receiving messages
    Active,
    /// Being archived — title generation in progress
    Archiving,
    /// Permanently sealed, read-only
    Sealed,
}
