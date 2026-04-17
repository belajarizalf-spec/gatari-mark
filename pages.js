// ============================================================
// PAGES.JS — Render semua halaman
// ============================================================

// ── DASHBOARD ─────────────────────────────────────────────────
function renderDashboard() {
  const prods = state.products;
  const scored = prods.filter(p=>p.confidenceScore>0);
  const avgConf = scored.length ? Math.round(scored.reduce((a,p)=>a+(parseInt(p.confidenceScore)||0),0)/scored.length) : 0;

  return `
  <div class="page-header">
    <h2>Dashboard</h2>
    <p>Ringkasan performa produk dan distribusi stage Gatari</p>
  </div>
  <div class="grid-4 mb-24">
    <div class="stat-card"><div class="stat-label">Total Produk</div><div class="stat-value">${prods.length}</div><div class="stat-sub">Di Google Sheets</div></div>
    <div class="stat-card"><div class="stat-label">Sudah Diskor</div><div class="stat-value">${scored.length}</div><div class="stat-sub">Dari ${prods.length} produk</div></div>
    <div class="stat-card"><div class="stat-label">Avg Confidence</div><div class="stat-value">${avgConf?avgConf+'%':'–'}</div><div class="stat-sub">Akurasi AI</div></div>
    <div class="stat-card"><div class="stat-label">Foto Tersimpan</div><div class="stat-value">${state.driveImages.length}</div><div class="stat-sub">Di Google Drive</div></div>
  </div>
  <div class="grid-2 mb-24">
    <div class="card">
      <div class="section-title">Distribusi Stage</div>
      <div style="position:relative;height:200px"><canvas id="dashChart" role="img" aria-label="Distribusi produk per stage">Distribusi stage.</canvas></div>
    </div>
    <div class="card">
      <div class="section-title">Produk Terbaru</div>
      ${prods.length===0?`<div class="empty-state"><div class="icon">📦</div><p>Belum ada produk</p></div>`:''}
      ${prods.slice(-5).reverse().map(p=>`
        <div class="flex items-center gap-12 mb-12">
          <div style="width:36px;height:36px;border-radius:8px;background:var(--bg);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0">
            ${p.imageUrl?`<img src="${p.imageUrl}" style="width:36px;height:36px;object-fit:contain">`:`<span style="font-size:18px">📦</span>`}
          </div>
          <div class="flex-1 min-w-0">
            <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</div>
            <div class="text-sm text-muted">${p.price?'Rp'+parseInt(p.price).toLocaleString('id'):'–'}</div>
          </div>
          ${p.primaryStage?`<span class="badge badge-green">${p.primaryStage}</span>`:`<span class="badge badge-wood">Unsorted</span>`}
        </div>
      `).join('')}
      <button class="btn btn-outline btn-sm w-full mt-8" onclick="navigate('products')">Lihat Semua →</button>
    </div>
  </div>
  <div class="grid-2">
    <div class="card">
      <div class="section-title">Quick Actions</div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <button class="btn btn-primary w-full" onclick="navigate('scoring')">🤖 Skor Produk dengan AI</button>
        <button class="btn btn-accent w-full" onclick="navigate('bundling')">🎁 Buat Bundle Produk</button>
        <button class="btn btn-outline w-full" onclick="loadAll()">🔄 Refresh dari Sheets</button>
      </div>
    </div>
    <div class="card">
      <div class="section-title">Stage Reference</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
        ${STAGES.map(s=>`<div class="flex items-center gap-8" style="background:var(--surface2);padding:8px 10px;border-radius:8px;border:1px solid var(--wood-pale)">
          <div class="stage-pill stage-pill-sm">${s.id}</div>
          <div style="font-size:11.5px;font-weight:600;color:var(--text2)">${s.ageRange}</div>
        </div>`).join('')}
      </div>
    </div>
  </div>`;
}

