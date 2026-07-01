/* ============================================
   reviews.js — infaRED review system
   Supabase for storage, Discord OAuth for login.
   ============================================ */

(function () {
  // ---- init supabase ----
  const { createClient } = supabase;
  const db = createClient(window.SUPABASE_URL, window.SUPABASE_ANON);

  // ---- state ----
  let currentUser = null;
  let selectedStars = 0;
  let existingReview = null;

  // ---- DOM refs ----
  const authEl       = document.getElementById('reviews-auth');
  const formEl       = document.getElementById('review-form');
  const formUser     = document.getElementById('form-user');
  const formStars    = document.getElementById('form-stars');
  const formText     = document.getElementById('form-text');
  const formChars    = document.getElementById('form-chars');
  const formSubmit   = document.getElementById('form-submit');
  const formError    = document.getElementById('form-error');
  const listEl       = document.getElementById('reviews-list');
  const avgEl        = document.getElementById('reviews-avg');
  const avgStarsEl   = document.getElementById('reviews-avg-stars');
  const countEl      = document.getElementById('reviews-count');

  // ---- star rendering helpers ----
  function starsHtml(n, size = 'sm') {
    let out = '';
    for (let i = 1; i <= 5; i++) {
      out += `<span class="ir-star-display ir-star-display--${size} ${i <= n ? 'ir-star-display--on' : ''}"">★</span>`;
    }
    return out;
  }

  function setFormStars(val) {
    selectedStars = val;
    formStars.querySelectorAll('.ir-star').forEach(btn => {
      btn.classList.toggle('ir-star--active', parseInt(btn.dataset.val) <= val);
    });
  }

  // ---- auth ----
  async function init() {
    const { data: { session } } = await db.auth.getSession();
    if (session) {
      currentUser = session.user;
    }
    renderAuth();
    loadReviews();
  }

  function renderAuth() {
    if (!currentUser) {
      authEl.innerHTML = `<button class="btn btn--ghost" id="login-btn">login with discord to review →</button>`;
      document.getElementById('login-btn').addEventListener('click', loginWithDiscord);
      formEl.style.display = 'none';
    } else {
      const meta = currentUser.user_metadata;
      const avatar = meta.avatar_url
        ? `<img src="${meta.avatar_url}" alt="" class="ir-review-avatar">`
        : `<div class="ir-review-avatar ir-review-avatar--placeholder">${(meta.full_name || meta.name || '?')[0]}</div>`;
      authEl.innerHTML = `
        <div class="ir-reviews__loggedin">
          ${avatar}
          <span class="ir-reviews__username">${meta.full_name || meta.name || 'unknown'}</span>
          <button class="btn btn--ghost ir-reviews__logout" id="logout-btn">log out</button>
        </div>`;
      document.getElementById('logout-btn').addEventListener('click', logout);
      formUser.innerHTML = `${avatar}<span>${meta.full_name || meta.name || 'unknown'}</span>`;
    }
  }

  async function loginWithDiscord() {
    await db.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo: window.location.href }
    });
  }

  async function logout() {
    await db.auth.signOut();
    currentUser = null;
    existingReview = null;
    formEl.style.display = 'none';
    renderAuth();
  }

  // ---- load reviews ----
  async function loadReviews() {
    const { data, error } = await db
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      listEl.innerHTML = `<p class="ir-reviews__empty">couldn't load reviews.</p>`;
      return;
    }

    renderSummary(data);
    renderList(data);

    if (currentUser) {
      existingReview = data.find(r => r.user_id === currentUser.id) || null;
      if (existingReview) {
        formEl.style.display = 'none';
        authEl.querySelector('.ir-reviews__loggedin') &&
          (authEl.insertAdjacentHTML('beforeend',
            `<p class="ir-reviews__already">you've already reviewed infaRED.</p>`));
      } else {
        formEl.style.display = 'block';
      }
    }
  }

  function renderSummary(reviews) {
    if (!reviews.length) {
      avgEl.textContent = '—';
      avgStarsEl.innerHTML = starsHtml(0);
      countEl.textContent = 'no reviews yet';
      return;
    }
    const avg = reviews.reduce((sum, r) => sum + r.stars, 0) / reviews.length;
    avgEl.textContent = avg.toFixed(1);
    avgStarsEl.innerHTML = starsHtml(Math.round(avg));
    countEl.textContent = `${reviews.length} review${reviews.length !== 1 ? 's' : ''}`;
  }

  function renderList(reviews) {
    if (!reviews.length) {
      listEl.innerHTML = `<p class="ir-reviews__empty">no reviews yet — be the first!</p>`;
      return;
    }
    listEl.innerHTML = reviews.map(r => {
      const date = new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      const avatar = r.avatar_url
        ? `<img src="${r.avatar_url}" alt="" class="ir-review-avatar">`
        : `<div class="ir-review-avatar ir-review-avatar--placeholder">${(r.username || '?')[0]}</div>`;
      const isOwn = currentUser && r.user_id === currentUser.id;
      return `
        <div class="ir-review" data-id="${r.id}">
          <div class="ir-review__header">
            ${avatar}
            <div class="ir-review__meta">
              <span class="ir-review__name">${r.username || 'unknown'}</span>
              <span class="ir-review__date">${date}</span>
            </div>
            <div class="ir-review__stars">${starsHtml(r.stars)}</div>
            ${isOwn ? `<button class="ir-review__delete" data-id="${r.id}" title="delete your review">✕</button>` : ''}
          </div>
          ${r.body ? `<p class="ir-review__body">${escHtml(r.body)}</p>` : ''}
        </div>`;
    }).join('');

    listEl.querySelectorAll('.ir-review__delete').forEach(btn => {
      btn.addEventListener('click', () => deleteReview(btn.dataset.id));
    });
  }

  // ---- submit review ----
  formStars.querySelectorAll('.ir-star').forEach(btn => {
    btn.addEventListener('click', () => setFormStars(parseInt(btn.dataset.val)));
    btn.addEventListener('mouseenter', () => {
      formStars.querySelectorAll('.ir-star').forEach(b => {
        b.classList.toggle('ir-star--hover', parseInt(b.dataset.val) <= parseInt(btn.dataset.val));
      });
    });
  });

  formStars.addEventListener('mouseleave', () => {
    formStars.querySelectorAll('.ir-star').forEach(b => b.classList.remove('ir-star--hover'));
  });

  formText.addEventListener('input', () => {
    formChars.textContent = formText.value.length;
  });

  formSubmit.addEventListener('click', async () => {
    formError.textContent = '';
    if (!selectedStars) { formError.textContent = 'please select a star rating.'; return; }
    if (!formText.value.trim()) { formError.textContent = 'please write a review.'; return; }

    formSubmit.disabled = true;
    formSubmit.textContent = 'posting...';

    const meta = currentUser.user_metadata;
    const { error } = await db.from('reviews').insert({
      user_id:    currentUser.id,
      username:   meta.full_name || meta.name || 'unknown',
      avatar_url: meta.avatar_url || null,
      stars:      selectedStars,
      body:       formText.value.trim()
    });

    if (error) {
      formError.textContent = error.code === '23505'
        ? 'you\'ve already left a review.'
        : 'something went wrong. try again.';
      formSubmit.disabled = false;
      formSubmit.textContent = 'post review →';
      return;
    }

    formEl.style.display = 'none';
    loadReviews();
  });

  // ---- delete review ----
  async function deleteReview(id) {
    if (!currentUser) return;
    await db.from('reviews').delete().eq('id', id).eq('user_id', currentUser.id);
    existingReview = null;
    loadReviews();
    renderAuth();
  }

  // ---- utils ----
  function escHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ---- listen for auth state changes (handles OAuth redirect back) ----
  db.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user || null;
    renderAuth();
    loadReviews();
  });

  init();
})();
