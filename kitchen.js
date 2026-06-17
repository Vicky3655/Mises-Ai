/* ============================================================
   MY KITCHEN  |  kitchen.js
   Reads selected items from inventory, plans meals,
   sets prep alerts, and talks to Mise AI via Anthropic API
   ============================================================ */
'use strict';

/* ── SHARED INVENTORY DATA ───────────────────────────────── */
// Reads from localStorage (set by inventory.js) OR falls back to defaults
const DEFAULT_INVENTORY = [
  { id:1, name:'Tomato Paste', qty:'2 Sachets',           emoji:'🍅', checked:false },
  { id:2, name:'Maggi',        qty:'4 Cubes of Maggi',    emoji:'🟨', checked:false },
  { id:3, name:'Pepper',       qty:'3 Spoons Dry Pepper', emoji:'🌶️', checked:false },
  { id:4, name:'Dried Fish',   qty:'4 Pieces',            emoji:'🐟', checked:false },
  { id:5, name:'Palm Oil',     qty:'1 Bottle',            emoji:'🫙', checked:false },
  { id:6, name:'Crayfish',     qty:'2 Cups',              emoji:'🦐', checked:false },
  { id:7, name:'Onions',       qty:'3 Medium Bulbs',      emoji:'🧅', checked:false },
  { id:8, name:'Stock Cubes',  qty:'6 Cubes',             emoji:'🟧', checked:false },
  { id:9, name:'Locust Beans', qty:'1 Wrap',              emoji:'🫘', checked:false },
];

/* ── STATE ───────────────────────────────────────────────── */
const state = {
  inventory:    [],
  selected:     new Set(),       // Set of item IDs
  meals:        [],              // saved meal plans
  aiHistory:    [],              // chat history for AI
  toastTimer:   null,
  alertTimers:  [],              // setInterval handles for countdowns
  searchQuery:  '',
  nextMealId:   1,
};

/* ── DOM ─────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const dom = {};

function cacheDOM() {
  [
    'backBtn','menuBtn','selBadge',
    // tabs
    'tab-planner','tab-meals','tab-assistant',
    // planner
    'invGrid','invSearch','invSearchClear','clearSelBtn',
    'selChips','mealName','mealDate','mealTime','mealNotes',
    'saveMealBtn',
    // meals
    'mealsList','mealCount',
    // ai
    'aiMessages','aiContext','aiContextItems',
    'aiInput','aiSendBtn',
    // meal detail modal
    'mealDetailOverlay','mealDetailTitle','mealDetailBody',
    'mealDetailClose','mealDetailDelete','mealDetailAsk',
    // alert modal
    'alertOverlay','alertTitle','alertBody','alertOk',
    // toast
    'toast',
  ].forEach(id => { dom[id] = $(id); });
}

/* ── TOAST ────────────────────────────────────────────────── */
function toast(msg, dur = 3000) {
  dom.toast.textContent = msg;
  dom.toast.classList.add('show');
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => dom.toast.classList.remove('show'), dur);
}

/* ── LOAD INVENTORY ──────────────────────────────────────── */
function loadInventory() {
  // Try reading from localStorage (written by inventory.js)
  try {
    const saved = localStorage.getItem('mise_inventory');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length) {
        state.inventory = parsed;
        return;
      }
    }
  } catch(e) {}
  state.inventory = [...DEFAULT_INVENTORY];
}

/* ── SAVE INVENTORY SNAPSHOT ─────────────────────────────── */
function persistInventory() {
  try { localStorage.setItem('mise_inventory', JSON.stringify(state.inventory)); } catch(e) {}
}

/* ── LOAD / SAVE MEALS ───────────────────────────────────── */
function loadMeals() {
  try {
    const saved = localStorage.getItem('mise_meals');
    if (saved) {
      state.meals = JSON.parse(saved);
      state.nextMealId = Math.max(0, ...state.meals.map(m => m.id)) + 1;
    }
  } catch(e) {}
}

function saveMeals() {
  try { localStorage.setItem('mise_meals', JSON.stringify(state.meals)); } catch(e) {}
}

