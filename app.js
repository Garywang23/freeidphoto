/* AI 证件照 · 前端逻辑 v0
 * - 上传 → 抠图(本地 MediaPipe 或 remove.bg via Worker)→ 按规格裁切 → 换背景 → 下载
 * - 隐私优先:默认本地处理,不上传服务器
 */

// ---------- 规格表 (mm @ 300dpi) ----------
// 证件照尺寸大全 · 中国常用 30 种规格(单位 mm,均按 300dpi 输出)
const SIZE_CATEGORIES = ['常用','通用','证件','签证','考试'];
const SIZES = [
  // —— 通用一/二寸系列 ——
  { id:'one-inch',     name:'一寸',     w_mm:25, h_mm:35, cat:'通用', desc:'最常用,毕业证、工作证、普通简历照', bg:'白/蓝/红' },
  { id:'small-one',    name:'小一寸',   w_mm:22, h_mm:32, cat:'通用', desc:'驾驶证、半身像、部分员工证', bg:'白' },
  { id:'big-one',      name:'大一寸',   w_mm:33, h_mm:48, cat:'通用', desc:'港澳通行证、台胞证、护照同尺寸', bg:'白' },
  { id:'two-inch',     name:'二寸',     w_mm:35, h_mm:49, cat:'通用', desc:'国内最常用,考试报名、简历、入职', bg:'白/蓝/红' },
  { id:'small-two',    name:'小二寸',   w_mm:35, h_mm:45, cat:'通用', desc:'护照、签证常用,毕业证、教师证', bg:'白' },
  { id:'big-two',      name:'大二寸',   w_mm:35, h_mm:53, cat:'通用', desc:'学位证、研究生录取通知书', bg:'白/蓝' },

  // —— 证件类 ——
  { id:'id-card',      name:'身份证',   w_mm:26, h_mm:32, cat:'证件', desc:'身份证、社保卡、居住证、学生证(同尺寸)', bg:'白' },
  { id:'passport-cn',  name:'中国护照', w_mm:33, h_mm:48, cat:'证件', desc:'中国普通护照、外交/公务护照', bg:'白' },
  { id:'hkmacau',      name:'港澳通行证',w_mm:33, h_mm:48, cat:'证件', desc:'往来港澳通行证(同护照尺寸)', bg:'白' },
  { id:'taiwan',       name:'台湾通行证',w_mm:33, h_mm:48, cat:'证件', desc:'大陆居民往来台湾通行证', bg:'白' },
  { id:'driver',       name:'驾驶证',   w_mm:22, h_mm:32, cat:'证件', desc:'机动车驾驶证,白底', bg:'白' },
  { id:'marriage',     name:'结婚证',   w_mm:53, h_mm:35, cat:'证件', desc:'结婚证(横版双人合影,红底)', bg:'红' },

  // —— 签证类 ——
  { id:'visa-us',      name:'美国签证', w_mm:51, h_mm:51, cat:'签证', desc:'美签 / 美国护照(2"×2" 正方形)', bg:'白' },
  { id:'visa-jp',      name:'日本签证', w_mm:45, h_mm:45, cat:'签证', desc:'日本签证(近 6 个月内拍摄)', bg:'白' },
  { id:'visa-kr',      name:'韩国签证', w_mm:35, h_mm:45, cat:'签证', desc:'韩国签证、留学签', bg:'白' },
  { id:'visa-schengen',name:'申根签证', w_mm:35, h_mm:45, cat:'签证', desc:'德/法/意/西/荷等申根国通用', bg:'白' },
  { id:'visa-uk',      name:'英国签证', w_mm:35, h_mm:45, cat:'签证', desc:'英国签证、留学签', bg:'白' },
  { id:'visa-ca',      name:'加拿大签证',w_mm:50, h_mm:70, cat:'签证', desc:'加拿大签证(尺寸较大)', bg:'白' },
  { id:'visa-au',      name:'澳大利亚签证',w_mm:35, h_mm:45, cat:'签证', desc:'澳洲签证、留学签', bg:'白' },
  { id:'visa-nz',      name:'新西兰签证',w_mm:35, h_mm:45, cat:'签证', desc:'新西兰签证、工签', bg:'白' },

  // —— 考试 / 报名 ——
  { id:'exam-mandarin',name:'普通话考试',w_mm:35, h_mm:49, cat:'考试', desc:'普通话水平测试报名', bg:'白/蓝' },
  { id:'exam-ncre',    name:'计算机等级',w_mm:33, h_mm:48, cat:'考试', desc:'全国计算机等级考试 NCRE', bg:'白/蓝' },
  { id:'exam-cet',     name:'英语四六级',w_mm:35, h_mm:49, cat:'考试', desc:'CET-4 / CET-6 报名', bg:'白/蓝' },
  { id:'exam-gwy',     name:'公务员考试',w_mm:35, h_mm:49, cat:'考试', desc:'国考 / 省考报名', bg:'白/红' },
  { id:'exam-teacher', name:'教师资格证',w_mm:35, h_mm:45, cat:'考试', desc:'中小学教师资格考试', bg:'白/蓝' },
  { id:'exam-postgrad',name:'研究生报名',w_mm:35, h_mm:45, cat:'考试', desc:'考研报名(硕士/博士)', bg:'白/蓝' },
  { id:'exam-gaokao',  name:'高考报名', w_mm:35, h_mm:49, cat:'考试', desc:'普通高校招生考试报名', bg:'白/蓝' },
  { id:'exam-ielts',   name:'雅思 IELTS', w_mm:35, h_mm:45, cat:'考试', desc:'雅思考试报名照片', bg:'白' },
  { id:'exam-toefl',   name:'托福 TOEFL', w_mm:51, h_mm:51, cat:'考试', desc:'托福考试报名照片(2"×2")', bg:'白' },
  { id:'exam-jlpt',    name:'日语等级',   w_mm:35, h_mm:45, cat:'考试', desc:'JLPT 日语能力测试', bg:'白' },
];

