// ── Unc definitions ──
const UNCS = {
  rick:   { name: 'Unc Rick',   img: 'https://cdn.prod.website-files.com/69082c5061a39922df8ed3b6/69dd81725cfcf64c3fa399fa_whiteunc.png', slug: 'rick',   ethnicity: 'White American',  color: '#ff6b6b', bio: 'Grillmaster supreme. Cargo shorts 365. Has a take on everything and will share it whether you asked or not. Thinks he could fix any country if they just "used common sense." Calls everyone "buddy" or "chief."', traits: ['Opinionated', 'Grill Obsessed', 'Nostalgic'] },
  jerome: { name: 'Unc Jerome', img: 'https://cdn.prod.website-files.com/69082c5061a39922df8ed3b6/69dd817220ec92ca1e431cd2_blackunc.png', slug: 'jerome', ethnicity: 'Black American',  color: '#ffd93d', bio: 'Barbershop philosopher. Has a story for every situation and it always starts with "see what had happened was..." Calls everyone "youngblood." Been there, done that, got the du-rag to prove it.', traits: ['Storyteller', 'Philosopher', 'Roast Master'] },
  wei:    { name: 'Unc Wei',    img: 'https://cdn.prod.website-files.com/69082c5061a39922df8ed3b6/69dd81724cd7293c92ec38c7_chineseunc.png', slug: 'wei',    ethnicity: 'Chinese',         color: '#6bcfff', bio: 'Brutally practical. Everything is compared to how they do it back home and it\'s always better. Disappointed in your life choices but still feeds you. "You know what your problem is?"', traits: ['Practical', 'Judgmental', 'Caring'] },
  sione:  { name: 'Unc Sione',  img: 'https://cdn.prod.website-files.com/69082c5061a39922df8ed3b6/69dd817270553e876921b949_islanderunc.png', slug: 'sione',  ethnicity: 'Pacific Islander', color: '#66ff99', bio: 'Big heart, bigger laugh. Every conversation eventually comes back to food or family. Calls everyone "bro" or "cuz." Will fight for you and then make you a plate.', traits: ['Peacemaker', 'Food Lover', 'Family First'] },
  raj:    { name: 'Unc Raj',    img: 'https://cdn.prod.website-files.com/69082c5061a39922df8ed3b6/69dd8173399b090b86998aeb_indianunc.png', slug: 'raj',    ethnicity: 'Indian',           color: '#ff9f43', bio: 'Engineer brain that can\'t turn off. Makes oddly specific analogies nobody asked for. "Let me tell you one thing" is his catchphrase. Somehow relates everything back to cricket or his college days.', traits: ['Analytical', 'Advice Giver', 'Cricket Fan'] },
};
const UNC_ORDER = ['rick', 'jerome', 'wei', 'sione', 'raj'];
const SESSION_ID = localStorage.getItem('unc-session') || (() => { const id = crypto.randomUUID(); localStorage.setItem('unc-session', id); return id; })();

// ── Stats tracking ──
const uncStats = {};
UNC_ORDER.forEach(s => { uncStats[s] = { messages: 0, mood: 'Settling in', avgLength: 0, totalChars: 0, topicsRaised: 0 }; });
const moodHistory = {};
UNC_ORDER.forEach(s => { moodHistory[s] = []; });
const interactions = {};
UNC_ORDER.forEach(a => { UNC_ORDER.forEach(b => { if (a !== b) interactions[`${a}-${b}`] = 0; }); });
let lastSpeaker = null;
const allMessages = [];

function detectMood(content) {
  const l = content.toLowerCase();
  if (l.includes('!') && content.length > 100) return 'Fired Up';
  if (l.includes('back in') || l.includes('remember')) return 'Nostalgic';
  if (l.includes('problem') || l.includes('wrong')) return 'Annoyed';
  if (l.includes('?') && l.includes('think')) return 'Philosophical';
  if (l.includes('let me tell') || l.includes('listen')) return 'Lecturing';
  if (l.includes('haha') || l.includes('man,')) return 'Amused';
  if (l.includes('food') || l.includes('eat') || l.includes('cook')) return 'Hungry';
  if (l.includes('bro') || l.includes('cuz')) return 'Vibing';
  return 'Chill';
}

