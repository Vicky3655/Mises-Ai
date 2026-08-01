/* ============================================================
   MISE AI  |  mise-ai.js  (Supabase edition)
   ============================================================ */

/* ── STATE ───────────────────────────────────────────────── */
const state = {
  chatCount:   0,
  totalChats:  7,
  notifCount:  2,
  toastTimer:  null,
  isTyping:    false,
};

/* ── HISTORY DATA ────────────────────────────────────────── */
const HISTORY = [
  { title: 'Ingredients For Making Jollof Rice',    meta: 'Today, 8:42 PM',  icon: 'bowl' },
  { title: 'What Can I Cook For An Afternoon Meal?',meta: 'Today, 4:15 PM',  icon: 'clock' },
  { title: 'What Must I Have To Make Amala?',       meta: 'Today, 1:30 PM',  icon: 'bowl' },
  { title: 'Best way to season Egusi soup',         meta: 'Yesterday',        icon: 'leaf' },
  { title: 'Suya marinade recipe',                  meta: 'Yesterday',        icon: 'flame' },
  { title: 'How to make crispy plantain',           meta: '2 days ago',       icon: 'chef' },
  { title: 'Scanned: Tomato & pepper blend',        meta: '3 days ago',       icon: 'scan' },
];

/* Icon SVG map */
const ICONS = {
  bowl:  `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75-1.5.75a3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0L3 16.5m15-3.379a48.474 48.474 0 0 0-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 0 1 3 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 0 1 6 13.12M12.265 3.11a.375.375 0 1 1-.53 0L12 2.845l.265.265Zm-3 0a.375.375 0 1 1-.53 0L9 2.845l.265.265Zm6 0a.375.375 0 1 1-.53 0L15 2.845l.265.265Z"/></svg>`,
  clock: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>`,
  leaf:  `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12.75 3.03v.568c0 .334.148.65.405.864l1.068.89c.442.369.535 1.01.216 1.49l-.51.766a2.25 2.25 0 0 1-1.161.886l-.143.048a1.107 1.107 0 0 0-.57 1.664c.369.555.169 1.307-.427 1.605L9 13.125l.423 1.059a.956.956 0 0 1-1.652.928l-.679-.906a1.125 1.125 0 0 0-1.906.172L4.5 15.75l-.612.153M12.75 3.031a9 9 0 0 0-8.862 12.872M12.75 3.031a9 9 0 0 1 6.69 14.036m0 0-.177-.529A2.249 2.249 0 0 0 17.128 15H16.5l-.324-.324a1.453 1.453 0 0 0-2.328.377l-.036.073a1.586 1.586 0 0 1-.982.816l-.99.282c-.55.157-.894.702-.8 1.267l.073.438c.08.474.49.821.97.821.846 0 1.598.542 1.865 1.345l.215.643"/></svg>`,
  flame: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z"/></svg>`,
  chef:  `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5"/></svg>`,
  scan:  `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 3.75H6A2.25 2.25 0 0 0 3.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0 1 20.25 6v1.5m0 9V18A2.25 2.25 0 0 1 18 20.25h-1.5m-9 0H6A2.25 2.25 0 0 1 3.75 18v-1.5M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg>`,
};

/* ── AI CHAT ─────────────────────────────────────────────────
   Routed through the `chat` Supabase Edge Function (see
   supabase/functions/chat/index.ts) instead of calling
   api.anthropic.com directly. The API key now lives server-side
   as a Supabase secret — it is never present in this file. */
async function fetchAIResponse(text) {
  const { data, error } = await window.sb.functions.invoke('chat', {
    body: {
      system: "You are Mise AI, a warm and expert Nigerian/West African culinary assistant. " +
              "Help with cooking, recipes, substitutions, and meal planning. Keep replies " +
              "friendly, practical, and concise (2-4 sentences unless more detail is clearly needed).",
      messages: [{ role: 'user', content: text }],
    },
  });
  if (error) throw error;
  return data?.content?.[0]?.text || "Sorry, I couldn't get a response. Please try again.";
}

