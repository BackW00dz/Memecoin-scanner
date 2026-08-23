const API='https://api.dexscreener.com';
const state={tokens:[], filtered:[], lastUpdated:null};

// ===== Constants: Single source of truth for thresholds =====
const THRESHOLDS = {
  MIN_LIQUIDITY_USD: 10000,
  MIN_LIQ_TO_MC_RATIO: 0.005,
  MIN_TRANSACTION_VOLUME: 10,  // Minimum buys+sells to calculate ratio
  BREAKOUT_SCORE: 80,
  SCORE_HIGH: 80,
  SCORE_WATCH: 65,
};

const $=s=>document.querySelector(s);
const fmtMoney=n=>{n=Number(n||0);if(n>=1e9)return '$'+(n/1e9).toFixed(2)+'B';if(n>=1e6)return '$'+(n/1e6).toFixed(2)+'M';if(n>=1e3)return '$'+(n/1e3).toFixed(1)+'K';if(n>=1)return '$'+n.toFixed(2);return '$'+n.toPrecision(3)};
const fmtPct=n=>`${n>=0?'+':''}${Number(n||0).toFixed(1)}%`;
const fmtNum=n=>Number(n||0).toLocaleString();
const ageHours=ts=>ts?Math.max(0,(Date.now()-ts)/36e5):9999;

/**
 * Validate if a URL is safe to embed (HTTPS only)
 */
function isSafeUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Fetch with retry logic and rate-limit handling (429)
 */
