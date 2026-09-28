let PRODUCTS = [];
let cart = JSON.parse(localStorage.getItem('kwame_cart') || '[]');
let activeCat = 'All';
const CATS = ['All', 'Phones', 'Laptops', 'Tablets', 'TVs & Audio', 'Gaming', 'Wearables', 'Cameras', 'Smart Home', 'Accessories'];

// ---------- Dark / light mode ----------
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('themeToggle').textContent = theme === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('kwame_theme', theme);
}
(function initTheme() {
  const saved = localStorage.getItem('kwame_theme');
  const preferred = saved || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  applyTheme(preferred);
})();
document.getElementById('themeToggle').onclick = () => {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
};

// ---------- Newsletter (decorative — no backend wired up) ----------
document.getElementById('newsletterForm').addEventListener('submit', (e) => {
  e.preventDefault();
  e.target.querySelector('button').textContent = 'Joined ✓';
});

// ---------- Account (email/password) ----------
let customerToken = localStorage.getItem('kwame_customer_token') || null;
let customer = JSON.parse(localStorage.getItem('kwame_customer') || 'null');
let authMode = 'login'; // or 'signup'

function renderAccountArea() {
  const el = document.getElementById('accountArea');
  if (customer && customerToken) {
    el.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <a href="my-orders.html" style="color:var(--ink); font-size:.82rem; text-decoration:none; font-weight:600;">${customer.name.split(' ')[0]}'s orders</a>
        <button id="logoutBtn" style="background:none; border:none; color:var(--muted); font-size:.75rem; text-decoration:underline; cursor:pointer;">Log out</button>
      </div>`;
    document.getElementById('logoutBtn').onclick = () => {
      localStorage.removeItem('kwame_customer_token');
      localStorage.removeItem('kwame_customer');
      customerToken = null; customer = null;
      renderAccountArea();
      lockSite(); // signing out re-locks the store
    };
  } else {
    el.innerHTML = '<button class="icon-btn" id="signInBtn">Sign in</button>';
    document.getElementById('signInBtn').onclick = () => openAuthModal('login');
  }
}
renderAccountArea();

// ---------- Mandatory sign-in gate ----------
// The store's content is hidden until the visitor creates an account or
// signs in — there is no "browse as guest" option, by design.
function lockSite() {
  document.body.classList.add('gated');
  document.getElementById('authCancel').style.display = 'none'; // no way to dismiss without signing in
  openAuthModal(customer ? 'login' : 'signup'); // new visitors land on "create account" first
}
function unlockSite() {
  document.body.classList.remove('gated');
  closeModal('authOverlay');
}
if (!(customer && customerToken)) {
  lockSite();
}

function openAuthModal(mode) {
  authMode = mode;
  document.getElementById('authErr').style.display = 'none';
  document.getElementById('authName').value = '';
  document.getElementById('authEmail').value = '';
  document.getElementById('authPassword').value = '';
  if (mode === 'signup') {
    document.getElementById('authTitle').textContent = 'Create an account';
    document.getElementById('authSub').textContent = 'So you can track your orders later.';
    document.getElementById('authNameField').style.display = 'block';
    document.getElementById('authSubmit').textContent = 'Create account';
    document.getElementById('authToggleText').textContent = 'Already have an account?';
    document.getElementById('authToggleLink').textContent = 'Sign in';
  } else {
    document.getElementById('authTitle').textContent = 'Sign in';
    document.getElementById('authSub').textContent = 'Sign in to see your order history.';
    document.getElementById('authNameField').style.display = 'none';
    document.getElementById('authSubmit').textContent = 'Sign in';
    document.getElementById('authToggleText').textContent = 'New here?';
    document.getElementById('authToggleLink').textContent = 'Create an account';
  }
  document.getElementById('authOverlay').classList.add('show');
}
document.getElementById('authCancel').onclick = () => document.getElementById('authOverlay').classList.remove('show');
document.getElementById('authToggleLink').onclick = (e) => {
  e.preventDefault();
  openAuthModal(authMode === 'login' ? 'signup' : 'login');
};

document.getElementById('authSubmit').onclick = async () => {
  const name = document.getElementById('authName').value.trim();
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const errEl = document.getElementById('authErr');
  const submitBtn = document.getElementById('authSubmit');

  if (!email || !password || (authMode === 'signup' && !name)) {
    errEl.textContent = 'Please fill in all fields.';
    errEl.style.display = 'block';
    return;
  }
  errEl.style.display = 'none';
  submitBtn.disabled = true;
  submitBtn.textContent = 'Please wait…';

  try {
    const endpoint = authMode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
    const body = authMode === 'signup' ? { name, email, password } : { email, password };
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Something went wrong');

    customerToken = data.token;
    customer = data.customer;
    localStorage.setItem('kwame_customer_token', customerToken);
    localStorage.setItem('kwame_customer', JSON.stringify(customer));
    renderAccountArea();
    unlockSite();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.style.display = 'block';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = authMode === 'signup' ? 'Create account' : 'Sign in';
  }
};

async function loadProducts() {
  try {
    const res = await fetch(`${API_BASE}/api/products`);
    PRODUCTS = await res.json();
  } catch (err) {
    document.getElementById('productGrid').innerHTML =
      '<p class="empty-note">Could not load products. Is the backend running and is API_BASE in config.js correct?</p>';
    return;
  }
  renderFilters();
  renderGrid();
}

function renderFilters() {
  CATS = ['All', ...new Set(PRODUCTS.filter(p => p.inStock !== false).map(p => p.category))];
  const el = document.getElementById('filters');
  el.innerHTML = CATS.map(c => {
    const label = c === 'All' ? `All layers ${PRODUCTS.filter(p => p.inStock !== false).length}` : c;
    return `<button class="filter-chip ${c === activeCat ? 'active' : ''}" data-cat="${c}">${label}</button>`;
  }).join('');
  el.querySelectorAll('.filter-chip').forEach(btn => {
    btn.onclick = () => { activeCat = btn.dataset.cat; renderFilters(); renderGrid(); };
  });
}

const CATEGORY_ICON = {
  Phones: '<circle cx="0" cy="0" r="22" stroke="white" stroke-opacity=".8" stroke-width="2.4" fill="none"/><circle cx="0" cy="0" r="4" fill="white"/>',
  Laptops: '<rect x="-20" y="-20" width="40" height="40" rx="4" stroke="white" stroke-opacity=".8" stroke-width="2.4" fill="none"/>',
  Tablets: '<rect x="-14" y="-22" width="28" height="44" rx="5" stroke="white" stroke-opacity=".8" stroke-width="2.4" fill="none"/>',
  'TVs & Audio': '<rect x="-24" y="-16" width="48" height="30" rx="3" stroke="white" stroke-opacity=".8" stroke-width="2.4" fill="none"/><line x1="-10" y1="18" x2="10" y2="18" stroke="white" stroke-opacity=".8" stroke-width="2.4"/>',
  Gaming: '<rect x="-24" y="-12" width="48" height="24" rx="12" stroke="white" stroke-opacity=".8" stroke-width="2.4" fill="none"/><circle cx="-10" cy="0" r="2.5" fill="white"/><circle cx="10" cy="-4" r="2.5" fill="white"/><circle cx="10" cy="4" r="2.5" fill="white"/>',
  Wearables: '<circle cx="0" cy="0" r="16" stroke="white" stroke-opacity=".8" stroke-width="2.4" fill="none"/><line x1="0" y1="-26" x2="0" y2="-16" stroke="white" stroke-opacity=".8" stroke-width="2.4"/><line x1="0" y1="16" x2="0" y2="26" stroke="white" stroke-opacity=".8" stroke-width="2.4"/>',
  Cameras: '<rect x="-22" y="-14" width="44" height="30" rx="4" stroke="white" stroke-opacity=".8" stroke-width="2.4" fill="none"/><circle cx="0" cy="1" r="9" stroke="white" stroke-opacity=".8" stroke-width="2.2" fill="none"/>',
  'Smart Home': '<path d="M-20 2 L0 -18 L20 2 V22 H-20 Z" stroke="white" stroke-opacity=".8" stroke-width="2.4" fill="none" stroke-linejoin="round"/>',
  Gadgets: '<path d="M0 -24 L-14 4 H-1 L-4 24 L18 -6 H4 Z" fill="white" fill-opacity=".85"/>',
  Accessories: '<path d="M-22 0 C-22 -14 -10 -22 0 -10 C10 -22 22 -14 22 0 C22 14 10 22 0 10 C-10 22 -22 14 -22 0Z" stroke="white" stroke-opacity=".8" stroke-width="2.2" fill="none"/>'
};
function tileStyle(cat) {
  if (['Phones','Laptops','Gadgets','Accessories'].includes(cat)) return '';
  let h = 0; for (const c of cat) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `background:linear-gradient(155deg,hsl(${h},35%,32%),hsl(${(h+30)%360},40%,14%))`;
}
function tileIcon(cat) {
  return `<svg class="ptile-icon" width="70" height="70" viewBox="-30 -30 60 60">${CATEGORY_ICON[cat] || CATEGORY_ICON.Accessories}</svg>`;
}

function thumbHtml(p) {
  return p.image ? `<img src="${p.image}" alt="${p.name}">` : '📱';
}

function renderGrid() {
  const el = document.getElementById('productGrid');
  let list = activeCat === 'All' ? PRODUCTS : PRODUCTS.filter(p => p.category === activeCat);
  list = list.filter(p => p.inStock !== false);
  if (list.length === 0) {
    el.innerHTML = '<p class="empty-note">No products in this category yet.</p>';
    return;
  }
  el.innerHTML = list.map((p, i) => `
    <div class="card reveal" style="--i:${i % 6}">
      <div class="ptile cat-${p.category.replace(/[^A-Za-z]/g, '')}" style="${tileStyle(p.category)}">
        <span class="ptile-tag">${(p.tag || p.category).toUpperCase()}</span>
        ${p.image ? `<img src="${p.image}" alt="${p.name}">` : tileIcon(p.category)}
        <button class="ptile-add" data-id="${p._id}">+</button>
        <span class="ptile-mark">G / A</span>
      </div>
      <div class="pinfo">
        <span class="pcat">${p.category}</span>
        <h3>${p.name}</h3>
        <div class="prow">
          <span class="pprice">GH₵${p.price.toLocaleString()}</span>
          <button class="padd-link" data-id="${p._id}">Add to bag</button>
        </div>
      </div>
    </div>`).join('');
  el.querySelectorAll('.ptile-add, .padd-link').forEach(btn => {
    btn.onclick = () => addToCart(btn.dataset.id);
  });
  observeReveals();
}

function saveCart() { localStorage.setItem('kwame_cart', JSON.stringify(cart)); }

function addToCart(id) {
  const line = cart.find(l => l.id === id);
  if (line) line.qty++; else cart.push({ id, qty: 1 });
  saveCart(); renderCart(); openDrawer();
}
function changeQty(id, delta) {
  const line = cart.find(l => l.id === id);
  if (!line) return;
  line.qty += delta;
  if (line.qty <= 0) cart = cart.filter(l => l.id !== id);
  saveCart(); renderCart();
}
function removeLine(id) { cart = cart.filter(l => l.id !== id); saveCart(); renderCart(); }

function cartTotal() {
  return cart.reduce((sum, l) => {
    const p = PRODUCTS.find(p => p._id === l.id);
    return sum + (p ? p.price * l.qty : 0);
  }, 0);
}

function renderCart() {
  const count = cart.reduce((s, l) => s + l.qty, 0);
  document.getElementById('cartCount').textContent = count;
  const el = document.getElementById('cartItems');
  const summary = document.getElementById('cartSummary');
  if (cart.length === 0) {
    el.innerHTML = '<div class="cart-empty">Your cart is empty.<br>Add a phone or accessory to get started.</div>';
    summary.style.display = 'none';
    return;
  }
  summary.style.display = 'block';
  el.innerHTML = cart.map(l => {
    const p = PRODUCTS.find(p => p._id === l.id);
    if (!p) return '';
    return `<div class="cart-line">
      <div class="thumb">${thumbHtml(p)}</div>
      <div class="meta">
        <h4>${p.name}</h4>
        <span>GH₵${p.price.toLocaleString()} each</span>
        <div class="qty">
          <button data-act="dec" data-id="${p._id}">−</button>
          <span>${l.qty}</span>
          <button data-act="inc" data-id="${p._id}">+</button>
          <button class="rm" data-rm="${p._id}">Remove</button>
        </div>
      </div>
    </div>`;
  }).join('');
  el.querySelectorAll('[data-act]').forEach(btn => {
    btn.onclick = () => changeQty(btn.dataset.id, btn.dataset.act === 'inc' ? 1 : -1);
  });
  el.querySelectorAll('[data-rm]').forEach(btn => {
    btn.onclick = () => removeLine(btn.dataset.rm);
  });
  const total = cartTotal();
  document.getElementById('cartSubtotal').textContent = 'GH₵' + total.toLocaleString();
  document.getElementById('cartTotal').textContent = 'GH₵' + total.toLocaleString();
}

function openDrawer() { document.getElementById('drawer').classList.add('open'); document.getElementById('overlay').classList.add('show'); }
function closeDrawer() { document.getElementById('drawer').classList.remove('open'); document.getElementById('overlay').classList.remove('show'); }
document.getElementById('cartOpen').onclick = openDrawer;
document.getElementById('cartClose').onclick = closeDrawer;
document.getElementById('overlay').onclick = closeDrawer;

function openModal(id) { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }

document.getElementById('checkoutBtn').onclick = () => {
  if (cart.length === 0) return;
  if (customer) {
    document.getElementById('custName').value = customer.name;
    document.getElementById('custEmail').value = customer.email;
  }
  openModal('checkoutOverlay');
};
document.getElementById('checkoutCancel').onclick = () => closeModal('checkoutOverlay');

document.getElementById('checkoutSubmit').onclick = async () => {
  const customerName = document.getElementById('custName').value.trim();
  const phone = document.getElementById('custPhone').value.trim();
  const email = document.getElementById('custEmail').value.trim();
  const address = document.getElementById('custAddress').value.trim();
  const errEl = document.getElementById('checkoutErr');
  const submitBtn = document.getElementById('checkoutSubmit');

  if (!customerName || !phone || !email || !address) {
    errEl.textContent = 'Please fill in your name, phone, email and address.';
    errEl.style.display = 'block';
    return;
  }
  errEl.style.display = 'none';
  submitBtn.disabled = true;
  submitBtn.textContent = 'Please wait…';

  const items = cart.map(l => {
    const p = PRODUCTS.find(p => p._id === l.id);
    return { productId: p._id, name: p.name, price: p.price, qty: l.qty };
  });
  const total = cartTotal();

  try {
    // 1. Save the order (attached to the signed-in account, if any)
    const orderHeaders = { 'Content-Type': 'application/json' };
    if (customerToken) orderHeaders['Authorization'] = `Bearer ${customerToken}`;
    const orderRes = await fetch(`${API_BASE}/api/orders`, {
      method: 'POST',
      headers: orderHeaders,
      body: JSON.stringify({ customerName, phone, address, items, total })
    });
    const order = await orderRes.json();
    if (!orderRes.ok) throw new Error(order.error || 'Could not save order');

    // 2. Start payment and redirect to Paystack's checkout
    const payRes = await fetch(`${API_BASE}/api/payment/initialize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: order._id, email })
    });
    const pay = await payRes.json();
    if (!payRes.ok) throw new Error(pay.error || 'Could not start payment');

    cart = [];
    saveCart();
    window.location.href = pay.authorization_url;
  } catch (err) {
    errEl.textContent = err.message || 'Something went wrong. Please try again.';
    errEl.style.display = 'block';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Continue to payment';
  }
};

