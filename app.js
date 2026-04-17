// ============================================================
// APP.JS — State, navigation, actions
// ============================================================

let state = {
  currentPage: 'dashboard',
  products: [],
  driveImages: [],
  bundles: [],
  scoringForm: { productName:'', productDesc:'', productPrice:'' },
  scoringResult: null,
  scoringAiData: null,
  isAnalyzing: false,
  selectedBundleProducts: [],
  bundleResult: null,
  lastBundleDesign: null,
  chart: null,
  recState: { mode:null, ageInput:'', needKeys:[], results:[], bundleResult:null, bundleDesign:null },
  recSelected: [],
  marketingState: { activeTab:'whatsapp' },
};

// ── NAVIGATION ────────────────────────────────────────────────
function navigate(page) {
  if (window._navPatch) window._navPatch(page);
  state.currentPage = page;
  const pages = ['dashboard','scoring','products','recommend','bundling','marketing','settings'];
  document.querySelectorAll('.nav-item').forEach((el,i)=>{
    el.classList.toggle('active', pages[i]===page);
  });
  renderPage();
}

function renderPage() {
  const main = document.getElementById('main-content');
  switch(state.currentPage) {
    case 'dashboard':  main.innerHTML = renderDashboard(); break;
    case 'scoring':    main.innerHTML = renderScoring(); break;
    case 'products':   main.innerHTML = renderProducts(); break;
    case 'recommend':  main.innerHTML = renderRecommend(); break;
    case 'bundling':   main.innerHTML = renderBundling(); break;
    case 'marketing':  main.innerHTML = renderMarketing(); break;
    case 'settings':   main.innerHTML = renderSettings(); break;
  }
  afterRender();
}

// ── LOAD FROM SHEETS ──────────────────────────────────────────
async function loadAll() {
  showNotif('🔄 Memuat data dari Sheets...');
  try {
    const [prodRes, imgRes] = await Promise.all([API.getProducts(), API.getImages()]);
    state.products = prodRes.products || [];
    state.driveImages = imgRes.images || [];
    renderPage();
    showNotif(`✓ ${state.products.length} produk dimuat`);
  } catch(e) {
    showNotif('Gagal memuat: ' + e.message);
  }
}

// ── AI SCORING ─────────────────────────────────────────────────
async function runAIScoring() {
  const f = state.scoringForm;
  if (!f.productName?.trim()) { showNotif('Masukkan nama produk'); return; }
  state.isAnalyzing = true;
  state.scoringResult = null;
  state.scoringAiData = null;
  renderPage();
  try {
    const ai = await API.aiScore(f.productName, f.productDesc||'');
    state.scoringAiData = ai;
    state.scoringResult = runScoringEngine(ai.scores);
    state.isAnalyzing = false;
    renderPage();
    showNotif('Analisis AI selesai! ✓');
  } catch(e) {
    state.isAnalyzing = false;
    showNotif('Gagal: ' + e.message);
    renderPage();
  }
}

// ── SAVE PRODUCT ──────────────────────────────────────────────
async function saveCurrentProduct() {
  const f = state.scoringForm;
  const r = state.scoringResult;
  const ai = state.scoringAiData;
  if (!r||!ai) return;
  const product = {
    name: f.productName||'Produk Baru',
    price: parseInt(f.productPrice)||0,
    stages: [r.primaryStage.id,...r.secondaryStages.map(s=>s.id)],
    skills: SKILL_KEYS.filter(k=>(parseInt(ai.scores[k])||0)>=65),
    primaryStage: r.primaryStage.id,
    ageRange: r.ageRange,
    stageRange: r.stageRange,
    confidenceScore: r.confidenceScore,
    aiInsight: ai.overallInsight||'',
    aiCategory: ai.productCategory||'',
    ...SKILL_KEYS.reduce((o,k)=>({...o,[k]:ai.scores[k]||0}),{}),
  };
  showNotif('💾 Menyimpan...');
  try {
    const res = await API.saveProduct(product);
    product.id = res.id;
    state.products.push(product);
    state.scoringForm = { productName:'', productDesc:'', productPrice:'' };
    state.scoringResult = null;
    state.scoringAiData = null;
    showNotif(`"${product.name}" tersimpan ✓`);
    navigate('products');
  } catch(e) { showNotif('Gagal simpan: ' + e.message); }
}

function reScopeProduct(id) {
  const p = state.products.find(p=>String(p.id)===String(id));
  if (!p) return;
  state.scoringForm = { productName:p.name, productDesc:'', productPrice:String(p.price||'') };
  state.scoringResult = null;
  state.scoringAiData = null;
  navigate('scoring');
}

function confirmDelete(id, name) {
  showModal(`Hapus produk "<strong>${escHtml(name)}</strong>"?`, async () => {
    try {
      await API.deleteProduct(id);
      state.products = state.products.filter(p=>String(p.id)!==String(id));
      renderPage();
      showNotif('Produk dihapus ✓');
    } catch(e) { showNotif('Gagal hapus: ' + e.message); }
  });
}

async function handleImgUpload(e) {
  const files = Array.from(e.target.files);
  if (!files.length) return;
  showNotif(`☁️ Upload ${files.length} foto...`);
  try {
    for (const file of files) {
      const b64 = await fileToBase64(file);
      const res = await API.uploadImage(file.name, b64, file.type);
      if (res.imageUrl) state.driveImages.push({ name:file.name, imageUrl:res.imageUrl, fileId:res.fileId });
    }
    renderPage();
    showNotif(`✓ ${files.length} foto di Drive`);
  } catch(e) { showNotif('Gagal upload: ' + e.message); }
  e.target.value = '';
}

