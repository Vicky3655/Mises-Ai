/* ============================================================
   INVENTORY LIST  |  inventory.js  (v3 — Supabase-backed)
   ============================================================ */
'use strict';

/* ── EMOJI PICKER DATA ─────────────────────────────────────── */
const EMOJI_CATS = [
  { key:'all',     icon:'✨', label:'All'      },
  { key:'veggie',  icon:'🥦', label:'Veggies'  },
  { key:'fruit',   icon:'🍎', label:'Fruits'   },
  { key:'protein', icon:'🥩', label:'Protein'  },
  { key:'pantry',  icon:'🫙', label:'Pantry'   },
  { key:'grain',   icon:'🌾', label:'Grains'   },
  { key:'spice',   icon:'🌶️', label:'Spices'  },
  { key:'dairy',   icon:'🥛', label:'Dairy'    },
];

const EMOJI_LIST = [
  { e:'🥦', cat:'veggie',  n:'Broccoli'       },
  { e:'🥕', cat:'veggie',  n:'Carrot'          },
  { e:'🧅', cat:'veggie',  n:'Onion'           },
  { e:'🥔', cat:'veggie',  n:'Potato'          },
  { e:'🌽', cat:'veggie',  n:'Corn'            },
  { e:'🫑', cat:'veggie',  n:'Bell Pepper'     },
  { e:'🍆', cat:'veggie',  n:'Eggplant'        },
  { e:'🥑', cat:'veggie',  n:'Avocado'         },
  { e:'🥒', cat:'veggie',  n:'Cucumber'        },
  { e:'🧄', cat:'veggie',  n:'Garlic'          },
  { e:'🥬', cat:'veggie',  n:'Leafy Green'     },
  { e:'🫛', cat:'veggie',  n:'Peas'            },
  { e:'🍠', cat:'veggie',  n:'Sweet Potato'    },
  { e:'🌿', cat:'veggie',  n:'Herb'            },
  { e:'🍅', cat:'fruit',   n:'Tomato'          },
  { e:'🍎', cat:'fruit',   n:'Apple'           },
  { e:'🍊', cat:'fruit',   n:'Orange'          },
  { e:'🍋', cat:'fruit',   n:'Lemon'           },
  { e:'🍇', cat:'fruit',   n:'Grapes'          },
  { e:'🍓', cat:'fruit',   n:'Strawberry'      },
  { e:'🍑', cat:'fruit',   n:'Peach'           },
  { e:'🥭', cat:'fruit',   n:'Mango'           },
  { e:'🍌', cat:'fruit',   n:'Banana'          },
  { e:'🍍', cat:'fruit',   n:'Pineapple'       },
  { e:'🫐', cat:'fruit',   n:'Blueberries'     },
  { e:'🍈', cat:'fruit',   n:'Melon'           },
  { e:'🥩', cat:'protein', n:'Red Meat'        },
  { e:'🍗', cat:'protein', n:'Chicken'         },
  { e:'🍖', cat:'protein', n:'Bone Meat'       },
  { e:'🥚', cat:'protein', n:'Egg'             },
  { e:'🐟', cat:'protein', n:'Fish'            },
  { e:'🦐', cat:'protein', n:'Shrimp/Crayfish' },
  { e:'🦀', cat:'protein', n:'Crab'            },
  { e:'🦞', cat:'protein', n:'Lobster'         },
  { e:'🐠', cat:'protein', n:'Tropical Fish'   },
  { e:'🦑', cat:'protein', n:'Squid'           },
  { e:'🥓', cat:'protein', n:'Bacon'           },
  { e:'🫙', cat:'pantry',  n:'Jar'             },
  { e:'🥫', cat:'pantry',  n:'Canned Food'     },
  { e:'🍶', cat:'pantry',  n:'Oil Bottle'      },
  { e:'🫒', cat:'pantry',  n:'Olive'           },
  { e:'🍯', cat:'pantry',  n:'Honey'           },
  { e:'🥜', cat:'pantry',  n:'Peanuts'         },
  { e:'🧴', cat:'pantry',  n:'Liquid Bottle'   },
  { e:'🌾', cat:'grain',   n:'Wheat / Grain'   },
  { e:'🍚', cat:'grain',   n:'Rice'            },
  { e:'🍞', cat:'grain',   n:'Bread'           },
  { e:'🥐', cat:'grain',   n:'Pastry'          },
  { e:'🫘', cat:'grain',   n:'Beans'           },
  { e:'🥣', cat:'grain',   n:'Porridge'        },
  { e:'🌶️', cat:'spice',  n:'Chili Pepper'    },
  { e:'🧂', cat:'spice',   n:'Salt'            },
  { e:'🌰', cat:'spice',   n:'Chestnut'        },
  { e:'🫚', cat:'spice',   n:'Cooking Oil'     },
  { e:'🥛', cat:'dairy',   n:'Milk'            },
  { e:'🧈', cat:'dairy',   n:'Butter'          },
  { e:'🧀', cat:'dairy',   n:'Cheese'          },
];

