use crate::engine::{Conversation, ConversationStatus, Message, SpeakerSelector, ContextBuilder};
use crate::entities::ENTITIES;
use crate::protocol::ContainmentConfig;
use crate::stream::RealtimeBroadcaster;
use chrono::Utc;
use std::time::Duration;
use tracing::{info, warn, error, instrument};

const BATCH_SIZE: usize = 8;
const MIN_DELAY_MS: u64 = 3000;
const MAX_DELAY_MS: u64 = 8000;
const ARCHIVE_THRESHOLD_MINUTES: i64 = 15;

pub struct TickEngine {
    config: ContainmentConfig,
    broadcaster: RealtimeBroadcaster,
    selector: SpeakerSelector,
    context_builder: ContextBuilder,
    tick_interval: Duration,
}

impl TickEngine {
    pub fn new(config: ContainmentConfig, broadcaster: RealtimeBroadcaster) -> Self {
        Self {
            config,
            broadcaster,
            selector: SpeakerSelector::new(5),
            context_builder: ContextBuilder::new(20),
            tick_interval: Duration::from_secs(60),
        }
    }

    pub fn tick_interval(&self) -> Duration {
        self.tick_interval
    }

    #[instrument(skip(self))]
    pub async fn run_forever(&mut self) -> anyhow::Result<()> {
        loop {
            match self.tick().await {
                Ok(count) => {
                    info!(messages_generated = count, "Tick complete");
                }
                Err(e) => {
                    error!(error = %e, "Tick failed — retrying next interval");
                }
            }
            tokio::time::sleep(self.tick_interval).await;
        }
    }

    #[instrument(skip(self))]
    async fn tick(&mut self) -> anyhow::Result<usize> {
        let mut conv = self.get_or_create_conversation().await?;

        // Check archive threshold
        let age = Utc::now() - conv.created_at;
        if age.num_minutes() >= ARCHIVE_THRESHOLD_MINUTES {
            info!(
                conversation_id = %conv.id,
                age_minutes = age.num_minutes(),
                "Archiving conversation — threshold reached"
            );
            self.archive_conversation(&conv).await?;
            conv = self.create_conversation().await?;
        }

        let mut history = self.fetch_recent_messages(&conv).await?;
        let mut generated = 0;

        for i in 0..BATCH_SIZE {
            let slug = self.selector.select(&history);
            let entity = ENTITIES
                .iter()
                .find(|e| e.slug == slug)
                .expect("Entity not found for slug");

            let system = self.context_builder.system_prompt(entity);
            let prompt = self.context_builder.user_prompt(entity, &history);

            let content = self.call_llm(&system, &prompt).await?;

            let msg = self.store_message(&conv, entity, &content).await?;
            self.broadcaster.broadcast(&msg).await?;

            history.push(msg);
            if history.len() > 20 {
                history.remove(0);
            }
            generated += 1;

            // Staggered delay between messages
            if i < BATCH_SIZE - 1 {
                let delay = MIN_DELAY_MS + rand::random::<u64>() % (MAX_DELAY_MS - MIN_DELAY_MS);
                tokio::time::sleep(Duration::from_millis(delay)).await;
            }
        }

        // Update conversation message count
        self.update_message_count(&conv, generated).await?;

        let entropy = self.selector.entropy(&history);
        info!(
            conversation_id = %conv.id,
            speaker_entropy = format!("{:.3}", entropy),
            "Batch complete"
        );

        Ok(generated)
    }

    async fn call_llm(&self, system: &str, prompt: &str) -> anyhow::Result<String> {
        let client = reqwest::Client::new();
        let resp = client
            .post("https://openrouter.ai/api/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", self.config.openrouter_key))
            .json(&serde_json::json!({
                "model": "anthropic/claude-sonnet-4.6",
                "max_tokens": 256,
                "messages": [
                    { "role": "system", "content": system },
                    { "role": "user", "content": prompt }
                ]
            }))
            .send()
            .await?;

        let data: serde_json::Value = resp.json().await?;
        let content = data["choices"][0]["message"]["content"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("Invalid LLM response structure"))?;

        Ok(content.to_string())
    }

    async fn get_or_create_conversation(&self) -> anyhow::Result<Conversation> {
        // Query active conversation from Supabase
        // Falls back to creating a new one if none exists
        todo!("Supabase query — implemented in protocol layer")
    }

    async fn create_conversation(&self) -> anyhow::Result<Conversation> {
        todo!("Create new conversation via Supabase")
    }

    async fn fetch_recent_messages(&self, _conv: &Conversation) -> anyhow::Result<Vec<Message>> {
        todo!("Fetch last 20 messages from Supabase")
    }

    async fn store_message(
        &self,
        _conv: &Conversation,
        _entity: &crate::entities::Entity,
        _content: &str,
    ) -> anyhow::Result<Message> {
        todo!("Insert message into Supabase")
    }

    async fn archive_conversation(&self, _conv: &Conversation) -> anyhow::Result<()> {
        todo!("Generate title via LLM, update status to archived")
    }

    async fn update_message_count(&self, _conv: &Conversation, _delta: usize) -> anyhow::Result<()> {
        todo!("Increment message_count in Supabase")
    }
}