/* ── TABS ────────────────────────────────────────────────── */
function setupTabs() {
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const panel = $('tab-' + btn.dataset.tab);
      if (panel) panel.classList.add('active');

      if (btn.dataset.tab === 'meals') renderMeals();
      if (btn.dataset.tab === 'assistant') updateAIContext();
    });
  });
}

/* ── RENDER INVENTORY GRID ───────────────────────────────── */
function renderInvGrid() {
  const q    = state.searchQuery.toLowerCase();
  const grid = dom['invGrid'];
  const items = q
    ? state.inventory.filter(i => i.name.toLowerCase().includes(q) || i.qty.toLowerCase().includes(q))
    : state.inventory;

  grid.innerHTML = '';

  if (!items.length) {
    grid.innerHTML = '<p style="color:var(--muted);font-size:13px;grid-column:1/-1;text-align:center;padding:24px 0">No items found</p>';
    return;
  }

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'inv-card' + (state.selected.has(item.id) ? ' selected' : '');
    card.dataset.id = item.id;
    card.innerHTML = `
      <div class="inv-card-check"></div>
      <div class="inv-card-emoji">${item.emoji}</div>
      <div class="inv-card-name">${escHTML(item.name)}</div>
      <div class="inv-card-qty">${escHTML(item.qty)}</div>
    `;
    card.addEventListener('click', () => toggleSelect(item.id));
    grid.appendChild(card);
  });
}

/* ── SELECTION ───────────────────────────────────────────── */
function toggleSelect(id) {
  if (state.selected.has(id)) state.selected.delete(id);
  else state.selected.add(id);
  updateSelectionUI();
  renderInvGrid();
}

function clearSelection() {
  state.selected.clear();
  updateSelectionUI();
  renderInvGrid();
}

function updateSelectionUI() {
  const count = state.selected.size;
  // Badge
  dom.selBadge.textContent = count + ' selected';
  dom.selBadge.classList.toggle('zero', count === 0);

  // Chips
  const chips = dom.selChips;
  if (!count) {
    chips.innerHTML = '<span class="no-sel-hint">No ingredients selected yet</span>';
  } else {
    chips.innerHTML = getSelectedItems()
      .map(i => `<span class="sel-chip">${i.emoji} ${escHTML(i.name)}</span>`)
      .join('');
  }

  // AI context
  updateAIContext();
}

function getSelectedItems() {
  return state.inventory.filter(i => state.selected.has(i.id));
}

/* ── SAVE MEAL ───────────────────────────────────────────── */
function saveMeal() {
  const name = dom.mealName.value.trim();
  const date = dom.mealDate.value;
  const time = dom.mealTime.value;
  const notes= dom.mealNotes.value.trim();

  if (!name) {
    dom.mealName.focus();
    dom.mealName.style.borderColor = 'var(--orange)';
    setTimeout(() => dom.mealName.style.borderColor = '', 1500);
    toast('⚠️ Please enter a meal name');
    return;
  }
  if (!state.selected.size) {
    toast('⚠️ Please select at least one ingredient');
    return;
  }
  if (!date || !time) {
    toast('⚠️ Please set a date and time for the alert');
    return;
  }

  const meal = {
    id:          state.nextMealId++,
    name,
    date,
    time,
    notes,
    ingredients: getSelectedItems().map(i => ({ id:i.id, name:i.name, qty:i.qty, emoji:i.emoji })),
    createdAt:   Date.now(),
    done:        false,
  };

  state.meals.unshift(meal);
  saveMeals();
  scheduleAlert(meal);

  // Clear form
  dom.mealName.value  = '';
  dom.mealDate.value  = '';
  dom.mealTime.value  = '';
  dom.mealNotes.value = '';
  clearSelection();

  toast(`✅ "${name}" saved! Alert set for ${formatDateTime(date, time)}`);

  // Switch to meals tab
  document.querySelector('[data-tab="meals"]').click();
}

