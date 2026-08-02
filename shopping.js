/* ============================================================
   MISE AI | DYNAMIC USER-DRIVEN SHOPPING LIST
   shopping.js
   ============================================================ */

const ITEMS_STORAGE_KEY   = 'mise_shopping_items_v2';
const CATS_STORAGE_KEY    = 'mise_user_categories_v1';
const LIBRARY_STORAGE_KEY = 'mise_user_item_library_v1';

const DEFAULT_CATEGORIES = ['Produce', 'Meat & Seafood', 'Spices & Oils', 'Pantry & Staples', 'Dairy & Bakery'];

let shoppingItems  = loadFromStorage(ITEMS_STORAGE_KEY, []);
let userCategories = loadFromStorage(CATS_STORAGE_KEY, DEFAULT_CATEGORIES);
let itemLibrary    = loadFromStorage(LIBRARY_STORAGE_KEY, []);

const containerDesktop  = document.getElementById('shoppingListContainer');
const containerMobile   = document.getElementById('mShoppingListContainer');
const cartBadge         = document.getElementById('dCartCount');
const toastEl           = document.getElementById('toast');
const storeModalOverlay = document.getElementById('storeModalOverlay');

function loadFromStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch (e) {
    return fallback;
  }
}

function saveToStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('[storage] save error:', e);
  }
}

function showToast(msg) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 2800);
}

/* ── 1. DYNAMIC CATEGORY & SUGGESTIONS POPULATION ───────── */

function renderCategoryOptions() {
  const selectEl = document.getElementById('categorySelect');
  if (!selectEl) return;

  let optionsHTML = userCategories.map(cat => 
    `<option value="${escapeHTML(cat)}">${getCatEmoji(cat)} ${escapeHTML(cat)}</option>`
  ).join('');

  optionsHTML += `<option value="__NEW_CAT__">➕ Add New Custom Category...</option>`;
  selectEl.innerHTML = optionsHTML;
}

function renderItemSuggestions() {
  let datalist = document.getElementById('itemSuggestionsList');
  if (!datalist) {
    datalist = document.createElement('datalist');
    datalist.id = 'itemSuggestionsList';
    document.body.appendChild(datalist);
  }

  datalist.innerHTML = itemLibrary.map(item => 
    `<option value="${escapeHTML(item)}"></option>`
  ).join('');

  const dInput = document.getElementById('addItemInput');
  const mInput = document.getElementById('mAddItemInput');
  if (dInput) dInput.setAttribute('list', 'itemSuggestionsList');
  if (mInput) mInput.setAttribute('list', 'itemSuggestionsList');
}

/* ── 2. DYNAMIC ITEM & CATEGORY CREATION ─────────────────── */

function addItem(inputEl, selectEl) {
  const name = inputEl.value.trim();
  if (!name) return;

  let category = selectEl ? selectEl.value : userCategories[0] || 'General';

  if (category === '__NEW_CAT__') {
    const newCat = prompt('Enter name for your new category:');
    if (newCat && newCat.trim()) {
      category = newCat.trim();
      if (!userCategories.includes(category)) {
        userCategories.push(category);
        saveToStorage(CATS_STORAGE_KEY, userCategories);
        renderCategoryOptions();
      }
    } else {
      category = userCategories[0] || 'General';
    }
  }

  if (!itemLibrary.includes(name)) {
    itemLibrary.push(name);
    saveToStorage(LIBRARY_STORAGE_KEY, itemLibrary);
    renderItemSuggestions();
  }

  shoppingItems.unshift({
    id: 'item-' + Date.now(),
    name: name,
    category: category,
    checked: false
  });

  inputEl.value = '';
  saveToStorage(ITEMS_STORAGE_KEY, shoppingItems);
  renderShoppingList();
  showToast(`Added "${name}" under ${category}`);
}

function toggleItem(id) {
  const item = shoppingItems.find(i => i.id === id);
  if (item) {
    item.checked = !item.checked;
    saveToStorage(ITEMS_STORAGE_KEY, shoppingItems);
    renderShoppingList();
  }
}

function deleteItem(id) {
  shoppingItems = shoppingItems.filter(i => i.id !== id);
  saveToStorage(ITEMS_STORAGE_KEY, shoppingItems);
  renderShoppingList();
  showToast('Item removed');
}

/* ── 3. RENDER SHOPPING LIST UI ──────────────────────────── */

function renderShoppingList() {
  const activeCount = shoppingItems.filter(i => !i.checked).length;
  if (cartBadge) cartBadge.textContent = activeCount;

  if (shoppingItems.length === 0) {
    const emptyHTML = `
      <div style="text-align: center; padding: 48px 20px; color: var(--sub);">
        <div style="font-size: 32px; margin-bottom: 10px;">🛒</div>
        <h3 style="font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 4px;">No items found in your list</h3>
        <p style="font-size: 13px;">Input the ingredients and food items you need to buy above.</p>
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

function getCatEmoji(cat) {
  const c = cat.toLowerCase();
  if (c.includes('veggie') || c.includes('produce') || c.includes('fruit')) return '🥦';
  if (c.includes('meat') || c.includes('fish') || c.includes('protein')) return '🥩';
  if (c.includes('spice') || c.includes('oil') || c.includes('pepper')) return '🌶️';
  if (c.includes('dairy') || c.includes('milk') || c.includes('bakery')) return '🥛';
  if (c.includes('drink') || c.includes('beverage')) return '🥤';
  return '🫙';
}

function escapeHTML(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ── 4. STORE CHECKOUT DISPATCHER ────────────────────────── */

function triggerStoreCheckout(platform) {
  const activeItems = shoppingItems.filter(i => !i.checked);
  
  if (activeItems.length === 0) {
    showToast('⚠️ No active items to order!');
    closeModal();
    return;
  }

  const itemListText = activeItems.map(i => `• ${i.name}`).join('\n');

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

/* ── 5. INITIALIZATION & EVENTS ──────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  renderCategoryOptions();
  renderItemSuggestions();
  renderShoppingList();

  const addBtn = document.getElementById('addBtn');
  const addItemInput = document.getElementById('addItemInput');
  const categorySelect = document.getElementById('categorySelect');

  if (addBtn && addItemInput) {
    addBtn.addEventListener('click', () => addItem(addItemInput, categorySelect));
    addItemInput.addEventListener('keydown', e => { if (e.key === 'Enter') addItem(addItemInput, categorySelect); });

    categorySelect?.addEventListener('change', () => {
      if (categorySelect.value === '__NEW_CAT__') {
        const newCat = prompt('Enter custom category name:');
        if (newCat && newCat.trim()) {
          const formatted = newCat.trim();
          if (!userCategories.includes(formatted)) {
            userCategories.push(formatted);
            saveToStorage(CATS_STORAGE_KEY, userCategories);
            renderCategoryOptions();
            categorySelect.value = formatted;
          }
        } else {
          categorySelect.selectedIndex = 0;
        }
      }
    });
  }

  const mAddBtn = document.getElementById('mAddBtn');
  const mAddItemInput = document.getElementById('mAddItemInput');
  if (mAddBtn && mAddItemInput) {
    mAddBtn.addEventListener('click', () => addItem(mAddItemInput, null));
    mAddItemInput.addEventListener('keydown', e => { if (e.key === 'Enter') addItem(mAddItemInput, null); });
  }

  document.getElementById('dOrderMallBtn')?.addEventListener('click', openModal);
  document.getElementById('dTopOrderBtn')?.addEventListener('click', openModal);
  document.getElementById('mOrderBtn')?.addEventListener('click', openModal);
  document.getElementById('closeStoreModal')?.addEventListener('click', closeModal);
});