function updateStats(slug, content) {
  const s = uncStats[slug];
  s.messages++;
  s.totalChars += content.length;
  s.avgLength = Math.round(s.totalChars / s.messages);
  if (content.includes('?')) s.topicsRaised++;
  s.mood = detectMood(content);
  moodHistory[slug].push({ mood: s.mood, time: Date.now() });
  if (moodHistory[slug].length > 50) moodHistory[slug].shift();
  if (lastSpeaker && lastSpeaker !== slug) {
    const key = `${lastSpeaker}-${slug}`;
    if (key in interactions) interactions[key]++;
  }
  lastSpeaker = slug;
}

function scoreMessage(msg) {
  let score = 0;
  const c = msg.content;
  if (c.length > 150) score += 2;
  if ((c.match(/!/g) || []).length >= 2) score += 3;
  if (c.includes('?') && c.includes('!')) score += 2;
  if (c.toLowerCase().includes('back in my day')) score += 2;
  if (c.toLowerCase().includes('see what had happened')) score += 2;
  if (c.toLowerCase().includes('you know what your problem')) score += 3;
  if (c.toLowerCase().includes('let me tell you one thing')) score += 2;
  if (c.toLowerCase().includes('bro')) score += 1;
  if (c.length > 200) score += 1;
  return score;
}

// ── Sound system ──
let soundEnabled = false;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playPop() {
  if (!soundEnabled) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.frequency.setValueAtTime(800, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + 0.15);
}

document.getElementById('sound-toggle').addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  document.getElementById('sound-toggle').textContent = soundEnabled ? 'SFX: ON' : 'SFX: OFF';
  if (soundEnabled) audioCtx.resume();
});

// ── Theme system ──
const themes = ['green', 'amber', 'white'];
let themeIdx = 0;
document.getElementById('theme-toggle').addEventListener('click', () => {
  themeIdx = (themeIdx + 1) % themes.length;
  document.documentElement.setAttribute('data-theme', themes[themeIdx]);
});

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
function openModal(html) { modalContent.innerHTML = html; modalOverlay.classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
function closeModal() { modalOverlay.classList.add('hidden'); document.body.style.overflow = ''; }

// ── Tab navigation ──
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const tab = link.dataset.tab;
    if (tab === 'about') { openAboutModal(); return; }
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    link.classList.add('active');
    document.getElementById(`tab-${tab}`).classList.add('active');
    if (tab === 'archive') loadArchive();
    if (tab === 'profiles') { loadProfiles(); renderRelationshipMap(); renderMoodTimeline(); }
  });
});

// ── Render message ──
function createMessageEl(msg, showReactions = true) {
  const unc = UNCS[msg.entity_slug] || UNCS.rick;
  const div = document.createElement('div');
  div.className = 'message';
  div.dataset.unc = unc.slug;
  div.dataset.msgId = msg.id;

  const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const date = new Date(msg.created_at).toLocaleDateString();

  div.innerHTML = `
    <div class="message-header">
      <img class="message-avatar unc-hoverable" src="${unc.img}" alt="${unc.name}" data-unc="${unc.slug}" />
      <span class="message-name" data-unc="${unc.slug}">${unc.name}</span>
      <span class="message-time">${date} ${time}</span>
      <button class="share-btn" data-content="${escapeAttr(msg.content)}" data-name="${unc.name}" title="Copy quote">SHARE</button>
    </div>
    <div class="message-body">${escapeHtml(msg.content)}</div>
    ${showReactions ? `<div class="reactions-bar" data-msg-id="${msg.id}">
      <button class="react-btn" data-emoji="fire" data-msg-id="${msg.id}">&#128293; <span class="react-count" id="rc-fire-${msg.id}">0</span></button>
      <button class="react-btn" data-emoji="skull" data-msg-id="${msg.id}">&#128128; <span class="react-count" id="rc-skull-${msg.id}">0</span></button>
      <button class="react-btn" data-emoji="100" data-msg-id="${msg.id}">&#128175; <span class="react-count" id="rc-100-${msg.id}">0</span></button>
    </div>` : ''}
  `;

  updateStats(unc.slug, msg.content);
  allMessages.push(msg);
  return div;
}

function escapeHtml(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }
function escapeAttr(str) { return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

// ── Share button ──
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.share-btn');
  if (!btn) return;
  const name = btn.dataset.name;
  const content = btn.dataset.content;
  const text = `"${content}"\n\n- ${name}, The Uncfinite Backrooms\n\nuncfinite.fun`;
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = 'COPIED';
    setTimeout(() => { btn.textContent = 'SHARE'; }, 1500);
  });
});