function showAssignImg(productId, productName) {
  if (!state.driveImages.length) { showNotif('Upload foto terlebih dahulu!'); return; }
  const items = state.driveImages.map(img=>`
    <div class="selectable-item mb-8" onclick="doAssignImg('${productId}','${img.imageUrl}')">
      <img src="${img.imageUrl}" style="width:44px;height:44px;object-fit:contain;border-radius:6px;border:1px solid var(--wood-pale);background:var(--bg)">
      <div style="font-size:12.5px;font-weight:600;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(img.name)}</div>
    </div>`).join('');
  showModal(`<div style="font-size:14px;font-weight:700;color:var(--wood);margin-bottom:12px">Pilih foto untuk "${escHtml(productName)}"</div><div style="max-height:280px;overflow-y:auto">${items}</div>`, null, true);
}

async function doAssignImg(productId, imageUrl) {
  closeModal();
  try {
    await API.assignImage(productId, imageUrl);
    const p = state.products.find(p=>String(p.id)===String(productId));
    if (p) p.imageUrl = imageUrl;
    renderPage();
    showNotif('Foto di-assign ✓');
  } catch(e) { showNotif('Gagal: ' + e.message); }
}

function toggleBundle(id) {
  const idx = state.selectedBundleProducts.findIndex(p=>String(p.id)===String(id));
  if (idx>=0) { state.selectedBundleProducts.splice(idx,1); }
  else if (state.selectedBundleProducts.length<3) {
    const p = state.products.find(p=>String(p.id)===String(id));
    if (p) state.selectedBundleProducts.push(p);
  } else { showNotif('Maksimal 3 produk'); return; }
  renderPage();
}

function runBundling() {
  if (state.selectedBundleProducts.length<2) return;
  state.bundleResult = buildBundle(state.selectedBundleProducts);
  renderPage();
  showNotif('Bundle dibuat! 🎁');
}

function resetBundle() {
  state.selectedBundleProducts = [];
  state.bundleResult = null;
  renderPage();
}

async function saveBundleToSheets() {
  const b = state.bundleResult; if(!b) return;
  const copy = generateCopy(b,null,null);
  try {
    await API.saveBundle({ productIds:b.products.map(p=>p.id), productNames:b.products.map(p=>p.name).join(', '), totalPrice:b.totalPrice, bundlePrice:b.bundlePrice, discountPct:b.discountPct, savings:b.savings, overlappingStages:b.overlappingStages, skills:b.skills, headline:copy.headline, hook:copy.hook, cta:copy.cta });
    showNotif('Bundle tersimpan ke Sheets ✓');
  } catch(e) { showNotif('Gagal: ' + e.message); }
}

function downloadDesign() {
  if (!state.lastBundleDesign) return;
  const a = document.createElement('a');
  a.href = state.lastBundleDesign;
  a.download = `gatari-bundle-${Date.now()}.png`;
  a.click();
  showNotif('Download berhasil! 🎉');
}

async function saveGasUrl() {
  const url = document.getElementById('gasUrl')?.value?.trim();
  if (!url) { showNotif('URL tidak boleh kosong'); return; }
  CONFIG.GAS_URL = url;
  localStorage.setItem('gatari_gas_url', url);
  showNotif('🔄 Testing...');
  const ok = await API.checkConnection();
  if (ok) { showNotif('✅ Terhubung!'); await loadAll(); }
  else { showNotif('❌ Gagal konek. Cek URL GAS.'); }
}

// ── MODAL ─────────────────────────────────────────────────────
function showModal(html, onConfirm, noButtons=false) {
  const box=document.getElementById('modalBox'), overlay=document.getElementById('modalOverlay');
  box.innerHTML=`<div style="padding:20px"><div style="font-size:14px;color:var(--text2);line-height:1.6;margin-bottom:${noButtons?0:18}px">${html}</div>${!noButtons?`<div class="flex gap-8 justify-end"><button class="btn btn-outline btn-sm" onclick="closeModal()">Batal</button><button class="btn btn-primary btn-sm" onclick="modalConfirm()">Ya, Hapus</button></div>`:''}</div>`;
  overlay.style.display='flex';
  window._modalConfirm=onConfirm;
}
function modalConfirm() { closeModal(); if(window._modalConfirm) window._modalConfirm(); }
function closeModal() { document.getElementById('modalOverlay').style.display='none'; }

function showNotif(msg) {
  const el=document.getElementById('notif');
  el.textContent=msg; el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),3000);
}

function afterRender() {
  if (state.currentPage==='dashboard') {
    const ctx=document.getElementById('dashChart'); if(!ctx) return;
    if(state.chart){state.chart.destroy();state.chart=null;}
    const dist={};STAGES.forEach(s=>dist[s.id]=0);
    state.products.forEach(p=>{
      if(p.primaryStage) dist[p.primaryStage]=(dist[p.primaryStage]||0)+1;
      else (p.stages||[]).forEach(s=>dist[s]=(dist[s]||0)+0.3);
    });
    state.chart=new Chart(ctx,{type:'bar',data:{labels:STAGES.map(s=>s.id),datasets:[{label:'Produk',data:STAGES.map(s=>Math.round((dist[s.id]||0)*10)/10),backgroundColor:'rgba(139,99,67,0.7)',borderColor:'#8B6343',borderWidth:1.5,borderRadius:6}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,grid:{color:'rgba(139,99,67,0.1)'},ticks:{color:'#9C7B63',font:{size:11}}},x:{grid:{display:false},ticks:{color:'#6B5043',font:{size:12,weight:'600'}}}}}});
  }
}

(async function init() {
  const savedUrl = localStorage.getItem('gatari_gas_url');
  if (savedUrl) CONFIG.GAS_URL = savedUrl;
  renderPage();
  const ok = await API.checkConnection();
  if (ok) await loadAll();
})();
