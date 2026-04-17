// ============================================================
// API.JS — Semua komunikasi ke Google Apps Script
// ============================================================

const API = {
  connected: false,

  async get(action, params = {}) {
    const url = new URL(CONFIG.GAS_URL);
    url.searchParams.set('action', action);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString());
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  },

  async post(body) {
    const res = await fetch(CONFIG.GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  },

  // ── Products ───────────────────────────────────────────────
  async getProducts() {
    return this.get('getProducts');
  },

  async saveProduct(product) {
    return this.post({ action: 'saveProduct', data: product });
  },

  async deleteProduct(id) {
    return this.post({ action: 'deleteProduct', id });
  },

  // ── Bundles ────────────────────────────────────────────────
  async getBundles() {
    return this.get('getBundles');
  },

  async saveBundle(bundle) {
    return this.post({ action: 'saveBundle', data: bundle });
  },

  async deleteBundle(id) {
    return this.post({ action: 'deleteBundle', id });
  },

  // ── AI Scoring ─────────────────────────────────────────────
  async aiScore(productName, productDesc = '') {
    return this.post({ action: 'aiScore', productName, productDesc });
  },

  // ── Images ─────────────────────────────────────────────────
  async uploadImage(name, base64, mimeType) {
    return this.post({ action: 'uploadImage', name, base64, mimeType });
  },

  async getImages() {
    return this.get('getImages');
  },

  async assignImage(productId, imageUrl) {
    return this.post({ action: 'assignImage', productId, imageUrl });
  },

  // ── Connection check ───────────────────────────────────────
  async checkConnection() {
    try {
      if (CONFIG.GAS_URL === 'PASTE_URL_GOOGLE_APPS_SCRIPT_KAMU_DI_SINI') {
        setConnStatus(false, 'GAS belum dikonfigurasi');
        return false;
      }
      await this.get('getProducts');
      this.connected = true;
      setConnStatus(true, 'Terhubung ke Sheets');
      return true;
    } catch (e) {
      this.connected = false;
      setConnStatus(false, 'Gagal konek');
      return false;
    }
  }
};

function setConnStatus(ok, label) {
  const dot = document.getElementById('connDot');
  const lbl = document.getElementById('connLabel');
  if (dot) dot.className = 'conn-dot ' + (ok ? 'conn-ok' : 'conn-err');
  if (lbl) lbl.textContent = label;
}

// ── File to Base64 helper ──────────────────────────────────
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      // Strip "data:image/png;base64," prefix
      const b64 = e.target.result.split(',')[1];
      resolve(b64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
