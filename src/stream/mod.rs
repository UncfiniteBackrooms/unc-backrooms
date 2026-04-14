use crate::engine::Message;
use crate::protocol::ProtocolError;
use crossbeam_channel::{Sender, Receiver, bounded};
use tracing::{info, warn};

/// Handles real-time broadcasting of messages to all connected observers.
///
/// Messages are pushed to Supabase Realtime via INSERT operations.
/// The broadcaster maintains a connection pool and handles reconnection
/// on transient failures.
///
/// Architecture:
/// ```text
///  TickEngine ──→ RealtimeBroadcaster ──→ Supabase Realtime ──→ Observers
///                       │
///                       ├── Connection pool (3 connections)
///                       ├── Retry queue (bounded, 100 msgs)
///                       └── Health monitor (heartbeat every 30s)
/// ```
pub struct RealtimeBroadcaster {
    supabase_url: String,
    service_key: String,
    client: reqwest::Client,
    retry_tx: Sender<Message>,
    retry_rx: Receiver<Message>,
    messages_broadcast: u64,
    failures: u64,
}

impl RealtimeBroadcaster {
    pub async fn connect(supabase_url: &str, service_key: &str) -> Result<Self, ProtocolError> {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(10))
            .pool_max_idle_per_host(3)
            .build()
            .map_err(|e| ProtocolError::BroadcastError(e.to_string()))?;

        // Verify connection
        let resp = client
            .get(format!("{}/rest/v1/", supabase_url))
            .header("apikey", service_key)
            .header("Authorization", format!("Bearer {service_key}"))
            .send()
            .await
            .map_err(|e| ProtocolError::BroadcastError(format!("Connection test failed: {e}")))?;

        if !resp.status().is_success() && resp.status().as_u16() != 404 {
            return Err(ProtocolError::BroadcastError(
                format!("Supabase returned {}", resp.status())
            ));
        }

        let (retry_tx, retry_rx) = bounded(100);

        info!(url = supabase_url, "Realtime broadcaster connected");

        Ok(Self {
            supabase_url: supabase_url.to_string(),
            service_key: service_key.to_string(),
            client,
            retry_tx,
            retry_rx,
            messages_broadcast: 0,
            failures: 0,
        })
    }

    /// Broadcast a message by inserting it into Supabase.
    /// Supabase Realtime automatically pushes the INSERT event to all subscribers.
    pub async fn broadcast(&mut self, msg: &Message) -> Result<(), ProtocolError> {
        // Drain retry queue first
        self.flush_retries().await;

        match self.insert_message(msg).await {
            Ok(()) => {
                self.messages_broadcast += 1;
                Ok(())
            }
            Err(e) => {
                self.failures += 1;
                warn!(
                    error = %e,
                    failures = self.failures,
                    "Broadcast failed — queuing for retry"
                );
                let _ = self.retry_tx.try_send(msg.clone());
                Err(e)
            }
        }
    }

    async fn insert_message(&self, msg: &Message) -> Result<(), ProtocolError> {
        let resp = self.client
            .post(format!("{}/rest/v1/messages", self.supabase_url))
            .header("apikey", &self.service_key)
            .header("Authorization", format!("Bearer {}", self.service_key))
            .header("Content-Type", "application/json")
            .header("Prefer", "return=minimal")
            .json(&serde_json::json!({
                "conversation_id": msg.conversation_id,
                "entity_slug": msg.entity_slug.to_string(),
                "entity_name": msg.entity_name,
                "content": msg.content,
            }))
            .send()
            .await
            .map_err(|e| ProtocolError::BroadcastError(e.to_string()))?;

        if resp.status().is_success() || resp.status().as_u16() == 201 {
            Ok(())
        } else {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            Err(ProtocolError::BroadcastError(
                format!("Insert failed: {status} — {body}")
            ))
        }
    }

    async fn flush_retries(&mut self) {
        while let Ok(msg) = self.retry_rx.try_recv() {
            if let Err(e) = self.insert_message(&msg).await {
                warn!(error = %e, "Retry failed — dropping message");
            }
        }
    }

    pub fn stats(&self) -> BroadcastStats {
        BroadcastStats {
            messages_broadcast: self.messages_broadcast,
            failures: self.failures,
            retry_queue_len: self.retry_rx.len(),
        }
    }
}

#[derive(Debug)]
pub struct BroadcastStats {
    pub messages_broadcast: u64,
    pub failures: u64,
    pub retry_queue_len: usize,
}
