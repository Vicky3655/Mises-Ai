/* ============================================================
   MISE AI — DATA LAYER  |  mise-data.js

   Replaces every localStorage.getItem/setItem call in the app
   ('mise_inventory', 'mise_inventory_selected', 'mise_selected_ids',
   'mise_plans') with calls against the Supabase tables defined in
   schema.sql.

   Load AFTER supabase-client.js.
   ============================================================ */
'use strict';

(function () {
  function sbOrThrow() {
    if (!window.sb) throw new Error('[mise] Supabase client not ready — check script load order.');
    return window.sb;
  }

  window.MiseData = {

    /* ══════════════════════ INVENTORY ══════════════════════ */

    async listInventory() {
      const sb = sbOrThrow();
      const { data, error } = await sb
        .from('inventory_items')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },

    async getCheckedInventoryItems() {
      const sb = sbOrThrow();
      const { data, error } = await sb
        .from('inventory_items')
        .select('*')
        .eq('checked', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },

    async addInventoryItem({ name, qty, emoji }) {
      const sb = sbOrThrow();
      const user = await window.MiseAuth.getUser();
      if (!user) throw new Error('Not signed in');
      const { data, error } = await sb
        .from('inventory_items')
        .insert({
          user_id: user.id,
          name,
          qty:   qty   || '1 Unit',
          emoji: emoji || '__MISE_LOGO__',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async toggleInventoryItem(id, checked) {
      const sb = sbOrThrow();
      const { error } = await sb
        .from('inventory_items')
        .update({ checked })
        .eq('id', id);
      if (error) throw error;
    },

    async deleteInventoryItem(id) {
      const sb = sbOrThrow();
      const { error } = await sb
        .from('inventory_items')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },

    /* ══════════════════════ MEAL PLANS ══════════════════════ */

    _mapPlanRow(row) {
      return {
        id:           row.id,
        name:         row.name,
        date:         row.plan_date || '',
        time:         row.plan_time ? String(row.plan_time).slice(0, 5) : '',
        alertEnabled: row.alert_enabled,
        notes:        row.notes || '',
        items:        (row.meal_plan_items || []).map(i => ({
          name: i.name, qty: i.qty, emoji: i.emoji,
        })),
        status:    row.status,
        createdAt: row.created_at,
      };
    },

    async listMealPlans() {
      const sb = sbOrThrow();
      const { data, error } = await sb
        .from('meal_plans')
        .select('*, meal_plan_items(name, qty, emoji)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(row => this._mapPlanRow(row));
    },

    async saveMealPlan({ name, date, time, alertEnabled, notes, items }) {
      const sb = sbOrThrow();
      const user = await window.MiseAuth.getUser();
      if (!user) throw new Error('Not signed in');

      const { data: planRow, error } = await sb
        .from('meal_plans')
        .insert({
          user_id:       user.id,
          name,
          plan_date:     date || null,
          plan_time:     time || null,
          alert_enabled: alertEnabled,
          notes:         notes || null,
        })
        .select()
        .single();
      if (error) throw error;

      let insertedItems = [];
      if (items && items.length) {
        const rows = items.map(i => ({
          meal_plan_id:      planRow.id,
          user_id:           user.id,
          inventory_item_id: i.id || null,
          name:              i.name,
          qty:               i.qty,
          emoji:             i.emoji,
        }));
        const { data: itemRows, error: itemErr } = await sb
          .from('meal_plan_items')
          .insert(rows)
          .select('name, qty, emoji');
        if (itemErr) throw itemErr;
        insertedItems = itemRows;
      }

      return this._mapPlanRow({ ...planRow, meal_plan_items: insertedItems });
    },

    async updateMealPlanStatus(id, status) {
      const sb = sbOrThrow();
      const { error } = await sb
        .from('meal_plans')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },

    async deleteMealPlan(id) {
      const sb = sbOrThrow();
      const { error } = await sb
        .from('meal_plans')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },

    async clearMealPlans() {
      const sb = sbOrThrow();
      const user = await window.MiseAuth.getUser();
      if (!user) throw new Error('Not signed in');
      const { error } = await sb
        .from('meal_plans')
        .delete()
        .eq('user_id', user.id);
      if (error) throw error;
    },

    /* ══════════════════════ SCAN HISTORY ══════════════════════ */

    async listScanHistory(limit = 50) {
      const sb = sbOrThrow();
      const { data, error } = await sb
        .from('scan_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },

    async addScanHistory({ foodName, confidence, scene, result, thumbnailUrl }) {
      const sb = sbOrThrow();
      const user = await window.MiseAuth.getUser();
      if (!user) throw new Error('Not signed in');
      const { data, error } = await sb
        .from('scan_history')
        .insert({
          user_id:       user.id,
          food_name:     foodName,
          confidence:    confidence ?? null,
          scene:         scene || null,
          result,
          thumbnail_url: thumbnailUrl || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async clearScanHistory() {
      const sb = sbOrThrow();
      const user = await window.MiseAuth.getUser();
      if (!user) throw new Error('Not signed in');
      const { error } = await sb
        .from('scan_history')
        .delete()
        .eq('user_id', user.id);
      if (error) throw error;
    },

    /* ══════════════════════ SHOPPING LIST ══════════════════════
       Backs shopping.html / shopping.js. Requires a `shopping_items`
       table — run shopping_items_schema.sql once in the Supabase SQL
       editor if it isn't already in your project. */

    async listShoppingItems() {
      const sb = sbOrThrow();
      const { data, error } = await sb
        .from('shopping_items')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },

    /** Distinct categories currently in use, so custom categories the
     *  user has typed before resurface without needing their own table. */
    async listShoppingCategories() {
      const sb = sbOrThrow();
      const { data, error } = await sb
        .from('shopping_items')
        .select('category');
      if (error) throw error;
      return [...new Set((data || []).map(r => r.category).filter(Boolean))];
    },

    /** Name suggestions for the add-item autocomplete, drawn from the
     *  user's own inventory plus their shopping history instead of a
     *  separate hand-maintained library. Resilient to either source
     *  (or the shopping_items table itself) not existing yet. */
    async getShoppingSuggestions() {
      const sb = sbOrThrow();
      const [invResult, histResult] = await Promise.allSettled([
        sb.from('inventory_items').select('name'),
        sb.from('shopping_items').select('name').order('created_at', { ascending: false }).limit(100),
      ]);
      const names = [];
      if (invResult.status === 'fulfilled' && !invResult.value.error) {
        names.push(...(invResult.value.data || []).map(r => r.name));
      }
      if (histResult.status === 'fulfilled' && !histResult.value.error) {
        names.push(...(histResult.value.data || []).map(r => r.name));
      }
      return [...new Set(names)].sort((a, b) => a.localeCompare(b));
    },

    async addShoppingItem({ name, qty, category }) {
      const sb = sbOrThrow();
      const user = await window.MiseAuth.getUser();
      if (!user) throw new Error('Not signed in');
      const { data, error } = await sb
        .from('shopping_items')
        .insert({
          user_id:  user.id,
          name,
          qty:      qty || null,
          category: category || 'Pantry & Staples',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async toggleShoppingItem(id, checked) {
      const sb = sbOrThrow();
      const { error } = await sb
        .from('shopping_items')
        .update({ checked })
        .eq('id', id);
      if (error) throw error;
    },

    async deleteShoppingItem(id) {
      const sb = sbOrThrow();
      const { error } = await sb
        .from('shopping_items')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
  };
})();
