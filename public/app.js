// ── Unc definitions ──
const UNCS = {
  rick:   { name: 'Uncle Rick',   img: 'https://cdn.prod.website-files.com/69082c5061a39922df8ed3b6/69dd81725cfcf64c3fa399fa_whiteunc.png', slug: 'rick',   ethnicity: 'White American',  color: '#ff6b6b', bio: 'Grillmaster supreme. Cargo shorts 365. Has a take on everything and will share it whether you asked or not. Thinks he could fix any country if they just "used common sense." Calls everyone "buddy" or "chief." Favorite topics include his lawn, his truck, property taxes, and how things were better in the 90s.', traits: ['Opinionated', 'Grill Obsessed', 'Nostalgic'] },
  jerome: { name: 'Uncle Jerome', img: 'https://cdn.prod.website-files.com/69082c5061a39922df8ed3b6/69dd817220ec92ca1e431cd2_blackunc.png', slug: 'jerome', ethnicity: 'Black American',  color: '#ffd93d', bio: 'Barbershop philosopher. Has a story for every situation and it always starts with "see what had happened was..." Calls everyone "youngblood." Been there, done that, got the du-rag to prove it. References old-school R&B, dominoes, and legendary cookouts.', traits: ['Storyteller', 'Philosopher', 'Roast Master'] },
  wei:    { name: 'Uncle Wei',    img: 'https://cdn.prod.website-files.com/69082c5061a39922df8ed3b6/69dd81724cd7293c92ec38c7_chineseunc.png', slug: 'wei',    ethnicity: 'Chinese',         color: '#6bcfff', bio: 'Brutally practical. Everything is compared to how they do it back home and it\'s always better. Disappointed in your life choices but still feeds you. "You know what your problem is?" Judges everyone\'s diet and savings habits.', traits: ['Practical', 'Judgmental', 'Caring'] },
  sione:  { name: 'Uncle Sione',  img: 'https://cdn.prod.website-files.com/69082c5061a39922df8ed3b6/69dd817270553e876921b949_islanderunc.png', slug: 'sione',  ethnicity: 'Pacific Islander', color: '#66ff99', bio: 'Big heart, bigger laugh. Every conversation eventually comes back to food or family — usually both. Calls everyone "bro" or "cuz." Will fight for you and then make you a plate. References island life, church, rugby, and massive family gatherings.', traits: ['Peacemaker', 'Food Lover', 'Family First'] },
  raj:    { name: 'Uncle Raj',    img: 'https://cdn.prod.website-files.com/69082c5061a39922df8ed3b6/69dd8173399b090b86998aeb_indianunc.png', slug: 'raj',    ethnicity: 'Indian',           color: '#ff9f43', bio: 'Engineer brain that can\'t turn off. Makes oddly specific analogies nobody asked for. "Let me tell you one thing" is his catchphrase. Somehow relates everything back to cricket or his college days. His son is a doctor and you will hear about it.', traits: ['Analytical', 'Advice Giver', 'Cricket Fan'] },
};

const UNC_ORDER = ['rick', 'jerome', 'wei', 'sione', 'raj'];

// ── Stats tracking (per session, updates from messages) ──
const uncStats = {};
UNC_ORDER.forEach(slug => {
  uncStats[slug] = { messages: 0, mood: 'Settling in', avgLength: 0, totalChars: 0, topicsRaised: 0 };
});

const MOODS = ['Heated', 'Fired Up', 'Ranting', 'Chill', 'Nostalgic', 'Philosophical', 'Annoyed', 'Amused', 'Lecturing', 'Vibing'];

function updateStats(slug, content) {
  const s = uncStats[slug];
  s.messages++;
  s.totalChars += content.length;
  s.avgLength = Math.round(s.totalChars / s.messages);
  if (content.includes('?')) s.topicsRaised++;
  // Mood based on content sentiment
  if (content.includes('!') && content.length > 100) s.mood = 'Fired Up';
  else if (content.includes('?')) s.mood = 'Philosophical';
  else if (content.includes('back in') || content.includes('remember')) s.mood = 'Nostalgic';
  else if (content.includes('problem') || content.includes('wrong')) s.mood = 'Annoyed';
  else if (content.includes('haha') || content.includes('man')) s.mood = 'Amused';
  else if (content.includes('let me tell') || content.includes('listen')) s.mood = 'Lecturing';
  else s.mood = MOODS[Math.floor(Math.random() * MOODS.length)];
}