/* ── STATE ── */
const state = {
  items: [],
  filter:     '',
  toastTimer: null,
};

/* ── DOM ── */
const $ = id => document.getElementById(id);
const dom = {};

function cacheDOM() {
  [
    /* lists */        'itemsList', 'mItemsList',
    /* desktop srch */ 'searchInput', 'searchClear',
    /* mobile srch */  'mSearchInput', 'mSearchClear',
    /* mobile CTAs */  'createNewBtn', 'quickEntryBtn',
    /* see all */      'seeAllBtn', 'mSeeAllBtn',
    /* back */         'backBtn', 'mBackBtn',
    /* modal */        'modalOverlay', 'modalClose', 'modalCancel', 'modalSave',
    /* modal fields */ 'itemName', 'itemQty', 'itemEmoji',
    /* feedback */     'toast', 'modalTitle',
  ].forEach(id => { dom[id] = $(id); });
}

/* ── TOAST ── */
function showToast(msg) {
  if (!dom.toast) return;
  dom.toast.textContent = msg;
  dom.toast.classList.add('show');
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => dom.toast.classList.remove('show'), 3000);
}

/* ── BUILD ITEM ROW ── */
function buildItemRow(item) {
  const row = document.createElement('div');
  row.className = 'item-row' + (item.checked ? ' checked' : '');
  row.dataset.id = item.id;

  const emojiHTML = item.emoji === '__MISE_LOGO__'
    ? `<div class="item-emoji item-emoji--logo"><img src="mise_ai_logo.png" alt="Mise AI"/></div>`
    : `<div class="item-emoji">${item.emoji}</div>`;

  row.innerHTML = `
    ${emojiHTML}
    <div class="item-info">
      <div class="item-name">${escHTML(item.name)}</div>
      <div class="item-qty">${escHTML(item.qty)}</div>
    </div>
    <button class="item-delete" data-id="${item.id}"
      title="Remove item" aria-label="Delete ${escHTML(item.name)}">✕</button>
    <input
      type="checkbox"
      class="item-checkbox"
      data-id="${item.id}"
      aria-label="Mark ${escHTML(item.name)} as done"
      ${item.checked ? 'checked' : ''}
    >
  `;

  row.querySelector('.item-checkbox').addEventListener('change', e => {
    e.stopPropagation();
    toggleItem(item.id);
  });
  row.querySelector('.item-delete').addEventListener('click', e => {
    e.stopPropagation();
    deleteItem(item.id, item.name);
  });

  return row;
}

