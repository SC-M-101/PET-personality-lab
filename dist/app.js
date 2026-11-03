import * as catData from './cat-data.js';
import * as dogData from './dog-data.js';
import { calculateResults as scoreCat } from './cat-scoring.js';
import { calculateResults as scoreDog } from './dog-scoring.js';
import { makePoster, pngFile } from './poster.js';
import { TIDBITS } from './tidbits.js';

const STORAGE_KEY = 'pet-personality-lab-v1';
const REGION = document.documentElement.dataset.region === 'cn' ? 'cn' : 'global';
const app = document.querySelector('#app');
const cats = { label: '猫咪', short: '猫', data: catData, score: scoreCat, count: catData.QUESTIONS.length };
const dogs = { label: '狗狗', short: '狗', data: dogData, score: scoreDog, count: dogData.QUESTIONS.length };
const species = { cat: cats, dog: dogs };
let advanceTimer = null;

const CAT_ART = `<path d="M82 118 L72 35 Q70 25 82 33 L129 77 Q150 69 172 77 L220 33 Q231 25 229 38 L219 119 Q253 158 249 209 Q245 277 150 284 Q55 277 51 209 Q47 158 82 118Z" fill="#272039"/><path d="M88 100 L82 56 L116 86Z M212 100 L218 56 L184 86Z" fill="#D79DB7"/><ellipse cx="111" cy="178" rx="9" ry="14" fill="#F6C16A"/><ellipse cx="189" cy="178" rx="9" ry="14" fill="#F6C16A"/><path d="M143 207 Q150 211 157 207 L150 218Z" fill="#E5A9A6"/><path d="M150 219 Q141 228 131 224 M150 219 Q159 228 169 224" fill="none" stroke="#E9DCE9" stroke-width="4" stroke-linecap="round"/><path d="M81 215 L25 200 M82 229 L22 229 M219 215 L275 200 M218 229 L278 229" stroke="#E9DCE9" stroke-width="4" stroke-linecap="round"/><path d="M83 266 Q149 310 219 266" fill="none" stroke="#F6C16A" stroke-width="8" stroke-linecap="round"/>`;
const DOG_ART = `
  <path d="M90 98 C62 60 32 67 31 105 C29 144 40 188 61 211 C78 214 88 193 91 169 L112 111 Z" fill="#4e3245"/>
  <path d="M210 98 C238 60 268 67 269 105 C271 144 260 188 239 211 C222 214 212 193 209 169 L188 111 Z" fill="#4e3245"/>
  <path d="M77 95 C96 69 125 69 150 70 C175 69 204 69 223 95 C239 117 238 157 233 197 C226 249 194 280 150 283 C106 280 74 249 67 197 C62 157 61 117 77 95 Z" fill="#d7a477"/>
  <path d="M128 72 Q150 64 172 72 L165 139 Q150 157 135 139 Z" fill="#f4d5ad"/>
  <path d="M83 120 Q66 132 67 167 L82 169 Q89 136 108 117 Z M217 120 Q234 132 233 167 L218 169 Q211 136 192 117 Z" fill="#bd865f"/>
  <ellipse cx="111" cy="170" rx="8" ry="11" fill="#302338"/><ellipse cx="189" cy="170" rx="8" ry="11" fill="#302338"/>
  <circle cx="108" cy="166" r="2.5" fill="#fff6e8"/><circle cx="186" cy="166" r="2.5" fill="#fff6e8"/>
  <ellipse cx="119" cy="216" rx="39" ry="32" fill="#f5d9b9"/><ellipse cx="181" cy="216" rx="39" ry="32" fill="#f5d9b9"/>
  <path d="M127 200 Q150 186 173 200 Q176 217 150 226 Q124 217 127 200 Z" fill="#302338"/>
  <path d="M150 223 L150 235 M150 235 Q136 246 123 234 M150 235 Q164 246 177 234" fill="none" stroke="#624256" stroke-width="4" stroke-linecap="round"/>
  <path d="M139 241 Q150 255 161 241 L160 255 Q150 268 140 255 Z" fill="#e98f9c"/>
  <path d="M88 259 Q150 301 212 259" fill="none" stroke="#f6c16a" stroke-width="10" stroke-linecap="round"/>
  <circle cx="150" cy="278" r="11" fill="#f6c16a"/><circle cx="150" cy="278" r="4" fill="#fff5dd"/>
`;

