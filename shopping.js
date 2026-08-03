/* ============================================================
   MISE AI | SHOPPING LIST  |  shopping.js  (Supabase edition)

   Data now lives in the `shopping_items` table (see
   shopping_items_schema.sql) instead of localStorage, so the list
   syncs across devices the same way Inventory and Kitchen already do.

   The add-item flow is also smarter than before:
   - One line can hold several items at once:
       "2 kg Tomatoes, Milk, 3 Onions"
   - A leading quantity/unit is parsed out of each item automatically
   - Category is auto-detected per item from a keyword map, unless you
     pick one specific category from the dropdown yourself
   - The autocomplete list is drawn live from your own Inventory plus
     past shopping items, instead of a separate hand-typed library
   ============================================================ */
'use strict';

const DEFAULT_CATEGORIES = ['Produce', 'Meat & Seafood', 'Dairy & Bakery', 'Spices & Oils', 'Pantry & Staples'];

/* Keyword → category map used to auto-classify an item when the
   category selector is left on "Auto-detect" (its default), or on
   mobile where there's no selector at all. Best-effort, and always
   overridable by hand — a wrong guess just means picking a category
   from the dropdown next time. */
const CATEGORY_KEYWORDS = {
  'Produce': [
    'tomato', 'onion', 'pepper', 'carrot', 'potato', 'sweet potato', 'lettuce', 'spinach',
    'cabbage', 'cucumber', 'garlic', 'ginger', 'plantain', 'banana', 'apple', 'orange',
    'lemon', 'lime', 'mango', 'avocado', 'vegetable', 'fruit', 'leafy', 'okra', 'yam',
    'cassava', 'corn', 'herb', 'parsley', 'cilantro', 'coriander', 'mushroom', 'pumpkin',
    'eggplant', 'broccoli', 'cauliflower',
  ],
  'Meat & Seafood': [
    'chicken', 'broiler', 'beef', 'goat meat', 'meat', 'fish', 'shrimp', 'prawn',
    'crayfish', 'turkey', 'pork', 'sausage', 'bacon', 'lamb', 'egg', 'eggs', 'seafood',
    'crab', 'lobster', 'tilapia', 'catfish', 'mince',
  ],
  'Dairy & Bakery': [
    'milk', 'cheese', 'butter', 'yogurt', 'yoghurt', 'cream', 'margarine', 'pastry',
    'cake', 'bun', 'loaf', 'bakery', 'custard',
  ],
  'Spices & Oils': [
    'salt', 'spice', 'seasoning', 'curry', 'oil', 'vinegar', 'stock cube', 'maggi',
    'knorr', 'thyme', 'bay leaf', 'nutmeg', 'cinnamon', 'paprika', 'chili', 'chilli',
    'garlic powder',
  ],
  'Pantry & Staples': [
    'rice', 'flour', 'sugar', 'pasta', 'spaghetti', 'noodle', 'bread', 'cereal', 'oat',
    'beans', 'lentil', 'canned', 'tinned', 'sauce', 'paste', 'honey', 'jam',
    'peanut butter', 'water', 'juice', 'drink',
  ],
};

/* Recognises a leading quantity/unit so it can be split from the item
   name, e.g. "2 kg Fresh Tomatoes" -> qty "2 kg", name "Fresh Tomatoes". */
const QTY_RE = /^(\d+(?:[.,]\d+)?\s*(?:kg|kgs|g|grams?|ml|l|liters?|litres?|lbs?|oz|ounces?|pcs?|pieces?|packs?|pack|bags?|bottles?|cans?|tins?|cartons?|dozen|cups?|tbsp|tsp|bunch(?:es)?|loaves|loaf|cloves?|heads?|sachets?|tubers?|wraps?)?)\s+(.+)$/i;

/* ── STATE ────────────────────────────────────────────────── */
let shoppingItems   = [];                    // [{ id, name, qty, category, checked }]
let userCategories  = [...DEFAULT_CATEGORIES];
let suggestionNames = [];

const containerDesktop  = document.getElementById('shoppingListContainer');
const containerMobile   = document.getElementById('mShoppingListContainer');
const cartBadge         = document.getElementById('dCartCount');
const toastEl           = document.getElementById('toast');
const storeModalOverlay = document.getElementById('storeModalOverlay');

/* ── TOAST ────────────────────────────────────────────────── */
let toastTimer;
function showToast(msg) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3200);
}

/* ── SMART INPUT PARSING ──────────────────────────────────── */