async function fetchWithRetry(url, maxRetries = 2) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const r = await fetch(url, { headers: { accept: 'application/json' } });
      if (r.status === 429) {
        // Rate limited: respect Retry-After header
        const delay = parseInt(r.headers.get('retry-after') || '5') * 1000;
        console.warn(`Rate limited. Waiting ${delay}ms before retry.`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    } catch (e) {
      if (i === maxRetries - 1) throw e;
      // Exponential backoff: 1s, 2s, 4s, ...
      const delay = 1000 * Math.pow(2, i);
      console.warn(`Fetch failed (attempt ${i + 1}/${maxRetries}). Retrying in ${delay}ms`, e.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

function calcScore(p){
  // Defensive nulling: ensure tx object exists and has expected shape
  const tx = (p.txns && p.txns.h24) ? p.txns.h24 : {};
  const buys = Number((tx && tx.buys) || 0);
  const sells = Number((tx && tx.sells) || 0);
  const total = buys + sells;
  
  const v = Number(p.volume?.h24 || 0);
  const liq = Number(p.liquidity?.usd || 0);
  const mc = Number(p.marketCap || p.fdv || 0);
  const ch = Number(p.priceChange?.h24 || 0);
  
  // Require minimum transaction volume to calculate meaningful ratio
  const ratio = total >= THRESHOLDS.MIN_TRANSACTION_VOLUME ? buys / Math.max(1, sells) : 0;
  
  const age = ageHours(p.pairCreatedAt);
  let score = 0;
  
  score += Math.min(20, Math.log10(v + 1) * 4);
  score += Math.max(0, Math.min(15, (ch + 20) * 0.25));
  score += Math.min(15, Math.log10(total + 1) * 3);
  score += Math.min(15, liq > 0 && mc > 0 ? Math.min(1.5, liq / mc) * 10 : 0);
  score += Math.min(10, ratio > 1 ? (ratio - 1) * 7 : 0);
  score += age < 24 ? 8 : age < 72 ? 6 : age < 168 ? 4 : 1;
  score += (p.info?.socials?.length || 0) > 0 ? 5 : 0;
  score += (p.info?.websites?.length || 0) > 0 ? 2 : 0;
  score += Math.min(10, Number(p.boosts?.active || 0) / 10);
  
  // Unified thresholds: use constants
  if (liq < THRESHOLDS.MIN_LIQUIDITY_USD) score -= 15;
  if (mc > 0 && liq / mc < THRESHOLDS.MIN_LIQ_TO_MC_RATIO) score -= 10;
  if (sells > buys * 2) score -= 8;
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Risk assessment using unified thresholds
 */
function risk(p){
  const liq = Number(p.liquidity?.usd || 0);
  const mc = Number(p.marketCap || p.fdv || 0);
  const age = ageHours(p.pairCreatedAt);
  
  // Use unified thresholds
  if (liq < THRESHOLDS.MIN_LIQUIDITY_USD || (mc > 0 && liq / mc < THRESHOLDS.MIN_LIQ_TO_MC_RATIO)) {
    return ['HIGH', 'bad'];
  }
  if (age < 2 || liq < 30000) return ['MEDIUM', 'warn'];
  return ['LOW', 'good'];
}

function normalize(p){
  return {...p, score: calcScore(p), risk: risk(p)};
}

async function scan(){
  $('#statusText').textContent='Scanning Solana…';
  $('#tokenList').innerHTML='<div class="loading">Finding fresh profiles, boosts and active pairs…</div>';
  try{
    const [profiles, boosts, ctos] = await Promise.all([
      fetchWithRetry(`${API}/token-profiles/latest/v1`),
      fetchWithRetry(`${API}/token-boosts/latest/v1`),
      fetchWithRetry(`${API}/community-takeovers/latest/v1`)
    ]);
    
    const seen = new Map();
    [...(profiles||[]), ...(boosts||[]), ...(ctos||[])].forEach(x=>{
      if(x.chainId==='solana' && x.tokenAddress) seen.set(x.tokenAddress,x);
    });
    
    const addresses = [...seen.keys()].slice(0, 30);
    if(!addresses.length) throw new Error('No Solana candidates returned');
    
    const pairs = await fetchWithRetry(`${API}/tokens/v1/solana/${addresses.join(',')}`);
    
    const best = new Map();
    (pairs || []).forEach(p => {
      if (p.chainId !== 'solana' || !p.baseToken) return;
      
      // Early rejection: filter by liquidity before scoring
      const liq = Number(p.liquidity?.usd || 0);
      if (liq < THRESHOLDS.MIN_LIQUIDITY_USD) return;
      
      const key = p.baseToken.address;
      const existing = best.get(key);
      if (!existing || liq > Number(existing.liquidity?.usd || 0)) {
        best.set(key, p);
      }
    });
    
    state.tokens = [...best.values()]
      .map(normalize)
      .filter(x => Number(x.liquidity?.usd || 0) > 0);
    
    state.lastUpdated = new Date();
    $('#statusText').textContent = 'Live scan active';
    $('#updatedText').textContent = 'Updated ' + state.lastUpdated.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
    render();
  } catch(e){
    console.error('Scan failed:', e);
    $('#statusText').textContent = 'Live API unavailable';
    $('#updatedText').textContent = 'Demo fallback';
    state.tokens = demoTokens().map(normalize);
    render();
  }
}

function demoTokens(){
  const now = Date.now();
  return [
    {chainId:'solana',dexId:'demo',url:'#',pairAddress:'demo1',baseToken:{address:'Demo1',name:'Signal Ape',symbol:'SAPE'},quoteToken:{symbol:'SOL'},priceUsd:'0.00081',priceChange:{h24:126.4},volume:{h24:1480000},liquidity:{usd:210000},marketCap:2700000,fdv:810000,txns:{h24:{buys:4820,sells:2670}},pairCreatedAt:now-7*36e5,boosts:{active:24},info:{socials:[{}],websites:[{}]}},
    {chainId:'solana',dexId:'demo',url:'#',pairAddress:'demo2',baseToken:{address:'Demo2',name:'Moon Raccoon',symbol:'MRAC'},quoteToken:{symbol:'SOL'},priceUsd:'0.0042',priceChange:{h24:72.8},volume:{h24:820000},liquidity:{usd:145000},marketCap:1900000,fdv:4200000,txns:{h24:{buys:2900,sells:1710}},pairCreatedAt:now-18*36e5,boosts:{active:9},info:{socials:[{}]}},
    {chainId:'solana',dexId:'demo',url:'#',pairAddress:'demo3',baseToken:{address:'Demo3',name:'Pixel Dog',symbol:'PDOG'},quoteToken:{symbol:'SOL'},priceUsd:'0.00017',priceChange:{h24:41.3},volume:{h24:350000},liquidity:{usd:58000},marketCap:920000,fdv:1700000,txns:{h24:{buys:1300,sells:990}},pairCreatedAt:now-31*36e5,boosts:{active:4},info:{}}
  ];
}

function apply(){
  const q = $('#searchInput').value.toLowerCase().trim();
  const sort = $('#sortSelect').value;
  
  let arr = state.tokens.filter(p => {
    const name = (p.baseToken?.name || '').toLowerCase();
    const symbol = (p.baseToken?.symbol || '').toLowerCase();
    return name.includes(q) || symbol.includes(q);
  });
  
  arr.sort((a, b) => {
    if (sort === 'volume') return Number(b.volume?.h24 || 0) - Number(a.volume?.h24 || 0);
    if (sort === 'change') return Number(b.priceChange?.h24 || 0) - Number(a.priceChange?.h24 || 0);
    if (sort === 'liquidity') return Number(b.liquidity?.usd || 0) - Number(a.liquidity?.usd || 0);
    if (sort === 'marketCap') return Number(b.marketCap || b.fdv || 0) - Number(a.marketCap || a.fdv || 0);
    return b.score - a.score;
  });
  
  state.filtered = arr;
}

function render(){
  apply();
  $('#countText').textContent = state.filtered.length;
  
  const alerts = state.filtered.filter(x => x.score >= THRESHOLDS.BREAKOUT_SCORE).slice(0, 1);
  $('#alerts').innerHTML = alerts.length
    ? `<div class="alert"><strong>🚨 ${esc(alerts[0].baseToken.symbol)} crossed ${alerts[0].score}/100</strong><span>Strong momentum detected. Review liquidity and holder concentration before considering any trade.</span></div>`
    : '';
  
  if (!state.filtered.length) {
    $('#tokenList').innerHTML = '<div class="empty">No candidates match your filter.</div>';
    return;
  }
  
  $('#tokenList').innerHTML = state.filtered.map((p, i) => {
    const ch = Number(p.priceChange?.h24 || 0);
    const r = p.risk;
    const icon = p.info?.imageUrl || p.info?.image || '';
    const iconHtml = isSafeUrl(icon)
      ? `<img class="token-icon" src="${icon}" alt="">`
      : `<div class="token-icon"></div>`;
    
    const scoreClass = p.score >= THRESHOLDS.SCORE_HIGH ? '' : p.score >= THRESHOLDS.SCORE_WATCH ? 'watch' : 'low';
    
    return `<article class="token-card" data-i="${i}">
      <div class="token-head">
        ${iconHtml}
        <div class="token-name"><strong>${esc(p.baseToken?.name || 'Unknown')}</strong><small>$${esc(p.baseToken?.symbol || '?')} · ${ageHours(p.pairCreatedAt).toFixed(1)}h old</small></div>
        <div class="score ${scoreClass}">${p.score}</div>
      </div>
      <div class="stats">
        <div class="stat"><label>Market cap</label><b>${fmtMoney(p.marketCap || p.fdv)}</b></div>
        <div class="stat"><label>24h volume</label><b>${fmtMoney(p.volume?.h24)}</b></div>
        <div class="stat"><label>24h move</label><b class="${ch >= 0 ? 'positive' : 'negative'}">${fmtPct(ch)}</b></div>
        <div class="stat"><label>Liquidity</label><b>${fmtMoney(p.liquidity?.usd)}</b></div>
      </div>
      <div class="risk-row"><span>Buys ${fmtNum(p.txns?.h24?.buys || 0)} · Sells ${fmtNum(p.txns?.h24?.sells || 0)}</span><span class="risk ${r[1]}">${r[0]} RISK</span></div>
    </article>`;
  }).join('');
  
  document.querySelectorAll('.token-card').forEach(el => {
    el.onclick = () => openDetail(state.filtered[Number(el.dataset.i)]);
  });
}

function openDetail(p){
  const ch = Number(p.priceChange?.h24 || 0);
  const r = p.risk;
  const socials = p.info?.socials || [];
  const websites = p.info?.websites || [];
  
  const iconHtml = isSafeUrl(p.info?.imageUrl)
    ? `<img src="${p.info.imageUrl}" alt="">`
    : `<div class="token-icon"></div>`;
  
  $('#detailContent').innerHTML=`
    <div class="detail-title">
      ${iconHtml}
      <div><h2>${esc(p.baseToken.name)} <span style="color:#7f8998">($${esc(p.baseToken.symbol)})</span></h2><p>Score ${p.score}/100 · ${r[0]} risk · ${ageHours(p.pairCreatedAt).toFixed(1)} hours old</p></div>
    </div>
    <div class="detail-grid">
      <div class="detail-box"><small>Price</small><strong>${fmtMoney(p.priceUsd)}</strong></div>
      <div class="detail-box"><small>24h change</small><strong class="${ch >= 0 ? 'positive' : 'negative'}">${fmtPct(ch)}</strong></div>
      <div class="detail-box"><small>Market cap</small><strong>${fmtMoney(p.marketCap || p.fdv)}</strong></div>
      <div class="detail-box"><small>Liquidity</small><strong>${fmtMoney(p.liquidity?.usd)}</strong></div>
      <div class="detail-box"><small>24h volume</small><strong>${fmtMoney(p.volume?.h24)}</strong></div>
      <div class="detail-box"><small>Boosts</small><strong>${fmtNum(p.boosts?.active || 0)}</strong></div>
      <div class="detail-box"><small>Buys / sells</small><strong>${fmtNum(p.txns?.h24?.buys || 0)} / ${fmtNum(p.txns?.h24?.sells || 0)}</strong></div>
      <div class="detail-box"><small>DEX</small><strong>${esc(p.dexId || '—')}</strong></div>
    </div>
    <div class="action-row">
      <a class="primary" href="${p.url || '#'}" target="_blank" rel="noopener">Open DEX Screener</a>
      <a href="https://solscan.io/token/${encodeURIComponent(p.baseToken.address)}" target="_blank" rel="noopener">View on Solscan</a>
    </div>
    <p class="disclaimer">The score uses public market/activity signals. This MVP does not verify developer wallets, holder concentration, mint/freeze authority, or social authenticity. Those checks should be added before treating a candidate as investable.</p>
  `;
  $('#modal').classList.remove('hidden');
}

function esc(s){
  return String(s || '').replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));
}

// Event listeners
$('#refreshBtn').onclick = scan;
$('#searchInput').oninput = render;
$('#sortSelect').onchange = render;
$('#closeModal').onclick = () => $('#modal').classList.add('hidden');
$('#modalBackdrop').onclick = () => $('#modal').classList.add('hidden');

// Escape key closes modal (mobile UX)
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !$('#modal').classList.contains('hidden')) {
    $('#modal').classList.add('hidden');
  }
});

// Initial scan and auto-refresh every 60 seconds
scan();
setInterval(scan, 60000);