/* ── RENDER ── */
function render() {
  const q        = state.filter.trim().toLowerCase();
  const filtered = q
    ? state.items.filter(i =>
        i.name.toLowerCase().includes(q) || i.qty.toLowerCase().includes(q))
    : state.items;

  /* Section-title count badge — update desktop AND mobile spans */
  document.querySelectorAll('.section-title').forEach(el => {
    el.innerHTML = `Recently Added <span class="count-badge">${state.items.length}</span>`;
  });

  /* Desktop sidebar stat counters */
  const setTxt = (id, v) => { const e = $(id); if (e) e.textContent = v; };
  const doneCount = state.items.filter(i => i.checked).length;
  setTxt('dTotalItems',      state.items.length);
  setTxt('dCheckedItems',    doneCount);
  setTxt('dKitchenSelected', doneCount);
  setTxt('kitchenCount',     doneCount);

  /* Broader & Complete Empty State Creator */
  const makeEmpty = () => {
    const wrap = document.createElement('div');
    wrap.className = 'empty-state';

    if (q) {
      wrap.innerHTML = `
        <div class="empty-state-card">
          <div class="empty-state-icon-wrap">
            <span class="empty-state-icon">🔍</span>
          </div>
          <h3 class="empty-state-title">No matching ingredients</h3>
          <p class="empty-state-text">We couldn't find any items matching "<strong>${escHTML(q)}</strong>". Check for typos or try searching another term.</p>
          <div class="empty-state-actions">
            <button type="button" class="empty-state-btn secondary" id="emptyClearBtn">
              Clear Search Filter
            </button>
          </div>
        </div>
      `;
      setTimeout(() => {
        wrap.querySelector('#emptyClearBtn')?.addEventListener('click', () => {
          if (dom.searchInput)  dom.searchInput.value  = '';
          if (dom.mSearchInput) dom.mSearchInput.value = '';
          if (dom.searchClear)  dom.searchClear.classList.remove('visible');
          if (dom.mSearchClear) dom.mSearchClear.classList.remove('visible');
          state.filter = '';
          render();
        });
      }, 0);
    } else {
      wrap.innerHTML = `
        <div class="empty-state-card">
          <div class="empty-state-icon-wrap logo-glow">
            <img src="mise_ai_logo.png" alt="Mise AI" class="empty-state-logo">
          </div>
          <h3 class="empty-state-title">Your Kitchen Pantry is Empty</h3>
          <p class="empty-state-text">Track your fresh produce, spices, grains, and meats here so Mise AI can help you organize ingredients and plan meals.</p>
          <div class="empty-state-actions">
            <button type="button" class="empty-state-btn primary" id="emptyAddBtn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 4.5v15m7.5-7.5h-15"/></svg>
              Add First Item
            </button>
            <button type="button" class="empty-state-btn secondary" id="emptyQuickBtn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 4.5v15m7.5-7.5h-15"/></svg>
              Quick Entry
            </button>
          </div>
        </div>
      `;
      setTimeout(() => {
        wrap.querySelector('#emptyAddBtn')?.addEventListener('click', () => openModal('Add New Item'));
        wrap.querySelector('#emptyQuickBtn')?.addEventListener('click', () => quickEntry());
      }, 0);
    }

    return wrap;
  };

  /* Write into both containers */
  [dom.itemsList, dom.mItemsList].forEach(list => {
    if (!list) return;
    list.innerHTML = '';
    if (filtered.length === 0) {
      list.appendChild(makeEmpty());
      return;
    }
    filtered.forEach(item => list.appendChild(buildItemRow(item)));
  });
}

/* ── ITEM ACTIONS ── */
function toggleItem(id) {
  const item = state.items.find(i => i.id === id);
  if (!item) return;
  item.checked = !item.checked;
  render();
  showToast(item.checked ? `✅ "${item.name}" marked done` : `↩️ "${item.name}" unmarked`);
}

function deleteItem(id, name) {
  state.items = state.items.filter(i => i.id !== id);
  render();
  showToast(`🗑️ "${name}" removed`);
}

function addItem(name, qty, emoji) {
  console.warn('[inventory] addItem called without inventory_patch.js — not persisted.');
  state.items.unshift({
    id:      'local-' + Date.now(),
    name:    name.trim(),
    qty:     qty.trim() || '1 Unit',
    emoji:   emoji.trim() || '__MISE_LOGO__',
    checked: false,
  });
  render();
}

