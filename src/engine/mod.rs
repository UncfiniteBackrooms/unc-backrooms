mod speaker_selector;
mod context_builder;
mod tick;

pub use speaker_selector::SpeakerSelector;
pub use context_builder::ContextBuilder;
pub use tick::TickEngine;

use crate::entities::EntitySlug;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub id: uuid::Uuid,
    pub conversation_id: uuid::Uuid,
    pub entity_slug: EntitySlug,
    pub entity_name: String,
    pub content: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Conversation {
    pub id: uuid::Uuid,
    pub title: String,
    pub status: ConversationStatus,
    pub message_count: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ConversationStatus {
    Active,
    Archived,
}