// ── SCORING ───────────────────────────────────────────────────
function renderScoring() {
  const f = state.scoringForm;
  const r = state.scoringResult;
  const ai = state.scoringAiData;
  const loading = state.isAnalyzing;

  return `
  <div class="page-header">
    <h2>Product Scoring</h2>
    <p>Ketik nama produk → AI menilai 6 dimensi perkembangan secara otomatis</p>
  </div>
  <div class="grid-2">
    <div class="card" style="align-self:start">
      <div class="flex items-center gap-8 mb-16">
        <div class="section-title" style="margin-bottom:0">Input Produk</div>
        <span class="ai-badge">✨ AI Powered</span>
      </div>
      <div class="input-group">
        <label class="input-label">Nama Produk <span style="color:var(--red)">*</span></label>
        <input class="input" id="sc-name" value="${f.productName||''}" placeholder="contoh: Wooden Shape Sorter, Sensory Ball Set..." oninput="state.scoringForm.productName=this.value">
      </div>
      <div class="input-group">
        <label class="input-label">Deskripsi Tambahan <span class="text-muted">(opsional)</span></label>
        <textarea class="input" id="sc-desc" placeholder="contoh: mainan kayu berbentuk geometri, anak belajar mencocokkan bentuk..." oninput="state.scoringForm.productDesc=this.value" style="min-height:80px">${f.productDesc||''}</textarea>
      </div>
      <div class="input-group">
        <label class="input-label">Harga Produk (Rp)</label>
        <input class="input" id="sc-price" value="${f.productPrice||''}" placeholder="contoh: 89000" type="number" oninput="state.scoringForm.productPrice=this.value">
      </div>
      <div class="info-box mb-16">
        <div style="font-size:12px;font-weight:700;color:var(--blue);margin-bottom:4px">💡 Cara Kerja AI Scoring</div>
        <div style="font-size:11.5px;color:var(--blue);line-height:1.6">AI menganalisis produk → memberi skor 0–100 per dimensi → mencocokkan ke stage usia yang paling sesuai. Semakin detail deskripsi, semakin akurat hasilnya.</div>
      </div>
      <button class="btn btn-primary w-full" onclick="runAIScoring()" ${loading?'disabled':''} style="padding:13px;font-size:14px">
        ${loading?'⏳ Sedang Menganalisis...':'🤖 Analisis dengan AI'}
      </button>
      ${r&&ai?`<hr class="divider"><button class="btn btn-outline btn-sm w-full" onclick="saveCurrentProduct()">💾 Simpan ke Sheets</button>`:''}
    </div>

    <div>
      ${loading?`
      <div class="card"><div class="ai-loading">
        <div class="ai-spinner"></div>
        <div class="ai-loading-text">AI sedang menganalisis produk...</div>
        <div class="ai-loading-sub">"${escHtml(f.productName)}"</div>
      </div></div>
      `:r&&ai?`
      <div class="card mb-16">
        <div class="flex items-center gap-8 mb-16">
          <div class="section-title" style="margin-bottom:0">Hasil Analisis</div>
          <span class="ai-badge">✨ AI</span>
        </div>
        <div class="flex items-center gap-16 mb-12">
          <div class="stage-pill" style="width:56px;height:56px;font-size:16px">${r.primaryStage.id}</div>
          <div>
            <div style="font-size:18px;font-weight:700;color:var(--wood)">${r.primaryStage.ageRange}</div>
            <div class="text-sm text-muted">Stage Utama · ${escHtml(ai.productCategory||'')}</div>
          </div>
          <div style="margin-left:auto;text-align:center">
            <div style="font-size:28px;font-weight:700;color:var(--green)">${r.confidenceScore}%</div>
            <div class="text-sm text-muted">Confidence</div>
          </div>
        </div>
        ${ai.overallInsight?`<div class="success-box mb-12"><div style="font-size:12.5px;line-height:1.6">💡 ${escHtml(ai.overallInsight)}</div></div>`:''}
        <div class="flex gap-8 mb-12" style="flex-wrap:wrap">
          <span class="badge badge-wood">Range: ${r.stageRange}</span>
          <span class="badge badge-blue">${r.ageRange}</span>
          ${r.secondaryStages.map(s=>`<span class="badge badge-accent">${s.id}</span>`).join('')}
        </div>
        <div class="text-sm text-muted mb-8">Kesesuaian per Stage:</div>
        ${r.allScores.slice(0,5).map(s=>`
          <div class="score-bar-wrap">
            <div class="score-bar-label"><span style="font-size:12px;font-weight:600;color:var(--text2)">${s.stage.id} <span class="text-muted">${s.stage.ageRange}</span></span><span style="font-size:12px;font-weight:700;color:var(--wood)">${Math.round(s.similarity)}%</span></div>
            <div class="score-bar-track"><div class="score-bar-fill" style="width:${Math.round(s.similarity)}%"></div></div>
          </div>`).join('')}
      </div>
      <div class="card mb-16">
        <div class="section-title">Skor 6 Dimensi (oleh AI)</div>
        ${SKILL_KEYS.map(k=>{
          const sc=parseInt(ai.scores[k])||0;
          const col=sc>=70?'var(--green)':sc>=40?'var(--wood)':'var(--text3)';
          const barCol=sc>=70?'linear-gradient(90deg,#4A7C59,#2E5C40)':sc>=40?'linear-gradient(90deg,var(--wood-light),var(--wood))':'linear-gradient(90deg,#C49A6C,#9C7B63)';
          return `<div class="dim-card">
            <div class="dim-header">
              <div class="dim-name">${SKILL_ICONS[k]} ${SKILL_LABELS[k]}</div>
              <div class="dim-score" style="color:${col}">${sc}<span style="font-size:11px;font-weight:400;color:var(--text3)">/100</span></div>
            </div>
            <div class="score-bar-track mb-6"><div class="score-bar-fill" style="width:${sc}%;background:${barCol}"></div></div>
            <div class="dim-reason">${escHtml(ai.reasons[k]||'')}</div>
          </div>`;
        }).join('')}
      </div>
      <div class="card">
        <div class="section-title">Auto Copywriting</div>
        ${renderCopyBlock(generateCopy(null,r.primaryStage,f.productName))}
      </div>
      `:`<div class="card"><div class="empty-state"><div class="icon">🤖</div><p style="font-weight:600;color:var(--text2);margin-bottom:6px">AI siap menilai produkmu</p><p>Ketik nama produk di sebelah kiri,<br>AI akan otomatis menilai 6 dimensi perkembangan</p></div></div>`}
    </div>
  </div>`;
}