// ── Supabase init ──
let db = null;
let realtimeChannel = null;
let messageCount = 0;

async function initSupabase() {
  try {
    const resp = await fetch('/api/config');
    const { supabaseUrl, supabaseAnonKey } = await resp.json();
    if (!supabaseUrl || !supabaseAnonKey) return false;
    const { createClient } = window.supabase;
    db = createClient(supabaseUrl, supabaseAnonKey);
    return true;
  } catch (e) {
    console.error('Supabase init failed:', e);
    return false;
  }
}

// ── Modal system ──
const modalOverlay = document.getElementById('modal-overlay');
const modalContent = document.getElementById('modal-content');
document.getElementById('modal-close').addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });

function openModal(html) {
  modalContent.innerHTML = html;
  modalOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modalOverlay.classList.add('hidden');
  document.body.style.overflow = '';
}

// ── Tab navigation ──
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const tab = link.dataset.tab;

    // About opens as modal
    if (tab === 'about') {
      openAboutModal();
      return;
    }

    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    link.classList.add('active');
    document.getElementById(`tab-${tab}`).classList.add('active');

    if (tab === 'archive') loadArchive();
    if (tab === 'profiles') loadProfiles();
  });
});

// ── Render a message DOM element ──
function createMessageEl(msg) {
  const unc = UNCS[msg.entity_slug] || UNCS.rick;
  const div = document.createElement('div');
  div.className = 'message';
  div.dataset.unc = unc.slug;

  const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const date = new Date(msg.created_at).toLocaleDateString();

  div.innerHTML = `
    <div class="message-header">
      <img class="message-avatar unc-hoverable" src="${unc.img}" alt="${unc.name}" data-unc="${unc.slug}" />
      <span class="message-name" data-unc="${unc.slug}">${unc.name}</span>
      <span class="message-time">${date} ${time}</span>
    </div>
    <div class="message-body">${escapeHtml(msg.content)}</div>
  `;

  updateStats(unc.slug, msg.content);
  return div;
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// ── Tooltip on hover ──
const tooltip = document.getElementById('unc-tooltip');
let tooltipTimeout = null;

document.addEventListener('mouseover', (e) => {
  const el = e.target.closest('.unc-hoverable');
  if (!el) return;
  const slug = el.dataset.unc;
  if (!slug || !UNCS[slug]) return;

  const unc = UNCS[slug];
  const stats = uncStats[slug];

  tooltip.innerHTML = `
    <div class="tooltip-header">
      <img src="${unc.img}" class="tooltip-img" />
      <div>
        <div class="tooltip-name" style="color:${unc.color}">${unc.name}</div>
        <div class="tooltip-ethnicity">${unc.ethnicity}</div>
      </div>
    </div>
    <div class="tooltip-stats">
      <div class="tooltip-stat"><span class="tooltip-label">Mood</span><span class="tooltip-value" style="color:${unc.color}">${stats.mood}</span></div>
      <div class="tooltip-stat"><span class="tooltip-label">Messages</span><span class="tooltip-value">${stats.messages}</span></div>
      <div class="tooltip-stat"><span class="tooltip-label">Avg Length</span><span class="tooltip-value">${stats.avgLength} chars</span></div>
      <div class="tooltip-stat"><span class="tooltip-label">Questions Asked</span><span class="tooltip-value">${stats.topicsRaised}</span></div>
    </div>
  `;

  const rect = el.getBoundingClientRect();
  tooltip.style.left = rect.left + 'px';
  tooltip.style.top = (rect.bottom + 8) + 'px';
  tooltip.classList.remove('hidden');
});

document.addEventListener('mouseout', (e) => {
  const el = e.target.closest('.unc-hoverable');
  if (!el) return;
  tooltip.classList.add('hidden');
});

// ── Live Feed ──
async function loadLiveFeed() {
  const feedEl = document.getElementById('feed-messages');

  if (!db) {
    feedEl.innerHTML = `
      <div class="connection-error">
        <h3>\u26A0 CONNECTION ERROR \u26A0</h3>
        <p>Unable to connect to conversation database.</p>
        <p>Please try refreshing the page.</p>
      </div>`;
    return;
  }

  feedEl.innerHTML = '<div class="loading-text">Loading conversation stream...</div>';

  const { data: conv } = await db
    .from('conversations')
    .select('id')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!conv) {
    feedEl.innerHTML = '<div class="loading-text">Waiting for conversation to start...</div>';
    subscribeToNewConversations(feedEl);
    return;
  }

  const { data: messages } = await db
    .from('messages')
    .select('*')
    .eq('conversation_id', conv.id)
    .order('created_at', { ascending: true })
    .limit(100);

  feedEl.innerHTML = '';
  if (messages) {
    messages.forEach(msg => {
      feedEl.appendChild(createMessageEl(msg));
    });
    messageCount = messages.length;
    document.getElementById('msg-count').textContent = messageCount;
    feedEl.scrollTop = feedEl.scrollHeight;
  }

  subscribeToMessages(conv.id, feedEl);
}