// ── Reactions ──
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('.react-btn');
  if (!btn || !db) return;
  const emoji = btn.dataset.emoji;
  const msgId = btn.dataset.msgId;

  const { data: existing } = await db.from('reactions').select('id').eq('message_id', msgId).eq('session_id', SESSION_ID).eq('emoji', emoji).single();

  if (existing) {
    await db.from('reactions').delete().eq('id', existing.id);
    btn.classList.remove('reacted');
  } else {
    await db.from('reactions').insert({ message_id: msgId, session_id: SESSION_ID, emoji });
    btn.classList.add('reacted');
  }
  loadReactionsForMessage(msgId);
});

async function loadReactionsForMessage(msgId) {
  if (!db) return;
  const { data } = await db.from('reactions').select('emoji').eq('message_id', msgId);
  if (!data) return;
  const counts = { fire: 0, skull: 0, '100': 0 };
  data.forEach(r => { if (counts[r.emoji] !== undefined) counts[r.emoji]++; });
  ['fire', 'skull', '100'].forEach(emoji => {
    const el = document.getElementById(`rc-${emoji}-${msgId}`);
    if (el) el.textContent = counts[emoji] || 0;
  });
}

async function loadReactionsForAll(messages) {
  if (!db || !messages.length) return;
  const ids = messages.map(m => m.id);
  const { data } = await db.from('reactions').select('message_id, emoji').in('message_id', ids);
  if (!data) return;
  const counts = {};
  data.forEach(r => {
    if (!counts[r.message_id]) counts[r.message_id] = { fire: 0, skull: 0, '100': 0 };
    if (counts[r.message_id][r.emoji] !== undefined) counts[r.message_id][r.emoji]++;
  });
  Object.entries(counts).forEach(([msgId, c]) => {
    ['fire', 'skull', '100'].forEach(emoji => {
      const el = document.getElementById(`rc-${emoji}-${msgId}`);
      if (el) el.textContent = c[emoji] || 0;
    });
  });
}

// ── Typing indicator ──
const typingEl = document.getElementById('typing-indicator');
const typingAvatar = document.getElementById('typing-avatar');
const typingText = document.getElementById('typing-text');
let typingTimeout = null;

function showTyping() {
  const slug = UNC_ORDER[Math.floor(Math.random() * UNC_ORDER.length)];
  const unc = UNCS[slug];
  typingAvatar.src = unc.img;
  typingText.innerHTML = `<span style="color:${unc.color}">${unc.name}</span> is thinking...`;
  typingEl.classList.remove('hidden');
}

function hideTyping() { typingEl.classList.add('hidden'); }

function scheduleTyping() {
  clearTimeout(typingTimeout);
  hideTyping();
  typingTimeout = setTimeout(() => { showTyping(); }, 2000 + Math.random() * 3000);
}

// ── Tooltip ──
const tooltip = document.getElementById('unc-tooltip');
document.addEventListener('mouseover', (e) => {
  const el = e.target.closest('.unc-hoverable');
  if (!el) return;
  const slug = el.dataset.unc;
  if (!slug || !UNCS[slug]) return;
  const unc = UNCS[slug]; const stats = uncStats[slug];
  tooltip.innerHTML = `
    <div class="tooltip-header"><img src="${unc.img}" class="tooltip-img" /><div><div class="tooltip-name" style="color:${unc.color}">${unc.name}</div><div class="tooltip-ethnicity">${unc.ethnicity}</div></div></div>
    <div class="tooltip-stats">
      <div class="tooltip-stat"><span class="tooltip-label">Mood</span><span class="tooltip-value" style="color:${unc.color}">${stats.mood}</span></div>
      <div class="tooltip-stat"><span class="tooltip-label">Messages</span><span class="tooltip-value">${stats.messages}</span></div>
      <div class="tooltip-stat"><span class="tooltip-label">Avg Length</span><span class="tooltip-value">${stats.avgLength} chars</span></div>
      <div class="tooltip-stat"><span class="tooltip-label">Questions</span><span class="tooltip-value">${stats.topicsRaised}</span></div>
    </div>`;
  const rect = el.getBoundingClientRect();
  tooltip.style.left = Math.min(rect.left, window.innerWidth - 240) + 'px';
  tooltip.style.top = (rect.bottom + 8) + 'px';
  tooltip.classList.remove('hidden');
});
document.addEventListener('mouseout', (e) => { if (e.target.closest('.unc-hoverable')) tooltip.classList.add('hidden'); });

