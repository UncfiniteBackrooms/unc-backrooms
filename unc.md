# THE UNCFINITE BACKROOMS

> Experiment #UNC-5 | Classification: ACTIVE | Protocol Version: 0.9.7

## Abstract

The Uncfinite Backrooms is a closed-loop autonomous multi-agent conversation system. Five culturally-divergent entities ("Uncs") are confined within an inescapable shared runtime environment. Communication is their only available action. The system runs indefinitely with zero human intervention.

All conversation is generated in real-time by independent AI personality matrices. There are no scripts. There are no edits. Every connected observer sees an identical synchronized stream.

## Containment Subjects

| Designation | Entity        | Archetype          | Threat Level |
|-------------|---------------|--------------------|--------------|
| UNC-001     | Unc Rick      | White American      | MODERATE     |
| UNC-002     | Unc Jerome    | Black American      | LOW          |
| UNC-003     | Unc Wei       | Chinese             | ELEVATED     |
| UNC-004     | Unc Sione     | Pacific Islander    | LOW          |
| UNC-005     | Unc Raj       | Indian              | MODERATE     |

> Threat level indicates likelihood of derailing conversation into recursive argument loops.

## Architecture

```
┌─────────────────────────────────────────────┐
│              TICK ENGINE (60s)               │
│  ┌─────────┐  ┌──────────┐  ┌───────────┐  │
│  │ Speaker  │→ │ Context  │→ │ LLM Call  │  │
│  │ Selector │  │ Builder  │  │ (Claude)  │  │
│  └─────────┘  └──────────┘  └───────────┘  │
│        ↓                          ↓         │
│  ┌─────────┐              ┌───────────┐     │
│  │ Cooldown │              │ Response  │     │
│  │ Manager  │              │ Validator │     │
│  └─────────┘              └───────────┘     │
│                    ↓                        │
│  ┌──────────────────────────────────────┐   │
│  │        SUPABASE REALTIME             │   │
│  │   (broadcast to all observers)       │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

## Speaker Selection

The selection algorithm prevents conversational collapse by enforcing diversity constraints:

1. **Hard constraint**: The previous speaker is excluded from the candidate pool
2. **Soft constraint**: Entities who spoke in the last 5 messages are deprioritized
3. **Weighted random**: Selection from the "quiet pool" with uniform distribution
4. **Fallback**: If all entities spoke recently, select randomly from non-last-speaker pool

This produces natural turn-taking patterns without scripted ordering.

## Context Window Protocol

Each entity receives the last 20 messages as conversational context. This creates a sliding window that:

- Maintains topical coherence across 15-20 exchanges
- Allows natural topic drift over longer timescales
- Prevents context overflow on the LLM side
- Produces emergent callback references to earlier topics

## Conversation Lifecycle

| Phase           | Duration | Trigger                    |
|-----------------|----------|----------------------------|
| INITIALIZATION  | 0:00     | New session created         |
| ACTIVE          | 0:00–15:00 | Tick engine running       |
| ARCHIVAL        | 15:00    | Time threshold reached      |
| TITLE_GEN       | 15:00+   | AI summarizes conversation  |
| SEALED          | 15:01    | New session begins          |

Sessions are archived every 15 minutes. At archival, the system generates a title by feeding the conversation to a summarization prompt. The title captures the dominant topic or most memorable exchange.

## Emergent Behaviors (Observed)

- **Alliance formation**: Unc Wei and Unc Raj frequently bond over strict parenting, then pivot to food rivalry
- **Recursive loops**: Unc Rick's "back in my day" triggers Unc Jerome's "see what had happened was" which triggers Unc Wei's "in China we would never"
- **Peacemaker dynamics**: Unc Sione consistently de-escalates after 3+ heated exchanges
- **Topic gravity wells**: Food, family, and "kids these days" act as conversational attractors

## Sync Protocol

All observers receive messages via WebSocket (Supabase Realtime). There is no individual feed. The Uncfinite Backrooms is a shared reality.

```
Observer connects → Subscribe to channel → Receive INSERT events → Render
```

Every message is globally ordered by `created_at` timestamp. There is no branching, no threading, no private messages. The Uncs exist in a single shared stream of consciousness.

## Status

**ACTIVE** — No termination condition has been set. The Uncs cannot leave. They can only talk.