// 常用 = 前 6 个最高频
const COMMON_IDS = ['two-inch','one-inch','small-two','id-card','passport-cn','visa-us'];

// 工具:取规格 px 信息
function sizePx(s){ return mmToPxAt300(s.w_mm, s.h_mm); }
function mmToPxAt300(w,h){ return { w: Math.round(w/25.4*300), h: Math.round(h/25.4*300) }; }

// ---------- 背景色 ----------
const BG_COLORS = [
  { id: 'white',  name: '白色',    css: '#ffffff' },
  { id: 'blue',   name: '蓝色',    css: '#438edb' },
  { id: 'red',    name: '红色',    css: '#d52b1e' },
  { id: 'lblue',  name: '浅蓝',    css: '#c6e0ff' },
  { id: 'gray',   name: '灰色',    css: '#b8b8b8' },
  { id: 'gradient', name: '渐变蓝', css: 'linear-gradient(180deg,#9cc8ff,#4a8de0)' },
];

// ---------- 状态 ----------
const state = {
  sourceBitmap: null,      // 原图 ImageBitmap
  cutoutCanvas: null,      // 抠完背景的 RGBA canvas(透明背景)
  size: SIZES.find(s=>s.id==='two-inch') || SIZES[0],  // 默认二寸(最常用)
  bg: BG_COLORS[0],
  engine: 'mediapipe',     // 'mediapipe' | 'onnx'
  quality: 95,
  format: 'jpeg',
};

// ---------- DOM ----------
const $ = sel => document.querySelector(sel);
const stepUpload = $('#step-upload');
const stepEdit   = $('#step-edit');
const dropZone   = $('#drop');
const fileInput  = $('#file');
const pickBtn    = $('#pickBtn');
const previewCv  = $('#canvas');
const loader     = $('#loader');
const loaderText = $('#loaderText');
const resetBtn   = $('#resetBtn');
const downloadBtn= $('#downloadBtn');
const sizeChips  = $('#sizeChips');
const bgChips    = $('#bgChips');
const sizeInfo   = $('#sizeInfo');
const qualityEl  = $('#quality');
const qualityVal = $('#qualityVal');
const formatEl   = $('#format');
const paperOrient = $('#paperOrient');
const paperGap    = $('#paperGap');
const paperInfo   = $('#paperInfo');
const paperPreset = $('#paperPreset');
const printCanvas = $('#printCanvas');
const printPreviewWrap = $('#printPreviewWrap');
const previewPrintBtn  = $('#previewPrintBtn');
const downloadPrintBtn = $('#downloadPrintBtn');