// "2 kg Tomatoes, Milk, 3 Onions" -> ["2 kg Tomatoes", "Milk", "3 Onions"]
function splitEntries(raw) {
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

// "2 kg Fresh Tomatoes" -> { qty: "2 kg", name: "Fresh Tomatoes" }
// "3 Onions"            -> { qty: "3",    name: "Onions" }
// "Milk"                -> { qty: "",     name: "Milk" }
function parseQtyAndName(raw) {
  const trimmed = raw.trim();
  const m = trimmed.match(QTY_RE);
  if (m && m[2] && m[2].trim()) {
    return { qty: m[1].trim(), name: m[2].trim() };
  }
  return { qty: '', name: trimmed };
}

function autoCategorize(name) {
  const n = name.toLowerCase();
  for (const cat of Object.keys(CATEGORY_KEYWORDS)) {
    if (CATEGORY_KEYWORDS[cat].some(w => n.includes(w))) return cat;
  }
  return 'Pantry & Staples';
}

/* ── CATEGORY DROPDOWN ────────────────────────────────────── */

function renderCategoryOptions() {
  const selectEl = document.getElementById('categorySelect');
  if (!selectEl) return;
  const current = selectEl.value;

  let html = `<option value="__AUTO__">✨ Auto-detect category</option>`;
  html += userCategories.map(cat =>
    `<option value="${escapeHTML(cat)}">${getCatEmoji(cat)} ${escapeHTML(cat)}</option>`
  ).join('');
  html += `<option value="__NEW_CAT__">➕ Add New Custom Category...</option>`;

  selectEl.innerHTML = html;
  if (current && [...selectEl.options].some(o => o.value === current)) {
    selectEl.value = current;
  }
}

function getCatEmoji(cat) {
  const c = cat.toLowerCase();
  if (c.includes('veggie') || c.includes('produce') || c.includes('fruit')) return '🥦';
  if (c.includes('meat') || c.includes('fish') || c.includes('protein') || c.includes('seafood')) return '🥩';
  if (c.includes('spice') || c.includes('oil') || c.includes('pepper')) return '🌶️';
  if (c.includes('dairy') || c.includes('milk') || c.includes('bakery')) return '🥛';
  if (c.includes('drink') || c.includes('beverage')) return '🥤';
  return '🫙';
}

/* ── AUTOCOMPLETE SUGGESTIONS ─────────────────────────────── */

function renderItemSuggestions() {
  let datalist = document.getElementById('itemSuggestionsList');
  if (!datalist) {
    datalist = document.createElement('datalist');
    datalist.id = 'itemSuggestionsList';
    document.body.appendChild(datalist);
  }
  datalist.innerHTML = suggestionNames.map(n => `<option value="${escapeHTML(n)}"></option>`).join('');

  const dInput = document.getElementById('addItemInput');
  const mInput = document.getElementById('mAddItemInput');
  if (dInput) dInput.setAttribute('list', 'itemSuggestionsList');
  if (mInput) mInput.setAttribute('list', 'itemSuggestionsList');
}

function rememberSuggestions(names) {
  let changed = false;
  names.forEach(n => {
    if (n && !suggestionNames.includes(n)) { suggestionNames.push(n); changed = true; }
  });
  if (changed) {
    suggestionNames.sort((a, b) => a.localeCompare(b));
    renderItemSuggestions();
  }
}

/* ── DATA LOADING ─────────────────────────────────────────── */

function mapRow(row) {
  return {
    id:       row.id,
    name:     row.name,
    qty:      row.qty || '',
    category: row.category || 'Pantry & Staples',
    checked:  !!row.checked,
  };
}

async function loadCategories() {
  try {
    const used = await window.MiseData.listShoppingCategories();
    const merged = [...DEFAULT_CATEGORIES];
    used.forEach(c => { if (c && !merged.includes(c)) merged.push(c); });
    userCategories = merged;
  } catch (e) {
    console.warn('[shopping] Failed to load categories, using defaults:', e);
    userCategories = [...DEFAULT_CATEGORIES];
  }
  renderCategoryOptions();
}

async function loadSuggestions() {
  try {
    suggestionNames = await window.MiseData.getShoppingSuggestions();
  } catch (e) {
    console.warn('[shopping] Failed to load suggestions:', e);
    suggestionNames = [];
  }
  renderItemSuggestions();
}

async function loadShoppingItems() {
  try {
    const rows = await window.MiseData.listShoppingItems();
    shoppingItems = rows.map(mapRow);
  } catch (e) {
    console.error('[shopping] Failed to load shopping list:', e);
    showToast('⚠️ Could not load your shopping list — check Supabase setup');
    shoppingItems = [];
  }
  renderShoppingList();
}

/* ── ADD ITEM(S) ──────────────────────────────────────────── */

async function addItem(inputEl, selectEl, btnEl) {
  const raw = inputEl.value.trim();
  if (!raw) return;

  const entries = splitEntries(raw);
  if (!entries.length) return;

  // A specific category picked from the dropdown applies to the whole
  // batch; "Auto-detect" (or no dropdown at all, e.g. on mobile)
  // classifies each item on its own — important once you're adding
  // several items from different aisles in one go.
  const forcedCategory = (selectEl && selectEl.value !== '__AUTO__') ? selectEl.value : null;

  const drafts = entries.map(entry => {
    const { qty, name } = parseQtyAndName(entry);
    return { name, qty, category: forcedCategory || autoCategorize(name) };
  });

  inputEl.value = '';
  inputEl.disabled = true;
  if (btnEl) btnEl.disabled = true;

  const succeeded = [];
  const failed = [];

  for (const draft of drafts) {
    try {
      const row = await window.MiseData.addShoppingItem(draft);
      succeeded.push(row);
    } catch (e) {
      console.error('[shopping] Failed to add item:', draft.name, e);
      failed.push(draft.name);
    }
  }

  // Insert newest-first, but keep multi-add batches in the order typed.
  [...succeeded].reverse().forEach(row => shoppingItems.unshift(mapRow(row)));
  if (succeeded.length) {
    rememberSuggestions(succeeded.map(r => r.name));
    renderShoppingList();
  }

  let msg = '';
  if (succeeded.length === 1) {
    msg = `Added "${succeeded[0].name}" under ${succeeded[0].category}`;
  } else if (succeeded.length > 1) {
    const cats = new Set(succeeded.map(r => r.category));
    msg = `Added ${succeeded.length} items` + (cats.size > 1 ? ` across ${cats.size} categories` : ` under ${[...cats][0]}`);
  }
  if (failed.length) {
    msg += (msg ? ' — ' : '') + `⚠️ couldn't add: ${failed.join(', ')}`;
  }
  if (msg) showToast(msg);

  inputEl.disabled = false;
  if (btnEl) btnEl.disabled = false;
  inputEl.focus();
}

/* ── TOGGLE / DELETE ──────────────────────────────────────── */

async function toggleItem(id) {
  const item = shoppingItems.find(i => i.id === id);
  if (!item) return;
  const next = !item.checked;
  item.checked = next; // optimistic
  renderShoppingList();
  try {
    await window.MiseData.toggleShoppingItem(id, next);
  } catch (e) {
    console.error('[shopping] toggleItem failed:', e);
    item.checked = !next; // revert
    renderShoppingList();
    showToast('⚠️ Could not update item — try again');
  }
}

async function deleteItem(id) {
  const prevItems = shoppingItems;
  const item = shoppingItems.find(i => i.id === id);
  shoppingItems = shoppingItems.filter(i => i.id !== id); // optimistic
  renderShoppingList();
  try {
    await window.MiseData.deleteShoppingItem(id);
    showToast(item ? `"${item.name}" removed` : 'Item removed');
  } catch (e) {
    console.error('[shopping] deleteItem failed:', e);
    shoppingItems = prevItems; // revert
    renderShoppingList();
    showToast('⚠️ Could not remove item — try again');
  }
}

/* ── RENDER SHOPPING LIST UI ──────────────────────────────── */

function renderShoppingList() {
  const activeCount = shoppingItems.filter(i => !i.checked).length;
  if (cartBadge) cartBadge.textContent = activeCount;

  if (shoppingItems.length === 0) {
    const emptyHTML = `
      <div style="text-align: center; padding: 48px 20px; color: var(--sub);">
        <div style="font-size: 32px; margin-bottom: 10px;">🛒</div>
        <h3 style="font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 4px;">No items found in your list</h3>
        <p style="font-size: 13px;">Add what you need above — try typing a few items at once, separated by commas.</p>
      </div>
    `;
    if (containerDesktop) containerDesktop.innerHTML = emptyHTML;
    if (containerMobile)  containerMobile.innerHTML  = emptyHTML;
    return;
  }

  const presentCategories = [...new Set(shoppingItems.map(i => i.category))];
  let html = '';

  presentCategories.forEach(cat => {
    const catItems = shoppingItems.filter(i => i.category === cat);
    if (catItems.length > 0) {
      html += `<div class="category-group"><div class="category-title">${getCatEmoji(cat)} ${escapeHTML(cat)}</div>`;
      catItems.forEach(item => {
        html += `
          <div class="shopping-item ${item.checked ? 'checked' : ''}">
            <input type="checkbox" class="shopping-checkbox" ${item.checked ? 'checked' : ''} onchange="toggleItem('${item.id}')">
            <span class="item-text">${escapeHTML(item.name)}</span>
            ${item.qty ? `<span class="item-qty-badge">${escapeHTML(item.qty)}</span>` : ''}
            <button class="item-del-btn" onclick="deleteItem('${item.id}')">✕</button>
          </div>
        `;
      });
      html += `</div>`;
    }
  });

  if (containerDesktop) containerDesktop.innerHTML = html;
  if (containerMobile)  containerMobile.innerHTML  = html;
}

function escapeHTML(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ── STORE CHECKOUT DISPATCHER ────────────────────────────── */

function triggerStoreCheckout(platform) {
  const activeItems = shoppingItems.filter(i => !i.checked);

  if (activeItems.length === 0) {
    showToast('⚠️ No active items to order!');
    closeModal();
    return;
  }

  const itemListText = activeItems.map(i => `• ${i.qty ? i.qty + ' ' : ''}${i.name}`).join('\n');

  if (platform === 'whatsapp') {
    const storePhone = '2348000000000'; // Replace with Partner Merchant Number
    const text = `Hello Supermarket! I would like to order the following items from Mise AI:\n\n${itemListText}\n\nPlease confirm availability & total price.`;
    window.open(`https://wa.me/${storePhone}?text=${encodeURIComponent(text)}`, '_blank');
    showToast('💬 Opening WhatsApp Merchant...');
  }
  else if (platform === 'chowdeck') {
    const query = activeItems[0]?.name || 'grocery';
    window.open(`https://chowdeck.com/search?q=${encodeURIComponent(query)}`, '_blank');
    showToast('🚀 Opening Chowdeck Supermarket...');
  }
  else if (platform === 'jumia') {
    const query = activeItems[0]?.name || 'grocery';
    window.open(`https://www.jumia.com.ng/grocery/?q=${encodeURIComponent(query)}`, '_blank');
    showToast('📦 Opening Jumia Grocery Search...');
  }
  else if (platform === 'instacart') {
    window.open(`https://www.instacart.com`, '_blank');
    showToast('🥕 Opening Instacart...');
  }

  closeModal();
}

function openModal() {
  const activeCount = shoppingItems.filter(i => !i.checked).length;
  const countEl = document.getElementById('modalItemCount');
  if (countEl) countEl.textContent = `${activeCount} item${activeCount === 1 ? '' : 's'}`;
  if (storeModalOverlay) storeModalOverlay.classList.add('open');
}

function closeModal() {
  if (storeModalOverlay) storeModalOverlay.classList.remove('open');
}

/* ── INIT ─────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', async () => {
  const session = await window.MiseAuth.requireSession('mise_ai_auth_v2.html');
  if (!session) return; // already redirecting to login

  await Promise.all([loadCategories(), loadSuggestions(), loadShoppingItems()]);

  const addBtn         = document.getElementById('addBtn');
  const addItemInput   = document.getElementById('addItemInput');
  const categorySelect = document.getElementById('categorySelect');

  if (addBtn && addItemInput) {
    addBtn.addEventListener('click', () => addItem(addItemInput, categorySelect, addBtn));
    addItemInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') addItem(addItemInput, categorySelect, addBtn);
    });

    categorySelect?.addEventListener('change', () => {
      if (categorySelect.value === '__NEW_CAT__') {
        const newCat = prompt('Enter name for your new category:');
        if (newCat && newCat.trim()) {
          const formatted = newCat.trim();
          if (!userCategories.includes(formatted)) {
            userCategories.push(formatted);
            renderCategoryOptions();
          }
          categorySelect.value = formatted;
        } else {
          categorySelect.value = '__AUTO__';
        }
      }
    });
  }

  const mAddBtn = document.getElementById('mAddBtn');
  const mAddItemInput = document.getElementById('mAddItemInput');
  if (mAddBtn && mAddItemInput) {
    mAddBtn.addEventListener('click', () => addItem(mAddItemInput, null, mAddBtn));
    mAddItemInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') addItem(mAddItemInput, null, mAddBtn);
    });
  }

  document.getElementById('dOrderMallBtn')?.addEventListener('click', openModal);
  document.getElementById('dTopOrderBtn')?.addEventListener('click', openModal);
  document.getElementById('mOrderBtn')?.addEventListener('click', openModal);
  document.getElementById('closeStoreModal')?.addEventListener('click', closeModal);
});