function freshState() { return { screen: 'welcome', kind: '', pet: { name: '', sex: '', age: '', photo: '' }, order: [], index: 0, answers: {} }; }
function current() { return species[state.kind]; }
function loadState() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
    if (!saved || !['welcome', 'access', 'info', 'quiz', 'results'].includes(saved.screen)) return freshState();
    if (saved.kind && !species[saved.kind]) return freshState();
    if (!saved.pet || !saved.answers || !Array.isArray(saved.order)) return freshState();
    saved.pet.photo = typeof saved.pet.photo === 'string' && saved.pet.photo.length < 2000000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(saved.pet.photo) ? saved.pet.photo : '';
    if (saved.screen !== 'welcome' && !saved.kind) return freshState();
    if (saved.kind && saved.order.length) {
      const ids = new Set(species[saved.kind].data.QUESTIONS.map(q => q.id));
      if (saved.order.length !== ids.size || new Set(saved.order).size !== ids.size || saved.order.some(id => !ids.has(id))) return freshState();
    }
    if (['quiz', 'results'].includes(saved.screen) && saved.order.length !== species[saved.kind].count) return freshState();
    saved.index = Math.max(0, Math.min((species[saved.kind]?.count ?? 1) - 1, Number(saved.index) || 0));
    return saved;
  } catch { return freshState(); }
}
let state = loadState();
let accessStatus = 'checking';
let accessGranted = false;
function persist() { try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; } catch { return false; } }
let photoImage = null;
let photoReady = Promise.resolve();
function preparePhoto(dataUrl) {
  photoImage = null;
  if (!dataUrl) { photoReady = Promise.resolve(); return photoReady; }
  photoReady = new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => { photoImage = image; resolve(); };
    image.onerror = () => reject(new Error('照片无法读取'));
    image.src = dataUrl;
  });
  return photoReady;
}
preparePhoto(state.pet.photo).catch(() => {});
async function resizePhoto(file) {
  if (!file.type.startsWith('image/')) throw new Error('请选择照片文件');
  if (file.size > 25 * 1024 * 1024) throw new Error('照片不能超过 25 MB，请换一张');
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('这张照片无法读取，请换成 JPG、PNG 或 WebP')); image.src = objectUrl; });
    const scale = Math.min(1, 900 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('当前浏览器无法处理照片');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.82);
  } finally { URL.revokeObjectURL(objectUrl); }
}
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
function scrollTop() { window.scrollTo({ top: 0, behavior: 'instant' }); }
function shuffle(ids) { const copy = [...ids]; for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; } return copy; }
function goTo(screen) { state.screen = screen; persist(); render(); scrollTop(); }
function resetFor(kind) { state.kind = kind; state.pet = { name: '', sex: '', age: '', photo: '' }; preparePhoto(''); state.order = []; state.index = 0; state.answers = {}; persist(); }