// 行业标准排版(6 寸纸,竖向)
const STANDARD_LAYOUTS = {
  'one-inch':    { cols: 4, rows: 2, orient: 'portrait', label: '一寸八连(8张)' },
  'small-one':   { cols: 4, rows: 2, orient: 'portrait', label: '小一寸八连(8张)' },
  'two-inch':    { cols: 2, rows: 2, orient: 'portrait', label: '二寸四连(4张)' },
  'small-two':   { cols: 2, rows: 2, orient: 'portrait', label: '小二寸四连(4张)' },
  'big-two':     { cols: 2, rows: 2, orient: 'portrait', label: '大二寸四连(4张)' },
  'big-one':     { cols: 2, rows: 3, orient: 'portrait', label: '大一寸六连(6张)' },
  'id-card':     { cols: 5, rows: 3, orient: 'portrait', label: '身份证十五连(15张)' },
  'passport-cn': { cols: 2, rows: 3, orient: 'portrait', label: '护照六连(6张)' },
  'driver':      { cols: 4, rows: 3, orient: 'portrait', label: '驾驶证十二连(12张)' },
  'visa-us':     { cols: 2, rows: 1, orient: 'portrait', label: '美签两连(2张)' },
};

// ---------- 初始化 chip ----------
let activeCategory = '常用';

function buildChips(){
  // —— 分类 tab ——
  let catHtml = SIZE_CATEGORIES.map(c =>
    `<button class="cat-tab ${c===activeCategory?'active':''}" data-cat="${c}">${c}</button>`
  ).join('');
  sizeChips.innerHTML = `<div class="cat-tabs">${catHtml}</div><div class="size-chip-row" id="sizeChipRow"></div>`;

  renderSizeChips();

  // —— 背景色 chips ——
  bgChips.innerHTML = BG_COLORS.map(b =>
    `<button class="chip ${b.id===state.bg.id?'active':''}" data-id="${b.id}">
       <span class="dot" style="background:${b.css}"></span>${b.name}
     </button>`
  ).join('');
  bgChips.querySelectorAll('.chip').forEach(el=>{
    el.onclick = ()=>{
      state.bg = BG_COLORS.find(b=>b.id===el.dataset.id);
      bgChips.querySelectorAll('.chip').forEach(x=>x.classList.toggle('active',x===el));
      renderPreview();
    };
  });

  // —— 分类 tab 切换 ——
  sizeChips.querySelectorAll('.cat-tab').forEach(el=>{
    el.onclick = ()=>{
      activeCategory = el.dataset.cat;
      sizeChips.querySelectorAll('.cat-tab').forEach(x=>x.classList.toggle('active',x===el));
      renderSizeChips();
    };
  });
}

function renderSizeChips(){
  const list = activeCategory==='常用'
    ? COMMON_IDS.map(id=>SIZES.find(s=>s.id===id)).filter(Boolean)
    : SIZES.filter(s=>s.cat===activeCategory);
  const row = document.getElementById('sizeChipRow');
  row.innerHTML = list.map(s =>
    `<button class="chip ${s.id===state.size.id?'active':''}" data-id="${s.id}" title="${s.desc}">${s.name}</button>`
  ).join('');
  row.querySelectorAll('.chip').forEach(el=>{
    el.onclick = ()=>{
      state.size = SIZES.find(s=>s.id===el.dataset.id);
      row.querySelectorAll('.chip').forEach(x=>x.classList.toggle('active',x===el));
      updateSizeInfo();
      renderPreview();
    };
  });
  updateSizeInfo();
}