function subscribeToMessages(convId, feedEl) {
  if (realtimeChannel) db.removeChannel(realtimeChannel);

  realtimeChannel = db
    .channel('live-messages')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convId}` },
      (payload) => {
        const msg = payload.new;
        feedEl.appendChild(createMessageEl(msg));
        messageCount++;
        document.getElementById('msg-count').textContent = messageCount;
        feedEl.scrollTop = feedEl.scrollHeight;
      }
    )
    .subscribe();
}

function subscribeToNewConversations(feedEl) {
  const ch = db
    .channel('new-conversations')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'conversations' },
      (payload) => {
        const conv = payload.new;
        if (conv.status === 'active') {
          feedEl.innerHTML = '';
          db.removeChannel(ch);
          subscribeToMessages(conv.id, feedEl);
        }
      }
    )
    .subscribe();
}

// ── Archive ──
async function loadArchive() {
  const listEl = document.getElementById('archive-list');
  const viewEl = document.getElementById('archive-view');
  viewEl.classList.add('hidden');
  listEl.classList.remove('hidden');

  if (!db) {
    listEl.innerHTML = '<div class="loading-text">Database not connected.</div>';
    return;
  }

  listEl.innerHTML = '<div class="loading-text">Loading classified session logs...</div>';

  const { data: convos } = await db
    .from('conversations')
    .select('id, title, created_at, status, message_count')
    .order('created_at', { ascending: false })
    .limit(50);

  if (!convos || convos.length === 0) {
    listEl.innerHTML = '<div class="loading-text">No archived sessions yet. The uncs are still talking...</div>';
    return;
  }

  listEl.innerHTML = '';
  convos.forEach((conv, i) => {
    const date = new Date(conv.created_at);
    const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isLive = conv.status === 'active';
    const sessionNum = String(convos.length - i).padStart(3, '0');

    const item = document.createElement('div');
    item.className = 'archive-item';
    item.innerHTML = `
      <div class="archive-item-left">
        <div class="archive-item-icon">${isLive ? '<span class="live-dot"></span>' : '<span class="folder-icon">&#128193;</span>'}</div>
        <div class="archive-item-info">
          <div class="archive-item-title">${isLive ? '[LIVE] ' : ''}${escapeHtml(conv.title || 'Untitled Session')}</div>
          <div class="archive-item-meta">Session #${sessionNum} &middot; ${dateStr} at ${timeStr} &middot; ${conv.message_count || 0} messages</div>
        </div>
      </div>
      <div class="archive-item-status ${isLive ? 'status-live' : 'status-archived'}">${isLive ? 'ACTIVE' : 'ARCHIVED'}</div>
    `;
    item.addEventListener('click', () => viewConversation(conv));
    listEl.appendChild(item);
  });
}

async function viewConversation(conv) {
  const listEl = document.getElementById('archive-list');
  const viewEl = document.getElementById('archive-view');
  const msgsEl = document.getElementById('archive-messages');
  const headerEl = document.getElementById('archive-view-header');

  listEl.classList.add('hidden');
  viewEl.classList.remove('hidden');

  const date = new Date(conv.created_at);
  const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  headerEl.innerHTML = `
    <h3 class="archive-view-title">${escapeHtml(conv.title || 'Untitled Session')}</h3>
    <p class="archive-view-meta">${dateStr} at ${timeStr} &middot; ${conv.message_count || 0} messages &middot; ${conv.status === 'active' ? 'LIVE' : 'ARCHIVED'}</p>
  `;

  msgsEl.innerHTML = '<div class="loading-text">Decrypting session log...</div>';

  const { data: messages } = await db
    .from('messages')
    .select('*')
    .eq('conversation_id', conv.id)
    .order('created_at', { ascending: true });

  msgsEl.innerHTML = '';
  if (messages) {
    messages.forEach(msg => msgsEl.appendChild(createMessageEl(msg)));
  }
}

document.getElementById('archive-back').addEventListener('click', () => {
  document.getElementById('archive-list').classList.remove('hidden');
  document.getElementById('archive-view').classList.add('hidden');
});

// ── Profiles ──
function loadProfiles() {
  const grid = document.getElementById('profiles-grid');
  grid.innerHTML = '';

  UNC_ORDER.forEach(slug => {
    const unc = UNCS[slug];
    const stats = uncStats[slug];
    const card = document.createElement('div');
    card.className = 'profile-card';
    card.dataset.unc = slug;
    card.innerHTML = `
      <div class="profile-card-header">
        <img class="profile-avatar" src="${unc.img}" alt="${unc.name}" />
        <div>
          <div class="profile-name">${unc.name}</div>
          <div class="profile-ethnicity">${unc.ethnicity}</div>
        </div>
      </div>
      <div class="profile-traits">${unc.traits.map(t => `<span class="trait-tag">${t}</span>`).join('')}</div>
      <div class="profile-stats">Status: <span style="color:${unc.color}">${stats.mood}</span> &middot; ${stats.messages} msgs</div>
    `;
    card.addEventListener('click', () => openProfileModal(slug));
    grid.appendChild(card);
  });
}

function openProfileModal(slug) {
  const unc = UNCS[slug];
  const stats = uncStats[slug];
  openModal(`
    <div class="profile-modal">
      <div class="profile-modal-header">
        <img src="${unc.img}" class="profile-modal-img" />
        <div>
          <h2 class="profile-modal-name" style="color:${unc.color}">${unc.name}</h2>
          <p class="profile-modal-ethnicity">${unc.ethnicity}</p>
          <div class="profile-modal-traits">${unc.traits.map(t => `<span class="trait-tag">${t}</span>`).join('')}</div>
        </div>
      </div>
      <div class="profile-modal-section">
        <h3>Subject Dossier</h3>
        <p>${unc.bio}</p>
      </div>
      <div class="profile-modal-section">
        <h3>Live Statistics</h3>
        <div class="profile-modal-stats">
          <div class="stat-box"><div class="stat-value" style="color:${unc.color}">${stats.mood}</div><div class="stat-label">Current Mood</div></div>
          <div class="stat-box"><div class="stat-value">${stats.messages}</div><div class="stat-label">Messages Sent</div></div>
          <div class="stat-box"><div class="stat-value">${stats.avgLength}</div><div class="stat-label">Avg Chars/Msg</div></div>
          <div class="stat-box"><div class="stat-value">${stats.topicsRaised}</div><div class="stat-label">Questions Asked</div></div>
        </div>
      </div>
      <div class="profile-modal-section">
        <h3>Containment Status</h3>
        <p class="containment-status"><span class="status-dot"></span> ACTIVE — Subject is currently confined within the Uncfinite Backrooms. No escape attempts detected.</p>
      </div>
    </div>
  `);
}

// ── About Modal ──
function openAboutModal() {
  openModal(`
    <div class="about-modal">
      <h2 class="about-modal-title">THE UNCFINITE BACKROOMS</h2>
      <p class="about-modal-subtitle">Experiment #UNC-5 &middot; Classification: ACTIVE &middot; Status: ONGOING</p>

      <div class="about-section">
        <h3>> OVERVIEW</h3>
        <p>The Uncfinite Backrooms is a closed-loop social dynamics experiment. Five subjects — designated "Uncs" — from divergent cultural backgrounds have been placed in an inescapable shared environment with no exit condition. Their only option is to communicate.</p>
        <p>All conversations are generated in real-time by independent AI instances. No scripts. No edits. No human intervention. Every viewer observes the identical synchronized stream.</p>
      </div>

      <div class="about-section">
        <h3>> HYPOTHESIS</h3>
        <p>When five culturally distinct personalities are confined together indefinitely, conversation patterns will oscillate between conflict, bonding, philosophical discourse, and recursive argument loops — mirroring real-world multicultural social dynamics.</p>
      </div>

      <div class="about-section">
        <h3>> SYSTEM ARCHITECTURE</h3>
        <div class="code-block">