/* ── MODAL ── */
function openModal(title = 'Add New Item') {
  if (!dom.modalOverlay) return;
  dom.modalTitle.textContent = title;
  dom.itemName.value = '';
  dom.itemQty.value  = '';
  resetEmojiPicker();
  dom.modalOverlay.classList.add('open');
  setTimeout(() => dom.itemName.focus(), 120);
}

function closeModal() {
  dom.modalOverlay?.classList.remove('open');
  closeEmojiPanel();
}

/* ── EMOJI PICKER ──────────────────────────────────────────── */
const epick = { open: false, cat: 'all' };
let _eTrigger, _ePreview, _eLabel, _eChevron, _ePanel, _eCats, _eGrid, _eWrap;

function initEmojiPicker() {
  _eTrigger = $('emojiTrigger');
  _ePreview = $('emojiPreview');
  _eLabel   = $('emojiLabel');
  _eChevron = $('emojiChevron');
  _ePanel   = $('emojiPanel');
  _eCats    = $('emojiCats');
  _eGrid    = $('emojiGrid');
  _eWrap    = $('emojiPickerWrap');
  if (!_eTrigger) return;

  _eCats.innerHTML = EMOJI_CATS.map(c =>
    `<button type="button" class="epick-cat${c.key === 'all' ? ' active' : ''}"
      data-cat="${c.key}" title="${c.label}">
       <span class="epick-cat-icon">${c.icon}</span>
       <span class="epick-cat-label">${c.label}</span>
     </button>`
  ).join('');

  _eCats.querySelectorAll('.epick-cat').forEach(btn =>
    btn.addEventListener('click', e => {
      e.stopPropagation();
      epick.cat = btn.dataset.cat;
      _eCats.querySelectorAll('.epick-cat').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderEmojiGrid();
    })
  );

  _eTrigger.addEventListener('click', e => { e.stopPropagation(); toggleEmojiPanel(); });

  document.addEventListener('click', e => {
    if (epick.open && !_eWrap?.contains(e.target)) closeEmojiPanel();
  });

  renderEmojiGrid();
  setPickerDefault();
}

function renderEmojiGrid() {
  if (!_eGrid) return;
  const list = epick.cat === 'all'
    ? EMOJI_LIST
    : EMOJI_LIST.filter(i => i.cat === epick.cat);

  _eGrid.innerHTML =
    `<button type="button" class="epick-opt epick-opt--logo" data-emoji="__MISE_LOGO__"
       title="Mise AI Logo" aria-label="Use Mise AI logo">
       <img src="mise_ai_logo.png" alt="Mise AI">
     </button>` +
    list.map(i =>
      `<button type="button" class="epick-opt" data-emoji="${i.e}"
         title="${i.n}" aria-label="${i.n}">${i.e}</button>`
    ).join('');

  _eGrid.querySelectorAll('.epick-opt').forEach(btn =>
    btn.addEventListener('click', e => {
      e.stopPropagation();
      selectEmoji(btn.dataset.emoji, btn.title);
    })
  );
}

function selectEmoji(val, label) {
  if (!_ePreview) return;
  dom.itemEmoji.value = val;
  if (val === '__MISE_LOGO__') {
    _ePreview.innerHTML = `<img src="mise_ai_logo.png" class="epick-preview-img" alt="Mise AI">`;
    _eLabel.textContent  = 'Mise AI Logo';
  } else {
    _ePreview.textContent = val;
    _eLabel.textContent   = label || val;
  }
  closeEmojiPanel();
}

function toggleEmojiPanel()  { epick.open ? closeEmojiPanel() : openEmojiPanel(); }
function openEmojiPanel()  {
  epick.open = true;
  _ePanel?.classList.add('open');
  _eChevron?.classList.add('rotated');
  _eWrap?.classList.add('open');
}
function closeEmojiPanel() {
  epick.open = false;
  _ePanel?.classList.remove('open');
  _eChevron?.classList.remove('rotated');
  _eWrap?.classList.remove('open');
}