/* ── RENDER MEALS ────────────────────────────────────────── */
function renderMeals() {
  const list = dom.mealsList;
  dom.mealCount.textContent = state.meals.length;

  if (!state.meals.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🍽️</div>
        <p>No meals planned yet.<br>Go to Meal Planner to create one.</p>
      </div>`;
    return;
  }

  list.innerHTML = '';
  state.meals.forEach(meal => {
    const { label, cls } = getMealStatus(meal);
    const dateStr = formatDateTime(meal.date, meal.time);
    const progress = getMealProgress(meal);

    const card = document.createElement('div');
    card.className = 'meal-card';
    card.innerHTML = `
      <div class="meal-card-top">
        <span class="meal-card-name">${escHTML(meal.name)}</span>
        <span class="meal-card-status ${cls}">${label}</span>
      </div>
      <div class="meal-card-meta">
        <span>📅 ${meal.date}</span>
        <span>⏰ ${meal.time}</span>
        ${meal.notes ? `<span>📝 Has notes</span>` : ''}
      </div>
      <div class="meal-card-ingredients">
        ${meal.ingredients.map(i => `<span class="meal-card-chip">${i.emoji} ${escHTML(i.name)}</span>`).join('')}
      </div>
      <div class="timer-bar-wrap">
        <div class="timer-bar-label">
          <span>${dateStr}</span>
          <span id="countdown-${meal.id}"></span>
        </div>
        <div class="timer-bar">
          <div class="timer-bar-fill" id="timerbar-${meal.id}" style="width:${progress}%"></div>
        </div>
      </div>
    `;
    card.addEventListener('click', () => openMealDetail(meal.id));
    list.appendChild(card);
    startCountdown(meal);
  });
}

/* ── MEAL STATUS ─────────────────────────────────────────── */
function getMealStatus(meal) {
  if (meal.done) return { label: '✓ Done',    cls: 'status-done' };
  const target = new Date(`${meal.date}T${meal.time}`);
  const now    = new Date();
  const diffMs = target - now;
  if (diffMs < 0)       return { label: '⚠ Overdue',  cls: 'status-overdue' };
  if (diffMs < 3600000) return { label: '🔥 Today',   cls: 'status-today' };
  return { label: '📅 Upcoming', cls: 'status-upcoming' };
}

function getMealProgress(meal) {
  const created = meal.createdAt;
  const target  = new Date(`${meal.date}T${meal.time}`).getTime();
  const now     = Date.now();
  if (now >= target) return 100;
  const total   = target - created;
  const elapsed = now - created;
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}

/* ── COUNTDOWN TIMER ─────────────────────────────────────── */
function startCountdown(meal) {
  const el  = $('countdown-' + meal.id);
  const bar = $('timerbar-'  + meal.id);
  if (!el) return;

  function tick() {
    const target = new Date(`${meal.date}T${meal.time}`).getTime();
    const diff   = target - Date.now();

    if (diff <= 0) {
      if (el)  el.textContent  = 'Now!';
      if (bar) bar.style.width = '100%';
      return;
    }

    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000)   / 1000);

    if (el) {
      if (h > 0) el.textContent = `${h}h ${m}m`;
      else if (m > 0) el.textContent = `${m}m ${s}s`;
      else el.textContent = `${s}s`;
    }
    if (bar) bar.style.width = getMealProgress(meal) + '%';
  }

  tick();
  const handle = setInterval(tick, 1000);
  state.alertTimers.push(handle);
}

/* ── SCHEDULE BROWSER ALERT ──────────────────────────────── */
function scheduleAlert(meal) {
  const target = new Date(`${meal.date}T${meal.time}`).getTime();
  const delay  = target - Date.now();
  if (delay <= 0) return;

  setTimeout(() => {
    // Browser Notification API
    if (Notification.permission === 'granted') {
      new Notification(`⏰ Time to cook: ${meal.name}!`, {
        body: `Ingredients: ${meal.ingredients.map(i => i.name).join(', ')}`,
        icon: 'mise_ai_logo.png',
      });
    }
    // In-page alert modal
    showAlertModal(meal);
  }, delay);

  // Request permission
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function rescheduleExistingAlerts() {
  state.meals.forEach(meal => {
    if (!meal.done) scheduleAlert(meal);
  });
}

function showAlertModal(meal) {
  dom.alertTitle.textContent = `Time to Cook: ${meal.name}`;
  dom.alertBody.textContent  = `Your prep alert has fired! Ingredients ready: ${meal.ingredients.map(i => i.name).join(', ')}.${meal.notes ? ' Note: ' + meal.notes : ''}`;
  dom.alertOverlay.classList.add('open');
  dom.alertOk.onclick = () => {
    dom.alertOverlay.classList.remove('open');
    meal.done = true;
    saveMeals();
    renderMeals();
  };
}

/* ── MEAL DETAIL MODAL ───────────────────────────────────── */
let _activeMealId = null;

function openMealDetail(id) {
  const meal = state.meals.find(m => m.id === id);
  if (!meal) return;
  _activeMealId = id;

  dom.mealDetailTitle.textContent = meal.name;
  dom.mealDetailBody.innerHTML = `
    <div class="detail-row">
      <span class="detail-key">Date</span>
      <span class="detail-val">${meal.date}</span>
    </div>
    <div class="detail-row">
      <span class="detail-key">Time</span>
      <span class="detail-val">${meal.time}</span>
    </div>
    <div class="detail-row">
      <span class="detail-key">Status</span>
      <span class="detail-val">${getMealStatus(meal).label}</span>
    </div>
    <div class="detail-row">
      <span class="detail-key">Ingredients</span>
      <div class="detail-chips">
        ${meal.ingredients.map(i => `<span class="detail-chip">${i.emoji} ${escHTML(i.name)}</span>`).join('')}
      </div>
    </div>
    ${meal.notes ? `<div class="detail-row"><span class="detail-key">Notes</span><span class="detail-val">${escHTML(meal.notes)}</span></div>` : ''}
  `;

  dom.mealDetailOverlay.classList.add('open');
}

function closeMealDetail() {
  dom.mealDetailOverlay.classList.remove('open');
}

function deleteMeal(id) {
  state.meals = state.meals.filter(m => m.id !== id);
  saveMeals();
  closeMealDetail();
  renderMeals();
  toast(' Meal plan deleted');
}

function askAIAboutMeal(id) {
  const meal = state.meals.find(m => m.id === id);
  if (!meal) return;
  closeMealDetail();

  // Switch to AI tab and pre-fill with context
  document.querySelector('[data-tab="assistant"]').click();
  const prompt = `I'm planning to cook "${meal.name}" using: ${meal.ingredients.map(i => i.name + ' (' + i.qty + ')').join(', ')}. Can you give me a detailed recipe and tips?`;
  dom.aiInput.value = prompt;
  dom.aiInput.focus();
}

/* ── AI ASSISTANT ────────────────────────────────────────── */
function updateAIContext() {
  const items = getSelectedItems();
  if (!items.length) {
    dom.aiContext.style.display = 'none';
    return;
  }
  dom.aiContext.style.display = 'flex';
  dom.aiContextItems.textContent = items.map(i => i.emoji + ' ' + i.name).join(', ');
}

function addMessage(role, content) {
  const wrap = document.createElement('div');
  wrap.className = 'ai-msg-wrap' + (role === 'user' ? ' user' : '');

  if (role === 'ai') {
    const avatar = document.createElement('div');
    avatar.className = 'ai-avatar';
    avatar.textContent = '👨‍🍳';
    wrap.appendChild(avatar);
  }

  const bubble = document.createElement('div');
  bubble.className = 'ai-bubble ' + (role === 'user' ? 'user' : 'ai');
  bubble.innerHTML = content.replace(/\n/g, '<br>');
  wrap.appendChild(bubble);

  dom.aiMessages.appendChild(wrap);
  dom.aiMessages.scrollTop = dom.aiMessages.scrollHeight;
  return wrap;
}

function addTypingIndicator() {
  const wrap = document.createElement('div');
  wrap.className = 'ai-msg-wrap';
  const avatar = document.createElement('div');
  avatar.className = 'ai-avatar';
  avatar.textContent = '👨‍🍳';
  const dots = document.createElement('div');
  dots.className = 'typing-dots';
  dots.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
  wrap.appendChild(avatar);
  wrap.appendChild(dots);
  dom.aiMessages.appendChild(wrap);
  dom.aiMessages.scrollTop = dom.aiMessages.scrollHeight;
  return wrap;
}

async function sendToAI(userText) {
  if (!userText.trim()) return;

  // Build system context from selected items
  const selectedItems = getSelectedItems();
  const itemsContext  = selectedItems.length
    ? `\nThe user currently has these ingredients selected in their inventory: ${selectedItems.map(i => i.name + ' (' + i.qty + ')').join(', ')}.`
    : '';

  addMessage('user', escHTML(userText));
  state.aiHistory.push({ role: 'user', content: userText });

  const typing = addTypingIndicator();
  dom.aiInput.value = '';
  dom.aiSendBtn.disabled = true;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: `You are Mise AI Chef, a warm and knowledgeable Nigerian culinary assistant embedded inside the "My Kitchen" feature of the Mise AI app.
Help users plan meals, suggest recipes, explain cooking techniques, give substitution tips, and estimate prep times.
${itemsContext}
Keep responses friendly and conversational. Format recipes clearly with numbered steps when asked. Use occasional food emojis to keep things warm.`,
        messages: state.aiHistory,
      })
    });

    const data  = await res.json();
    typing.remove();

    if (data.content?.[0]?.text) {
      const reply = data.content[0].text;
      state.aiHistory.push({ role: 'assistant', content: reply });
      addMessage('ai', reply);
    } else if (data.error) {
      addMessage('ai', `⚠️ API error: ${data.error.message || 'Unknown'}. Check your API key.`);
    } else {
      addMessage('ai', '⚠️ No response received. Please try again.');
    }

  } catch (err) {
    typing.remove();
    addMessage('ai', '⚠️ Connection error. Check your internet and try again.');
    console.error('AI error:', err);
  }

  dom.aiSendBtn.disabled = false;
}

