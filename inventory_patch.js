/* ============================================================
   INVENTORY PATCH  |  inventory_patch.js
   Load AFTER inventory.js.  Adds three things:
     1. Full inventory sync to localStorage on every render
        (key: mise_inventory — read by kitchen.js)
     2. Selected-item objects sync so kitchen.html can load them
        (key: mise_inventory_selected — read by kitchen.html)   ← FIX
     3. "Plan Meal" button injected into the mobile topbar
        with a live checked-item badge

   BUG FIXES applied here (2025-06):
   ─────────────────────────────────
   FIX 1  Key mismatch
          inventory_patch.js was writing to 'mise_selected_ids'
          but kitchen.html reads 'mise_inventory_selected'.
          → Now writes the correct key.

   FIX 2  Shape mismatch
          'mise_selected_ids' only stored an array of IDs [1,3,5].
          kitchen.html expects full objects [{id,name,qty,emoji}].
          → Now writes full selected-item objects.

   FIX 3  (in kitchen.html) Fallback stomps empty state
          When stored value exists but is '[]', kitchen.html was
          still loading demo data because it checked
          `if (!selectedItems.length)` instead of `if (stored === null)`.
          → kitchen.html loadSelectedItems() updated accordingly.
   ============================================================ */
'use strict';

/* ── 1. STORAGE SYNC ─────────────────────────────────────────
   Saves the full items array AND the checked-item objects so
   kitchen.html can display exactly what was selected.         */
function syncInventoryToStorage() {
  try {
    /* Full inventory — all items with checked flag */
    const allItems = state.items.map(i => ({
      id:      i.id,
      name:    i.name,
      qty:     i.qty,
      emoji:   i.emoji === '__MISE_LOGO__' ? '🍽️' : i.emoji,
      checked: i.checked,
    }));
    localStorage.setItem('mise_inventory', JSON.stringify(allItems));

    /* ─── FIX 1 + FIX 2 ─────────────────────────────────────
       Write CHECKED items as full objects under the key that
       kitchen.html actually reads: 'mise_inventory_selected'.
       Old code wrote only IDs to 'mise_selected_ids' — neither
       the key nor the shape matched what kitchen.html expects. */
    const selectedItems = state.items
      .filter(i => i.checked)
      .map(i => ({
        id:    i.id,
        name:  i.name,
        qty:   i.qty,
        emoji: i.emoji === '__MISE_LOGO__' ? '🍽️' : i.emoji,
      }));
    localStorage.setItem('mise_inventory_selected', JSON.stringify(selectedItems));

    /* Keep legacy key for any other consumers (non-breaking) */
    const selectedIds = selectedItems.map(i => i.id);
    localStorage.setItem('mise_selected_ids', JSON.stringify(selectedIds));

  } catch (e) {
    console.warn('[inventory_patch] localStorage sync failed:', e);
  }
}

/* ── 2. PATCH render() ───────────────────────────────────────
   One patch on render() covers every state change
   (toggle, delete, add) — no need to wrap each function.    */
(function patchRender() {
  const _orig = window.render;
  if (typeof _orig !== 'function') {
    console.warn('[inventory_patch] render() not found — patch skipped');
    return;
  }
  window.render = function () {
    _orig.apply(this, arguments);
    syncInventoryToStorage();
    refreshKitchenBadge();
  };
})();

/* ── 3. KITCHEN COUNT BADGE ──────────────────────────────────
   Uses id="kitchenNavCount" (not "kitchenCount") to avoid
   clashing with the existing desktop sidebar badge.         */
function refreshKitchenBadge() {
  const el = document.getElementById('kitchenNavCount');
  if (!el) return;
  const count = state.items.filter(i => i.checked).length;
  el.textContent = count;
  el.style.background = count > 0
    ? 'rgba(255,255,255,.40)'
    : 'rgba(255,255,255,.18)';
}

/* ── 4. INJECT "PLAN MEAL" BUTTON INTO MOBILE TOPBAR ─────────
   Inserts the button before the menu icon so the topbar
   reads:  [← back]  [Inventory List]  [Plan Meal n]  [☰]  */
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
   Compact pill button that fits the mobile topbar height.   */
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
   Wait for inventory.js init() to complete before running.  */
document.addEventListener('DOMContentLoaded', () => {
  // Small delay so inventory.js DOMContentLoaded handlers run first
  setTimeout(() => {
    injectKitchenBtn();
    syncInventoryToStorage();   // initial sync with default items
    refreshKitchenBadge();
  }, 60);
});