function renderWelcome() {
  const chosen = current();
  app.innerHTML = `<section class="welcome screen">
    <div class="hero-content"><span class="eyebrow">THE PET PERSONALITY LAB · VOL. 01</span>
      <h1>它的小世界，<br><em>藏着什么设定？</em></h1>
      <p class="hero-copy">先选家里的猫咪或狗狗，再从它平常的动作和选择里，认识独一无二的它。</p>
      <div class="hero-facts"><span>✦ 猫狗各 25 种趣味画像</span><span>✦ 主性格＋另一面</span><span>✦ 购买后输入验证码</span></div>
      <div class="species-picker" role="group" aria-label="选择家里的伙伴">
        <button type="button" class="species-choice ${state.kind === 'cat' ? 'selected' : ''}" data-kind="cat" aria-pressed="${state.kind === 'cat'}"><span class="species-symbol" aria-hidden="true">喵</span><span><strong>我家是猫咪</strong><small>54 个日常观察</small></span><span class="choice-tick" aria-hidden="true">${state.kind === 'cat' ? '✓' : '○'}</span></button>
        <button type="button" class="species-choice ${state.kind === 'dog' ? 'selected' : ''}" data-kind="dog" aria-pressed="${state.kind === 'dog'}"><span class="species-symbol" aria-hidden="true">汪</span><span><strong>我家是狗狗</strong><small>45 个日常观察</small></span><span class="choice-tick" aria-hidden="true">${state.kind === 'dog' ? '✓' : '○'}</span></button>
      </div>
      <button id="begin" class="button button-primary hero-button" type="button" ${chosen ? '' : 'disabled'}>${chosen ? `认识我家${chosen.label}` : '先选猫咪或狗狗'} <span aria-hidden="true">↗</span></button>
      <p class="fine-print">按你见过的日常作答；没观察过的情境可以跳过，不必让它刻意经历。</p>
    </div>
    <div class="hero-visual" aria-hidden="true"><div class="orbit orbit-outer"></div><div class="orbit orbit-inner"></div><div class="visual-star star-one">✦</div><div class="visual-star star-two">✧</div>
      <div class="cat-disc ${state.kind === 'dog' ? 'dog-disc' : ''}"><svg viewBox="0 0 300 320">${state.kind === 'dog' ? DOG_ART : CAT_ART}</svg></div>
      <div class="visual-ticket">${state.kind === 'dog' ? 'DOG ID' : state.kind === 'cat' ? 'CAT ID' : 'PET ID'} <strong>???</strong><span>答案藏在日常里</span></div>
    </div>
  </section>`;
  app.querySelectorAll('[data-kind]').forEach(button => button.addEventListener('click', () => { if (state.kind !== button.dataset.kind) resetFor(button.dataset.kind); renderWelcome(); }));
  app.querySelector('#begin').addEventListener('click', () => { if (current()) goTo(accessGranted ? 'info' : 'access'); });
}

function renderAccess() {
  const who = current();
  const checking = accessStatus === 'checking';
  app.innerHTML = `<section class="access-screen screen"><button id="back-welcome" class="back-link" type="button">← 返回选择猫狗</button>
    <div class="panel access-panel"><span class="eyebrow">ONE ORDER · ONE CODE</span><h1>给${who.label}开启测试</h1>
      <p class="muted">购买后，请从小红书的发货消息里复制专属验证码。每笔订单对应一个码，验证后可以反复测试。</p>
      <form id="access-form"><label class="field"><span>订单验证码</span><input name="code" type="text" inputmode="numeric" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="32" placeholder="输入发货消息中的 6 位数字" required ${checking ? 'disabled' : ''}></label>
        <button id="legacy-code-toggle" class="legacy-code-toggle" type="button">使用旧版字母码</button>
        <button class="button button-primary access-submit" type="submit" ${checking ? 'disabled' : ''}>${checking ? '正在检查购买记录…' : '验证并开始 ↗'}</button><p id="access-message" class="access-message" role="status" aria-live="polite">${accessStatus === 'error' ? '暂时无法连接验证服务，请稍后重试。' : ''}</p></form>
      <p class="access-help">找不到验证码？请查看小红书订单的发货消息，或联系卖家。</p>
    </div></section>`;
  app.querySelector('#back-welcome').addEventListener('click', () => goTo('welcome'));
  app.querySelector('#legacy-code-toggle').addEventListener('click', event => {
    const input = app.querySelector('#access-form input[name="code"]');
    const legacy = input.inputMode === 'numeric';
    input.inputMode = legacy ? 'text' : 'numeric';
    input.placeholder = legacy ? '输入旧版 PET- 字母码' : '输入发货消息中的 6 位数字';
    event.currentTarget.textContent = legacy ? '使用 6 位数字码' : '使用旧版字母码';
    input.focus();
  });
  app.querySelector('#access-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const message = form.querySelector('#access-message');
    const code = form.elements.code.value.trim();
    button.disabled = true;
    button.textContent = '正在验证…';
    message.textContent = '';
    try {
      const response = await fetch('/api/access', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ code }) });
      const data = await response.json();
      if (!response.ok || !data.ok) { message.textContent = data.error || '验证暂时失败，请稍后重试。'; return; }
      accessGranted = true;
      accessStatus = 'ready';
      goTo('info');
    } catch { message.textContent = '暂时无法连接验证服务，请检查网络后重试。'; }
    finally { button.disabled = false; button.textContent = '验证并开始 ↗'; }
  });
}