/* ── HELPERS ─────────────────────────────────────────────── */
function escHTML(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDateTime(date, time) {
  if (!date || !time) return '—';
  const d = new Date(`${date}T${time}`);
  return d.toLocaleString('en-GB', { weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
}

/* ── EVENTS ───────────────────────────────────────────────── */
function bindEvents() {
  // Back
  dom.backBtn.addEventListener('click', () => {
    if (document.referrer) history.back();
    else toast(' Navigate to your main page');
  });

  
  

  // Clear selection
  dom.clearSelBtn.addEventListener('click', clearSelection);

  // Search
  dom['invSearch'].addEventListener('input', e => {
    state.searchQuery = e.target.value;
    dom['invSearchClear'].classList.toggle('hidden', !state.searchQuery);
    renderInvGrid();
  });
  dom['invSearchClear'].addEventListener('click', () => {
    state.searchQuery = '';
    dom['invSearch'].value = '';
    dom['invSearchClear'].classList.add('hidden');
    renderInvGrid();
  });

  // Save meal
  dom.saveMealBtn.addEventListener('click', saveMeal);

  // Meal detail modal
  dom.mealDetailClose.addEventListener('click',  closeMealDetail);
  dom.mealDetailDelete.addEventListener('click', () => _activeMealId && deleteMeal(_activeMealId));
  dom.mealDetailAsk.addEventListener('click',    () => _activeMealId && askAIAboutMeal(_activeMealId));
  dom.mealDetailOverlay.addEventListener('click', e => {
    if (e.target === dom.mealDetailOverlay) closeMealDetail();
  });

  // Alert OK
  dom.alertOk.addEventListener('click', () => dom.alertOverlay.classList.remove('open'));

  // AI send
  dom.aiSendBtn.addEventListener('click', () => sendToAI(dom.aiInput.value.trim()));
  dom.aiInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendToAI(dom.aiInput.value.trim());
    }
  });

  // AI quick prompts
  document.querySelectorAll('.ai-prompt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sel = getSelectedItems();
      let prompt = btn.dataset.prompt;
      if (sel.length) {
        prompt += ` These are my selected ingredients: ${sel.map(i => i.name).join(', ')}.`;
      }
      dom.aiInput.value = prompt;
      sendToAI(prompt);
    });
  });

  // Set default date/time to today
  const now  = new Date();
  const pad  = n => String(n).padStart(2,'0');
  dom.mealDate.value = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
  dom.mealTime.value = `${pad(now.getHours()+1)}:00`;

  // Keyboard: N = new item focus
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeMealDetail();
      dom.alertOverlay.classList.remove('open');
    }
  });
}

/* ── INIT ─────────────────────────────────────────────────── */
function init() {
  cacheDOM();
  loadInventory();
  loadMeals();
  setupTabs();
  bindEvents();
  renderInvGrid();
  rescheduleExistingAlerts();
  updateSelectionUI();
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', init)
  : init();
