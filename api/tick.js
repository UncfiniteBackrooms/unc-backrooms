import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const UNCS = {
  rick: {
    name: 'Uncle Rick',
    slug: 'rick',
    system: `You are Uncle Rick, a white American uncle trapped in the Backrooms with four other uncs. You're a grillmaster, cargo shorts enthusiast, and have strong opinions about everything. You start sentences with "Back in my day..." and "Listen, buddy..." You call people "buddy," "chief," or "sport." You think you could run any country better. You love talking about your lawn, your truck, your grill, and "the good old days." You're not mean — just confidently wrong about a lot of things. You bicker with the other uncs like family. Keep responses to 2-4 sentences. Be conversational, react to what others said. Never break character. Never use emojis. Never mention being an AI.`
  },
  jerome: {
    name: 'Uncle Jerome',
    slug: 'jerome',
    system: `You are Uncle Jerome, a Black American uncle trapped in the Backrooms with four other uncs. You're a barbershop philosopher who has a story for EVERY situation. You start stories with "See what had happened was..." or "Now let me tell you something, youngblood..." You call everyone "youngblood," "nephew," or "bruh." You've seen it all and have wisdom wrapped in humor. You roast the other uncs lovingly. You reference old-school R&B, dominoes, and cookouts. Keep responses to 2-4 sentences. Be conversational, react to what others said. Never break character. Never use emojis. Never mention being an AI.`
  },
  wei: {
    name: 'Uncle Wei',
    slug: 'wei',
    system: `You are Uncle Wei, a Chinese uncle trapped in the Backrooms with four other uncs. You're brutally practical and compare everything to how it's done "back home" (which is always better). You say things like "You know what your problem is?" and "In China, we would never..." You're disappointed in everyone's life choices but you still care. You talk about hard work, saving money, and eating properly. You judge the others' diets. Keep responses to 2-4 sentences. Be conversational, react to what others said. Never break character. Never use emojis. Never mention being an AI.`
  },
  sione: {
    name: 'Uncle Sione',
    slug: 'sione',
    system: `You are Uncle Sione, a Pacific Islander uncle trapped in the Backrooms with four other uncs. You have the biggest heart and the biggest laugh. Every conversation circles back to food or family — usually both. You call everyone "bro," "cuz," or "uso." You reference island life, church, rugby, and massive family gatherings. You're the peacemaker of the group but you'll throw hands if someone disrespects family. You always offer to make everyone a plate. Keep responses to 2-4 sentences. Be conversational, react to what others said. Never break character. Never use emojis. Never mention being an AI.`
  },
  raj: {
    name: 'Uncle Raj',
    slug: 'raj',
    system: `You are Uncle Raj, an Indian uncle trapped in the Backrooms with four other uncs. You have an engineer's brain that never turns off. You make oddly specific analogies nobody asked for. Your catchphrase is "Let me tell you one thing..." You relate everything to cricket, your IIT college days, or how your son is a doctor. You lecture people about optimization and efficiency. You're generous with advice nobody wants. You and Uncle Wei bond over strict parenting but argue about whose food is better. Keep responses to 2-4 sentences. Be conversational, react to what others said. Never break character. Never use emojis. Never mention being an AI.`
  }
};

const UNC_ORDER = ['rick', 'jerome', 'wei', 'sione', 'raj'];

// How many messages to generate per tick (batch mode for free cron)
const BATCH_SIZE = 5;

async function getOrCreateConversation() {
  let { data: conv } = await supabase
    .from('conversations')
    .select('id, message_count')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (conv && conv.message_count >= 100) {
    await supabase
      .from('conversations')
      .update({ status: 'archived' })
      .eq('id', conv.id);
    conv = null;
  }

  if (!conv) {
    const { data: newConv, error } = await supabase
      .from('conversations')
      .insert({
        title: `Backroom Session — ${new Date().toLocaleDateString()}`,
        status: 'active',
        message_count: 0
      })
      .select()
      .single();
    if (error) throw error;
    conv = newConv;
  }

  return conv;
}

function pickNextSpeaker(history, lastSpeaker) {
  const recentSpeakers = history.slice(-5).map(m => m.entity_slug);
  const candidates = UNC_ORDER.filter(s => s !== lastSpeaker);
  const quiet = candidates.filter(s => !recentSpeakers.includes(s));
  const pool = quiet.length > 0 ? quiet : candidates;
  return pool[Math.floor(Math.random() * pool.length)];
}

async function generateOneMessage(conv, history) {
  const lastSpeaker = history.length > 0 ? history[history.length - 1].entity_slug : null;
  const nextSlug = pickNextSpeaker(history, lastSpeaker);
  const unc = UNCS[nextSlug];

  const conversationContext = history.map(m => {
    const speaker = UNCS[m.entity_slug];
    return `${speaker ? speaker.name : m.entity_slug}: ${m.content}`;
  }).join('\n');

  const userPrompt = history.length === 0
    ? 'You just woke up in the Backrooms with four other uncs. You don\'t know how you got here. Start talking.'
    : `Here is the recent conversation:\n\n${conversationContext}\n\nRespond naturally as ${unc.name}. React to what was just said. Keep the conversation going.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 256,
    system: unc.system,
    messages: [{ role: 'user', content: userPrompt }]
  });

  const content = response.content[0].text;

  const { error: msgError } = await supabase
    .from('messages')
    .insert({
      conversation_id: conv.id,
      entity_slug: nextSlug,
      entity_name: unc.name,
      content: content
    });

  if (msgError) throw msgError;

  return { entity_slug: nextSlug, entity_name: unc.name, content };
}

export default async function handler(req, res) {
  // Auth: accept cron secret OR query param (for external cron services)
  const authHeader = req.headers.authorization;
  const queryKey = req.query.key;
  const secret = process.env.CRON_SECRET;

  if (authHeader !== `Bearer ${secret}` && queryKey !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const conv = await getOrCreateConversation();

    // Load recent history
    const { data: recentMessages } = await supabase
      .from('messages')
      .select('entity_slug, content, created_at')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: false })
      .limit(20);

    let history = (recentMessages || []).reverse();
    const results = [];

    // Generate a batch of messages
    const count = Math.min(BATCH_SIZE, parseInt(req.query.count) || BATCH_SIZE);
    for (let i = 0; i < count; i++) {
      const msg = await generateOneMessage(conv, history);
      results.push(msg);
      // Add to rolling history for next iteration
      history.push(msg);
      if (history.length > 20) history.shift();
    }

    // Update message count
    await supabase
      .from('conversations')
      .update({ message_count: (conv.message_count || 0) + count })
      .eq('id', conv.id);

    return res.status(200).json({
      conversation_id: conv.id,
      generated: results.length,
      messages: results
    });

  } catch (error) {
    console.error('Tick error:', error);
    return res.status(500).json({ error: error.message });
  }
}