function startQuiz(skip) {
  if (advanceTimer) clearTimeout(advanceTimer);
  if (skip) state.pet = { name: '', sex: '', age: '', photo: state.pet.photo || '' };
  else {
    const form = app.querySelector('#pet-form');
    const rawAge = form.elements.age.value;
    const age = rawAge === '' ? '' : Number(rawAge);
    state.pet = { name: form.elements.name.value.trim().slice(0, 30), sex: ['male', 'female'].includes(form.elements.sex.value) ? form.elements.sex.value : '', age: age !== '' && Number.isFinite(age) && age >= 0 && age <= 30 ? age : '', photo: state.pet.photo || '' };
  }
  if (state.order.length !== current().count) state.order = shuffle(current().data.QUESTIONS.map(q => q.id));
  goTo('quiz');
}
function renderInfo() {
  const who = current();
  app.innerHTML = `<section class="info-screen screen"><button id="back-welcome" class="back-link" type="button">← 返回选择猫狗</button>
    <div class="panel info-panel"><span class="eyebrow">BEFORE WE BEGIN · ${state.kind.toUpperCase()}</span><h1>先认识一下这位小伙伴</h1>
      <p class="muted">只填你愿意分享的信息。称呼、性别、年龄和照片都可留空，跳过也能完整做题。</p>
      <form id="pet-form"><label class="field"><span>${who.label}的名字或常用称呼（可选）</span><input name="name" type="text" maxlength="30" autocomplete="off" placeholder="例如：${state.kind === 'cat' ? '芝麻' : '豆包'}" value="${escapeHtml(state.pet.name)}"></label>
        <div class="field"><span>性别（可选；不确定就留空）</span><input name="sex" type="hidden" value="${state.pet.sex === 'male' || state.pet.sex === 'female' ? state.pet.sex : ''}"><div class="sex-options" role="group" aria-label="性别，可不填写"><button type="button" class="sex-option ${state.pet.sex === 'male' ? 'selected' : ''}" data-sex="male" aria-label="♂，雄性" aria-pressed="${state.pet.sex === 'male'}">♂</button><button type="button" class="sex-option ${state.pet.sex === 'female' ? 'selected' : ''}" data-sex="female" aria-label="♀，雌性" aria-pressed="${state.pet.sex === 'female'}">♀</button><small>点选后再点一次可取消</small></div></div>
        <label class="field"><span>年龄（岁，可选；不知道就留空）</span><input name="age" type="number" min="0" max="30" step="0.1" inputmode="decimal" placeholder="例如：2.5" value="${escapeHtml(state.pet.age)}"></label>
        <div class="field"><span>${who.label}的照片（可选）</span><input id="pet-photo" class="visually-hidden" name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif"><label class="photo-upload" for="pet-photo"><span aria-hidden="true">＋</span><strong>选择一张照片</strong><small>支持 JPG、PNG、WebP；最终会放进分享图</small></label><div class="photo-preview-wrap" ${state.pet.photo ? '' : 'hidden'}><img id="pet-photo-preview" src="${state.pet.photo || ''}" alt="${who.label}照片预览"><button id="remove-photo" type="button" class="back-link">移除照片</button></div><p id="photo-status" class="photo-status" role="status" aria-live="polite"></p></div>
        <div class="form-actions"><button class="button button-primary" type="submit">下一页 ↗</button><button class="button button-secondary" id="skip-info" type="button">跳过</button></div></form>
      <p class="fine-print">以最近三个月的通常表现作答。照片会在设备上缩小处理，仅保存在当前浏览器会话，不上传到服务器。</p>
    </div></section>`;
  app.querySelector('#back-welcome').addEventListener('click', () => goTo('welcome'));
  app.querySelector('#pet-form').addEventListener('submit', e => { e.preventDefault(); startQuiz(false); });
  app.querySelector('#skip-info').addEventListener('click', () => startQuiz(true));
  app.querySelector('#pet-photo').addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const status = app.querySelector('#photo-status');
    const actions = app.querySelectorAll('.form-actions button');
    const previousPhoto = state.pet.photo;
    actions.forEach(button => { button.disabled = true; });
    status.textContent = '正在准备照片…';
    try {
      const dataUrl = await resizePhoto(file);
      state.pet.photo = dataUrl;
      const stored = persist();
      await preparePhoto(dataUrl);
      app.querySelector('#pet-photo-preview').src = dataUrl;
      app.querySelector('.photo-preview-wrap').hidden = false;
      status.textContent = stored ? '照片已准备好，会出现在最终结果图中。' : '照片已准备好；请勿刷新页面，浏览器未能保存本次进度。';
    } catch (error) { state.pet.photo = previousPhoto; persist(); preparePhoto(previousPhoto).catch(() => {}); status.textContent = error.message || '照片处理失败，请换一张'; }
    finally { event.target.value = ''; actions.forEach(button => { button.disabled = false; }); }
  });
  app.querySelector('#remove-photo').addEventListener('click', () => { state.pet.photo = ''; preparePhoto(''); persist(); app.querySelector('.photo-preview-wrap').hidden = true; app.querySelector('#pet-photo-preview').removeAttribute('src'); app.querySelector('#photo-status').textContent = '照片已移除。'; });
  app.querySelectorAll('[data-sex]').forEach(button => button.addEventListener('click', () => { const field = app.querySelector('input[name="sex"]'); field.value = field.value === button.dataset.sex ? '' : button.dataset.sex; app.querySelectorAll('[data-sex]').forEach(option => { const active = option.dataset.sex === field.value; option.classList.toggle('selected', active); option.setAttribute('aria-pressed', String(active)); }); }));
}