async function sendMessage(text) {
  if (!text || !text.trim() || state.isTyping) return;
  text = text.trim();

  appendMessage('user', text);
  state.chatCount++;
  state.totalChats++;
  if (dom['chatCountStat']) dom['chatCountStat'].textContent = state.chatCount;
  if (dom['totalChats'])    dom['totalChats'].textContent    = state.totalChats;
  addHistoryItem(text);

  state.isTyping = true;
  const typingEl = appendTyping();

  try {
    const reply = await fetchAIResponse(text);
    typingEl.remove();
    appendMessage('ai', reply);
  } catch (err) {
    console.error('[mise-ai] chat failed:', err);
    typingEl.remove();
    appendMessage('ai', "I had a glitch in the kitchen — please try again in a moment.");
  }
  state.isTyping = false;
}

/* ── USER RENDERING ──────────────────────────────────────────
   Reads full_name/avatar_url straight from the session's
   user_metadata (set at signup — see supabase-client.js's
   MiseAuth.signup). No extra DB round trip needed for this. */
function renderMiseUser(user) {
  const meta = user.user_metadata || {};
  const displayName = meta.full_name || user.email || 'Chef';
  const firstName = displayName.split(' ')[0];

  const nameEl = document.getElementById('userFirstName');
  if (nameEl) nameEl.textContent = firstName;

  const avatarEl = dom['avatarBtn'];
  if (avatarEl) avatarEl.src = meta.avatar_url || initialsAvatar(displayName);
}

