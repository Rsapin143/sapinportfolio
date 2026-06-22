/* ═══════════════════════════════════════════════════════════════
   PURE HTML / CSS / JAVASCRIPT PORTFOLIO ADMIN + SUPABASE REALTIME
   Data is saved to Supabase so all devices see the same content.
═══════════════════════════════════════════════════════════════ */
(() => {
  const ADMIN_EMAIL = 'rodolfo@gmail.com';
  const ADMIN_PASSWORD = 'rod123';

  const PROFILE_KEY = 'rod-static-profile';
  const WORKS_KEY = 'rod-static-works';
  const AUTH_KEY = 'rod-static-admin';

  // Fill these in assets/js/supabase-config.js
  const SUPABASE_URL = window.SUPABASE_URL || '';
  const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || '';
  const SUPABASE_BUCKET = window.SUPABASE_BUCKET || 'portfolio-media';
  const DATA_ROW_ID = 'main';

  const supa = (SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase)
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

  let applyingRemoteUpdate = false;

  const DEFAULT_PROFILE = {
    name: 'Rodolfo',
    title: 'Full Stack Developer',
    bio: 'I craft beautiful, performant digital experiences at the intersection of design and engineering. Based in Manila, turning complex problems into elegant, user-centric solutions.',
    location: 'Manila, Philippines',
    contactEmail: 'rodolfo@gmail.com',
    github: '',
    linkedin: '',
    profileImage: '',
    skills: [
      { name: 'React', level: 90 },
      { name: 'Node.js', level: 85 },
      { name: 'TypeScript', level: 80 },
      { name: 'MongoDB', level: 75 },
      { name: 'UI/UX Design', level: 72 },
      { name: 'Docker', level: 65 },
    ],
  };

  const DEFAULT_WORKS = [
    {
      id: 1,
      title: 'E-Commerce Platform',
      description: 'Full-stack e-commerce with real-time inventory, smart recommendations, and seamless checkout flow.',
      tech: ['React', 'Node.js', 'MongoDB', 'Stripe'],
      images: [
        'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=700&h=450&fit=crop',
        'https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?w=700&h=450&fit=crop',
        'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=700&h=450&fit=crop',
      ],
      category: 'Web App',
      url: '#',
      video: '',
      videoRatio: '16 / 9',
    },
    {
      id: 2,
      title: 'Analytics Dashboard',
      description: 'Real-time data visualization platform with interactive charts, smart reporting, and predictive insights.',
      tech: ['Vue.js', 'D3.js', 'Python', 'FastAPI'],
      images: [
        'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=700&h=450&fit=crop',
        'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=700&h=450&fit=crop',
        'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=700&h=450&fit=crop',
      ],
      category: 'Dashboard',
      url: '#',
      video: '',
      videoRatio: '16 / 9',
    },
    {
      id: 3,
      title: 'Mobile Banking App',
      description: 'Secure banking app with biometric authentication, real-time notifications, and smart budgeting.',
      tech: ['React Native', 'TypeScript', 'Firebase'],
      images: [
        'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=700&h=450&fit=crop',
        'https://images.unsplash.com/photo-1601597111158-2fceff292cdc?w=700&h=450&fit=crop',
        'https://images.unsplash.com/photo-1616077168712-fc6c788bfe49?w=700&h=450&fit=crop',
      ],
      category: 'Mobile',
      url: '#',
      video: '',
      videoRatio: '16 / 9',
    },
  ];

  const app = document.getElementById('app');
  let flashTimer = null;
  let flash = null;
  let particleRaf = null;

  const state = {
    profile: loadJSON(PROFILE_KEY, DEFAULT_PROFILE),
    works: loadJSON(WORKS_KEY, DEFAULT_WORKS),
    isAdmin: localStorage.getItem(AUTH_KEY) === 'true',
    view: 'portfolio',
    tab: 'profile',
  };

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return structuredCloneSafe(fallback);
      const data = JSON.parse(raw);
      if (key === PROFILE_KEY) return { ...structuredCloneSafe(DEFAULT_PROFILE), ...data };
      return Array.isArray(data) ? data : structuredCloneSafe(fallback);
    } catch {
      return structuredCloneSafe(fallback);
    }
  }

  function structuredCloneSafe(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function saveLocalCache() {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(state.profile));
    localStorage.setItem(WORKS_KEY, JSON.stringify(state.works));
    localStorage.setItem(AUTH_KEY, state.isAdmin ? 'true' : 'false');
  }

  function saveData() {
    saveLocalCache();

    if (!supa || applyingRemoteUpdate) return;

    supa
      .from('site_settings')
      .upsert({
        id: DATA_ROW_ID,
        profile: state.profile,
        works: state.works,
        updated_at: new Date().toISOString(),
      })
      .then(({ error }) => {
        if (error) {
          console.error('Supabase save error:', error);
          showFlash('Saved locally, but Supabase did not update. Check your Supabase setup.', 'error');
        }
      });
  }

  async function loadRemoteData() {
    if (!supa) return;

    const { data, error } = await supa
      .from('site_settings')
      .select('profile, works')
      .eq('id', DATA_ROW_ID)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Supabase load error:', error);
      showFlash('Could not load Supabase data. Check config and SQL setup.', 'error');
      return;
    }

    if (data) {
      state.profile = { ...structuredCloneSafe(DEFAULT_PROFILE), ...(data.profile || {}) };
      state.works = Array.isArray(data.works) ? data.works : structuredCloneSafe(DEFAULT_WORKS);
      saveLocalCache();
      return;
    }

    // First run: create the main data row from the default/local data.
    await supa.from('site_settings').upsert({
      id: DATA_ROW_ID,
      profile: state.profile,
      works: state.works,
      updated_at: new Date().toISOString(),
    });
  }

  function subscribeToRealtime() {
    if (!supa) return;

    supa
      .channel('portfolio-site-settings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'site_settings', filter: `id=eq.${DATA_ROW_ID}` },
        (payload) => {
          if (!payload.new) return;

          const activeForm = document.activeElement && document.activeElement.closest('form');
          applyingRemoteUpdate = true;
          state.profile = { ...structuredCloneSafe(DEFAULT_PROFILE), ...(payload.new.profile || {}) };
          state.works = Array.isArray(payload.new.works) ? payload.new.works : structuredCloneSafe(DEFAULT_WORKS);
          saveLocalCache();
          applyingRemoteUpdate = false;

          // Avoid interrupting the user while typing in an admin form.
          if (!activeForm) render();
        }
      )
      .subscribe((status, err) => {
        if (err) console.error('Supabase realtime error:', err);
        if (status === 'SUBSCRIBED') console.log('Supabase realtime connected.');
      });
  }

  async function uploadToSupabaseStorage(file, folder) {
    if (!supa || !file) return '';

    const ext = (file.name.split('.').pop() || 'file').toLowerCase();
    const base = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'upload';
    const path = `${folder}/${base}-${Date.now()}.${ext}`;

    const { error } = await supa.storage
      .from(SUPABASE_BUCKET)
      .upload(path, file, { cacheControl: '3600', upsert: false });

    if (error) {
      console.error('Supabase upload error:', error);
      showFlash('File upload failed. Check your Supabase Storage bucket and policies.', 'error');
      return '';
    }

    const { data } = supa.storage.from(SUPABASE_BUCKET).getPublicUrl(path);
    return data?.publicUrl || '';
  }

  function showFlash(message, type = 'success') {
    flash = { message, type };
    if (flashTimer) clearTimeout(flashTimer);
    flashTimer = setTimeout(() => {
      flash = null;
      const el = document.querySelector('.flash');
      if (el) el.remove();
    }, 2400);
  }

  function h(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function icon(name, size = 17, strokeWidth = 1.8) {
    const c = `fill="none" stroke="currentColor" stroke-width="${h(strokeWidth)}" stroke-linecap="round" stroke-linejoin="round"`;
    const icons = {
      user: `<path ${c} d="M20 21a8 8 0 0 0-16 0" /><circle ${c} cx="12" cy="7" r="4" />`,
      zap: `<path ${c} d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />`,
      works: `<rect ${c} x="3" y="4" width="18" height="16" rx="2" /><path ${c} d="M8 4V2h8v2" /><path ${c} d="M3 10h18" />`,
      eye: `<path ${c} d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" /><circle ${c} cx="12" cy="12" r="3" />`,
      logout: `<path ${c} d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path ${c} d="M16 17l5-5-5-5" /><path ${c} d="M21 12H9" />`,
      settings: `<circle ${c} cx="12" cy="12" r="3" /><path ${c} d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.05.05a2 2 0 0 1-2.83 2.83l-.05-.05a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.1 1.65V21a2 2 0 0 1-4 0v-.07a1.8 1.8 0 0 0-1.1-1.65 1.8 1.8 0 0 0-1.98.36l-.05.05a2 2 0 0 1-2.83-2.83l.05-.05A1.8 1.8 0 0 0 4.6 15a1.8 1.8 0 0 0-1.65-1.1H3a2 2 0 0 1 0-4h.07A1.8 1.8 0 0 0 4.6 8a1.8 1.8 0 0 0-.36-1.98l-.05-.05a2 2 0 0 1 2.83-2.83l.05.05A1.8 1.8 0 0 0 9 4.6a1.8 1.8 0 0 0 1.1-1.65V3a2 2 0 0 1 4 0v.07A1.8 1.8 0 0 0 15 4.6a1.8 1.8 0 0 0 1.98-.36l.05-.05a2 2 0 0 1 2.83 2.83l-.05.05A1.8 1.8 0 0 0 19.4 9c.18.5.65.85 1.18.9H21a2 2 0 0 1 0 4h-.42A1.8 1.8 0 0 0 19.4 15z" />`,
      pin: `<path ${c} d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0z" /><circle ${c} cx="12" cy="10" r="3" />`,
      mail: `<rect ${c} x="3" y="5" width="18" height="14" rx="2" /><path ${c} d="m3 7 9 6 9-6" />`,
      github: `<path ${c} d="M9 19c-5 1.5-5-2.5-7-3" /><path ${c} d="M15 22v-3.9a3.4 3.4 0 0 0-.9-2.6c3 0 6.1-1.5 6.1-6.7 0-1.5-.5-2.7-1.4-3.8.1-.4.6-1.9-.2-3.8 0 0-1.1-.4-3.8 1.4a13.2 13.2 0 0 0-6.8 0C5.3.9 4.2 1.3 4.2 1.3c-.8 1.9-.3 3.4-.2 3.8A5.3 5.3 0 0 0 2.6 9c0 5.2 3.1 6.7 6.1 6.7a3.4 3.4 0 0 0-.9 2.6V22" />`,
      alert: `<path ${c} d="M10.3 4.3 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z" /><path ${c} d="M12 9v4" /><path ${c} d="M12 17h.01" />`,
      check: `<path ${c} d="M20 6 9 17l-5-5" />`,
      trash: `<path ${c} d="M3 6h18" /><path ${c} d="M8 6V4h8v2" /><path ${c} d="M19 6l-1 14H6L5 6" /><path ${c} d="M10 11v5" /><path ${c} d="M14 11v5" />`,
      plus: `<path ${c} d="M12 5v14" /><path ${c} d="M5 12h14" />`,
      'arrow-left': `<path ${c} d="M19 12H5" /><path ${c} d="M12 19l-7-7 7-7" />`,
      send: `<path ${c} d="M22 2 11 13" /><path ${c} d="M22 2 15 22l-4-9-9-4 20-7z" />`,
      play: `<polygon ${c} points="8 5 19 12 8 19 8 5" />`,
      image: `<rect ${c} x="3" y="5" width="18" height="14" rx="2" /><circle ${c} cx="8.5" cy="10" r="1.5" /><path ${c} d="M21 15l-5-5L5 19" />`,
    };
    return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${icons[name] || ''}</svg>`;
  }

  function cleanLines(value) {
    return String(value || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function cleanCSV(value) {
    return String(value || '')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
  }

  function sanitizeRatio(value) {
    const raw = String(value || '').trim();
    if (/^\d+(\.\d+)?\s*\/\s*\d+(\.\d+)?$/.test(raw)) return raw.replace(/\s*\/\s*/, ' / ');
    if (/^(16:9|9:16|1:1|4:5|4:3)$/i.test(raw)) return raw.replace(':', ' / ');
    return '16 / 9';
  }

  function isPortraitRatio(ratio) {
    const m = String(ratio || '').match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
    return m ? Number(m[1]) < Number(m[2]) : false;
  }

  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function detectVideoRatio(file) {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        const w = video.videoWidth || 16;
        const hgt = video.videoHeight || 9;
        URL.revokeObjectURL(url);
        if (w === hgt) return resolve('1 / 1');
        if (w > hgt) return resolve('16 / 9');
        return resolve('9 / 16');
      };
      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve('16 / 9');
      };
      video.src = url;
    });
  }

  /* IndexedDB is used only for uploaded video blobs because videos are too large for localStorage. */
  const videoDB = {
    db: null,
    open() {
      if (this.db) return Promise.resolve(this.db);
      return new Promise((resolve, reject) => {
        const request = indexedDB.open('rod-static-video-db', 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('videos')) db.createObjectStore('videos');
        };
        request.onsuccess = () => {
          this.db = request.result;
          resolve(this.db);
        };
        request.onerror = () => reject(request.error);
      });
    },
    async put(id, blob) {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('videos', 'readwrite');
        tx.objectStore('videos').put(blob, String(id));
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    },
    async get(id) {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('videos', 'readonly');
        const req = tx.objectStore('videos').get(String(id));
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    },
    async remove(id) {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('videos', 'readwrite');
        tx.objectStore('videos').delete(String(id));
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    },
  };

  function parseRoute() {
    const hash = window.location.hash.replace('#', '').trim();
    if (hash === 'login') {
      state.view = 'login';
      return;
    }
    if (hash.startsWith('admin')) {
      if (!state.isAdmin) {
        showFlash('Please login first.', 'error');
        state.view = 'login';
        return;
      }
      state.view = 'admin';
      const tab = hash.split('-')[1];
      state.tab = ['profile', 'skills', 'works'].includes(tab) ? tab : 'profile';
      return;
    }
    state.view = 'portfolio';
  }

  function render() {
    parseRoute();
    const flashHTML = flash
      ? `<div class="flash ${h(flash.type)}">${flash.type === 'error' ? icon('alert', 15) : icon('check', 15)} ${h(flash.message)}</div>`
      : '';

    if (state.view === 'login') app.innerHTML = flashHTML + renderLogin();
    if (state.view === 'admin') app.innerHTML = flashHTML + renderAdmin();
    if (state.view === 'portfolio') app.innerHTML = flashHTML + renderPortfolio();

    document.title = `${state.profile.name || 'Rod'} Portfolio`;
    initCurrentView();
  }

  function renderLogin() {
    return `
      <div class="login-page">
        <canvas class="particle-canvas"></canvas>
        <form class="login-card" id="loginForm">
          <a class="back-link" href="#portfolio">${icon('arrow-left', 14)} Back to Portfolio</a>
          <div class="login-title"><span class="glow-orange">Admin</span><span> Login</span></div>
          <p class="login-subtitle">Sign in to manage your portfolio</p>
          <div class="field-group">
            <label class="label">Email Address</label>
            <input class="input-field" type="email" name="email" placeholder="your@email.com" required>
          </div>
          <div class="field-group large">
            <label class="label">Password</label>
            <input class="input-field" type="password" name="password" placeholder="••••••••" required>
          </div>
          <button class="btn-primary" type="submit" style="width:100%;padding:15px;">Sign In</button>
        </form>
      </div>
    `;
  }

  function renderAdmin() {
    const sidebar = [
      { id: 'profile', icon: 'user', label: 'Profile' },
      { id: 'skills', icon: 'zap', label: 'Skills' },
      { id: 'works', icon: 'works', label: 'Works' },
    ];
    return `
      <div class="admin-page">
        <aside class="admin-sidebar">
          <div class="admin-brand"><span class="glow-orange">Rod</span><small> Admin</small></div>
          ${sidebar.map((item) => `
            <a class="sidebar-item ${state.tab === item.id ? 'active' : ''}" href="#admin-${item.id}">
              ${icon(item.icon, 17)}<span class="sidebar-label">${h(item.label)}</span>
            </a>
          `).join('')}
          <div class="sidebar-bottom">
            <a class="sidebar-item" href="#portfolio">${icon('eye', 17)}<span class="sidebar-label">View Portfolio</span></a>
            <button class="sidebar-item sidebar-logout" id="logoutBtn" type="button">${icon('logout', 17)}<span class="sidebar-label">Logout</span></button>
          </div>
        </aside>
        <main class="admin-main">
          ${state.tab === 'profile' ? renderAdminProfile() : ''}
          ${state.tab === 'skills' ? renderAdminSkills() : ''}
          ${state.tab === 'works' ? renderAdminWorks() : ''}
        </main>
      </div>
    `;
  }

  function renderAdminProfile() {
    const p = state.profile;
    return `
      <h2 class="admin-title" style="margin-bottom:36px;">Profile Settings</h2>
      <form id="profileForm">
        <div class="form-grid-2">
          <div><label class="label">Full Name</label><input class="input-field" name="name" value="${h(p.name)}" placeholder="Full Name"></div>
          <div><label class="label">Job Title</label><input class="input-field" name="title" value="${h(p.title)}" placeholder="Job Title"></div>
          <div><label class="label">Location</label><input class="input-field" name="location" value="${h(p.location)}" placeholder="Location"></div>
          <div><label class="label">Contact Email</label><input class="input-field" type="email" name="contactEmail" value="${h(p.contactEmail)}" placeholder="Contact Email"></div>
          <div><label class="label">GitHub URL</label><input class="input-field" name="github" value="${h(p.github)}" placeholder="GitHub URL"></div>
          <div><label class="label">LinkedIn URL</label><input class="input-field" name="linkedin" value="${h(p.linkedin)}" placeholder="LinkedIn URL"></div>
          <div>
            <label class="label">Profile Image Path / URL</label>
            <input class="input-field" name="profileImage" value="${h(p.profileImage && !String(p.profileImage).startsWith('data:') ? p.profileImage : '')}" placeholder="uploads/profile/profile.jpg or image URL">
            <div class="helper-text">Use this for a deployed image path, or upload from desktop below.</div>
          </div>
          <div>
            <label class="label">Upload Profile Picture</label>
            <input class="input-field file-field" type="file" name="profile_image" accept="image/jpeg,image/png,image/webp,image/gif">
            <div class="helper-text">Supabase version uploads images to Storage so all devices can see them.</div>
          </div>
        </div>
        ${p.profileImage ? `
          <div style="margin-top:18px;">
            <label class="label">Current Profile Picture</label>
            <img src="${h(p.profileImage)}" alt="Profile image" style="width:140px;height:140px;object-fit:cover;border-radius:14px;border:1px solid var(--border);background:var(--surface);">
          </div>
        ` : ''}
        <div style="margin-top:20px;margin-bottom:32px;">
          <label class="label">Bio / About Me</label>
          <textarea class="textarea-field" name="bio" rows="5">${h(p.bio)}</textarea>
        </div>
        <button class="btn-primary" type="submit">Save Profile</button>
      </form>
    `;
  }

  function renderAdminSkills() {
    return `
      <div class="admin-title-row">
        <h2 class="admin-title">Skills</h2>
        <button class="btn-outline" type="button" id="addSkillRow">${icon('plus', 15)} Add Skill</button>
      </div>
      <form id="skillsForm">
        <div id="skillsList">
          ${(state.profile.skills || []).map((skill) => `
            <div class="skill-row">
              <input class="input-field" name="skill_name[]" value="${h(skill.name)}" placeholder="Skill name">
              <div>
                <input class="range-input" type="range" min="0" max="100" value="${h(skill.level)}" name="skill_level[]">
                <div class="level-output">${h(skill.level)}%</div>
              </div>
              <button class="icon-btn remove-skill" type="button">×</button>
            </div>
          `).join('')}
        </div>
        <button class="btn-primary" type="submit" style="margin-top:16px;">Save Skills</button>
      </form>
    `;
  }

  function renderAdminWorks() {
    return `
      <div class="admin-title-row">
        <h2 class="admin-title">Works</h2>
        <button class="btn-outline" type="button" id="addWorkBtn">${icon('plus', 15)} Add Project</button>
      </div>
      <form id="worksForm">
        ${state.works.map((work) => renderWorkEditor(work)).join('')}
        <button class="btn-primary" type="submit">Save All Works</button>
      </form>
    `;
  }

  function renderWorkEditor(work) {
    const images = (work.images || []).join('\n');
    return `
      <div class="admin-card work-editor" data-id="${h(work.id)}">
        <div class="card-grid-2">
          <div><label class="label">Project Title</label><input class="input-field" name="work_title" value="${h(work.title)}"></div>
          <div><label class="label">Category</label><input class="input-field" name="work_category" value="${h(work.category)}"></div>
        </div>
        <div style="margin-bottom:16px;">
          <label class="label">Description</label>
          <textarea class="textarea-field" name="work_description" rows="2">${h(work.description)}</textarea>
        </div>
        <div style="margin-bottom:16px;">
          <label class="label">Technologies (comma separated)</label>
          <input class="input-field" name="work_tech" value="${h((work.tech || []).join(', '))}" placeholder="React, Node.js, MongoDB">
        </div>
        <div style="margin-bottom:16px;">
          <label class="label">Project URL</label>
          <input class="input-field" name="work_url" value="${h(work.url || '#')}" placeholder="https://your-project.com">
        </div>
        <div style="margin-bottom:18px;">
          <label class="label">Image URLs / Poster Images (one per line — supports slideshow)</label>
          <textarea class="textarea-field" name="work_images" rows="3" placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg">${h(images)}</textarea>
          <div class="helper-text">Images are used as slideshow cards, and the first image becomes the video poster if a video is added.</div>
        </div>
        <div class="video-upload-box">
          <div class="card-grid-2">
            <div>
              <label class="label">Upload Video From Desktop</label>
              <input class="input-field file-field video-upload-input" type="file" name="work_video_upload" accept="video/mp4,video/webm,video/ogg,video/quicktime">
              <div class="helper-text">Supabase version uploads videos to Storage so all devices can see them.</div>
            </div>
            <div>
              <label class="label">Video Aspect Ratio</label>
              <input class="input-field video-ratio-field" name="work_video_ratio" value="${h(work.videoRatio || '16 / 9')}" placeholder="16 / 9 or 9 / 16">
              <div class="helper-text ratio-helper">Auto-detects after choosing a file. You can also type 9 / 16, 16 / 9, 1 / 1, or 4 / 5.</div>
            </div>
          </div>
          <div style="margin-top:14px;">
            <label class="label">Current Video URL / Uploaded Path</label>
            <input class="input-field work-video-url" name="work_video_url" value="${h(work.video || '')}" placeholder="uploads/videos/demo.mp4, https://example.com/video.mp4, or leave empty">
            <div class="helper-text">For Supabase, upload from desktop or paste a public video URL here.</div>
          </div>
          ${work.video ? `<video class="admin-video-preview" ${work.video.startsWith('indexeddb:') ? `data-video-id="${h(work.id)}"` : `src="${h(work.video)}"`} muted controls preload="metadata"></video>` : ''}
        </div>
        <div class="form-actions-right">
          <button class="remove-project-btn remove-work" type="button">${icon('trash', 14)} Remove Project</button>
        </div>
      </div>
    `;
  }

  function renderPortfolio() {
    const p = state.profile;
    const firstLetter = (p.name || 'R').charAt(0).toUpperCase();
    const roles = [p.title || 'Full Stack Developer', 'Creative UI/UX Designer', 'Problem Solver', 'Code Craftsman'];
    return `
      <div style="background:var(--bg);min-height:100vh;">
        <canvas class="particle-canvas"></canvas>
        <nav class="nav">
          <a class="logo" href="#portfolio"><span class="glow-orange glow-text-pulse">R</span><span>od</span><small>.</small></a>
          <div class="nav-menu">
            <a class="nav-link" href="#about">about</a>
            <a class="nav-link" href="#skills">skills</a>
            <a class="nav-link" href="#works">works</a>
            <a class="nav-link" href="#contact">contact</a>
            <a class="btn-ghost" href="${state.isAdmin ? '#admin-profile' : '#login'}">${state.isAdmin ? `${icon('settings', 14)} Dashboard` : 'Login'}</a>
          </div>
        </nav>
        <section class="hero">
          <div class="hero-inner">
            <div class="hero-copy">
              <div class="section-label">Hello, World — I'm</div>
              <h1><span>${h(p.name)}</span><span class="glow-orange glow-text-pulse">.</span></h1>
              <div class="hero-role"><span class="glow-blue" id="typewriter" data-roles="${h(JSON.stringify(roles))}"></span><span class="cursor-blink" style="color:var(--orange);margin-left:2px;font-weight:300;">|</span></div>
              <p>${h(p.bio)}</p>
              <div class="hero-buttons"><a class="btn-primary" href="#works">View My Work</a><a class="btn-outline" href="#contact">Get In Touch</a></div>
              <div class="scroll-hint"><div class="scroll-hint-line"></div>SCROLL DOWN</div>
            </div>
            <div class="orbital">
              <div class="orbital-ring-outer"></div><div class="orbital-ring-middle"></div><div class="orbital-avatar">${h(firstLetter)}</div>
            </div>
          </div>
        </section>
        <section id="about" class="section reveal">
          <div class="container">
            <div class="grid-2">
              <div style="position:relative;">
                <div class="avatar-card ${p.profileImage ? 'has-photo' : ''}">
                  ${p.profileImage ? `<img class="avatar-photo" src="${h(p.profileImage)}" alt="${h(p.name)} profile image">` : `<div class="avatar-card-letter">${h(firstLetter)}</div>`}
                </div>
                <div class="floating-badge"><div style="font-size:11px;color:var(--muted);margin-bottom:3px;">Based in</div><div style="font-size:14px;font-weight:700;color:var(--text);display:flex;align-items:center;gap:6px;">${icon('pin', 14)} ${h(p.location)}</div></div>
                <div class="status-badge"><div class="status-dot"></div><span style="font-size:12px;color:var(--text);font-weight:600;">Available for work</span></div>
              </div>
              <div>
                <div class="section-label">About Me</div>
                <h2 class="about-title">Crafting <span class="glow-orange">Digital</span><br>Experiences</h2>
                <div class="section-divider"></div>
                <p class="about-text">${h(p.bio)}</p>
                ${p.contactEmail ? `<a class="contact-link" href="mailto:${h(p.contactEmail)}">${icon('mail', 14)} ${h(p.contactEmail)}</a>` : ''}
                ${p.github ? `<div class="muted-row">${icon('github', 14)} ${h(p.github)}</div>` : ''}
              </div>
            </div>
          </div>
        </section>
        <section id="skills" class="section reveal">
          <div class="container">
            <div class="section-label">What I Do Best</div>
            <h2 class="section-title">Skills &amp; <span class="glow-orange">Expertise</span></h2>
            <div class="section-divider"></div>
            ${renderPublicSkills()}
          </div>
        </section>
        <section id="works" class="section reveal">
          <div class="container">
            <div class="section-label">Portfolio</div>
            <h2 class="section-title">Featured <span class="glow-orange">Works</span></h2>
            <div class="section-divider"></div>
            <div class="works-grid">${state.works.map(renderPublicWork).join('')}</div>
          </div>
        </section>
        <section id="contact" class="section contact-section reveal">
          <div class="container">
            <div class="section-label">Let's Connect</div>
            <h2 class="contact-title">Let's <span class="glow-orange">Work Together</span></h2>
            <p class="contact-copy">Have a project in mind? I'd love to hear about it. Let's connect and build something extraordinary together.</p>
            <a class="btn-primary" href="mailto:${h(p.contactEmail)}">${icon('send', 15)} Send a Message</a>
          </div>
        </section>
        <footer class="footer">© 2024 <span style="color:var(--orange);">${h(p.name)}</span> — Built with passion &amp; clean code.</footer>
      </div>
    `;
  }

  function renderPublicSkills() {
    const skills = state.profile.skills || [];
    const half = Math.ceil(skills.length / 2);
    const columns = [skills.slice(0, half), skills.slice(half)];
    return `
      <div class="skills-grid">
        ${columns.map((col) => `<div>${col.map((skill) => `
          <div class="skill-bar">
            <div class="skill-head"><span class="skill-name">${h(skill.name)}</span><span class="skill-value">${h(skill.level)}%</span></div>
            <div class="skill-track"><div class="skill-fill" data-level="${h(skill.level)}"></div></div>
          </div>
        `).join('')}</div>`).join('')}
      </div>
    `;
  }

  function renderPublicWork(work) {
    const images = (work.images && work.images.length ? work.images : ['https://picsum.photos/700/450']);
    const video = String(work.video || '').trim();
    const ratio = sanitizeRatio(work.videoRatio || '16 / 9');
    const isPortrait = video && isPortraitRatio(ratio);
    const url = work.url || '#';
    const isExternal = url !== '#';
    const poster = images[0] || '';
    return `
      <a class="project-card ${video ? 'has-video' : ''} ${isPortrait ? 'portrait-card' : ''}" href="${h(url)}" ${isExternal ? 'target="_blank" rel="noopener"' : ''}>
        <div class="project-image-area" style="--media-ratio:${h(video ? ratio : '16 / 10')};">
          ${video ? `
            <video class="project-video" ${video.startsWith('indexeddb:') ? `data-video-id="${h(work.id)}"` : `src="${h(video)}"`} ${poster ? `poster="${h(poster)}"` : ''} muted loop playsinline preload="metadata"></video>
            <div class="video-hover-badge">${icon('play', 13)} Hover to play</div>
          ` : `
            ${images.map((src, i) => `<img class="project-image ${i === 0 ? 'active' : ''}" src="${h(src)}" alt="${h(work.title)}">`).join('')}
            ${images.length > 1 ? `<div class="slide-dots">${images.map((_, i) => `<div class="slide-dot ${i === 0 ? 'active' : ''}"></div>`).join('')}</div>` : ''}
          `}
          <div class="category-badge">${h(work.category || '')}</div>
          <div class="img-overlay"></div>
        </div>
        <div class="project-body">
          <h3>${h(work.title)}</h3>
          <p>${h(work.description || '')}</p>
          <div class="project-tags">${(work.tech || []).map((tech) => `<span class="tag">${h(tech)}</span>`).join('')}</div>
        </div>
      </a>
    `;
  }

  function initCurrentView() {
    initParticles();
    initNav();
    if (state.view === 'login') initLogin();
    if (state.view === 'admin') initAdmin();
    if (state.view === 'portfolio') initPortfolio();
    loadIndexedVideos();
    scrollToCurrentSection();
  }


  function scrollToCurrentSection() {
    const id = window.location.hash.replace('#', '');
    if (!['about', 'skills', 'works', 'contact'].includes(id)) return;
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 50);
  }

  function initLogin() {
    document.getElementById('loginForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const email = form.email.value.trim();
      const password = form.password.value.trim();
      if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        state.isAdmin = true;
        saveData();
        showFlash('Logged in successfully.');
        window.location.hash = '#admin-profile';
        render();
      } else {
        showFlash('Invalid email or password. Please try again.', 'error');
        render();
      }
    });
  }

  function initAdmin() {
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
      state.isAdmin = false;
      saveData();
      showFlash('Logged out successfully.');
      window.location.hash = '#portfolio';
      render();
    });

    if (state.tab === 'profile') initProfileForm();
    if (state.tab === 'skills') initSkillsForm();
    if (state.tab === 'works') initWorksForm();
  }

  function initProfileForm() {
    document.getElementById('profileForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const imageFile = form.profile_image?.files?.[0];
      let profileImage = form.profileImage.value.trim() || state.profile.profileImage || '';
      if (imageFile) {
        profileImage = await uploadToSupabaseStorage(imageFile, 'profile');
        if (!profileImage) {
          profileImage = await fileToDataURL(imageFile);
          showFlash('Supabase is not configured, so the image was saved only in this browser.', 'error');
        }
      }

      state.profile = {
        ...state.profile,
        name: form.name.value.trim(),
        title: form.title.value.trim(),
        location: form.location.value.trim(),
        contactEmail: form.contactEmail.value.trim(),
        github: form.github.value.trim(),
        linkedin: form.linkedin.value.trim(),
        profileImage,
        bio: form.bio.value.trim(),
      };
      saveData();
      showFlash('Profile saved successfully.');
      render();
    });
  }

  function initSkillsForm() {
    document.getElementById('addSkillRow')?.addEventListener('click', () => {
      state.profile.skills = [...(state.profile.skills || []), { name: 'New Skill', level: 50 }];
      saveData();
      render();
    });

    document.querySelectorAll('.range-input').forEach((input) => {
      input.addEventListener('input', () => {
        const output = input.closest('.skill-row')?.querySelector('.level-output');
        if (output) output.textContent = `${input.value}%`;
      });
    });

    document.querySelectorAll('.remove-skill').forEach((btn) => {
      btn.addEventListener('click', () => btn.closest('.skill-row')?.remove());
    });

    document.getElementById('skillsForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const skills = [];
      document.querySelectorAll('.skill-row').forEach((row) => {
        const name = row.querySelector('[name="skill_name[]"]').value.trim();
        const level = Number(row.querySelector('[name="skill_level[]"]').value || 50);
        if (name) skills.push({ name, level: Math.max(0, Math.min(100, level)) });
      });
      state.profile.skills = skills;
      saveData();
      showFlash('Skills saved successfully.');
      render();
    });
  }

  function initWorksForm() {
    document.getElementById('addWorkBtn')?.addEventListener('click', () => {
      state.works.unshift({
        id: Date.now(),
        title: 'New Project',
        description: '',
        tech: [],
        category: 'Web App',
        url: '#',
        images: [`https://picsum.photos/700/450?random=${Date.now()}`],
        video: '',
        videoRatio: '16 / 9',
      });
      saveData();
      render();
    });

    document.querySelectorAll('.remove-work').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const card = btn.closest('.work-editor');
        const id = Number(card.dataset.id);
        const old = state.works.find((w) => Number(w.id) === id);
        if (old?.video?.startsWith('indexeddb:')) await videoDB.remove(id).catch(() => {});
        state.works = state.works.filter((w) => Number(w.id) !== id);
        saveData();
        showFlash('Project removed.');
        render();
      });
    });

    document.querySelectorAll('.video-upload-input').forEach((input) => {
      input.addEventListener('change', async () => {
        const file = input.files?.[0];
        if (!file) return;
        const card = input.closest('.work-editor');
        const ratioField = card.querySelector('.video-ratio-field');
        const helper = card.querySelector('.ratio-helper');
        const urlField = card.querySelector('.work-video-url');
        const ratio = await detectVideoRatio(file);
        ratioField.value = ratio;
        if (urlField) urlField.value = 'Ready to upload after saving';
        if (helper) {
          helper.textContent = `Detected ${ratio}. Click Save All Works to upload this video to Supabase.`;
          helper.classList.add('is-detected');
        }
      });
    });

    document.getElementById('worksForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newWorks = [];
      for (const card of document.querySelectorAll('.work-editor')) {
        const id = Number(card.dataset.id);
        const title = card.querySelector('[name="work_title"]').value.trim();
        if (!title) continue;

        const previous = state.works.find((w) => Number(w.id) === id);
        let video = card.querySelector('[name="work_video_url"]').value.trim();
        const file = card.querySelector('[name="work_video_upload"]')?.files?.[0];
        if (file) {
          const uploadedVideo = await uploadToSupabaseStorage(file, 'videos');
          if (uploadedVideo) {
            video = uploadedVideo;
          } else {
            await videoDB.put(id, file);
            video = `indexeddb:${id}`;
            showFlash('Supabase is not configured, so the video was saved only in this browser.', 'error');
          }
        }
        if (!video && previous?.video?.startsWith('indexeddb:')) await videoDB.remove(id).catch(() => {});
        if (video === 'Ready to upload after saving') video = previous?.video || '';

        newWorks.push({
          id,
          title,
          category: card.querySelector('[name="work_category"]').value.trim(),
          description: card.querySelector('[name="work_description"]').value.trim(),
          tech: cleanCSV(card.querySelector('[name="work_tech"]').value),
          url: card.querySelector('[name="work_url"]').value.trim() || '#',
          images: cleanLines(card.querySelector('[name="work_images"]').value),
          video,
          videoRatio: sanitizeRatio(card.querySelector('[name="work_video_ratio"]').value),
        });
      }
      state.works = newWorks;
      saveData();
      showFlash('Works saved successfully.');
      render();
    });
  }

  function initPortfolio() {
    initTypewriter();
    initReveal();
    initSkillBars();
    initProjectCards();
  }

  function initNav() {
    const nav = document.querySelector('.nav');
    if (!nav) return;
    const update = () => nav.classList.toggle('scrolled', window.scrollY > 30);
    update();
    window.addEventListener('scroll', update, { passive: true });
  }

  function initParticles() {
    const canvas = document.querySelector('.particle-canvas');
    if (!canvas) return;
    if (particleRaf) cancelAnimationFrame(particleRaf);
    const ctx = canvas.getContext('2d');
    const mouse = { x: -9999, y: -9999 };
    let particles = [];

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const count = Math.min(Math.floor((window.innerWidth * window.innerHeight) / 14000), 90);
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        r: Math.random() * 1.8 + 0.6,
        isOrange: Math.random() > 0.72,
        alpha: Math.random() * 0.5 + 0.15,
      }));
    }

    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
    resize();

    function tick() {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 110 && dist > 0) {
          const force = ((110 - dist) / 110) * 0.28;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }
        p.vx *= 0.985;
        p.vy *= 0.985;
        const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (spd > 1.8) { p.vx = (p.vx / spd) * 1.8; p.vy = (p.vy / spd) * 1.8; }
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = width; if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height; if (p.y > height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.isOrange ? `rgba(255,107,43,${p.alpha})` : `rgba(61,142,255,${p.alpha})`;
        ctx.fill();
      });
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 130) {
            const a = (1 - d / 130) * 0.12;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(100,150,255,${a})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      particleRaf = requestAnimationFrame(tick);
    }
    tick();
  }

  function initTypewriter() {
    const el = document.getElementById('typewriter');
    if (!el) return;
    let words = [];
    try { words = JSON.parse(el.dataset.roles || '[]'); } catch { words = []; }
    if (!words.length) words = ['Full Stack Developer'];
    let idx = 0, charIdx = 0, deleting = false;
    function step() {
      const current = words[idx];
      let delay = 75;
      if (!deleting && charIdx < current.length) {
        el.textContent = current.slice(0, charIdx + 1);
        charIdx++;
      } else if (!deleting && charIdx === current.length) {
        delay = 2200;
        deleting = true;
      } else if (deleting && charIdx > 0) {
        el.textContent = current.slice(0, charIdx - 1);
        charIdx--;
        delay = 38;
      } else {
        deleting = false;
        idx = (idx + 1) % words.length;
      }
      setTimeout(step, delay);
    }
    step();
  }

  function initReveal() {
    const els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('visible'));
      return;
    }
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    els.forEach((el) => obs.observe(el));
  }

  function initSkillBars() {
    const fills = document.querySelectorAll('.skill-fill');
    if (!('IntersectionObserver' in window)) {
      fills.forEach((f) => { f.style.width = `${f.dataset.level}%`; });
      return;
    }
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const level = entry.target.dataset.level || 0;
          setTimeout(() => { entry.target.style.width = `${level}%`; }, 150);
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    fills.forEach((f) => obs.observe(f));
  }

  function initProjectCards() {
    document.querySelectorAll('.project-card').forEach((card) => {
      const imgs = Array.from(card.querySelectorAll('.project-image'));
      const dots = Array.from(card.querySelectorAll('.slide-dot'));
      let interval = null;
      let idx = 0;
      const setSlide = (i) => {
        imgs.forEach((img, j) => img.classList.toggle('active', j === i));
        dots.forEach((dot, j) => dot.classList.toggle('active', j === i));
      };
      card.addEventListener('mouseenter', () => {
        const video = card.querySelector('.project-video');
        if (video) video.play().catch(() => {});
        if (imgs.length > 1) {
          interval = setInterval(() => {
            idx = (idx + 1) % imgs.length;
            setSlide(idx);
          }, 850);
        }
      });
      card.addEventListener('mouseleave', () => {
        const video = card.querySelector('.project-video');
        if (video) { video.pause(); video.currentTime = 0; }
        clearInterval(interval);
        idx = 0;
        setSlide(0);
      });
    });
  }

  async function loadIndexedVideos() {
    const videos = document.querySelectorAll('video[data-video-id]');
    for (const video of videos) {
      const id = video.dataset.videoId;
      try {
        const blob = await videoDB.get(id);
        if (blob) video.src = URL.createObjectURL(blob);
      } catch {
        // Ignore IndexedDB errors. The user can still use normal video URLs or paths.
      }
    }
  }

  window.addEventListener('hashchange', render);

  async function boot() {
    app.innerHTML = `
      <div class="login-page">
        <canvas class="particle-canvas"></canvas>
        <div class="login-card" style="text-align:center;">
          <div class="login-title"><span class="glow-orange">Loading</span><span> Portfolio</span></div>
          <p class="login-subtitle">Connecting to Supabase...</p>
        </div>
      </div>
    `;
    initParticles();
    await loadRemoteData();
    subscribeToRealtime();
    render();
  }

  boot();
})();
