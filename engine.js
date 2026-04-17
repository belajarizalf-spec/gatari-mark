// ============================================================
// ENGINE.JS — Scoring & bundling logic
// ============================================================

const STAGES = [
  {id:'1A',label:'1A',ageRange:'0–6 bulan',months:[0,6],weights:{sensorik:2,motorikKasar:2,motorikHalus:1,kognitif:1,bahasaSosial:1,kemandirian:0.5}},
  {id:'1B',label:'1B',ageRange:'6–12 bulan',months:[6,12],weights:{sensorik:2,motorikKasar:2,motorikHalus:1.5,kognitif:1.5,bahasaSosial:1,kemandirian:0.5}},
  {id:'2A',label:'2A',ageRange:'12–18 bulan',months:[12,18],weights:{sensorik:1.5,motorikKasar:2,motorikHalus:2,kognitif:1.5,bahasaSosial:1.5,kemandirian:1}},
  {id:'2B',label:'2B',ageRange:'18–24 bulan',months:[18,24],weights:{sensorik:1,motorikKasar:1.5,motorikHalus:2,kognitif:2,bahasaSosial:2,kemandirian:1.5}},
  {id:'3A',label:'3A',ageRange:'24–36 bulan',months:[24,36],weights:{sensorik:1,motorikKasar:1.5,motorikHalus:2,kognitif:2,bahasaSosial:2,kemandirian:2}},
  {id:'3B',label:'3B',ageRange:'36–48 bulan',months:[36,48],weights:{sensorik:1,motorikKasar:1,motorikHalus:2,kognitif:2.5,bahasaSosial:2,kemandirian:2}},
  {id:'4A',label:'4A',ageRange:'48–60 bulan',months:[48,60],weights:{sensorik:0.5,motorikKasar:1,motorikHalus:2,kognitif:2.5,bahasaSosial:2.5,kemandirian:2.5}},
  {id:'4B',label:'4B',ageRange:'60–72 bulan',months:[60,72],weights:{sensorik:0.5,motorikKasar:1,motorikHalus:1.5,kognitif:2.5,bahasaSosial:2.5,kemandirian:3}},
];

const SKILL_KEYS   = ['sensorik','motorikKasar','motorikHalus','kognitif','bahasaSosial','kemandirian'];
const SKILL_LABELS = {sensorik:'Sensorik',motorikKasar:'Motorik Kasar',motorikHalus:'Motorik Halus',kognitif:'Kognitif',bahasaSosial:'Bahasa & Sosial',kemandirian:'Kemandirian'};
const SKILL_ICONS  = {sensorik:'👁️',motorikKasar:'🦵',motorikHalus:'✋',kognitif:'🧠',bahasaSosial:'💬',kemandirian:'⭐'};

function calcSimilarity(scores, stage) {
  const w = stage.weights;
  const totalW = SKILL_KEYS.reduce((a,k)=>a+(w[k]||0),0);
  let sim = 0;
  SKILL_KEYS.forEach(k=>{
    const wk = w[k]||0;
    const s = (scores[k]||0)/100;
    sim += wk*(1-Math.abs(s-0.75));
  });
  return Math.max(0,Math.min(100,(sim/totalW)*100));
}

function runScoringEngine(scores) {
  const results = STAGES.map(stage=>({stage,similarity:calcSimilarity(scores,stage)}))
    .sort((a,b)=>b.similarity-a.similarity);
  const top3 = results.slice(0,3);
  const allMonths = top3.flatMap(r=>r.stage.months);
  return {
    primaryStage: top3[0].stage,
    secondaryStages: top3.slice(1).map(r=>r.stage),
    stageRange: `${top3[0].stage.id}–${top3[top3.length-1].stage.id}`,
    ageRange: ageToLabel(Math.min(...allMonths),Math.max(...allMonths)),
    confidenceScore: Math.round(top3[0].similarity),
    allScores: results,
    rawScores: scores,
  };
}

function ageToLabel(min,max) {
  const t=m=>m>=12?`${Math.round(m/12*10)/10} tahun`:`${m} bulan`;
  return `${t(min)} – ${t(max)}`;
}

function buildBundle(selectedProducts) {
  if (selectedProducts.length < 2) return null;
  const stageCount={};
  selectedProducts.forEach(p=>{
    (p.stages||[]).forEach(s=>{stageCount[s]=(stageCount[s]||0)+1;});
  });
  const overlapping = Object.entries(stageCount).filter(([,c])=>c>1).map(([s])=>s);
  const skills = [...new Set(selectedProducts.flatMap(p=>p.skills||[]))];
  const total = selectedProducts.reduce((a,p)=>a+(parseInt(p.price)||0),0);
  const disc = selectedProducts.length===2?10:15;
  const bundlePrice = Math.round(total*(1-disc/100));
  const firstStage = STAGES.find(s=>s.id===overlapping[0]);
  return {
    products: selectedProducts,
    overlappingStages: overlapping,
    skills,
    totalPrice: total,
    bundlePrice,
    discountPct: disc,
    savings: total-bundlePrice,
    targetAgeRange: firstStage?.ageRange||'Multi-stage',
  };
}

function generateCopy(bundle, stage, productName) {
  const name = bundle ? bundle.products.map(p=>p.name).join(' + ') : (productName||'Produk Ini');
  const ageRange = bundle ? bundle.targetAgeRange : (stage?.ageRange||'');
  const skills = bundle ? bundle.skills : [];
  const disc = bundle?.discountPct||0;

  const headlines = [
    `Siapkan Si Kecil untuk Dunia dengan ${bundle?'Bundle Spesial':name}`,
    `Tumbuh Lebih Optimal: ${bundle?'Set Lengkap':name} untuk ${ageRange}`,
    `Dukung Tumbuh Kembang dengan Mainan Edukatif Premium`,
    `Hadirkan Masa Depan Cerah Mulai dari Sekarang`,
  ];
  const hooks = [
    `Setiap momen bermain adalah momen belajar. Jangan biarkan berlalu begitu saja. 💛`,
    `Ibu dan Ayah, masa emas tumbuh kembang si kecil hanya terjadi sekali.`,
    `Ribuan orang tua sudah merasakan manfaatnya. Kini giliran buah hati Anda.`,
    `Permainan yang tepat = stimulasi yang optimal = anak yang bahagia & cerdas.`,
  ];
  const benefits = bundle
    ? [`Stimulasi ${skills.slice(0,2).map(s=>SKILL_LABELS[s]||s).join(' & ')} optimal`,`Dirancang oleh ahli perkembangan anak`,`Bahan aman & ramah lingkungan`,`Cocok usia ${ageRange}`]
    : [`Merangsang perkembangan multidimensi anak`,`Desain Montessori aman & menarik`,`Bahan premium, aman untuk si kecil`,`Cocok usia ${ageRange}`];
  const cta = bundle
    ? `Ambil Bundle Hemat ${disc}% Sekarang →`
    : `Pesan Sekarang & Stimulasi Optimal →`;

  const pick = arr=>arr[Math.floor(Math.random()*arr.length)];
  return { headline:pick(headlines), hook:pick(hooks), benefits, cta };
}
