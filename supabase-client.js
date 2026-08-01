/* ============================================================
   MISE AI — SUPABASE CLIENT  |  supabase-client.js

   Shared by every page. Load order matters — put these two tags
   before any other Mise script that touches auth or data:

     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
     <script src="supabase-client.js"></script>
     <script src="mise-data.js"></script>   (only on pages that read/write data)

   This is a plain global script on purpose (not an ES module) so it
   drops into the existing onclick="..."-style pages without needing
   every file converted to type="module".

   Exposes:
     window.sb        — the Supabase client instance
     window.MiseAuth   — auth helpers (login, signup, logout, session guard)
   ============================================================ */
'use strict';

(function () {
  // Same project the app already referenced in mise_ai_auth_v2.html / mise-ai.html.
  // The anon/publishable key is safe to ship client-side — it only ever acts
  // within the Row Level Security policies defined in schema.sql.
  const SUPABASE_URL      = 'https://gnurpzrlrerwjuxnlzcz.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_Mb1BqkqjO3RGWa9dMu9WWw_0LeIrS9D';

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    console.error(
      '[mise] Supabase library not found. Make sure this tag is loaded BEFORE ' +
      'supabase-client.js: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>'
    );
    return;
  }

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  // Renamed to `sb` so it doesn't collide with the `supabase` library namespace above.
  window.sb = sb;

  window.MiseAuth = {
    /** Email + password sign in. Throws on failure. */
    async login(email, password) {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data.user;
    },

    /** Email + password sign up. `name` is stored as user_metadata.full_name. */
    async signup(name, email, password) {
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });
      if (error) throw error;
      return data.user;
    },

    async sendPasswordReset(email) {
      const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/mise_ai_auth_v2.html',
      });
      if (error) throw error;
    },

    async signInWithGoogle() {
      const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/mise-ai.html' },
      });
      if (error) throw error;
      // Browser navigates to Google here — nothing else runs after this resolves.
    },

    async logOut(redirectTo) {
      await sb.auth.signOut();
      window.location.href = redirectTo || 'mise_ai_auth_v2.html';
    },

    /** Current session, or null. Never redirects. */
    async getSession() {
      const { data: { session } } = await sb.auth.getSession();
      return session;
    },

    /** Current user, or null. Never redirects. */
    async getUser() {
      const { data: { user } } = await sb.auth.getUser();
      return user;
    },

    /**
     * Call at the top of any page that requires a signed-in user:
     *   const session = await window.MiseAuth.requireSession('mise_ai_auth_v2.html');
     *   if (!session) return;   // already redirecting
     */
    async requireSession(redirectTo) {
      const session = await this.getSession();
      if (!session) {
        window.location.href = redirectTo || 'mise_ai_auth_v2.html';
        return null;
      }
      return session;
    },
  };
})();
