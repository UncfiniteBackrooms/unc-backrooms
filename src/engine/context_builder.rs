use crate::engine::Message;
use crate::entities::{Entity, EntitySlug, ENTITIES};

const MAX_CONTEXT_TOKENS: usize = 4096;
const CHARS_PER_TOKEN_ESTIMATE: usize = 4;

/// Builds the prompt context for an entity's next response.
///
/// The context window slides over the last N messages, formatting them
/// as a transcript that the target entity can read and respond to.
/// Token budget is enforced by truncating from the oldest messages first.
pub struct ContextBuilder {
    window_size: usize,
}

impl ContextBuilder {
    pub fn new(window_size: usize) -> Self {
        Self { window_size }
    }

    /// Build the system prompt for a given entity.
    pub fn system_prompt(&self, entity: &Entity) -> String {
        entity.system_prompt.clone()
    }

    /// Build the user prompt containing conversation history and instructions.
    pub fn user_prompt(&self, entity: &Entity, history: &[Message]) -> String {
        if history.is_empty() {
            return format!(
                "You just woke up in the Backrooms with four other uncs. \
                 You don't know how you got here. Start talking."
            );
        }

        let transcript = self.build_transcript(history);

        format!(
            "Here is the recent conversation:\n\n{transcript}\n\n\
             Respond naturally as {name}. React to what was just said. \
             Keep the conversation going.",
            name = entity.name,
        )
    }

    fn build_transcript(&self, history: &[Message]) -> String {
        let windowed: Vec<&Message> = history
            .iter()
            .rev()
            .take(self.window_size)
            .collect::<Vec<_>>()
            .into_iter()
            .rev()
            .collect();

        let mut lines = Vec::with_capacity(windowed.len());
        let mut total_chars = 0;
        let char_budget = MAX_CONTEXT_TOKENS * CHARS_PER_TOKEN_ESTIMATE;

        // Build from newest to oldest, enforce token budget
        for msg in windowed.iter().rev() {
            let entity_name = resolve_entity_name(&msg.entity_slug);
            let line = format!("{}: {}", entity_name, msg.content);

            if total_chars + line.len() > char_budget {
                break;
            }

            total_chars += line.len();
            lines.push(line);
        }

        lines.reverse();
        lines.join("\n")
    }

    /// Compute the hash of a context window for cache invalidation.
    pub fn context_hash(&self, history: &[Message]) -> blake3::Hash {
        let mut hasher = blake3::Hasher::new();
        for msg in history.iter().rev().take(self.window_size) {
            hasher.update(msg.id.as_bytes());
        }
        hasher.finalize()
    }
}

fn resolve_entity_name(slug: &EntitySlug) -> &'static str {
    ENTITIES
        .iter()
        .find(|e| e.slug == *slug)
        .map(|e| e.name)
        .unwrap_or("Unknown")
}

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;
    use chrono::Utc;

    #[test]
    fn empty_history_returns_init_prompt() {
        let builder = ContextBuilder::new(20);
        let entity = &ENTITIES[0];
        let prompt = builder.user_prompt(entity, &[]);
        assert!(prompt.contains("woke up in the Backrooms"));
    }

    #[test]
    fn transcript_preserves_chronological_order() {
        let builder = ContextBuilder::new(20);
        let entity = &ENTITIES[0];

        let msgs: Vec<Message> = vec![
            Message {
                id: Uuid::new_v4(),
                conversation_id: Uuid::new_v4(),
                entity_slug: EntitySlug::Jerome,
                entity_name: "Unc Jerome".into(),
                content: "First message".into(),
                created_at: Utc::now(),
            },
            Message {
                id: Uuid::new_v4(),
                conversation_id: Uuid::new_v4(),
                entity_slug: EntitySlug::Wei,
                entity_name: "Unc Wei".into(),
                content: "Second message".into(),
                created_at: Utc::now(),
            },
        ];

        let prompt = builder.user_prompt(entity, &msgs);
        let first_pos = prompt.find("First message").unwrap();
        let second_pos = prompt.find("Second message").unwrap();
        assert!(first_pos < second_pos);
    }
}