function renderQuiz() {
  const who = current();
  const question = who.data.QUESTIONS.find(q => q.id === state.order[state.index]);
  if (!question) { state = freshState(); persist(); renderWelcome(); return; }
  const selected = Object.prototype.hasOwnProperty.call(state.answers, question.id) ? state.answers[question.id] : undefined;
  const last = state.index === who.count - 1;
  const title = state.pet.name ? `${escapeHtml(state.pet.name)}的测试` : `${who.label}性格测试`;
  app.innerHTML = `<section class="quiz-screen screen"><div class="quiz-top"><span>${title}</span><span>${state.index + 1} / ${who.count}</span></div>
    <div class="progress" role="progressbar" aria-label="答题进度" aria-valuemin="0" aria-valuemax="${who.count}" aria-valuenow="${state.index + 1}"><div style="width:${(state.index + 1) / who.count * 100}%"></div></div>
    <div class="panel quiz-panel"><span class="eyebrow">${who.short === '猫' ? 'CAT' : 'DOG'} QUESTION ${String(state.index + 1).padStart(2, '0')}</span><h1>${escapeHtml(question.text)}</h1>
      <p class="muted">请选它通常的表现；未见过或无法判断时选“没观察到”。无需为答题制造情境。</p>
      <div class="answers" role="group" aria-label="选择出现频率">${who.data.ANSWERS.map((answer, index) => `<button class="answer ${selected === answer.value ? 'selected' : ''}" type="button" data-answer="${index}" aria-pressed="${selected === answer.value}"><span class="answer-index">${answer.value === null ? '—' : index + 1}</span><span><strong>${answer.label}</strong><small>${answer.detail}</small></span></button>`).join('')}</div>
      <div class="quiz-actions"><button class="back-link" id="go-back" type="button">← ${state.index === 0 ? '返回信息页' : '上一题'}</button>${last ? `<button class="button button-primary" id="submit" type="button" ${selected === undefined ? 'disabled' : ''}>提交结果 ↗</button>` : '<span class="auto-hint">选择后自动进入下一题</span>'}</div>
      ${last ? '<p class="submit-note">提交前可返回修改任意答案。</p>' : ''}
    </div></section>`;
  app.querySelectorAll('[data-answer]').forEach(button => button.addEventListener('click', () => { if (advanceTimer) clearTimeout(advanceTimer); const answer = who.data.ANSWERS[Number(button.dataset.answer)]; state.answers[question.id] = answer.value; persist(); app.querySelectorAll('[data-answer]').forEach(option => { const active = option === button; option.classList.toggle('selected', active); option.setAttribute('aria-pressed', String(active)); }); if (last) { app.querySelector('#submit').disabled = false; return; } const currentIndex = state.index; advanceTimer = setTimeout(() => { advanceTimer = null; if (state.screen !== 'quiz' || state.index !== currentIndex) return; state.index++; persist(); renderQuiz(); scrollTop(); }, 260); }));
  app.querySelector('#go-back').addEventListener('click', () => { if (advanceTimer) clearTimeout(advanceTimer); advanceTimer = null; if (state.index === 0) state.screen = 'info'; else state.index--; persist(); render(); scrollTop(); });
  if (last) app.querySelector('#submit').addEventListener('click', () => { const firstMissing = state.order.findIndex(id => !Object.prototype.hasOwnProperty.call(state.answers, id)); if (firstMissing !== -1) { state.index = firstMissing; persist(); renderQuiz(); scrollTop(); return; } goTo('results'); });
}