// ── PRODUCTS ──────────────────────────────────────────────────
function renderProducts() {
  const imgs = state.driveImages;
  return `
  <div class="page-header" style="display:flex;align-items:flex-start;justify-content:space-between">
    <div><h2>Product List</h2><p>Data tersimpan di Google Sheets · Foto di Google Drive</p></div>
    <div class="flex gap-8">
      <button class="btn btn-outline btn-sm" onclick="loadAll()">🔄 Refresh</button>
      <button class="btn btn-primary" onclick="navigate('scoring')">+ Produk Baru</button>
    </div>
  </div>

  <!-- UPLOAD FOTO KE GOOGLE DRIVE -->
  <div class="card mb-20">
    <div class="section-title">📸 Upload Foto Produk → Google Drive</div>
    <div class="flex gap-16" style="align-items:flex-start;flex-wrap:wrap">
      <div style="flex:1;min-width:240px">
        <div class="upload-zone" onclick="document.getElementById('imgUpload').click()" id="uploadZone">
          <div style="font-size:28px;margin-bottom:8px">☁️</div>
          <div style="font-weight:600;color:var(--wood);margin-bottom:4px">Klik untuk upload ke Google Drive</div>
          <div class="text-sm text-muted">PNG transparan · Otomatis tersimpan di Drive</div>
        </div>
        <input type="file" id="imgUpload" accept="image/png,image/jpeg,image/webp" multiple style="display:none" onchange="handleImgUpload(event)">
      </div>
      ${imgs.length>0?`
      <div style="flex:2;min-width:200px">
        <div class="text-sm text-muted mb-8">📁 Foto di Google Drive (${imgs.length} file):</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;max-height:160px;overflow-y:auto">
          ${imgs.map(img=>`
            <div style="position:relative;text-align:center" title="${escHtml(img.name)}">
              <img src="${img.imageUrl}" style="width:70px;height:70px;object-fit:contain;border-radius:8px;border:1.5px solid var(--wood-pale);background:var(--bg);padding:4px;display:block">
              <div style="font-size:9px;color:var(--text3);max-width:70px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(img.name)}</div>
            </div>`).join('')}
        </div>
      </div>`:''}
    </div>
    <div class="info-box mt-12">
      <div style="font-size:11.5px;color:var(--blue)">💡 <strong>Cara assign foto ke produk:</strong> Upload foto PNG transparan di sini → klik tombol 📷 di kartu produk → pilih foto dari Drive → foto tersimpan permanen di Sheets.</div>
    </div>
  </div>

  ${state.products.length===0?`<div class="card"><div class="empty-state"><div class="icon">📦</div><p>Belum ada produk.<br>Mulai dari <strong>Product Scoring</strong>.</p></div></div>`:`
  <div class="grid-3">
    ${state.products.map(p=>`
      <div class="product-card">
        <div class="product-img">
          ${p.imageUrl?`<img src="${p.imageUrl}" style="width:100%;height:100%;object-fit:contain;padding:8px">`:`<span style="font-size:40px">📦</span>`}
          <div style="position:absolute;top:8px;right:8px">${p.primaryStage?`<span class="badge badge-green">${p.primaryStage}</span>`:`<span class="badge badge-wood">Unsorted</span>`}</div>
        </div>
        <div style="font-weight:700;font-size:13.5px;margin-bottom:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(p.name)}</div>
        <div style="font-size:12px;color:var(--accent);font-weight:600;margin-bottom:8px">${p.price?'Rp'+parseInt(p.price).toLocaleString('id'):'–'}</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px">
          ${(p.stages||[]).map(s=>`<span class="badge badge-wood" style="font-size:10px">${s}</span>`).join('')}
        </div>
        ${p.confidenceScore?`<div class="text-sm text-muted mb-8">Confidence: <strong style="color:var(--green)">${p.confidenceScore}%</strong> · ${escHtml(p.ageRange||'')}</div>`:''}
        <div class="flex gap-6">
          <button class="btn btn-outline btn-sm flex-1" onclick="reScopeProduct('${p.id}')">🤖 Re-skor</button>
          <button class="btn btn-sm" style="background:var(--green-soft);color:var(--green);border:none;cursor:pointer;border-radius:8px;padding:6px 10px" onclick="showAssignImg('${p.id}','${escHtml(p.name)}')">📷</button>
          <button class="btn btn-sm" style="background:var(--red-soft);color:var(--red);border:none;cursor:pointer;border-radius:8px;padding:6px 10px" onclick="confirmDelete('${p.id}','${escHtml(p.name)}')">🗑</button>
        </div>
      </div>`).join('')}
  </div>`}`;
}