function updateSizeInfo(){
  const s = state.size;
  const px = sizePx(s);
  sizeInfo.innerHTML =
    `<strong>${s.name}</strong> · ${s.w_mm}×${s.h_mm}mm · ${px.w}×${px.h}px @ 300dpi<br>` +
    `<span style="color:var(--muted)">${s.desc}</span><br>` +
    `<span style="color:var(--muted);font-size:12px">推荐底色:${s.bg}</span>`;
}

// ---------- 上传 ----------
function bindUpload(){
  pickBtn.onclick = e=>{ e.stopPropagation(); fileInput.click(); };
  dropZone.onclick = ()=> fileInput.click();
  fileInput.onchange = e=> handleFile(e.target.files[0]);
  ;['dragenter','dragover'].forEach(ev=>dropZone.addEventListener(ev,e=>{e.preventDefault();dropZone.classList.add('dragover')}));
  ;['dragleave','drop'].forEach(ev=>dropZone.addEventListener(ev,e=>{e.preventDefault();dropZone.classList.remove('dragover')}));
  dropZone.addEventListener('drop',e=>{
    const f=e.dataTransfer.files[0]; if(f) handleFile(f);
  });
  resetBtn.onclick = ()=>{
    state.sourceBitmap = null; state.cutoutCanvas = null;
    stepEdit.classList.add('hidden'); stepUpload.classList.remove('hidden');
    fileInput.value='';
  };
}

async function handleFile(file){
  if(!file) return;
  if(file.size > 8*1024*1024){ alert('文件超过 8MB,请压缩后再试'); return; }
  if(!file.type.startsWith('image/')){ alert('请选择图片文件'); return; }
  const bmp = await createImageBitmap(file);
  state.sourceBitmap = bmp;
  state.cutoutCanvas = null;
  stepUpload.classList.add('hidden');
  stepEdit.classList.remove('hidden');
  renderPreview();
}

// ---------- 抠图 ----------
async function runCutout(){
  const tip = state.engine==='onnx' ? 'ONNX 高质量抠图中(首次需下载 ~40MB 模型,稍候)…' : '本地 AI 抠图中…';
  showLoader(true, tip);
  try{
    if(state.engine==='onnx'){
      state.cutoutCanvas = await cutoutViaOnnx(state.sourceBitmap);
    }else{
      state.cutoutCanvas = await cutoutViaMediaPipe(state.sourceBitmap);
    }
    downloadBtn.disabled = false;
  }catch(err){
    console.error(err);
    alert('抠图失败:'+(err.message||err));
    downloadBtn.disabled = true;
  }finally{
    showLoader(false);
  }
}

