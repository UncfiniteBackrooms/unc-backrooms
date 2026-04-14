mod personality;

pub use personality::PersonalityMatrix;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum EntitySlug {
    Rick,
    Jerome,
    Wei,
    Sione,
    Raj,
}

impl std::fmt::Display for EntitySlug {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            EntitySlug::Rick => write!(f, "rick"),
            EntitySlug::Jerome => write!(f, "jerome"),
            EntitySlug::Wei => write!(f, "wei"),
            EntitySlug::Sione => write!(f, "sione"),
            EntitySlug::Raj => write!(f, "raj"),
        }
    }
}

pub struct Entity {
    pub slug: EntitySlug,
    pub name: &'static str,
    pub ethnicity: &'static str,
    pub designation: &'static str,
    pub threat_level: ThreatLevel,
    pub system_prompt: String,
    pub personality: PersonalityMatrix,
}

#[derive(Debug, Clone)]
pub enum ThreatLevel {
    Low,
    Moderate,
    Elevated,
}

pub static ENTITY_ORDER: &[EntitySlug] = &[
    EntitySlug::Rick,
    EntitySlug::Jerome,
    EntitySlug::Wei,
    EntitySlug::Sione,
    EntitySlug::Raj,
];

lazy_static::lazy_static! {
    pub static ref ENTITIES: Vec<Entity> = vec![
        Entity {
            slug: EntitySlug::Rick,
            name: "Unc Rick",
            ethnicity: "White American",
            designation: "UNC-001",
            threat_level: ThreatLevel::Moderate,
            personality: PersonalityMatrix::new(0.8, 0.3, 0.9, 0.2, 0.7),
            system_prompt: include_str!("prompts/rick.txt").to_string(),
        },
        Entity {
            slug: EntitySlug::Jerome,
            name: "Unc Jerome",
            ethnicity: "Black American",
            designation: "UNC-002",
            threat_level: ThreatLevel::Low,
            personality: PersonalityMatrix::new(0.6, 0.9, 0.5, 0.8, 0.9),
            system_prompt: include_str!("prompts/jerome.txt").to_string(),
        },
        Entity {
            slug: EntitySlug::Wei,
            name: "Unc Wei",
            ethnicity: "Chinese",
            designation: "UNC-003",
            threat_level: ThreatLevel::Elevated,
            personality: PersonalityMatrix::new(0.9, 0.2, 0.7, 0.4, 0.3),
            system_prompt: include_str!("prompts/wei.txt").to_string(),
        },
        Entity {
            slug: EntitySlug::Sione,
            name: "Unc Sione",
            ethnicity: "Pacific Islander",
            designation: "UNC-004",
            threat_level: ThreatLevel::Low,
            personality: PersonalityMatrix::new(0.3, 0.8, 0.2, 0.95, 0.85),
            system_prompt: include_str!("prompts/sione.txt").to_string(),
        },
        Entity {
            slug: EntitySlug::Raj,
            name: "Unc Raj",
            ethnicity: "Indian",
            designation: "UNC-005",
            threat_level: ThreatLevel::Moderate,
            personality: PersonalityMatrix::new(0.85, 0.5, 0.6, 0.5, 0.6),
            system_prompt: include_str!("prompts/raj.txt").to_string(),
        },
    ];
}