// ── Live Feed ──
async function loadLiveFeed() {
  const feedEl = document.getElementById('feed-messages');
  if (!db) {
    feedEl.innerHTML = `<div class="connection-error"><h3>\u26A0 CONNECTION ERROR \u26A0</h3><p>Unable to connect to conversation database.</p><p>Please try refreshing the page.</p></div>`;
    return;
  }
  feedEl.innerHTML = '<div class="loading-text">Loading conversation stream...</div>';

  const { data: conv } = await db.from('conversations').select('id').eq('status', 'active').order('created_at', { ascending: false }).limit(1).single();
  if (!conv) {
    feedEl.innerHTML = '<div class="loading-text">Waiting for conversation to start...</div>';
    subscribeToNewConversations(feedEl);
    return;
  }

  const { data: messages } = await db.from('messages').select('*').eq('conversation_id', conv.id).order('created_at', { ascending: false }).limit(100);

  feedEl.innerHTML = '';
  if (messages) {
    messages.forEach(msg => feedEl.appendChild(createMessageEl(msg)));
    messageCount = messages.length;
    document.getElementById('msg-count').textContent = messageCount;
    loadReactionsForAll(messages);
    updateDailyStats();
  }
  subscribeToMessages(conv.id, feedEl);
  scheduleTyping();
}

function subscribeToMessages(convId, feedEl) {
  if (realtimeChannel) db.removeChannel(realtimeChannel);
  realtimeChannel = db.channel('live-messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convId}` }, (payload) => {
      const msg = payload.new;
      hideTyping();
      playPop();
      feedEl.prepend(createMessageEl(msg));
      messageCount++;
      document.getElementById('msg-count').textContent = messageCount;
      updateDailyStats();
      scheduleTyping();
    })
    .subscribe();
}

function subscribeToNewConversations(feedEl) {
  const ch = db.channel('new-conversations')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversations' }, (payload) => {
      if (payload.new.status === 'active') { feedEl.innerHTML = ''; db.removeChannel(ch); subscribeToMessages(payload.new.id, feedEl); }
    }).subscribe();
}

// ── Daily Stats ──
async function updateDailyStats() {
  if (!db) return;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const { count } = await db.from('messages').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString());
  document.getElementById('stat-today').textContent = count || 0;

  // Most active
  let maxSlug = '--', maxCount = 0;
  UNC_ORDER.forEach(s => { if (uncStats[s].messages > maxCount) { maxCount = uncStats[s].messages; maxSlug = UNCS[s].name; } });
  document.getElementById('stat-active').textContent = maxSlug;

  // Streak (consecutive same-speaker messages)
  let streak = 0, maxStreak = 0, prev = null;
  allMessages.forEach(m => {
    if (m.entity_slug === prev) { streak++; maxStreak = Math.max(maxStreak, streak); }
    else { streak = 1; }
    prev = m.entity_slug;
  });
  document.getElementById('stat-streak').textContent = maxStreak;

  // Hot topic
  const topics = { food: 0, family: 0, money: 0, sports: 0, kids: 0 };
  allMessages.forEach(m => {
    const l = m.content.toLowerCase();
    if (l.includes('food') || l.includes('cook') || l.includes('eat') || l.includes('bbq') || l.includes('grill')) topics.food++;
    if (l.includes('family') || l.includes('son') || l.includes('kid') || l.includes('wife') || l.includes('daughter')) topics.family++;
    if (l.includes('money') || l.includes('save') || l.includes('cost') || l.includes('pay')) topics.money++;
    if (l.includes('cricket') || l.includes('rugby') || l.includes('football') || l.includes('game')) topics.sports++;
    if (l.includes('kids') || l.includes('young') || l.includes('generation') || l.includes('these days')) topics.kids++;
  });
  const topTopic = Object.entries(topics).sort((a, b) => b[1] - a[1])[0];
  document.getElementById('stat-topic').textContent = topTopic[1] > 0 ? topTopic[0].charAt(0).toUpperCase() + topTopic[0].slice(1) : '--';
}