function initialsAvatar(name) {
  const initials = (name || '?')
    .split(' ')
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80">
    <rect width="80" height="80" rx="40" fill="#E8611A"/>
    <text x="50%" y="52%" dy=".35em" text-anchor="middle"
      font-family="Plus Jakarta Sans, sans-serif" font-size="30" fill="#fff">${initials}</text>
  </svg>`;
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

/* ── DOM CACHE ───────────────────────────────────────────── */
let dom = {};

function cacheDOM() {
  const ids = [
    'chatInput', 'sendBtn', 'messagesArea', 'historyList',
    'toast', 'notifBadge', 'notifBtn', 'avatarBtn',
    'chatCountStat', 'totalChats',
    'qaSmartChat', 'qaVoice', 'qaScan', 'qaVideo',
    'centerTop',
  ];
  ids.forEach(id => { dom[id] = document.getElementById(id); });
}

/* ── TOAST ───────────────────────────────────────────────── */
function showToast(msg) {
  const t = dom['toast'];
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  if (state.toastTimer) clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

/* ── TIME ────────────────────────────────────────────────── */
function nowTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function appendMessage(role, text) {
  const area = dom['messagesArea'];
  if (!area) return;

  const wrap = document.createElement('div');
  wrap.className = `msg-bubble ${role}`;

  const avatarEl = role === 'user'
    ? `<img class="msg-avatar" src="https://i.pravatar.cc/80?img=11" alt="You">`
    : `<div class="msg-avatar ai"><img src="mise_ai_logo.png" alt="AI"></div>`;

  wrap.innerHTML = `
    ${avatarEl}
    <div class="msg-body">
      <div class="msg-text">${escapeHTML(text)}</div>
      <div class="msg-time">${nowTime()}</div>
    </div>
  `;

  area.appendChild(wrap);
  scrollBottom();
}

function appendTyping() {
  const area = dom['messagesArea'];
  const wrap = document.createElement('div');
  wrap.className = 'msg-bubble ai';
  wrap.innerHTML = `
    <div class="msg-avatar ai"><img src="mise_ai_logo.png" alt="AI"></div>
    <div class="msg-body">
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>
  `;
  area.appendChild(wrap);
  scrollBottom();
  return wrap;
}

function escapeHTML(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function scrollBottom() {
  const top = dom['centerTop'];
  if (top) setTimeout(() => { top.scrollTop = top.scrollHeight; }, 50);
}

/* ── HISTORY ─────────────────────────────────────────────── */
function buildHistory() {
  const list = dom['historyList'];
  if (!list) return;
  list.innerHTML = '';
  HISTORY.forEach(item => {
    const el = createHistoryItem(item.title, item.meta, item.icon);
    list.appendChild(el);
  });
}

function addHistoryItem(title) {
  const list = dom['historyList'];
  if (!list) return;
  const el = createHistoryItem(title, 'Just now', 'bowl');
  list.insertBefore(el, list.firstChild);
}

function createHistoryItem(title, meta, iconKey) {
  const el = document.createElement('div');
  el.className = 'history-item';
  el.setAttribute('tabindex', '0');
  el.setAttribute('role', 'button');
  el.setAttribute('aria-label', title);
  el.innerHTML = `
    <div class="history-icon">${ICONS[iconKey] || ICONS.bowl}</div>
    <div class="history-text">
      <div class="history-title">${escapeHTML(title)}</div>
      <div class="history-meta">${meta}</div>
    </div>
    <span class="history-arrow">↗</span>
  `;
  el.addEventListener('click', () => {
    dom['chatInput'].value = title;
    dom['chatInput'].focus();
    showToast('📖 ' + title);
  });
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
  });
  return el;
}

/* ── NAV TABS ────────────────────────────────────────────── */
function setupNavTabs() {
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const label = tab.dataset.tab;
      const labels = { home: 'Home', recipes: '🍽️ Recipes coming soon!', scan: '📸 Scan mode coming soon!', kitchen: '🍳 My Kitchen coming soon!' };
      if (label !== 'home') showToast(labels[label] || label);
    });
  });
}

/* ── FEATURE CARDS & PILLS ───────────────────────────────── */
function setupCards() {
  document.querySelectorAll('.feat-card[data-prompt]').forEach(card => {
    card.addEventListener('click', () => {
      const prompt = card.dataset.prompt;
      dom['chatInput'].value = prompt;
      sendMessage(prompt);
      dom['chatInput'].value = '';
    });
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); }
    });
  });

  document.querySelectorAll('.pill[data-prompt]').forEach(pill => {
    pill.addEventListener('click', () => {
      const prompt = pill.dataset.prompt;
      sendMessage(prompt);
    });
  });
}

/* ── CHAT INPUT ──────────────────────────────────────────── */
function setupChatInput() {
  const input = dom['chatInput'];
  const send  = dom['sendBtn'];

  if (!input || !send) return;

  send.addEventListener('click', () => {
    sendMessage(input.value);
    input.value = '';
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input.value);
      input.value = '';
    }
  });
}

/* ── QUICK ACTIONS ───────────────────────────────────────── */
function setupQuickActions() {
  const actions = {
    qaSmartChat: () => { dom['chatInput'].focus(); showToast('💬 Smart Chat ready — type your question!'); },
    qaVoice:     () => showToast('🎙️ Voice input coming soon!'),
    qaScan:      () => { sendMessage('I want to scan an image of food or ingredients for AI analysis'); },
    qaVideo:     () => showToast('📹 Video mode coming soon!'),
  };

  Object.entries(actions).forEach(([id, fn]) => {
    const el = dom[id];
    if (el) el.addEventListener('click', fn);
  });
}

/* ── NOTIFICATIONS ───────────────────────────────────────── */
function setupNotifications() {
  const btn   = dom['notifBtn'];
  const badge = dom['notifBadge'];
  if (!btn) return;

  btn.addEventListener('click', () => {
    if (state.notifCount > 0) {
      state.notifCount = 0;
      badge.style.display = 'none';
      showToast('✅ All notifications cleared');
    } else {
      showToast('No new notifications');
    }
  });

  const avatar = dom['avatarBtn'];
  if (avatar) avatar.addEventListener('click', () => showToast('👤 Profile settings coming soon!'));
}

/* ── GREETING TIME ───────────────────────────────────────── */
function setGreeting() {
  const h = new Date().getHours();
  let label = 'Good evening';
  if (h >= 5  && h < 12) label = 'Good morning';
  else if (h >= 12 && h < 17) label = 'Good afternoon';
  const el = document.querySelector('.greeting-small');
  if (el) el.textContent = label;
}

/* ── INIT ────────────────────────────────────────────────── */
async function init() {
  const session = await window.MiseAuth.requireSession('mise_ai_auth_v2.html');
  if (!session) return; // already redirecting to login
  window.MiseUser = session.user;

  cacheDOM();
  setGreeting();
  renderMiseUser(session.user);
  buildHistory();
  setupNavTabs();
  setupCards();
  setupChatInput();
  setupQuickActions();
  setupNotifications();
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', init)
  : init();

/* ── GLOBALS ─────────────────────────────────────────────── */
window.sendMessage = sendMessage;
window.showToast   = showToast;