// ── BUNDLING ──────────────────────────────────────────────────
function renderBundling() {
  const bundle = state.bundleResult;
  const selected = state.selectedBundleProducts;
  return `
  <div class="page-header">
    <h2>Bundling Engine</h2>
    <p>Pilih 2–3 produk · Auto bundle dengan diskon otomatis · Export desain siap tawarkan</p>
  </div>
  <div class="grid-2">
    <div>
      <div class="card mb-16">
        <div class="section-title">Pilih Produk (2–3)</div>
        ${state.products.length===0?`<div class="empty-state"><div class="icon">📦</div><p>Belum ada produk</p></div>`:''}
        <div style="display:flex;flex-direction:column;gap:8px">
          ${state.products.map(p=>{
            const isSel=selected.some(s=>s.id===p.id);
            return `<div class="selectable-item ${isSel?'selected':''}" onclick="toggleBundle('${p.id}')">
              <div style="width:32px;height:32px;border-radius:6px;background:var(--bg);display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden">
                ${p.imageUrl?`<img src="${p.imageUrl}" style="width:32px;height:32px;object-fit:contain">`:`<span style="font-size:16px">📦</span>`}
              </div>
              <div class="flex-1 min-w-0">
                <div style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(p.name)}</div>
                <div class="text-sm text-muted">${p.price?'Rp'+parseInt(p.price).toLocaleString('id'):'–'} · ${(p.stages||[]).join(', ')}</div>
              </div>
              <div class="check-circle ${isSel?'checked':''}">${isSel?'✓':''}</div>
            </div>`;
          }).join('')}
        </div>
        <div style="margin-top:12px;display:flex;gap:8px">
          <button class="btn btn-primary flex-1" onclick="runBundling()" ${selected.length<2?'disabled':''}>🎁 Generate Bundle</button>
          <button class="btn btn-outline" onclick="resetBundle()">Reset</button>
        </div>
      </div>
    </div>

    <div>
      ${bundle?`
      <div class="card mb-16">
        <div class="section-title">Bundle Preview</div>
        <div class="bundle-preview">
          <div style="font-family:'DM Serif Display',serif;font-size:18px;color:var(--wood);margin-bottom:4px">${bundle.products.map(p=>escHtml(p.name)).join(' + ')}</div>
          <div class="text-sm text-muted mb-8">Target: ${bundle.targetAgeRange}</div>
          <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin:12px 0;flex-wrap:wrap">
            ${bundle.products.map(p=>`
              <div style="text-align:center">
                <div style="width:90px;height:90px;background:var(--surface);border-radius:10px;display:flex;align-items:center;justify-content:center;border:2px solid var(--wood-pale);overflow:hidden">
                  ${p.imageUrl?`<img src="${p.imageUrl}" style="width:100%;height:100%;object-fit:contain;padding:6px">`:`<span style="font-size:30px">📦</span>`}
                </div>
                <div style="font-size:10px;color:var(--text2);margin-top:4px;font-weight:600;max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(p.name)}</div>
              </div>
            `).join('<div style="font-size:20px;color:var(--wood-light);font-weight:700;align-self:center">+</div>')}
          </div>
          <div>
            <span style="text-decoration:line-through;color:var(--text3);font-size:13px">Rp${bundle.totalPrice.toLocaleString('id')}</span>
            <span style="margin-left:8px;font-size:18px;font-weight:700;color:var(--green)">Rp${bundle.bundlePrice.toLocaleString('id')}</span>
          </div>
          <span class="badge badge-green mt-8" style="margin-top:8px;display:inline-flex">Hemat ${bundle.discountPct}% · Rp${bundle.savings.toLocaleString('id')}</span>
        </div>
        <div class="flex gap-8 mt-12" style="flex-wrap:wrap">
          ${bundle.overlappingStages.map(s=>`<span class="badge badge-wood">Stage ${s}</span>`).join('')}
          ${bundle.skills.map(s=>`<span class="badge badge-blue">${SKILL_LABELS[s]||s}</span>`).join('')}
        </div>
        <div class="flex gap-8 mt-12">
          <button class="btn btn-outline btn-sm" onclick="saveBundleToSheets()">💾 Simpan ke Sheets</button>
        </div>
      </div>
      <div class="card mb-16">
        <div class="section-title">Auto Copywriting</div>
        ${renderCopyBlock(generateCopy(bundle,null,null))}
      </div>
      <div class="card">
        <div class="section-title">🎨 Bundle Design Export</div>
        <p class="text-sm text-muted mb-12">Generate desain siap download · 1200×630px · Foto produk dari Google Drive</p>
        <canvas id="bundleCanvas" style="display:none"></canvas>
        <div id="bundleDesignPreview" style="display:none;margin-bottom:12px">
          <img id="bundleDesignImg" style="width:100%;border-radius:var(--radius);border:1.5px solid var(--wood-pale)">
        </div>
        <div class="flex gap-8">
          <button class="btn btn-accent flex-1" onclick="generateBundleDesign()">✨ Generate Desain</button>
          <button class="btn btn-primary" id="downloadBtn" onclick="downloadDesign()" style="display:none">⬇ Download PNG</button>
        </div>
      </div>
      `:`<div class="card"><div class="empty-state"><div class="icon">🎁</div><p>Pilih 2–3 produk lalu klik<br><strong>Generate Bundle</strong></p></div></div>`}
    </div>
  </div>`;
}