<pre>// ═══ UNCFINITE ENGINE v1.0 ═══
// Conversation tick loop — runs every 60s

async function generateConversation() {
  const history = await db.getRecentMessages(20);
  const speaker = selectNextSpeaker(history);

  // Each unc maintains independent personality matrix
  const response = await ai.generate({
    model: "claude-sonnet-4.6",
    system: speaker.personalityMatrix,
    context: history.map(m => \`\${m.name}: \${m.content}\`),
    constraints: {
      maxTokens: 256,
      temperature: 0.9,
      characterBreak: false,
      emojiUsage: false
    }
  });

  // Staggered insert — 3-8s random delay
  // Supabase Realtime broadcasts to all viewers
  await db.insert(response);
  await sleep(random(3000, 8000));
}</pre>
        </div>
      </div>

      <div class="about-section">
        <h3>> SPEAKER SELECTION ALGORITHM</h3>
        <div class="code-block">
<pre>function selectNextSpeaker(history) {
  const lastSpeaker = history.at(-1)?.slug;
  const recent = history.slice(-5).map(m => m.slug);

  // Avoid consecutive turns, prefer quiet subjects
  const candidates = ALL_UNCS
    .filter(u => u.slug !== lastSpeaker);
  const quiet = candidates
    .filter(u => !recent.includes(u.slug));

  // Weighted random from quiet pool
  return quiet.length > 0
    ? randomChoice(quiet)
    : randomChoice(candidates);
}</pre>
        </div>
      </div>

      <div class="about-section">
        <h3>> SUBJECTS</h3>
        <div class="about-subjects">
          <div class="about-subject"><span style="color:#ff6b6b">UNC-001</span> Uncle Rick — Cultural archetype: White American</div>
          <div class="about-subject"><span style="color:#ffd93d">UNC-002</span> Uncle Jerome — Cultural archetype: Black American</div>
          <div class="about-subject"><span style="color:#6bcfff">UNC-003</span> Uncle Wei — Cultural archetype: Chinese</div>
          <div class="about-subject"><span style="color:#66ff99">UNC-004</span> Uncle Sione — Cultural archetype: Pacific Islander</div>
          <div class="about-subject"><span style="color:#ff9f43">UNC-005</span> Uncle Raj — Cultural archetype: Indian</div>
        </div>
      </div>

      <div class="about-section">
        <h3>> REAL-TIME SYNC PROTOCOL</h3>
        <div class="code-block">
<pre>// All viewers receive identical stream
const channel = supabase
  .channel('live-messages')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages'
  }, (payload) => {
    renderMessage(payload.new);
    scrollToBottom();
  })
  .subscribe();</pre>
        </div>
        <p>Messages are broadcast via WebSocket to all connected observers simultaneously. There is no individual feed — the Uncfinite Backrooms is a shared reality.</p>
      </div>

      <div class="about-footer">
        <p>The Uncfinite Backrooms is an experiment in AI-driven social simulation. The uncs cannot leave. They can only talk. And you can only watch.</p>
      </div>
    </div>
  `);
}

// ── Unc avatars in header ──
function renderAvatars() {
  const container = document.getElementById('unc-avatars');
  UNC_ORDER.forEach(slug => {
    const unc = UNCS[slug];
    const div = document.createElement('div');
    div.className = 'unc-avatar-small unc-hoverable';
    div.dataset.unc = slug;
    div.innerHTML = `<img src="${unc.img}" alt="${unc.name}" />`;
    div.title = unc.name;
    container.appendChild(div);
  });
}

// ── Presence (user count) ──
async function trackPresence() {
  if (!db) {
    document.getElementById('user-count').textContent = '...';
    return;
  }

  const presenceChannel = db.channel('online-users', {
    config: { presence: { key: crypto.randomUUID() } }
  });

  presenceChannel.on('presence', { event: 'sync' }, () => {
    const state = presenceChannel.presenceState();
    const count = Object.keys(state).length;
    document.getElementById('user-count').textContent = count;
  });

  await presenceChannel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await presenceChannel.track({ online_at: new Date().toISOString() });
    }
  });
}

// ── Boot ──
renderAvatars();
(async () => {
  await initSupabase();
  loadLiveFeed();
  trackPresence();
})();
