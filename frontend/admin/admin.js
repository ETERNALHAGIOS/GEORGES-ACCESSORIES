let token = localStorage.getItem('kwame_admin_token') || null;
let products = [];
let orders = [];
let pendingImage = ''; // base64 of the currently-selected new product photo

function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

function showDashboard() {
  document.getElementById('loginWrap').style.display = 'none';
  document.getElementById('dashboard').style.display = 'block';
  loadProducts();
  loadOrders();
}
function showLogin() {
  document.getElementById('loginWrap').style.display = 'flex';
  document.getElementById('dashboard').style.display = 'none';
}

if (token) showDashboard(); else showLogin();

document.getElementById('loginSubmit').onclick = async () => {
  const key = document.getElementById('adminKey').value;
  const errEl = document.getElementById('loginErr');
  try {
    const res = await fetch(`${API_BASE}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key })
    });
    const data = await res.json();
    if (!res.ok) { errEl.style.display = 'block'; return; }
    errEl.style.display = 'none';
    token = data.token;
    localStorage.setItem('kwame_admin_token', token);
    document.getElementById('adminKey').value = '';
    showDashboard();
  } catch (err) {
    errEl.textContent = 'Could not reach the server.';
    errEl.style.display = 'block';
  }
};

document.getElementById('logoutBtn').onclick = () => {
  localStorage.removeItem('kwame_admin_token');
  token = null;
  showLogin();
};

// ---------- Tabs ----------
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.panel).classList.add('active');
  };
});

// ---------- Products ----------
async function loadProducts() {
  const res = await fetch(`${API_BASE}/api/products`);
  products = await res.json();
  renderProducts();
}
function renderProducts() {
  const body = document.getElementById('productsBody');
  if (products.length === 0) {
    body.innerHTML = '<tr><td colspan="6" class="empty-note">No products yet — add your first one.</td></tr>';
    return;
  }
  body.innerHTML = products.map(p => `
    <tr>
      <td>${p.image ? `<img src="${p.image}">` : '—'}</td>
      <td>${p.name}</td>
      <td>${p.category}</td>
      <td>GH₵${p.price.toLocaleString()}</td>
      <td>${p.inStock !== false ? 'Yes' : 'No'}</td>
      <td>
        <button class="mini-btn" data-edit="${p._id}">Edit</button>
        <button class="mini-btn danger" data-del="${p._id}">Delete</button>
      </td>
    </tr>`).join('');
  body.querySelectorAll('[data-edit]').forEach(btn => btn.onclick = () => openProductModal(btn.dataset.edit));
  body.querySelectorAll('[data-del]').forEach(btn => btn.onclick = () => deleteProduct(btn.dataset.del));
}

function openProductModal(id) {
  pendingImage = '';
  document.getElementById('productErr').style.display = 'none';
  document.getElementById('pImagePreview').style.display = 'none';
  document.getElementById('pImageFile').value = '';
  if (id) {
    const p = products.find(p => p._id === id);
    document.getElementById('productModalTitle').textContent = 'Edit product';
    document.getElementById('productId').value = p._id;
    document.getElementById('pName').value = p.name;
    document.getElementById('pTag').value = p.tag || '';
    document.getElementById('pCategory').value = p.category;
    document.getElementById('pPrice').value = p.price;
    document.getElementById('pInStock').checked = p.inStock !== false;
    pendingImage = p.image || '';
    if (p.image) {
      document.getElementById('pImagePreview').src = p.image;
      document.getElementById('pImagePreview').style.display = 'block';
    }
  } else {
    document.getElementById('productModalTitle').textContent = 'Add product';
    document.getElementById('productId').value = '';
    document.getElementById('pName').value = '';
    document.getElementById('pTag').value = '';
    document.getElementById('pCategory').value = '';
    document.getElementById('pPrice').value = '';
    document.getElementById('pInStock').checked = true;
  }
  document.getElementById('productModal').classList.add('show');
}
document.getElementById('newProductBtn').onclick = () => openProductModal(null);
document.getElementById('productCancel').onclick = () => document.getElementById('productModal').classList.remove('show');

document.getElementById('pImageFile').onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    pendingImage = reader.result; // base64 data URL, stored directly on the product
    document.getElementById('pImagePreview').src = pendingImage;
    document.getElementById('pImagePreview').style.display = 'block';
  };
  reader.readAsDataURL(file);
};

document.getElementById('productSave').onclick = async () => {
  const id = document.getElementById('productId').value;
  const name = document.getElementById('pName').value.trim();
  const price = parseFloat(document.getElementById('pPrice').value);
  const errEl = document.getElementById('productErr');
  if (!name || isNaN(price)) { errEl.style.display = 'block'; return; }
  errEl.style.display = 'none';

  const body = {
    name,
    tag: document.getElementById('pTag').value.trim(),
    category: document.getElementById('pCategory').value.trim() || 'General',
    price,
    image: pendingImage,
    inStock: document.getElementById('pInStock').checked
  };

  const url = id ? `${API_BASE}/api/products/${id}` : `${API_BASE}/api/products`;
  const method = id ? 'PUT' : 'POST';
  const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
  if (!res.ok) { errEl.textContent = 'Could not save — check your admin session.'; errEl.style.display = 'block'; return; }

  document.getElementById('productModal').classList.remove('show');
  loadProducts();
};

async function deleteProduct(id) {
  if (!confirm('Delete this product? This cannot be undone.')) return;
  await fetch(`${API_BASE}/api/products/${id}`, { method: 'DELETE', headers: authHeaders() });
  loadProducts();
}

// ---------- Orders ----------
async function loadOrders() {
  const res = await fetch(`${API_BASE}/api/orders`, { headers: authHeaders() });
  if (!res.ok) return;
  orders = await res.json();
  renderOrders();
}
function renderOrders() {
  const body = document.getElementById('ordersBody');
  if (orders.length === 0) {
    body.innerHTML = '<tr><td colspan="6" class="empty-note">No orders yet.</td></tr>';
    return;
  }
  body.innerHTML = orders.map(o => `
    <tr>
      <td>${o.customerName}<br><span style="color:#5b6a85">${o.phone}</span></td>
      <td>${o.items.map(i => `${i.name} x${i.qty}`).join(', ')}</td>
      <td>GH₵${o.total.toLocaleString()}</td>
      <td><span class="status-pill status-${o.paymentStatus}">${o.paymentStatus}</span></td>
      <td>
        <select class="order-select" data-id="${o._id}">
          ${['new','confirmed','shipped','delivered','cancelled'].map(s =>
            `<option value="${s}" ${o.orderStatus === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </td>
      <td>${new Date(o.createdAt).toLocaleString()}</td>
    </tr>`).join('');
  body.querySelectorAll('.order-select').forEach(sel => {
    sel.onchange = async () => {
      await fetch(`${API_BASE}/api/orders/${sel.dataset.id}`, {
        method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ orderStatus: sel.value })
      });
    };
  });
}