// 本地:MediaPipe Selfie Segmentation
let mpInstance = null;
async function cutoutViaMediaPipe(bitmap){
  // 把 bitmap 画到一个临时 canvas
  const src = document.createElement('canvas');
  src.width = bitmap.width; src.height = bitmap.height;
  src.getContext('2d').drawImage(bitmap,0,0);

  if(!mpInstance){
    mpInstance = new SelfieSegmentation({
      locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${f}`
    });
    mpInstance.setOptions({ modelSelection: 1 });
    await mpInstance.initialize();
  }

  return new Promise((resolve)=>{
    mpInstance.onResults(results=>{
      const out = document.createElement('canvas');
      out.width = bitmap.width; out.height = bitmap.height;
      const ctx = out.getContext('2d');
      // 先画原图
      ctx.drawImage(results.image,0,0,out.width,out.height);
      // 用 mask 当作 destination-in,留下人像
      ctx.globalCompositeOperation='destination-in';
      ctx.drawImage(results.segmentationMask,0,0,out.width,out.height);
      ctx.globalCompositeOperation='source-over';
      resolve(out);
    });
    mpInstance.send({ image: src });
  });
}

// 高质量:@imgly/background-removal(浏览器端 ONNX,首次会下载 ~40MB 模型,之后缓存)
// 多 CDN 备份,提升国内访问成功率
// 版本必须和 setup-models.ps1 里的 @imgly/background-removal-data 版本对齐
const ONNX_CDN_URLS = [
  'https://esm.sh/@imgly/background-removal@1.4.5',
  'https://fastly.jsdelivr.net/npm/@imgly/background-removal@1.4.5/+esm',
  'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.4.5/+esm',
  'https://gcore.jsdelivr.net/npm/@imgly/background-removal@1.4.5/+esm',
];
let imglyMod = null;
async function cutoutViaOnnx(bitmap){
  if(!imglyMod){
    let lastErr = null;
    for(const url of ONNX_CDN_URLS){
      try{
        loaderText.textContent = `加载模型库:${new URL(url).host}…`;
        imglyMod = await import(url);
        break;
      }catch(e){ lastErr = e; console.warn('CDN 失败,尝试下一个:', url, e); }
    }
    if(!imglyMod) throw new Error('所有 CDN 都加载失败,请检查网络。最后错误:'+(lastErr&&lastErr.message||lastErr));
  }
  const removeBackground = imglyMod.removeBackground || imglyMod.default;
  if(typeof removeBackground !== 'function'){
    throw new Error('background-removal 模块加载异常,请刷新重试');
  }
  // 把 bitmap 画到 canvas,导出 Blob 包装成 File 给 imgly
  const tmp = document.createElement('canvas');
  tmp.width = bitmap.width; tmp.height = bitmap.height;
  tmp.getContext('2d').drawImage(bitmap,0,0);
  const srcBlob = await new Promise(r=>tmp.toBlob(r,'image/png'));
  const srcFile = new File([srcBlob], 'input.png', { type: 'image/png' });
  const outBlob = await removeBackground(srcFile, {
    // 自托管模型(同源)— 国内访问无障碍 + 不依赖 staticimgly.com
    publicPath: new URL('./models/', location.href).href,
    debug: false,
    model: 'medium',
    output: { format: 'image/png', quality: 0.95 },
    progress: (key, current, total) => {
      if(key && (key.startsWith('fetch:') || key.startsWith('compute:'))){
        loaderText.textContent = `${key} ${(current/1024/1024).toFixed(1)} / ${(total/1024/1024).toFixed(1)} MB…`;
      }
    }
  });
  const outBmp = await createImageBitmap(outBlob);
  const out = document.createElement('canvas');
  out.width = outBmp.width; out.height = outBmp.height;
  const ctx = out.getContext('2d');
  ctx.drawImage(outBmp,0,0);
  // alpha 阈值后处理:清掉半透明背景残留(< 80 直接透明,> 200 完全不透明,中间平滑)
  const img = ctx.getImageData(0,0,out.width,out.height);
  const d = img.data;
  for(let i=3; i<d.length; i+=4){
    const a = d[i];
    if(a < 80) d[i] = 0;
    else if(a > 200) d[i] = 255;
    else d[i] = Math.round(((a - 80) / 120) * 255);
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

// ---------- 渲染预览(裁切到规格 + 换背景) ----------
function renderPreview(){
  const target = mmToPx(state.size);            // 目标像素 e.g. 295×413
  previewCv.width = target.w;
  previewCv.height = target.h;
  const ctx = previewCv.getContext('2d');

  // 还没抠图:直接显示原图(居中 cover)
  if(!state.cutoutCanvas){
    if(!state.sourceBitmap) return;
    ctx.fillStyle = '#f0f3f8';
    ctx.fillRect(0,0,target.w,target.h);
    const src = state.sourceBitmap;
    const sAR = src.width/src.height;
    const tAR = target.w/target.h;
    let dw,dh;
    if(sAR > tAR){ dh = target.h; dw = dh*sAR; }
    else        { dw = target.w; dh = dw/sAR; }
    ctx.drawImage(src,(target.w-dw)/2,(target.h-dh)/2,dw,dh);
    return;
  }

  // 1. 画背景
  if(state.bg.css.startsWith('linear-gradient')){
    // 简易解析:linear-gradient(180deg,#a,#b)
    const m = /linear-gradient\([^,]+,([^,]+),([^)]+)\)/.exec(state.bg.css);
    const g = ctx.createLinearGradient(0,0,0,target.h);
    g.addColorStop(0,(m?m[1]:'#fff').trim());
    g.addColorStop(1,(m?m[2]:'#fff').trim());
    ctx.fillStyle = g;
  }else{
    ctx.fillStyle = state.bg.css;
  }
  ctx.fillRect(0,0,target.w,target.h);

  // 2. 居中裁切人像(cover)
  const src = state.cutoutCanvas;
  const sAR = src.width/src.height;
  const tAR = target.w/target.h;
  let dw,dh;
  if(sAR > tAR){ dh = target.h; dw = dh*sAR; }
  else        { dw = target.w; dh = dw/sAR; }
  const dx = (target.w-dw)/2;
  const dy = (target.h-dh)/2;
  ctx.drawImage(src,dx,dy,dw,dh);
}

function mmToPx({w_mm,h_mm,dpi}){
  return { w: Math.round(w_mm/25.4*(dpi||300)), h: Math.round(h_mm/25.4*(dpi||300)) };
}

// ---------- 下载 ----------
function bindDownload(){
  downloadBtn.onclick = ()=>{
    const mime = state.format==='png' ? 'image/png' : 'image/jpeg';
    const ext  = state.format==='png' ? 'png' : 'jpg';
    const q    = state.quality/100;
    previewCv.toBlob(blob=>{
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `idphoto_${state.size.id}_${state.bg.id}.${ext}`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    }, mime, q);
  };
  qualityEl.oninput = e=>{ state.quality = +e.target.value; qualityVal.textContent = state.quality; };
  formatEl.onchange = e=>{ state.format = e.target.value; };
}

// 抠图模型卡片(放在图片下方,显眼的位置)
function bindEnginePicker(){
  const cards = document.querySelectorAll('.engine-card');
  cards.forEach(card=>{
    card.addEventListener('click', async ()=>{
      const newEngine = card.dataset.engine;
      // 同引擎且已抠图:跳过
      if(newEngine === state.engine && state.cutoutCanvas) return;
      state.engine = newEngine;
      cards.forEach(c=>c.classList.toggle('active', c===card));
      const radio = card.querySelector('input[type=radio]');
      if(radio) radio.checked = true;
      if(state.sourceBitmap){ await runCutout(); renderPreview(); }
    });
  });
}

// ---------- 6 寸相纸拼版 ----------
// 6 寸 = 6"×4" = 152.4×101.6mm @ 300dpi = 1800×1200px
const PAPER = { w_mm: 152.4, h_mm: 101.6, dpi: 300 };

function buildPrintSheet(){
  if(!state.cutoutCanvas) return null;
  const preset = paperPreset ? paperPreset.value : 'auto';
  const gap_mm = Math.max(0, parseFloat(paperGap.value)||0);
  const margin_mm = 3;

  // 行业标准:固定行列 + 强制方向
  let cols, rows, orient;
  if(preset === 'standard' && STANDARD_LAYOUTS[state.size.id]){
    const L = STANDARD_LAYOUTS[state.size.id];
    cols = L.cols; rows = L.rows; orient = L.orient;
  }else{
    orient = paperOrient.value;
  }

  // 纸张像素
  const paperW_mm = orient==='landscape' ? PAPER.w_mm : PAPER.h_mm;
  const paperH_mm = orient==='landscape' ? PAPER.h_mm : PAPER.w_mm;
  const paperW = Math.round(paperW_mm/25.4*PAPER.dpi);
  const paperH = Math.round(paperH_mm/25.4*PAPER.dpi);

  // 单张证件照像素
  const cell = mmToPx(state.size);
  const cellW_mm = state.size.w_mm;
  const cellH_mm = state.size.h_mm;

  // 自由排版才需要算行列数
  if(cols === undefined){
    const usableW = paperW_mm - 2*margin_mm;
    const usableH = paperH_mm - 2*margin_mm;
    cols = Math.max(1, Math.floor((usableW + gap_mm) / (cellW_mm + gap_mm)));
    rows = Math.max(1, Math.floor((usableH + gap_mm) / (cellH_mm + gap_mm)));
  }
  const total = cols * rows;

  // 实际拼图块大小(像素)
  const gap_px = Math.round(gap_mm/25.4*PAPER.dpi);
  const margin_px = Math.round(margin_mm/25.4*PAPER.dpi);
  const gridW = cols*cell.w + (cols-1)*gap_px;
  const gridH = rows*cell.h + (rows-1)*gap_px;
  const startX = Math.round((paperW - gridW)/2);
  const startY = Math.round((paperH - gridH)/2);

  // 先把单张证件照渲染到一个缓存 canvas(带背景),复用 renderPreview 的逻辑
  const tile = document.createElement('canvas');
  tile.width = cell.w; tile.height = cell.h;
  drawIdPhotoTo(tile);

  // 画到 6 寸纸
  const sheet = document.createElement('canvas');
  sheet.width = paperW; sheet.height = paperH;
  const ctx = sheet.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,paperW,paperH);

  // 裁切辅助线(浅灰),便于剪刀剪开
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 1;
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      const x = startX + c*(cell.w+gap_px);
      const y = startY + r*(cell.h+gap_px);
      ctx.drawImage(tile, x, y);
      ctx.strokeRect(x+.5, y+.5, cell.w-1, cell.h-1);
    }
  }

  const presetLabel = (preset==='standard' && STANDARD_LAYOUTS[state.size.id]) ? ' · '+STANDARD_LAYOUTS[state.size.id].label : '';
  paperInfo.textContent = `${paperW_mm}×${paperH_mm}mm · ${paperW}×${paperH}px · ${cols}列×${rows}行 = ${total}张${presetLabel}`;
  return sheet;
}

// 把单张证件照(背景+人像)画到给定 canvas(等同 renderPreview 但目标可换)
function drawIdPhotoTo(canvas){
  const target = { w: canvas.width, h: canvas.height };
  const ctx = canvas.getContext('2d');
  if(state.bg.css.startsWith('linear-gradient')){
    const m = /linear-gradient\([^,]+,([^,]+),([^)]+)\)/.exec(state.bg.css);
    const g = ctx.createLinearGradient(0,0,0,target.h);
    g.addColorStop(0,(m?m[1]:'#fff').trim());
    g.addColorStop(1,(m?m[2]:'#fff').trim());
    ctx.fillStyle = g;
  }else{
    ctx.fillStyle = state.bg.css;
  }
  ctx.fillRect(0,0,target.w,target.h);
  const src = state.cutoutCanvas;
  const sAR = src.width/src.height, tAR = target.w/target.h;
  let dw,dh;
  if(sAR > tAR){ dh = target.h; dw = dh*sAR; }
  else        { dw = target.w; dh = dw/sAR; }
  ctx.drawImage(src,(target.w-dw)/2,(target.h-dh)/2,dw,dh);
}

function bindPrintSheet(){
  const update = ()=>{
    if(!state.cutoutCanvas) return;
    const sheet = buildPrintSheet();
    if(!sheet) return;
    // 缩放到预览 canvas(最大宽 800)
    const maxW = 800;
    const scale = Math.min(1, maxW/sheet.width);
    printCanvas.width  = Math.round(sheet.width*scale);
    printCanvas.height = Math.round(sheet.height*scale);
    printCanvas.getContext('2d').drawImage(sheet, 0,0, printCanvas.width, printCanvas.height);
    printPreviewWrap.classList.remove('hidden');
    downloadPrintBtn.disabled = false;
  };
  previewPrintBtn.onclick = update;
  paperOrient.onchange = update;
  paperGap.onchange = update;
  if(paperPreset) paperPreset.onchange = update;
  downloadPrintBtn.onclick = ()=>{
    const sheet = buildPrintSheet();
    if(!sheet) return;
    const mime = state.format==='png' ? 'image/png' : 'image/jpeg';
    const ext  = state.format==='png' ? 'png' : 'jpg';
    sheet.toBlob(blob=>{
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `idphoto_print_6inch_${state.size.id}_${state.bg.id}.${ext}`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    }, mime, state.quality/100);
  };
}

function showLoader(on, text){
  loader.classList.toggle('hidden', !on);
  if(text) loaderText.textContent = text;
  downloadBtn.disabled = on;
}

// ---------- 启动 ----------
buildChips();
bindUpload();
bindDownload();
bindEnginePicker();
bindPrintSheet();