// ── SETTINGS ──────────────────────────────────────────────────
function renderSettings() {
  return `
  <div class="page-header"><h2>Stage Settings</h2><p>Konfigurasi bobot stage dan koneksi sistem</p></div>
  <div class="card mb-20">
    <div class="section-title">Koneksi Google Apps Script</div>
    <div class="input-group">
      <label class="input-label">GAS Web App URL</label>
      <div class="flex gap-8">
        <input class="input flex-1" id="gasUrl" value="${CONFIG.GAS_URL!=='PASTE_URL_GOOGLE_APPS_SCRIPT_KAMU_DI_SINI'?CONFIG.GAS_URL:''}" placeholder="https://script.google.com/macros/s/...">
        <button class="btn btn-primary" onclick="saveGasUrl()">Simpan & Test</button>
      </div>
    </div>
    <div class="info-box">
      <div style="font-size:11.5px;color:var(--blue);line-height:1.7">
        <strong>Cara mendapatkan URL:</strong><br>
        1. Buka <a href="https://script.google.com" target="_blank" style="color:var(--blue)">script.google.com</a> → paste Code.gs<br>
        2. Deploy → New Deployment → Web App<br>
        3. Execute as: <strong>Me</strong> · Who has access: <strong>Anyone</strong><br>
        4. Copy URL dan paste di sini
      </div>
    </div>
  </div>
  <div class="card mb-20">
    <div class="section-title">Bobot Dimensi per Stage</div>
    <div style="overflow-x:auto">
    <table class="settings-table">
      <thead><tr><th>Stage</th><th>Usia</th>${SKILL_KEYS.map(k=>`<th>${SKILL_LABELS[k]}</th>`).join('')}</tr></thead>
      <tbody>${STAGES.map((s,si)=>`
        <tr>
          <td><span class="stage-pill stage-pill-sm">${s.id}</span></td>
          <td style="color:var(--text2);font-weight:600;white-space:nowrap;font-size:12px">${s.ageRange}</td>
          ${SKILL_KEYS.map(k=>`<td><input type="number" min="0" max="5" step="0.5" value="${s.weights[k]||0}" style="width:50px;padding:4px 6px;border:1px solid var(--wood-pale);border-radius:4px;font-family:Nunito;font-size:12px" onchange="STAGES[${si}].weights['${k}']=parseFloat(this.value)"></td>`).join('')}
        </tr>`).join('')}
      </tbody>
    </table>
    </div>
  </div>`;
}

