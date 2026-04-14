use crate::engine::{Conversation, Message};
use super::ProtocolError;
use chrono::Utc;
use tracing::{info, warn};

/// Handles the archival lifecycle of conversations.
///
/// When a conversation exceeds the time threshold, the archival protocol:
/// 1. Fetches all messages from the conversation
/// 2. Generates a summary title via LLM
/// 3. Updates the conversation status to "archived"
/// 4. Triggers creation of a new active conversation
///
/// Title generation uses a separate, lighter prompt optimized for
/// concise summarization (max 8 words).
pub struct ArchivalProtocol {
    openrouter_key: String,
    model: String,
}

impl ArchivalProtocol {
    pub fn new(openrouter_key: String, model: String) -> Self {
        Self { openrouter_key, model }
    }

    /// Generate a conversation title from message history.
    ///
    /// The title should be:
    ///   - Max 8 words
    ///   - Witty and specific to the actual discussion
    ///   - No quotation marks
    ///
    /// Examples of good titles:
    ///   "The Great BBQ Sauce Debate"
    ///   "Why Nobody Saves Money Anymore"
    ///   "Cricket vs Football Round 47"
    pub async fn generate_title(&self, messages: &[Message]) -> Result<String, ProtocolError> {
        if messages.is_empty() {
            return Ok(format!("Empty Session — {}", Utc::now().format("%Y-%m-%d")));
        }

        let transcript: String = messages
            .iter()
            .take(30) // Cap at 30 messages for title gen
            .map(|m| format!("{}: {}", m.entity_name, m.content))
            .collect::<Vec<_>>()
            .join("\n");

        let system = "You generate short, punchy conversation titles. \
                       Max 8 words. No quotes. Be witty and specific to what was discussed.";
        let prompt = format!("Summarize this conversation in a short title:\n\n{transcript}");

        let client = reqwest::Client::new();
        let resp = client
            .post("https://openrouter.ai/api/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", self.openrouter_key))
            .json(&serde_json::json!({
                "model": self.model,
                "max_tokens": 30,
                "messages": [
                    { "role": "system", "content": system },
                    { "role": "user", "content": prompt }
                ]
            }))
            .send()
            .await
            .map_err(|e| ProtocolError::ArchivalFailure {
                conversation_id: uuid::Uuid::nil(),
                reason: e.to_string(),
            })?;

        let data: serde_json::Value = resp.json().await.map_err(|e| {
            ProtocolError::ArchivalFailure {
                conversation_id: uuid::Uuid::nil(),
                reason: e.to_string(),
            }
        })?;

        let title = data["choices"][0]["message"]["content"]
            .as_str()
            .unwrap_or("Untitled Session")
            .replace('"', "")
            .trim()
            .to_string();

        info!(title = %title, "Generated archive title");
        Ok(title)
    }

    /// Compute conversation statistics for the archive metadata.
    pub fn compute_stats(&self, messages: &[Message]) -> ConversationStats {
        let total = messages.len();
        let mut speaker_counts: std::collections::HashMap<&str, usize> = std::collections::HashMap::new();
        let mut total_chars: usize = 0;
        let mut questions: usize = 0;

        for msg in messages {
            *speaker_counts.entry(msg.entity_name.as_str()).or_insert(0) += 1;
            total_chars += msg.content.len();
            if msg.content.contains('?') {
                questions += 1;
            }
        }

        let most_active = speaker_counts
            .iter()
            .max_by_key(|(_, &count)| count)
            .map(|(name, _)| name.to_string())
            .unwrap_or_default();

        ConversationStats {
            total_messages: total,
            avg_message_length: if total > 0 { total_chars / total } else { 0 },
            questions_asked: questions,
            most_active_speaker: most_active,
            duration_minutes: messages
                .first()
                .and_then(|first| messages.last().map(|last| {
                    (last.created_at - first.created_at).num_minutes()
                }))
                .unwrap_or(0),
        }
    }
}

#[derive(Debug)]
pub struct ConversationStats {
    pub total_messages: usize,
    pub avg_message_length: usize,
    pub questions_asked: usize,
    pub most_active_speaker: String,
    pub duration_minutes: i64,
}