function setPickerDefault() {
  if (!_ePreview) return;
  dom.itemEmoji.value   = '';
  _ePreview.innerHTML   = `<img src="mise_ai_logo.png" class="epick-preview-img" alt="Mise AI">`;
  _eLabel.textContent   = 'Mise AI Logo (default)';
  closeEmojiPanel();
}

function resetEmojiPicker() {
  epick.cat = 'all';
  _eCats?.querySelectorAll('.epick-cat').forEach((b, i) =>
    b.classList.toggle('active', i === 0)
  );
  renderEmojiGrid();
  setPickerDefault();
}

/* ── SAVE MODAL ── */
async function saveModal() {
  const name  = dom.itemName.value.trim();
  const qty   = dom.itemQty.value.trim();
  const emoji = dom.itemEmoji.value.trim();

  if (!name) {
    dom.itemName.focus();
    dom.itemName.style.borderColor = '#e8621a';
    setTimeout(() => { dom.itemName.style.borderColor = ''; }, 1400);
    showToast('⚠️ Please enter an item name');
    return;
  }

  dom.modalSave.disabled = true;
  try {
    await addItem(name, qty, emoji);
    closeModal();
    showToast(`✅ "${name}" added to inventory`);
  } catch (e) {
    console.error('[inventory] Failed to add item:', e);
    showToast('⚠️ Could not save item — try again');
  } finally {
    dom.modalSave.disabled = false;
  }
}

/* ── QUICK ENTRY ── */
function quickEntry() {
  openModal('Quick Entry');
  if (dom.itemQty)   dom.itemQty.placeholder   = 'e.g. 2 Pieces';
  if (dom.itemEmoji) dom.itemEmoji.value        = '';
}

/* ── SEARCH ── */
function setupSearch() {
  function bind(input, clear) {
    if (!input) return;
    input.addEventListener('input', () => {
      state.filter = input.value;
      clear?.classList.toggle('visible', input.value.length > 0);
      render();
    });
    clear?.addEventListener('click', () => {
      input.value = ''; state.filter = '';
      clear.classList.remove('visible');
      input.focus(); render();
    });
  }
  bind(dom.searchInput,  dom.searchClear);   /* desktop */
  bind(dom.mSearchInput, dom.mSearchClear);  /* mobile  */
}

/* ── EVENTS ── */
function setupEvents() {
  dom.createNewBtn?.addEventListener('click',  () => openModal('Add New Item'));
  dom.quickEntryBtn?.addEventListener('click', quickEntry);

  dom.modalClose?.addEventListener('click',   closeModal);
  dom.modalCancel?.addEventListener('click',  closeModal);
  dom.modalSave?.addEventListener('click',    saveModal);
  dom.modalOverlay?.addEventListener('click', e => {
    if (e.target === dom.modalOverlay) closeModal();
  });
  [dom.itemName, dom.itemQty, dom.itemEmoji].forEach(el => {
    el?.addEventListener('keydown', e => { if (e.key === 'Enter') saveModal(); });
  });

  const onSeeAll = () => showToast('📋 Showing all inventory items');
  dom.seeAllBtn?.addEventListener('click',  onSeeAll);
  dom.mSeeAllBtn?.addEventListener('click', onSeeAll);

  const onBack = () => document.referrer
    ? history.back()
    : showToast('🏠 Navigate to your main page');
  dom.backBtn?.addEventListener('click',  onBack);
  dom.mBackBtn?.addEventListener('click', onBack);

  document.addEventListener('keydown', e => {
    if (e.key === 'n' && !isInputFocused()) { e.preventDefault(); openModal(); }
    if (e.key === 'Escape') closeModal();
  });
}

/* ── HELPERS ── */
function escHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isInputFocused() {
  const tag = document.activeElement?.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA';
}

/* ── INIT ── */
function init() {
  cacheDOM();
  setupSearch();
  setupEvents();
  initEmojiPicker();
  render();
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', init)
  : init();