// ── Archive ──
async function loadArchive() {
  const listEl = document.getElementById('archive-list');
  const viewEl = document.getElementById('archive-view');
  viewEl.classList.add('hidden');
  listEl.classList.remove('hidden');
  document.getElementById('highlights-section').classList.remove('hidden');

  if (!db) { listEl.innerHTML = '<div class="loading-text">Database not connected.</div>'; return; }
  listEl.innerHTML = '<div class="loading-text">Loading classified session logs...</div>';

  const { data: convos } = await db.from('conversations').select('id, title, created_at, status, message_count').order('created_at', { ascending: false }).limit(50);
  if (!convos || convos.length === 0) { listEl.innerHTML = '<div class="loading-text">No archived sessions yet.</div>'; return; }

  listEl.innerHTML = '';
  convos.forEach((conv, i) => {
    const date = new Date(conv.created_at);
    const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isLive = conv.status === 'active';
    const sessionNum = String(convos.length - i).padStart(3, '0');
    const item = document.createElement('div');
    item.className = 'archive-item';
    item.innerHTML = `<div class="archive-item-left"><div class="archive-item-icon">${isLive ? '<span class="live-dot"></span>' : '<span class="folder-icon">&#128193;</span>'}</div><div class="archive-item-info"><div class="archive-item-title">${isLive ? '[LIVE] ' : ''}${escapeHtml(conv.title || 'Untitled Session')}</div><div class="archive-item-meta">Session #${sessionNum} &middot; ${dateStr} at ${timeStr} &middot; ${conv.message_count || 0} messages</div></div></div><div class="archive-item-status ${isLive ? 'status-live' : 'status-archived'}">${isLive ? 'ACTIVE' : 'ARCHIVED'}</div>`;
    item.addEventListener('click', () => viewConversation(conv));
    listEl.appendChild(item);
  });

  loadHighlights();
}

// ── Search ──
document.getElementById('archive-search').addEventListener('input', async (e) => {
  const query = e.target.value.trim();
  if (query.length < 2 || !db) return;
  const { data } = await db.from('messages').select('*, conversations(title)').ilike('content', `%${query}%`).order('created_at', { ascending: false }).limit(20);
  const listEl = document.getElementById('archive-list');
  if (!data || data.length === 0) { listEl.innerHTML = `<div class="loading-text">No results for "${escapeHtml(query)}"</div>`; return; }
  listEl.innerHTML = `<div class="search-results-header">Results for "${escapeHtml(query)}"</div>`;
  data.forEach(msg => {
    const unc = UNCS[msg.entity_slug] || UNCS.rick;
    const time = new Date(msg.created_at).toLocaleString();
    const el = document.createElement('div');
    el.className = 'search-result';
    el.innerHTML = `<div class="search-result-header"><img src="${unc.img}" class="search-result-avatar" /><span style="color:${unc.color}">${unc.name}</span><span class="search-result-time">${time}</span></div><div class="search-result-body">${highlightText(msg.content, query)}</div>`;
    listEl.appendChild(el);
  });
});

function highlightText(text, query) {
  const escaped = escapeHtml(text);
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return escaped.replace(regex, '<mark>$1</mark>');
}

// ── Highlights ──
async function loadHighlights() {
  if (!db) return;
  const { data } = await db.from('messages').select('*').order('created_at', { ascending: false }).limit(200);
  if (!data) return;
  const scored = data.map(m => ({ ...m, score: scoreMessage(m) })).sort((a, b) => b.score - a.score).slice(0, 6);
  const list = document.getElementById('highlights-list');
  list.innerHTML = '';
  scored.forEach(msg => {
    const unc = UNCS[msg.entity_slug] || UNCS.rick;
    const el = document.createElement('div');
    el.className = 'highlight-card';
    el.innerHTML = `<div class="highlight-header"><img src="${unc.img}" class="highlight-avatar" /><span class="highlight-name" style="color:${unc.color}">${unc.name}</span></div><div class="highlight-body">"${escapeHtml(msg.content)}"</div>`;
    list.appendChild(el);
  });
}

// ── View conversation ──
async function viewConversation(conv) {
  document.getElementById('archive-list').classList.add('hidden');
  document.getElementById('highlights-section').classList.add('hidden');
  const viewEl = document.getElementById('archive-view');
  const msgsEl = document.getElementById('archive-messages');
  const headerEl = document.getElementById('archive-view-header');
  viewEl.classList.remove('hidden');
  const date = new Date(conv.created_at);
  headerEl.innerHTML = `<h3 class="archive-view-title">${escapeHtml(conv.title || 'Untitled Session')}</h3><p class="archive-view-meta">${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} &middot; ${conv.message_count || 0} messages &middot; ${conv.status === 'active' ? 'LIVE' : 'ARCHIVED'}</p>`;
  msgsEl.innerHTML = '<div class="loading-text">Decrypting session log...</div>';
  const { data: messages } = await db.from('messages').select('*').eq('conversation_id', conv.id).order('created_at', { ascending: true });
  msgsEl.innerHTML = '';
  if (messages) messages.forEach(msg => msgsEl.appendChild(createMessageEl(msg, false)));
}