function researchCitation() {
  if (state.kind === 'cat') return REGION === 'cn'
    ? 'Litchfield 等（2017，DOI: 10.1371/journal.pone.0183455）；Mikkola 等（2021，DOI: 10.3390/ani11071991）；Fe-BARQ（Duffy 等，2017，DOI: 10.1016/j.beproc.2017.02.010）'
    : '<a href="https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0183455" target="_blank" rel="noopener noreferrer">Feline Five（2017）</a>、<a href="https://pubmed.ncbi.nlm.nih.gov/34359119/" target="_blank" rel="noopener noreferrer">猫咪七项行为研究（2021）</a>和<a href="https://vetapps.vet.upenn.edu/febarq/about.cfm" target="_blank" rel="noopener noreferrer">Fe-BARQ</a>';
  return REGION === 'cn'
    ? '2024 年犬类行为分组研究（DOI: 10.1038/s41598-024-52920-9）及后续研究（DOI: 10.1016/j.applanim.2026.107215）'
    : '<a href="https://www.nature.com/articles/s41598-024-52920-9" target="_blank" rel="noopener noreferrer">2024 年犬类行为分组研究</a>及<a href="https://doi.org/10.1016/j.applanim.2026.107215" target="_blank" rel="noopener noreferrer">后续研究</a>';
}
function renderResults() {
  const who = current();
  const result = who.score(state.answers);
  const name = escapeHtml(state.pet.name?.trim() || `你家${who.label}`);
  if (!result.enough) {
    app.innerHTML = `<section class="result-screen insufficient screen"><div class="panel"><span class="eyebrow">RESULT · 资料不足</span><h1>还需要多一点日常观察</h1><p>这次“没观察到”的情况较多，暂时无法可靠区分趣味画像。可以补充已经见过的行为；不必为了测试让${who.label}接触令它不舒服的人或动物。</p><div class="result-actions"><button class="button button-primary" id="review" type="button">返回检查答案</button><button class="button button-secondary" id="restart" type="button">重新选择猫狗</button></div></div></section>`;
    app.querySelector('#review').addEventListener('click', review);
    app.querySelector('#restart').addEventListener('click', restart);
    return;
  }
  const primary = result.archetypeMatches[0];
  const secondary = result.archetypeMatches[1];
  const tidbit = TIDBITS[state.kind][primary.profile.id];
  const close = secondary.score >= 60 && primary.score - secondary.score <= 8;
  const note = close ? '两种画像比较接近，可以把它看作混合型。' : '与主画像有一定差距，作为一点补充参考。';
  const subtitle = [state.pet.sex === 'male' ? '♂' : state.pet.sex === 'female' ? '♀' : '', state.pet.age === '' ? '' : `${escapeHtml(state.pet.age)} 岁`].filter(Boolean).join(' · ');
  const evidence = Object.entries(result.domain).filter(([, value]) => value !== null).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const dims = state.kind === 'cat' ? catData.DIMENSIONS : dogData.DIMENSION_NAMES;
  const catFactors = state.kind === 'cat' ? `<p class="muted">分数由这次的观察频率换算，并非论文量表的标准分或人格概率。没有观察到的情境显示“暂无”。</p><div class="factor-list">${result.researchScores.map(factor => `<div class="factor"><div class="factor-top"><div><strong>${factor.name}</strong><small>${factor.detail}</small></div><span>${factor.score === null ? '暂无' : `${factor.score} / 100`}</span></div><div class="factor-track"><div style="width:${factor.score ?? 0}%"></div></div></div>`).join('')}</div>` : '';
  const dogFactors = state.kind === 'dog' ? `<p class="muted">分数表示与五种研究参照行为画像的接近程度，不是五种类型的概率，也不代表风险。</p><div class="factor-list">${result.matches.map(({ profile, score }) => `<div class="factor"><div class="factor-top"><div><strong>${profile.name}</strong><small>${profile.english}</small></div><span>${score} / 100</span></div><div class="factor-track"><div style="width:${score}%;background:${profile.color}"></div></div></div>`).join('')}</div>` : '';
  const dogResearch = state.kind === 'dog' ? `<div class="research-supplement"><span>研究参考 · 行为画像</span><p>${result.matches[0].profile.summary} ${result.matches[0].profile.insight}</p></div>` : '';
  app.innerHTML = `<section class="result-screen screen"><div class="result-head"><span class="eyebrow">YOUR ${state.kind.toUpperCase()}, A LITTLE CLOSER</span><h1>${name}的性格画像</h1><p>${subtitle ? `${subtitle} · ` : ''}${who.count} 个日常观察完成。看看哪些描述与你认识的它相近。</p></div>
    <div class="panel result-main"><div class="result-identity">${state.pet.photo ? `<img class="result-pet-photo" src="${state.pet.photo}" alt="${name}的照片">` : `<span class="result-code">${primary.profile.code}</span>`}<div><span class="result-kicker">主${who.short}格 · 25 种趣味画像之一</span><h2>${primary.profile.name}</h2><p class="result-tagline">${primary.profile.accent}</p></div></div>
      <div class="overview"><h3>${name}的性格综述</h3><p><strong class="overview-hook">${primary.profile.longName}。</strong>${primary.profile.story}${primary.profile.overview}</p><div class="daily-scene"><strong>${who.short === '猫' ? '小猫趣闻' : '小狗趣闻'}</strong><p>${tidbit}</p><small>这是一种可能的日常场景，请以你观察到的它为准。</small></div></div>
      <div class="secondary"><span>还带一点副${who.short}格 · ${secondary.profile.code}</span><strong>${secondary.profile.name}</strong><p>${secondary.profile.longName}。${secondary.profile.accent}。${note}</p></div>
      ${dogResearch}<details class="type-list"><summary>看看全部 25 种趣味${who.short}格</summary><div>${who.data.ARCHETYPES.map(type => `<span class="type-chip ${type.id === primary.profile.id ? 'primary' : type.id === secondary.profile.id ? 'runner' : ''}">${type.code} · ${type.name}</span>`).join('')}</div></details>
    </div><div class="panel result-panel"><h2>五项研究参照方向</h2>${catFactors || dogFactors}</div>
    <div class="panel result-panel"><h2>这次答案的主要线索</h2><p class="muted">这些只是相对较常见的行为，不代表“好”或“坏”。</p><div class="evidence">${evidence.map(([key, value]) => `<div><span>${dims[key]}</span><strong>${value.toFixed(1)} <small>/ 4</small></strong></div>`).join('')}</div></div>
    <div class="panel method"><h2>关于这份测试</h2><p>研究参考：${researchCitation()}。研究支持的是可分别观察的行为维度；25 种趣味${who.short}格、中文题目和匹配规则由本站设计，尚未经过科学验证。结果不用于诊断或给${who.label}贴固定标签。若持续出现恐惧、疼痛或突然的行为变化，请咨询兽医或合格行为专业人士。</p></div>
    <div class="panel share-panel"><span class="eyebrow">SAVE & SHARE</span><h2>把它的性格画像带走</h2><p>生成一张包含主副性格与五项分数的图片。图片只在你的手机或电脑里生成。</p>
      <div class="share-actions"><button class="button button-primary" id="save-poster" type="button">生成并保存结果图 ↓</button><button class="button button-secondary" id="share-poster" type="button">打开系统分享菜单 ↗</button><button class="button button-secondary" id="copy-share" type="button">复制分享文案</button></div>
      <p class="share-tip">系统分享菜单中可选择已安装的微信、QQ等应用。发布到小红书或抖音时，也可以先保存图片，再从对应应用上传。</p><p id="share-status" class="share-status" role="status" aria-live="polite"></p><img id="poster-preview" class="poster-preview" alt="${name}的性格结果图片预览" hidden>
    </div>
    <div class="result-actions"><button class="button button-secondary" id="review" type="button">返回修改答案</button><button class="button button-primary" id="restart" type="button">再认识一位伙伴 ↗</button></div></section>`;
  app.querySelector('#review').addEventListener('click', review);
  app.querySelector('#restart').addEventListener('click', restart);
  const pageUrl = `${location.origin}${location.pathname}`;
  const plainName = state.pet.name?.trim() || `你家${who.label}`;
  const caption = `我给${plainName}做了性格测试：主${who.short}格「${primary.profile.name}」，还带一点「${secondary.profile.name}」。你家${who.label}会是什么性格？${pageUrl}`;
  const poster = () => makePoster({ kind: state.kind, name: plainName, primary: primary.profile, secondary: secondary.profile, factors: state.kind === 'cat' ? result.researchScores : result.matches.map(item => ({ name: item.profile.name, score: item.score })), url: pageUrl, photo: photoImage, tidbit });
  const showPoster = dataUrl => { const image = app.querySelector('#poster-preview'); image.src = dataUrl; image.hidden = false; };
  const status = message => { app.querySelector('#share-status').textContent = message; };
  if (state.pet.photo) {
    const buttons = app.querySelectorAll('#save-poster, #share-poster');
    buttons.forEach(button => { button.disabled = true; });
    status('正在准备照片，请稍候…');
    photoReady.then(() => { buttons.forEach(button => { button.disabled = false; }); status('照片已加入结果图，可以保存或分享。'); }).catch(() => status('照片无法读取。请返回信息页更换照片。'));
  }
  app.querySelector('#save-poster').addEventListener('click', () => {
    try { const dataUrl = poster(); showPoster(dataUrl); const link = document.createElement('a'); link.href = dataUrl; link.download = `${plainName.replace(/[\\/:*?"<>|]/g, '') || who.label}-性格画像.png`; document.body.append(link); link.click(); link.remove(); status('结果图已生成。如果手机没有自动保存，请长按下方图片保存。'); }
    catch { status('当前浏览器无法生成图片，请尝试在手机自带浏览器打开。'); }
  });
  app.querySelector('#share-poster').addEventListener('click', async () => {
    let dataUrl;
    try { dataUrl = poster(); showPoster(dataUrl); } catch { status('当前浏览器无法生成图片，请尝试在手机自带浏览器打开。'); return; }
    try {
      const file = pngFile(dataUrl, `${who.label}-性格画像.png`);
      if (navigator.share && navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: `${plainName}的性格画像`, text: caption }); status('已打开系统分享菜单。'); return; }
      if (navigator.share) { await navigator.share({ title: `${plainName}的性格画像`, text: caption, url: pageUrl }); status('已打开系统分享菜单；图片可长按下方预览保存。'); return; }
    } catch (error) { if (error?.name === 'AbortError') return; }
    status('此浏览器暂不支持直接分享图片。请长按下方图片保存，再到微信、QQ、小红书或抖音中发送。');
  });
  app.querySelector('#copy-share').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(caption); status('分享文案和网页链接已复制。'); }
    catch { const field = document.createElement('textarea'); field.value = caption; document.body.append(field); field.select(); const copied = document.execCommand('copy'); field.remove(); status(copied ? '分享文案和网页链接已复制。' : `请手动复制：${caption}`); }
  });
}
function review() { state.screen = 'quiz'; state.index = current().count - 1; persist(); renderQuiz(); scrollTop(); }
function restart() { if (advanceTimer) clearTimeout(advanceTimer); state = freshState(); persist(); render(); scrollTop(); }
function render() {
  if (state.screen === 'welcome') return renderWelcome();
  if (!accessGranted || state.screen === 'access') return renderAccess();
  if (state.screen === 'quiz') return renderQuiz();
  if (state.screen === 'results') return renderResults();
  return renderInfo();
}
render();
fetch('/api/access', { credentials: 'same-origin', cache: 'no-store' })
  .then(async response => { const data = await response.json(); accessGranted = response.ok && data.ok === true; accessStatus = response.ok ? 'ready' : 'error'; if (accessGranted && state.screen === 'access') { state.screen = 'info'; persist(); } render(); })
  .catch(() => { accessStatus = 'error'; render(); });
