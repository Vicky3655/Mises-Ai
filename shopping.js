/* ============================================================
   MISE AI | SHOPPING LIST LOGIC & STORE EXPORT
   shopping.js
   ============================================================ */

const STORAGE_KEY = 'mise_shopping_list_items';

// Initial state
let shoppingItems = loadShoppingList();

// DOM elements
const containerDesktop = document.getElementById('shoppingListContainer');
const containerMobile = document.getElementById('mShoppingListContainer');
const cartBadge = document.getElementById('dCartCount');
const toastEl = document.getElementById('toast');
const storeModalOverlay = document.getElementById('storeModalOverlay');

function loadShoppingList() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [
      { id: '1', name: 'Fresh Tomatoes (2 kg)', category: 'Produce', checked: false },
      { id: '2', name: 'Red Palm Oil (1 Liter)', category: 'Spices', checked: false },
      { id: '3', name: 'Red Onion (1 Bag)', category: 'Produce', checked: true },
      { id: '4', name: 'Egusi Ground Seeds', category: 'Pantry', checked: false }
    ];
  } catch (e) {
    return [];
  }
}

function saveShoppingList() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(shoppingItems));
  renderShoppingList();
}

function showToast(msg) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 2800);
}

// Render Categorized Shopping List
function renderShoppingList() {
  const activeCount = shoppingItems.filter(i => !i.checked).length;
  if (cartBadge) cartBadge.textContent = activeCount;

  const categories = ['Produce', 'Proteins', 'Spices', 'Pantry', 'Dairy'];
  let html = '';

  if (shoppingItems.length === 0) {
    html = `
      <div style="text-align: center; padding: 40px 20px; color: var(--sub);">
        🛒 Your shopping list is empty!<br>Type an item above to add ingredients.
      </div>
    `;
    if (containerDesktop) containerDesktop.innerHTML = html;
    if (containerMobile) containerMobile.innerHTML = html;
    return;
  }

  categories.forEach(cat => {
    const catItems = shoppingItems.filter(i => i.category === cat);
    if (catItems.length > 0) {
      html += `<div class="category-group"><div class="category-title">${getCatEmoji(cat)} ${cat}</div>`;
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
  if (containerMobile) containerMobile.innerHTML = html;
}

function getCatEmoji(cat) {
  const map = { Produce: '🥦', Proteins: '🥩', Spices: '🌶️', Pantry: '🫙', Dairy: '🥛' };
  return map[cat] || '📦';
}

function escapeHTML(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Add Item
function addItem(inputEl, catEl) {
  const name = inputEl.value.trim();
  if (!name) return;
  const category = catEl ? catEl.value : 'Produce';

  shoppingItems.unshift({
    id: Date.now().toString(),
    name: name,
    category: category,
    checked: false
  });

  inputEl.value = '';
  saveShoppingList();
  showToast(`Added "${name}" to shopping list`);
}

function toggleItem(id) {
  const item = shoppingItems.find(i => i.id === id);
  if (item) {
    item.checked = !item.checked;
    saveShoppingList();
  }
}

function deleteItem(id) {
  shoppingItems = shoppingItems.filter(i => i.id !== id);
  saveShoppingList();
  showToast('Item removed');
}

// Store Checkout / Integration Dispatcher
function triggerStoreCheckout(platform) {
  const activeItems = shoppingItems.filter(i => !i.checked);
  
  if (activeItems.length === 0) {
    showToast('⚠️ No active items to order!');
    closeModal();
    return;
  }

  const itemListText = activeItems.map(i => `• ${i.name}`).join('\n');

  if (platform === 'whatsapp') {
    // Connects directly to Local Supermarket WhatsApp
    const storePhone = '2348000000000'; // Replace with Store Partner Number
    const text = `Hello Supermarket! I would like to order the following items from Mise AI:\n\n${itemListText}\n\nPlease confirm price & delivery time.`;
    window.open(`https://wa.me/${storePhone}?text=${encodeURIComponent(text)}`, '_blank');
    showToast('💬 Redirecting to WhatsApp Merchant...');
  } 
  else if (platform === 'chowdeck') {
    // Search deep link or partner integration link
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
    showToast('🥕 Opening Instacart Cart...');
  }

  closeModal();
}

// Modal controls
function openModal() {
  const activeCount = shoppingItems.filter(i => !i.checked).length;
  document.getElementById('modalItemCount').textContent = `${activeCount} item${activeCount === 1 ? '' : 's'}`;
  if (storeModalOverlay) storeModalOverlay.classList.add('open');
}

function closeModal() {
  if (storeModalOverlay) storeModalOverlay.classList.remove('open');
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  renderShoppingList();

  // Desktop Add
  const addBtn = document.getElementById('addBtn');
  const addItemInput = document.getElementById('addItemInput');
  const categorySelect = document.getElementById('categorySelect');

  if (addBtn && addItemInput) {
    addBtn.addEventListener('click', () => addItem(addItemInput, categorySelect));
    addItemInput.addEventListener('keydown', e => { if (e.key === 'Enter') addItem(addItemInput, categorySelect); });
  }

  // Mobile Add
  const mAddBtn = document.getElementById('mAddBtn');
  const mAddItemInput = document.getElementById('mAddItemInput');
  if (mAddBtn && mAddItemInput) {
    mAddBtn.addEventListener('click', () => addItem(mAddItemInput, null));
    mAddItemInput.addEventListener('keydown', e => { if (e.key === 'Enter') addItem(mAddItemInput, null); });
  }

  // Order buttons
  document.getElementById('dOrderMallBtn')?.addEventListener('click', openModal);
  document.getElementById('dTopOrderBtn')?.addEventListener('click', openModal);
  document.getElementById('mOrderBtn')?.addEventListener('click', openModal);
  document.getElementById('closeStoreModal')?.addEventListener('click', closeModal);
});