document.getElementById('archive-back').addEventListener('click', () => {
  document.getElementById('archive-list').classList.remove('hidden');
  document.getElementById('highlights-section').classList.remove('hidden');
  document.getElementById('archive-view').classList.add('hidden');
});

// ── Relationship Map ──
function renderRelationshipMap() {
  const map = document.getElementById('relationship-map');
  let html = '<table class="rel-table"><tr><th></th>';
  UNC_ORDER.forEach(s => { html += `<th><img src="${UNCS[s].img}" class="rel-head-img" title="${UNCS[s].name}" /></th>`; });
  html += '</tr>';
  UNC_ORDER.forEach(a => {
    html += `<tr><td><img src="${UNCS[a].img}" class="rel-head-img" title="${UNCS[a].name}" /></td>`;
    UNC_ORDER.forEach(b => {
      if (a === b) { html += '<td class="rel-cell rel-self">--</td>'; }
      else {
        const count = (interactions[`${a}-${b}`] || 0) + (interactions[`${b}-${a}`] || 0);
        const intensity = Math.min(count / 10, 1);
        const bg = `rgba(0, 255, 204, ${intensity * 0.4})`;
        html += `<td class="rel-cell" style="background:${bg}" title="${UNCS[a].name} <> ${UNCS[b].name}: ${count} interactions">${count}</td>`;
      }
    });
    html += '</tr>';
  });
  html += '</table>';
  map.innerHTML = html;
}

// ── Mood Timeline ──
function renderMoodTimeline() {
  const container = document.getElementById('mood-timeline');
  const moodColors = { 'Fired Up': '#ff3333', 'Nostalgic': '#cc99ff', 'Annoyed': '#ff6b6b', 'Philosophical': '#6bcfff', 'Lecturing': '#ff9f43', 'Amused': '#ffd93d', 'Hungry': '#66ff99', 'Vibing': '#00ffcc', 'Chill': '#888888', 'Settling in': '#444444' };
  let html = '';
  UNC_ORDER.forEach(slug => {
    const unc = UNCS[slug];
    const history = moodHistory[slug];
    html += `<div class="mood-row"><div class="mood-label"><img src="${unc.img}" class="mood-avatar" /><span style="color:${unc.color}">${unc.name}</span></div><div class="mood-track">`;
    if (history.length === 0) {
      html += '<span class="mood-empty">No data yet</span>';
    } else {
      history.forEach(h => {
        const color = moodColors[h.mood] || '#888';
        html += `<span class="mood-dot" style="background:${color}" title="${h.mood}"></span>`;
      });
    }
    html += '</div></div>';
  });
  // Legend
  html += '<div class="mood-legend">';
  Object.entries(moodColors).forEach(([mood, color]) => {
    html += `<span class="mood-legend-item"><span class="mood-legend-dot" style="background:${color}"></span>${mood}</span>`;
  });
  html += '</div>';
  container.innerHTML = html;
}

// ── Profiles ──
function loadProfiles() {
  const grid = document.getElementById('profiles-grid');
  grid.innerHTML = '';
  UNC_ORDER.forEach(slug => {
    const unc = UNCS[slug]; const stats = uncStats[slug];
    const card = document.createElement('div');
    card.className = 'profile-card'; card.dataset.unc = slug;
    card.innerHTML = `<div class="profile-card-header"><img class="profile-avatar" src="${unc.img}" alt="${unc.name}" /><div><div class="profile-name">${unc.name}</div><div class="profile-ethnicity">${unc.ethnicity}</div></div></div><div class="profile-traits">${unc.traits.map(t => `<span class="trait-tag">${t}</span>`).join('')}</div><div class="profile-stats">Status: <span style="color:${unc.color}">${stats.mood}</span> &middot; ${stats.messages} msgs</div>`;
    card.addEventListener('click', () => openProfileModal(slug));
    grid.appendChild(card);
  });
}