loadProducts();
renderCart();

// ---------- Scroll effects: reveal-on-scroll, parallax glass blobs, progress bar ----------
document.documentElement.classList.add('js-reveal');
const revealObserver = ('IntersectionObserver' in window) ? new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); revealObserver.unobserve(e.target); } });
}, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }) : null;
function observeReveals() {
  document.querySelectorAll('.reveal:not(.in)').forEach(el => revealObserver ? revealObserver.observe(el) : el.classList.add('in'));
}
observeReveals();

let scrollTicking = false;
function onScroll() {
  const y = window.scrollY, max = document.documentElement.scrollHeight - window.innerHeight;
  const root = document.documentElement.style;
  root.setProperty('--sy', y);
  root.setProperty('--p', max > 0 ? y / max : 0);
  const hdr = document.querySelector('header');
  if (hdr) hdr.classList.toggle('scrolled', y > 20);
  scrollTicking = false;
}
window.addEventListener('scroll', () => { if (!scrollTicking) { scrollTicking = true; requestAnimationFrame(onScroll); } }, { passive: true });
onScroll();

// light that follows your finger / cursor across product tiles
document.addEventListener('pointermove', (e) => {
  const t = e.target.closest && e.target.closest('.ptile');
  if (!t) return;
  const r = t.getBoundingClientRect();
  t.style.setProperty('--mx', (e.clientX - r.left) + 'px');
  t.style.setProperty('--my', (e.clientY - r.top) + 'px');
});
