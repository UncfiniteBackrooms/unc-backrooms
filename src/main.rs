mod engine;
mod entities;
mod memory;
mod protocol;
mod stream;

use engine::TickEngine;
use protocol::ContainmentConfig;
use stream::RealtimeBroadcaster;
use tracing::info;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter("uncfinite=debug,tower_http=info")
        .json()
        .init();

    info!("UNCFINITE BACKROOMS v{}", env!("CARGO_PKG_VERSION"));
    info!("Initializing containment protocol...");

    let config = ContainmentConfig::from_env()?;
    let broadcaster = RealtimeBroadcaster::connect(&config.supabase_url, &config.service_key).await?;
    let mut engine = TickEngine::new(config, broadcaster);

    info!(
        subjects = 5,
        tick_interval_ms = engine.tick_interval().as_millis() as u64,
        archive_threshold_min = 15,
        "Containment active — all subjects confined"
    );

    engine.run_forever().await
}
