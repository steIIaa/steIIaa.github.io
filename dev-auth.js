/* ============================================
   dev-auth.js — shared Discord auth for dev team
   Handles login/logout in the footer and exposes
   window.devAuth for other scripts to check.
   ============================================ */

(function () {
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON) return;

  const { createClient } = supabase;
  const db = createClient(window.SUPABASE_URL, window.SUPABASE_ANON);

  // expose globally so devlog.js can use it
  window.devAuth = { db, user: null, isDev: false };

  async function checkWhitelist(userId) {
    const { data } = await db
      .from('dev_whitelist')
      .select('user_id')
      .eq('user_id', userId)
      .single();
    return !!data;
  }

  async function init() {
    const { data: { session } } = await db.auth.getSession();
    if (session?.user) {
      window.devAuth.user = session.user;
      window.devAuth.isDev = await checkWhitelist(session.user.id);
    }
    renderFooterAuth();
    document.dispatchEvent(new CustomEvent('devauth:ready'));
  }

  function renderFooterAuth() {
    const el = document.getElementById('footer-dev-auth');
    if (!el) return;

    if (!window.devAuth.user) {
      el.innerHTML = `<button class="footer__dev-btn" id="footer-login">dev login</button>`;
      document.getElementById('footer-login').addEventListener('click', login);
    } else {
      const meta = window.devAuth.user.user_metadata;
      const name = meta.custom_claims?.global_name || meta.full_name || meta.name || 'dev';
      const label = window.devAuth.isDev ? `✦ ${name}` : name;
      el.innerHTML = `
        <span class="footer__dev-name">${label}</span>
        <button class="footer__dev-btn" id="footer-logout">log out</button>`;
      document.getElementById('footer-logout').addEventListener('click', logout);
    }
  }

  async function login() {
    await db.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo: window.location.href }
    });
  }

  async function logout() {
    await db.auth.signOut();
    window.devAuth.user = null;
    window.devAuth.isDev = false;
    renderFooterAuth();
    document.dispatchEvent(new CustomEvent('devauth:ready'));
  }

  db.auth.onAuthStateChange(async (_event, session) => {
    window.devAuth.user = session?.user || null;
    window.devAuth.isDev = session?.user
      ? await checkWhitelist(session.user.id)
      : false;
    renderFooterAuth();
    document.dispatchEvent(new CustomEvent('devauth:ready'));
  });

  init();
})();