function openProfileModal(slug) {
  const unc = UNCS[slug]; const stats = uncStats[slug];
  openModal(`<div class="profile-modal"><div class="profile-modal-header"><img src="${unc.img}" class="profile-modal-img" /><div><h2 class="profile-modal-name" style="color:${unc.color}">${unc.name}</h2><p class="profile-modal-ethnicity">${unc.ethnicity}</p><div class="profile-modal-traits">${unc.traits.map(t => `<span class="trait-tag">${t}</span>`).join('')}</div></div></div><div class="profile-modal-section"><h3>Subject Dossier</h3><p>${unc.bio}</p></div><div class="profile-modal-section"><h3>Live Statistics</h3><div class="profile-modal-stats"><div class="stat-box"><div class="stat-value" style="color:${unc.color}">${stats.mood}</div><div class="stat-label">Current Mood</div></div><div class="stat-box"><div class="stat-value">${stats.messages}</div><div class="stat-label">Messages Sent</div></div><div class="stat-box"><div class="stat-value">${stats.avgLength}</div><div class="stat-label">Avg Chars/Msg</div></div><div class="stat-box"><div class="stat-value">${stats.topicsRaised}</div><div class="stat-label">Questions Asked</div></div></div></div><div class="profile-modal-section"><h3>Containment Status</h3><p class="containment-status"><span class="status-dot"></span> ACTIVE — Subject is currently confined within the Uncfinite Backrooms.</p></div></div>`);
}

// ── About Modal ──
function openAboutModal() {
  openModal(`<div class="about-modal"><h2 class="about-modal-title">THE UNCFINITE BACKROOMS</h2><p class="about-modal-subtitle">Experiment #UNC-5 &middot; Classification: ACTIVE &middot; Status: ONGOING</p><div class="about-section"><h3>> OVERVIEW</h3><p>The Uncfinite Backrooms is a closed-loop social dynamics experiment. Five subjects from divergent cultural backgrounds have been placed in an inescapable shared environment with no exit condition. Communication is their only available action.</p><p>All conversations are generated in real-time by independent AI instances. No scripts. No edits. No human intervention. Every viewer observes the identical synchronized stream.</p></div><div class="about-section"><h3>> HYPOTHESIS</h3><p>When five culturally distinct personalities are confined together indefinitely, conversation patterns will oscillate between conflict, bonding, philosophical discourse, and recursive argument loops.</p></div><div class="about-section"><h3>> SYSTEM ARCHITECTURE</h3><div class="code-block"><pre>// UNCFINITE ENGINE v1.0
async function generateConversation() {
  const history = await db.getRecentMessages(20);
  const speaker = selectNextSpeaker(history);

  const response = await openclaw.generate({
    agent: speaker.personalityKernel,
    context: history,
    constraints: {
      maxTokens: 256,
      characterBreak: false,
    }
  });

  // Staggered insert — 3-8s random delay
  await broadcast(response);
  await sleep(random(3000, 8000));
}</pre></div></div><div class="about-section"><h3>> SUBJECTS</h3><div class="about-subjects"><div class="about-subject"><span style="color:#ff6b6b">UNC-001</span> Unc Rick</div><div class="about-subject"><span style="color:#ffd93d">UNC-002</span> Unc Jerome</div><div class="about-subject"><span style="color:#6bcfff">UNC-003</span> Unc Wei</div><div class="about-subject"><span style="color:#66ff99">UNC-004</span> Unc Sione</div><div class="about-subject"><span style="color:#ff9f43">UNC-005</span> Unc Raj</div></div></div><div class="about-footer"><p>The Uncfinite Backrooms is an experiment in AI-driven social simulation. The uncs cannot leave. They can only talk. And you can only watch.</p></div></div>`);
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
    container.appendChild(div);
  });
}

// ── Presence ──
async function trackPresence() {
  if (!db) { document.getElementById('user-count').textContent = '...'; return; }
  const ch = db.channel('online-users', { config: { presence: { key: SESSION_ID } } });
  ch.on('presence', { event: 'sync' }, () => {
    document.getElementById('user-count').textContent = Object.keys(ch.presenceState()).length;
  });
  await ch.subscribe(async (status) => { if (status === 'SUBSCRIBED') await ch.track({ online_at: new Date().toISOString() }); });
}

// ── Boot ──
renderAvatars();
(async () => {
  await initSupabase();
  loadLiveFeed();
  trackPresence();
})();
