/* ============================================================
   INVENTORY PATCH  |  inventory_patch.js  (Supabase edition)
   Load AFTER inventory.js AND supabase-client.js + mise-data.js:

     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
     <script src="supabase-client.js"></script>
     <script src="mise-data.js"></script>
     <script src="inventory.js"></script>
     <script src="inventory_patch.js"></script>

   Responsibilities:
     1. Guard the page — bounce to login if there's no session.
     2. Load the signed-in user's inventory from Supabase into
        state.items (replacing the empty starter array).
     3. Override addItem / deleteItem / toggleItem so every local
        mutation is mirrored to the inventory_items table, with
        optimistic UI updates that roll back on failure.
     4. Inject the "Plan Meal" button + live badge (unchanged from
        the original localStorage version — this part is pure UI).

   Previously this file synced state.items to the localStorage keys
   'mise_inventory' / 'mise_inventory_selected' / 'mise_selected_ids'.
   None of that is needed anymore — Supabase IS the storage now, and
   kitchen.html reads checked items straight from the inventory_items
   table via MiseData.getCheckedInventoryItems().
   ============================================================ */
'use strict';

/* ── 1. LOAD FROM SUPABASE ───────────────────────────────────
   Replaces inventory.js's (now-empty) starter state.items. */
async function loadInventoryFromSupabase() {
  try {
    const rows = await window.MiseData.listInventory();
    state.items = rows.map(r => ({
      id:      r.id,
      name:    r.name,
      qty:     r.qty,
      emoji:   r.emoji,
      checked: r.checked,
    }));
  } catch (e) {
    console.error('[inventory_patch] Failed to load inventory:', e);
    showToast('⚠️ Could not load your inventory');
    state.items = [];
  }
  render();
}

/* ── 2. OVERRIDE MUTATIONS ────────────────────────────────────
   Each override keeps the exact call signature of the original so
   every existing call site (saveModal, checkbox/delete handlers)
   keeps working unchanged. */

window.addItem = async function (name, qty, emoji) {
  const cleanName  = name.trim();
  const cleanQty   = qty.trim()   || '1 Unit';
  const cleanEmoji = emoji.trim() || '__MISE_LOGO__';

  const row = await window.MiseData.addInventoryItem({
    name: cleanName, qty: cleanQty, emoji: cleanEmoji,
  });
  state.items.unshift({
    id: row.id, name: row.name, qty: row.qty,
    emoji: row.emoji, checked: row.checked,
  });
  render();
  // Errors are intentionally left to bubble up — saveModal() in
  // inventory.js awaits this and shows the failure toast itself,
  // keeping the modal open so the typed data isn't lost.
};

window.deleteItem = async function (id, name) {
  const prevItems = state.items;
  state.items = state.items.filter(i => i.id !== id); // optimistic
  render();
  try {
    await window.MiseData.deleteInventoryItem(id);
    showToast(`🗑️ "${name}" removed`);
  } catch (e) {
    console.error('[inventory_patch] deleteItem failed:', e);
    state.items = prevItems; // revert
    render();
    showToast('⚠️ Could not remove item — try again');
  }
};

window.toggleItem = async function (id) {
  const item = state.items.find(i => i.id === id);
  if (!item) return;
  const nextChecked = !item.checked;
  item.checked = nextChecked; // optimistic
  render();
  showToast(nextChecked ? `✅ "${item.name}" marked done` : `↩️ "${item.name}" unmarked`);
  try {
    await window.MiseData.toggleInventoryItem(id, nextChecked);
  } catch (e) {
    console.error('[inventory_patch] toggleItem failed:', e);
    item.checked = !nextChecked; // revert
    render();
    showToast('⚠️ Could not update item — try again');
  }
};

/* ── 3. KITCHEN BADGE ─────────────────────────────────────────
   Uses id="kitchenNavCount" (not "kitchenCount") to avoid clashing
   with the existing desktop sidebar badge. */
function refreshKitchenBadge() {
  const el = document.getElementById('kitchenNavCount');
  if (!el) return;
  const count = state.items.filter(i => i.checked).length;
  el.textContent = count;
  el.style.background = count > 0
    ? 'rgba(255,255,255,.40)'
    : 'rgba(255,255,255,.18)';
}

const _origRender = window.render;
window.render = function () {
  _origRender.apply(this, arguments);
  refreshKitchenBadge();
};

/* ── 4. INJECT "PLAN MEAL" BUTTON INTO MOBILE TOPBAR ─────────
   Unchanged from the original — inserts the button before the menu
   icon so the topbar reads: [← back] [Inventory List] [Plan Meal n] [☰] */
function injectKitchenBtn() {
  if (document.getElementById('kitchenNavBtn')) return; // already injected

  const topbar = document.querySelector('.mobile-layout .topbar');
  if (!topbar) return;

  const btn = document.createElement('button');
  btn.id        = 'kitchenNavBtn';
  btn.className = 'kitchen-nav-btn';
  btn.setAttribute('aria-label', 'Go to meal planner');
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"
      width="13" height="13" aria-hidden="true">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
    Plan Meal
    <span class="kitchen-nav-count" id="kitchenNavCount">0</span>`;

  btn.addEventListener('click', () => {
    window.location.href = 'kitchen.html';
  });

  // Insert before the menu button to keep correct visual order
  const menuBtn = document.getElementById('menuBtn');
  if (menuBtn) topbar.insertBefore(btn, menuBtn);
  else topbar.appendChild(btn);

  injectStyles();
  refreshKitchenBadge();
}

/* ── 5. INJECT STYLES ────────────────────────────────────────
   Compact pill button that fits the mobile topbar height. */
function injectStyles() {
  if (document.getElementById('kitchen-patch-style')) return;
  const s = document.createElement('style');
  s.id = 'kitchen-patch-style';
  s.textContent = `
    /* Plan Meal pill button */
    .kitchen-nav-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 6px 10px;
      border-radius: 99px;
      flex-shrink: 0;
      background: linear-gradient(135deg, #FF7C38, #A84410);
      border: none;
      color: #fff;
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 11.5px;
      font-weight: 600;
      letter-spacing: .03em;
      cursor: pointer;
      white-space: nowrap;
      box-shadow: 0 3px 10px rgba(232,97,26,.35);
      transition: transform .15s, box-shadow .2s;
    }
    .kitchen-nav-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 5px 16px rgba(232,97,26,.50);
    }
    .kitchen-nav-btn:active { transform: scale(.95); }

    /* Count badge inside the button */
    .kitchen-nav-count {
      min-width: 17px;
      height: 17px;
      border-radius: 99px;
      background: rgba(255,255,255,.18);
      font-size: 10px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
      transition: background .2s;
    }

    /* Nudge topbar so the extra button still fits */
    .mobile-layout .topbar {
      gap: 6px;
    }
  `;
  document.head.appendChild(s);
}

/* ── 6. INIT ─────────────────────────────────────────────────
   Registered after inventory.js's own DOMContentLoaded listener, so
   by the time this callback runs, cacheDOM/setupEvents/render() (with
   the empty starter state) have already completed — this just needs
   to check auth, then swap in the real data. */
document.addEventListener('DOMContentLoaded', async () => {
  const session = await window.MiseAuth.requireSession('mise_ai_auth_v2.html');
  if (!session) return; // already redirecting to the login page

  await loadInventoryFromSupabase();
  injectKitchenBtn();
});
