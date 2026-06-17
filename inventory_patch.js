/* ── PATCH: add to inventory.js ─────────────────────────────
   1. Add "Go to Kitchen" button to the topbar
   2. Save checked items to localStorage whenever state changes
   3. Navigate to kitchen.html on button click
   ─────────────────────────────────────────────────────────── */

// ── SAVE CHECKED ITEMS TO LOCALSTORAGE ────────────────────
function syncSelectedToStorage() {
  const selected = state.items
    .filter(i => i.checked)
    .map(i => ({
      id:    i.id,
      name:  i.name,
      qty:   i.qty,
      emoji: i.emoji === '__MISE_LOGO__' ? '🍽' : i.emoji,
    }));
  localStorage.setItem('mise_inventory_selected', JSON.stringify(selected));
}

// Wrap existing toggleItem to also sync
const _origToggle = toggleItem;
window.toggleItem = function(id) {
  _origToggle(id);
  syncSelectedToStorage();
};

// Wrap deleteItem to also sync
const _origDelete = deleteItem;
window.deleteItem = function(id, name) {
  _origDelete(id, name);
  syncSelectedToStorage();
};

// ── INJECT "PLAN MEAL" BUTTON INTO TOPBAR ─────────────────
function injectKitchenBtn() {
  const topbar = document.querySelector('.topbar');
  if (!topbar || document.getElementById('kitchenBtn')) return;

  const btn = document.createElement('button');
  btn.id = 'kitchenBtn';
  btn.className = 'kitchen-nav-btn';
  btn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" width="14" height="14">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
    Plan Meal
    <span class="kitchen-nav-count" id="kitchenCount">0</span>`;
  btn.onclick = () => { window.location.href = 'kitchen.html'; };
  topbar.appendChild(btn);

  // Inject style if not already present
  if (!document.getElementById('kitchen-btn-style')) {
    const style = document.createElement('style');
    style.id = 'kitchen-btn-style';
    style.textContent = `
      .kitchen-nav-btn {
        display: flex; align-items: center; gap: 6px;
        padding: 8px 14px; border-radius: 99px;
        background: linear-gradient(135deg,#FF7C38,#A84410);
        border: none; color: #fff;
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-size: 13px; font-weight: 600;
        cursor: pointer; letter-spacing: .04em;
        box-shadow: 0 4px 14px rgba(232,97,26,.35);
        transition: transform .15s, box-shadow .2s;
      }
      .kitchen-nav-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 20px rgba(232,97,26,.5);
      }
      .kitchen-nav-btn:active { transform: scale(.96); }
      .kitchen-nav-count {
        min-width: 18px; height: 18px; border-radius: 99px;
        background: rgba(255,255,255,.25);
        font-size: 10px; font-weight: 700;
        display: flex; align-items: center; justify-content: center;
        padding: 0 5px;
      }
    `;
    document.head.appendChild(style);
  }
}

// ── UPDATE COUNT BADGE ─────────────────────────────────────
function updateKitchenCount() {
  const el = document.getElementById('kitchenCount');
  if (!el) return;
  const count = state.items.filter(i => i.checked).length;
  el.textContent = count;
  el.style.background = count > 0 ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.18)';
}

// Wrap render to also update count badge
const _origRender = render;
window.render = function() {
  _origRender();
  syncSelectedToStorage();
  updateKitchenCount();
};

// Init
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    injectKitchenBtn();
    updateKitchenCount();
  }, 50);
});
