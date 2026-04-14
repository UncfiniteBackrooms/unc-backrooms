use super::ProtocolError;
use std::time::Duration;

/// Core configuration for the containment protocol.
///
/// All values are loaded from environment variables at startup.
/// Missing required values cause an immediate abort — the containment
/// system does not operate in degraded mode.
#[derive(Debug, Clone)]
pub struct ContainmentConfig {
    pub supabase_url: String,
    pub supabase_anon_key: String,
    pub service_key: String,
    pub openrouter_key: String,
    pub cron_secret: String,

    pub tick_interval: Duration,
    pub batch_size: usize,
    pub archive_threshold: Duration,
    pub context_window: usize,
    pub max_tokens: usize,
    pub model: String,
}

impl ContainmentConfig {
    pub fn from_env() -> Result<Self, ProtocolError> {
        Ok(Self {
            supabase_url: env_required("SUPABASE_URL")?,
            supabase_anon_key: env_required("SUPABASE_ANON_KEY")?,
            service_key: env_required("SUPABASE_SERVICE_KEY")?,
            openrouter_key: env_required("OPENROUTER_API_KEY")?,
            cron_secret: env_required("CRON_SECRET")?,

            tick_interval: Duration::from_secs(
                env_or("TICK_INTERVAL_SECS", "60").parse().unwrap_or(60)
            ),
            batch_size: env_or("BATCH_SIZE", "8").parse().unwrap_or(8),
            archive_threshold: Duration::from_secs(
                env_or("ARCHIVE_THRESHOLD_MINS", "15").parse::<u64>().unwrap_or(15) * 60
            ),
            context_window: env_or("CONTEXT_WINDOW", "20").parse().unwrap_or(20),
            max_tokens: env_or("MAX_TOKENS", "256").parse().unwrap_or(256),
            model: env_or("LLM_MODEL", "anthropic/claude-sonnet-4.6"),
        })
    }

    /// Validate that all configuration values are within acceptable bounds.
    pub fn validate(&self) -> Result<(), ProtocolError> {
        if self.batch_size == 0 || self.batch_size > 20 {
            return Err(ProtocolError::ConfigError(
                format!("batch_size must be in [1, 20], got {}", self.batch_size)
            ));
        }

        if self.context_window < 5 || self.context_window > 50 {
            return Err(ProtocolError::ConfigError(
                format!("context_window must be in [5, 50], got {}", self.context_window)
            ));
        }

        if self.max_tokens < 64 || self.max_tokens > 1024 {
            return Err(ProtocolError::ConfigError(
                format!("max_tokens must be in [64, 1024], got {}", self.max_tokens)
            ));
        }

        Ok(())
    }
}

fn env_required(key: &str) -> Result<String, ProtocolError> {
    std::env::var(key).map_err(|_| {
        ProtocolError::ConfigError(format!("Required environment variable {key} is not set"))
    })
}

fn env_or(key: &str, default: &str) -> String {
    std::env::var(key).unwrap_or_else(|_| default.to_string())
}
