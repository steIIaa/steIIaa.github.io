/* ============================================
   devlog.js — skrate devlog
   Posts are public — load immediately.
   Compose form only shows for whitelisted devs.
   ============================================ */

(function () {
  const composeEl   = document.getElementById('dl-compose');
  const composeUser = document.getElementById('dl-compose-user');
  const titleInput  = document.getElementById('dl-title');
  const bodyInput   = document.getElementById('dl-body');
  const imagesInput = document.getElementById('dl-images');
  const submitBtn   = document.getElementById('dl-submit');
  const errorEl     = document.getElementById('dl-error');
  const listEl      = document.getElementById('dl-posts-list');

  // posts are public — load immediately without waiting for auth
  // we just need the supabase client, which is available via the
  // global created by the inline script in <head>
  const { createClient } = supabase;
  const db = createClient(window.SUPABASE_URL, window.SUPABASE_ANON);

  loadPosts();

  // auth-gated UI — run immediately if devAuth is already ready,
  // otherwise wait for the event from dev-auth.js
  if (window.devAuth) {
    setupAuthUI();
  } else {
    document.addEventListener('devauth:ready', setupAuthUI);
  }

  function setupAuthUI() {
    const { user, isDev } = window.devAuth || {};

    if (isDev && user) {
      const meta = user.user_metadata;
      const name = meta.custom_claims?.global_name || meta.full_name || meta.name || 'dev';
      const avatar = meta.avatar_url
        ? `<img src="${meta.avatar_url}" alt="" class="ir-review-avatar">`
        : `<div class="ir-review-avatar ir-review-avatar--placeholder">${name[0]}</div>`;
      composeUser.innerHTML = `${avatar}<span>${name}</span>`;
      composeEl.style.display = 'block';

      // only attach submit listener once
      if (!submitBtn._listenerAdded) {
        submitBtn._listenerAdded = true;
        submitBtn.addEventListener('click', handleSubmit);
      }
    } else {
      composeEl.style.display = 'none';
    }
  }

  async function handleSubmit() {
    const { user } = window.devAuth || {};
    if (!user) return;

    errorEl.textContent = '';
    const title = titleInput.value.trim();
    const body  = bodyInput.value.trim();
    const imageUrls = imagesInput.value
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.startsWith('http'));

    if (!title) { errorEl.textContent = 'please add a title.'; return; }
    if (!body)  { errorEl.textContent = 'please write something.'; return; }

    submitBtn.disabled = true;
    submitBtn.textContent = 'posting...';

    const meta = user.user_metadata;
    const { error } = await db.from('posts').insert({
      user_id:    user.id,
      username:   meta.custom_claims?.global_name || meta.full_name || meta.name || 'dev',
      avatar_url: meta.avatar_url || null,
      title,
      body,
      image_urls: imageUrls.length ? imageUrls : null
    });

    submitBtn.disabled = false;
    submitBtn.textContent = 'post update →';

    if (error) {
      errorEl.textContent = 'something went wrong. try again.';
      return;
    }

    titleInput.value = '';
    bodyInput.value = '';
    imagesInput.value = '';
    loadPosts();
  }

  async function loadPosts() {
    const { data, error } = await db
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      listEl.innerHTML = `<p class="dl-posts__empty">couldn't load posts.</p>`;
      return;
    }

    if (!data.length) {
      listEl.innerHTML = `<p class="dl-posts__empty">no updates yet — check back soon.</p>`;
      return;
    }

    listEl.innerHTML = data.map(post => {
      const date = new Date(post.created_at).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric'
      });
      const avatar = post.avatar_url
        ? `<img src="${post.avatar_url}" alt="" class="ir-review-avatar">`
        : `<div class="ir-review-avatar ir-review-avatar--placeholder">${(post.username || '?')[0]}</div>`;
      const isOwn = window.devAuth?.user?.id === post.user_id;
      const images = (post.image_urls || []).map(url =>
        `<figure class="dl-post__img-wrap">
          <img src="${escHtml(url)}" alt="" class="dl-post__img" loading="lazy">
        </figure>`
      ).join('');

      return `
        <article class="dl-post" data-id="${post.id}">
          <header class="dl-post__header">
            <div class="dl-post__author">
              ${avatar}
              <div class="dl-post__meta">
                <span class="dl-post__name">${escHtml(post.username || 'dev')}</span>
                <time class="dl-post__date">${date}</time>
              </div>
            </div>
            ${isOwn ? `<button class="dl-post__delete" data-id="${post.id}" title="delete post">✕</button>` : ''}
          </header>
          <h2 class="dl-post__title">${escHtml(post.title)}</h2>
          <div class="dl-post__body">${formatBody(post.body)}</div>
          ${images ? `<div class="dl-post__images">${images}</div>` : ''}
        </article>`;
    }).join('');

    listEl.querySelectorAll('.dl-post__delete').forEach(btn => {
      btn.addEventListener('click', () => deletePost(btn.dataset.id));
    });
  }

  async function deletePost(id) {
    const { user } = window.devAuth || {};
    if (!user) return;
    if (!confirm('delete this post?')) return;
    await db.from('posts').delete().eq('id', id).eq('user_id', user.id);
    loadPosts();
  }

  function formatBody(text) {
    return text
      .split(/\n\n+/)
      .map(p => `<p>${escHtml(p.trim()).replace(/\n/g, '<br>')}</p>`)
      .join('');
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }

  // re-run auth UI if auth state changes after initial load
  document.addEventListener('devauth:ready', setupAuthUI);
})();