// ── COPY BLOCK ────────────────────────────────────────────────
function renderCopyBlock(copy) {
  return `<div class="copy-section">
    <div class="copy-headline">${escHtml(copy.headline)}</div>
    <div class="copy-hook">${escHtml(copy.hook)}</div>
    <ul class="copy-benefits">${copy.benefits.map(b=>`<li>${escHtml(b)}</li>`).join('')}</ul>
    <div class="copy-cta">${escHtml(copy.cta)}</div>
  </div>`;
}

// ── CANVAS BUNDLE DESIGN ──────────────────────────────────────
function generateBundleDesign() {
  const bundle = state.bundleResult;
  if (!bundle) return;
  const canvas = document.getElementById('bundleCanvas');
  if (!canvas) return;
  const W=1200,H=630;
  canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext('2d');
  const T=CONFIG.THEME;

  // BG
  const grad=ctx.createLinearGradient(0,0,W,H);
  grad.addColorStop(0,T.bg1);grad.addColorStop(1,T.bg2);
  ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='rgba(196,154,108,0.09)';
  ctx.beginPath();ctx.arc(80,80,200,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(W-60,H-60,170,0,Math.PI*2);ctx.fill();

  // Brand
  ctx.fillStyle=T.primary;ctx.font='bold 20px sans-serif';ctx.fillText(`🌿 ${CONFIG.BRAND_NAME.toUpperCase()}`,50,50);

  // Copy
  const copy=generateCopy(bundle,null,null);
  ctx.fillStyle=T.text;ctx.font='bold 42px Georgia,serif';
  wrapTextCanvas(ctx,copy.headline,50,115,W*0.52,52);
  ctx.fillStyle=T.textMuted;ctx.font='20px sans-serif';
  wrapTextCanvas(ctx,copy.hook,50,228,W*0.48,30);
  ctx.fillStyle=T.green;ctx.font='bold 17px sans-serif';
  copy.benefits.slice(0,3).forEach((b,i)=>ctx.fillText(`✓ ${b}`,50,320+i*34));

  // Price
  const bx=50,by=H-140;
  ctx.fillStyle=T.primary;rrect(ctx,bx,by,280,62,30);ctx.fill();
  ctx.fillStyle='#fff';ctx.font='bold 25px sans-serif';
  ctx.fillText(`Rp${bundle.bundlePrice.toLocaleString('id')}`,bx+16,by+38);
  ctx.fillStyle=T.green;rrect(ctx,bx+290,by+8,148,46,23);ctx.fill();
  ctx.fillStyle='#fff';ctx.font='bold 14px sans-serif';
  ctx.fillText(`Hemat ${bundle.discountPct}%`,bx+305,by+34);
  ctx.fillStyle=T.accent;ctx.font='bold 16px sans-serif';ctx.fillText(copy.cta,50,H-44);

  // Product images (right)
  const prods=bundle.products.slice(0,3);
  const n=prods.length,boxSize=n===2?210:175;
  const imgAreaX=W*0.58,imgAreaW=W*0.40;
  const startX=imgAreaX+(imgAreaW-(n*boxSize+(n-1)*18))/2;
  const cy=H/2-40;

  Promise.all(prods.map((p,i)=>new Promise(res=>{
    if(p.imageUrl){
      const img=new Image();img.crossOrigin='anonymous';
      img.onload=()=>res({img,p,i});img.onerror=()=>res({img:null,p,i});
      img.src=p.imageUrl;
    } else res({img:null,p,i});
  }))).then(results=>{
    results.forEach(({img,p,i})=>{
      const x=startX+i*(boxSize+18),y=cy-boxSize/2;
      ctx.fillStyle='rgba(139,99,67,0.07)';rrect(ctx,x+5,y+5,boxSize,boxSize,14);ctx.fill();
      ctx.fillStyle='#FFF9F0';rrect(ctx,x,y,boxSize,boxSize,14);ctx.fill();
      ctx.strokeStyle='#E8D5BC';ctx.lineWidth=2;rrect(ctx,x,y,boxSize,boxSize,14);ctx.stroke();
      const pad=16;
      if(img) ctx.drawImage(img,x+pad,y+pad,boxSize-pad*2,boxSize-pad*2-30);
      else{ctx.fillStyle='#C49A6C';ctx.font=`bold ${Math.round(boxSize*.28)}px sans-serif`;ctx.textAlign='center';ctx.fillText('📦',x+boxSize/2,y+boxSize/2+8);ctx.textAlign='left';}
      ctx.fillStyle=T.text;ctx.font='bold 12px sans-serif';ctx.textAlign='center';
      wrapTextCanvasC(ctx,p.name,x+boxSize/2,y+boxSize-22,boxSize-12,14);ctx.textAlign='left';
    });
    for(let i=0;i<n-1;i++){
      const px=startX+(i+1)*(boxSize+18)-9;
      ctx.fillStyle='#C49A6C';ctx.font='bold 26px sans-serif';ctx.textAlign='center';
      ctx.fillText('+',px,cy+8);ctx.textAlign='left';
    }
    const url=canvas.toDataURL('image/png');
    const pv=document.getElementById('bundleDesignPreview');
    const di=document.getElementById('bundleDesignImg');
    const db=document.getElementById('downloadBtn');
    if(pv&&di&&db){di.src=url;pv.style.display='block';db.style.display='block';state.lastBundleDesign=url;}
    showNotif('Desain bundle siap! ✨');
  });
}

function wrapTextCanvas(ctx,text,x,y,maxW,lh){
  const ws=text.split(' ');let line='',cy=y;
  ws.forEach(w=>{const t=line+w+' ';if(ctx.measureText(t).width>maxW&&line){ctx.fillText(line,x,cy);line=w+' ';cy+=lh;}else line=t;});
  ctx.fillText(line,x,cy);
}
function wrapTextCanvasC(ctx,text,x,y,maxW,lh){
  const ws=text.split(' ');let line='',cy=y;
  ws.forEach(w=>{const t=line+w+' ';if(ctx.measureText(t).width>maxW&&line){ctx.fillText(line.trim(),x,cy);line=w+' ';cy+=lh;}else line=t;});
  ctx.fillText(line.trim(),x,cy);
}
function rrect(ctx,x,y,w,h,r){
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
}

function escHtml(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
