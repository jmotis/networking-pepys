/* Networking Pepys — main app
   Orchestrates filters, layout, detail, timeline.
*/
(function(){
  const NP = window.NP;
  const $ = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => [...el.querySelectorAll(s)];

  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const MODES = ['walk','coach','boat','horse','ship'];

  // ---------- State ----------
  const state = {
    // Month-level range: keys are (year*12 + month-1), matching data.js
    mMin: NP.monthRange[0],
    mMax: NP.monthRange[1],
    modes: new Set(MODES),
    companions: 'ANY',   // or Set
    regions: 'ANY',      // or Set
    topN: 150,           // null => all
    showAll: false,
    egoId: null,         // focus a single node
    layout: 'force',     // force | concentric | schematic
    selectedId: null,
  };

  // Helpers for month keys
  const MONTH_NAMES_SHORT = MONTH_NAMES;
  const mKeyToY = k => Math.floor(k/12);
  const mKeyToM = k => (k%12);
  const mKeyFromYM = (y,m) => y*12 + m;
  const fmtMonthKey = k => `${MONTH_NAMES_SHORT[mKeyToM(k)]} ${mKeyToY(k)}`;

  // ---------- DOM refs ----------
  const canvas = $('#net');
  const tip = $('#tip');

  // ---------- Filter UI wiring ----------
  function renderModeChips(){
    const el = $('#mode-chips');
    el.innerHTML = '';
    MODES.forEach(m => {
      const b = document.createElement('button');
      b.className = 'chip' + (state.modes.has(m) ? ' on' : '');
      b.setAttribute('aria-pressed', state.modes.has(m));
      b.innerHTML = `<span class="swatch" style="background:${NP.MODE_COLORS[m]}"></span>${m}`;
      b.addEventListener('click', ()=>{
        if (state.modes.has(m)) state.modes.delete(m); else state.modes.add(m);
        if (state.modes.size===0) state.modes.add(m); // don't allow zero
        renderModeChips();
        refreshGraph();
      });
      el.appendChild(b);
    });
  }

  function renderRegionChips(){
    const el = $('#region-chips');
    el.innerHTML = '';
    NP.regions.forEach(({name, count})=>{
      const on = state.regions !== 'ANY' && state.regions.has(name);
      const b = document.createElement('button');
      b.className = 'chip' + (on ? ' on' : '');
      b.setAttribute('aria-pressed', on);
      b.textContent = `${name} (${count})`;
      b.addEventListener('click', ()=>{
        if (state.regions === 'ANY') state.regions = new Set();
        if (state.regions.has(name)) state.regions.delete(name);
        else state.regions.add(name);
        if (state.regions.size===0) state.regions = 'ANY';
        renderRegionChips();
        $('#clear-region').style.visibility = (state.regions==='ANY') ? 'hidden':'visible';
        refreshGraph();
      });
      el.appendChild(b);
    });
    $('#clear-region').style.visibility = (state.regions==='ANY') ? 'hidden':'visible';
  }

  function populateCompanions(){
    const sel = $('#companion-select');
    sel.innerHTML = '<option value="ANY">All trips (with or without companions)</option>';
    // top 60 by count
    NP.companions.slice(0, 60).forEach(({name, count})=>{
      const o = document.createElement('option');
      o.value = name;
      o.textContent = `${name} (${count})`;
      sel.appendChild(o);
    });
    sel.addEventListener('change', ()=>{
      if (sel.value === 'ANY') state.companions = 'ANY';
      else state.companions = new Set([sel.value]);
      refreshGraph();
    });
  }

  // Year range (deprecated DOM slider removed). Date-range inputs are wired in wireDateInputs().
  function wireYearSlider(){ /* no-op */ }

  // Textual date-range inputs (month granularity)
  function wireDateInputs(){
    const fromEl = $('#date-from'), toEl = $('#date-to'), errEl = $('#date-err');
    if (!fromEl || !toEl) return;
    const set = () => {
      fromEl.value = fmtMonthKey(state.mMin);
      toEl.value = fmtMonthKey(state.mMax);
    };
    set();
    const parse = (v) => {
      // accept "Mon YYYY", "YYYY-MM", "M/YYYY", "YYYY"
      v = (v||'').trim();
      if (!v) return null;
      let y, m;
      let mo = v.match(/^(\d{4})[-\/](\d{1,2})$/); // 1663-05
      if (mo){ y=+mo[1]; m=+mo[2]-1; }
      else if ((mo = v.match(/^(\d{1,2})[-\/](\d{4})$/))){ y=+mo[2]; m=+mo[1]-1; } // 05/1663
      else if ((mo = v.match(/^([A-Za-z]{3,})\s+(\d{4})$/))){
        const idx = MONTH_NAMES.findIndex(n => n.toLowerCase() === mo[1].slice(0,3).toLowerCase());
        if (idx<0) return null;
        y=+mo[2]; m=idx;
      } else if ((mo = v.match(/^(\d{4})$/))){ y=+mo[1]; m=0; }
      else return null;
      if (m<0 || m>11) return null;
      return mKeyFromYM(y, m);
    };
    const commit = () => {
      const a = parse(fromEl.value);
      const b = parse(toEl.value);
      if (a==null || b==null){
        errEl.textContent = 'Use formats like "Jan 1663", "1663-01", or "1663".';
        errEl.classList.add('on');
        return;
      }
      errEl.classList.remove('on'); errEl.textContent='';
      const lo = Math.max(NP.monthRange[0], Math.min(a,b));
      const hi = Math.min(NP.monthRange[1], Math.max(a,b));
      state.mMin = lo; state.mMax = hi;
      set();
      drawTimeline(); refreshGraph();
    };
    [fromEl, toEl].forEach(el => {
      el.addEventListener('change', commit);
      el.addEventListener('keydown', e => { if (e.key==='Enter') commit(); });
    });
    // expose for other callers
    wireDateInputs._sync = set;
  }

  // Top-N
  function wireTopN(){
    const s = $('#topn-slider');
    s.value = state.topN;
    $('#topn-val').textContent = state.topN;
    s.addEventListener('input', ()=>{
      state.topN = +s.value;
      $('#topn-val').textContent = state.topN;
      state.showAll = false;
      $('#show-all').textContent = 'Show all 912';
      refreshGraph();
    });
    $('#show-all').addEventListener('click', ()=>{
      state.showAll = !state.showAll;
      $('#show-all').textContent = state.showAll ? 'Top-N only' : 'Show all 912';
      refreshGraph();
    });
  }

  // Search
  function wireSearch(){
    const inp = $('#search-input');
    const list = $('#search-results');
    inp.addEventListener('input', ()=>{
      const q = inp.value.trim().toLowerCase();
      list.innerHTML = '';
      if (q.length < 2) return;
      const matches = NP.nodes
        .filter(n => (n.name+' '+n.location).toLowerCase().includes(q))
        .sort((a,b)=> b.visits - a.visits)
        .slice(0, 12);
      for (const n of matches){
        const b = document.createElement('button');
        b.innerHTML = `<span>${escapeHtml(n.name)}</span><span class="count">${n.visits}</span>`;
        b.addEventListener('click', ()=>{
          selectPlace(n.id, true);
          inp.value = '';
          list.innerHTML = '';
        });
        list.appendChild(b);
      }
    });
  }

  // Layout segmented control
  function wireLayoutSeg(){
    $$('.seg[data-seg="layout"] button').forEach(b => {
      b.addEventListener('click', ()=>{
        state.layout = b.dataset.layout;
        $$('.seg[data-seg="layout"] button').forEach(x=>x.classList.toggle('on', x===b));
        refreshGraph(true);
      });
      b.classList.toggle('on', b.dataset.layout === state.layout);
    });
  }

  // Ego toggle
  function wireEgo(){
    $('#clear-ego').addEventListener('click', ()=>{
      state.egoId = null;
      updateEgoBadge();
      refreshGraph();
    });
  }
  function updateEgoBadge(){
    const el = $('#ego-badge');
    if (state.egoId){
      const n = NP.nodeById[state.egoId];
      el.style.display = 'flex';
      $('#ego-name').textContent = n ? n.name : state.egoId;
    } else {
      el.style.display = 'none';
    }
  }

  // Clear filters
  function wireClears(){
    $('#clear-region').addEventListener('click', ()=>{
      state.regions = 'ANY'; renderRegionChips(); refreshGraph();
    });
    $('#clear-all').addEventListener('click', ()=>{
      state.mMin = NP.monthRange[0]; state.mMax = NP.monthRange[1];
      state.modes = new Set(MODES);
      state.companions = 'ANY';
      state.regions = 'ANY';
      state.topN = 150; state.showAll = false;
      state.egoId = null;
      if (wireDateInputs._sync) wireDateInputs._sync();
      $('#topn-slider').value = state.topN; $('#topn-val').textContent = state.topN;
      $('#companion-select').value = 'ANY';
      renderModeChips(); renderRegionChips(); updateEgoBadge();
      refreshGraph();
    });
  }

  // ---------- Tour state application ----------
  // Apply a tour chapter's full state in one call, then refresh all UI.
  NP.applyTourChapter = function(ch){
    if (ch.mMin != null) state.mMin = Math.max(NP.monthRange[0], ch.mMin);
    if (ch.mMax != null) state.mMax = Math.min(NP.monthRange[1], ch.mMax);
    if (ch.modes){ state.modes = new Set(ch.modes); }
    else { state.modes = new Set(MODES); }
    state.companions = (ch.companions && ch.companions !== 'ANY')
      ? (Array.isArray(ch.companions) ? new Set(ch.companions) : ch.companions)
      : 'ANY';
    state.regions = (ch.regions && ch.regions !== 'ANY')
      ? (Array.isArray(ch.regions) ? new Set(ch.regions) : ch.regions)
      : 'ANY';
    if (ch.topN != null){ state.topN = ch.topN; state.showAll = false; }
    state.egoId = ch.egoId || null;
    if (ch.layout){
      state.layout = ch.layout;
      $$('.seg[data-seg="layout"] button').forEach(b =>
        b.classList.toggle('on', b.dataset.layout === state.layout));
    }
    // Sync UI
    if (wireDateInputs._sync) wireDateInputs._sync();
    $('#topn-slider').value = state.topN; $('#topn-val').textContent = state.topN;
    const csel = $('#companion-select'); if (csel) csel.value = (state.companions === 'ANY' ? 'ANY' : 'ANY');
    renderModeChips(); renderRegionChips(); updateEgoBadge();
    refreshGraph(true);
    // After refresh, optionally select a location
    if (ch.selectLoc){
      // Find best match by normalized location string
      const target = ch.selectLoc.toLowerCase();
      const match = NP.nodes.find(n => {
        const loc = (n.location || '').toLowerCase();
        const name = (n.name || '').toLowerCase();
        return loc === target || name === target || name.includes(target) || loc.includes(target);
      });
      if (match){
        state.selectedId = match.id;
        renderer.setFocus(match.id);
        renderDetail(match.id);
      }
    } else {
      // Clear previous tour selection so the detail panel isn't stale
      if (state.selectedId){
        state.selectedId = null;
        renderer.setFocus(null);
        renderDetail(null);
      }
    }
  };
  // Expose a clean reset for exiting a tour
  NP.resetAllFilters = function(){
    $('#clear-all').click();
  };

  // ---------- Rendering pipeline ----------
  let renderer;
  let forceSim = null;
  let raf = null;
  let lastVisibleNodes = [];
  let lastVisibleEdges = [];

  function buildVisible(){
    const filter = {
      mMin: state.mMin, mMax: state.mMax,
      modes: state.modes,
      companions: state.companions,
      regions: state.regions,
    };
    const g = NP.computeFilteredGraph(filter);

    // Decide which nodes to show
    let visibleIds;
    if (state.egoId){
      visibleIds = new Set([state.egoId]);
      for (const [k, e] of g.pair){
        if (e.a === state.egoId) visibleIds.add(e.b);
        else if (e.b === state.egoId) visibleIds.add(e.a);
      }
    } else {
      // rank nodes by visit count in filtered graph
      const ranked = [...g.nodeVisits.entries()].sort((a,b)=>b[1]-a[1]);
      const limit = state.showAll ? ranked.length : Math.min(state.topN, ranked.length);
      visibleIds = new Set(ranked.slice(0, limit).map(x => x[0]));
    }

    // Build node list
    const maxVisits = Math.max(1, ...visibleIds.size ? [...visibleIds].map(id => g.nodeVisits.get(id) || 0) : [1]);
    const nodes = [];
    for (const id of visibleIds){
      const n = NP.nodeById[id]; if (!n) continue;
      const v = g.nodeVisits.get(id) || 0;
      const r = 3 + Math.sqrt(v / Math.max(1,maxVisits)) * 14;
      nodes.push({ id, r, label: n.name, visits: v });
    }

    // Edges: only between visible nodes
    const edges = [];
    let maxPair = 1;
    for (const [k, e] of g.pair){
      if (visibleIds.has(e.a) && visibleIds.has(e.b)){
        if (e.count > maxPair) maxPair = e.count;
      }
    }
    for (const [k, e] of g.pair){
      if (!visibleIds.has(e.a) || !visibleIds.has(e.b)) continue;
      const w = 0.4 + Math.sqrt(e.count / maxPair) * 3.2;
      edges.push({ a: e.a, b: e.b, count: e.count, w });
    }
    return { nodes, edges, nodeVisits: g.nodeVisits };
  }

  function refreshGraph(forceLayoutRecompute=false){
    const { nodes, edges, nodeVisits } = buildVisible();
    lastVisibleNodes = nodes; lastVisibleEdges = edges;
    updateCounter(nodes.length, edges.length);
    updateEgoBadge();

    // compute positions based on layout mode
    let positions;
    // Only show the geographic backdrop in schematic layout
    renderer.setBackdrop(state.layout === 'schematic'
      ? NP.makeMapBackdrop(renderer.w, renderer.h)
      : null);
    if (state.layout === 'schematic'){
      positions = NP.layoutSchematic(nodes.map(n => NP.nodeById[n.id]), renderer.w, renderer.h);
      cancelForce();
      renderer.setGraph(nodes, edges, positions);
      renderer.resetView();
    } else if (state.layout === 'concentric'){
      positions = NP.layoutConcentric(nodes.map(n => NP.nodeById[n.id]), renderer.w, renderer.h, nodeVisits, state.egoId);
      cancelForce();
      renderer.setGraph(nodes, edges, positions);
      renderer.resetView();
    } else {
      // force
      cancelForce();
      forceSim = new NP.ForceLayout(nodes.map(n=>({id:n.id})), edges.map(e=>({a:e.a,b:e.b,count:e.count})), renderer.w, renderer.h, {
        repulsion: nodes.length > 300 ? 700 : 1600,
        linkDist: nodes.length > 300 ? 70 : 110,
        linkStrength: 0.015,
        gravity: 0.018,
        alphaDecay: 0.018,
      });
      const tick = () => {
        const more = forceSim.step();
        renderer.setGraph(nodes, edges, forceSim.positions());
        if (more) { raf = requestAnimationFrame(tick); }
        else { renderer.resetView(); }
      };
      // warm up many steps for a settled initial layout
      for (let i=0;i<350;i++) forceSim.step();
      renderer.setGraph(nodes, edges, forceSim.positions());
      renderer.resetView();
      raf = requestAnimationFrame(tick);
      // fit again after settle
      setTimeout(()=>{ if (forceSim) renderer.resetView(); }, 800);
    }
  }
  function cancelForce(){ if (raf){ cancelAnimationFrame(raf); raf=null; } forceSim = null; }

  function updateCounter(nNodes, nEdges){
    $('#counter').innerHTML = `<strong>${nNodes}</strong> places · <strong>${nEdges}</strong> connections · <strong>${fmtMonthKey(state.mMin)}–${fmtMonthKey(state.mMax)}</strong>`;
  }

  // ---------- Hover / click ----------
  function onHover(id, mx, my){
    if (!id){ tip.style.opacity = '0'; return; }
    const n = NP.nodeById[id]; if (!n) return;
    tip.style.opacity = '1';
    tip.style.left = (mx + 14) + 'px';
    tip.style.top = (my + 14) + 'px';
    tip.innerHTML = `${escapeHtml(n.name)}<span class="loc">${escapeHtml(n.location || '—')} · ${n.visits} visits</span>`;
  }
  function onClick(id){
    if (!id) return;
    selectPlace(id, false);
  }

  function selectPlace(id, recenter){
    state.selectedId = id;
    renderer.setFocus(id);
    renderDetail(id);
    if (recenter){
      // center on node if known
      const p = renderer.positions[id];
      if (p){
        renderer.tx = renderer.w/2 - p.x*renderer.scale;
        renderer.ty = renderer.h/2 - p.y*renderer.scale;
        renderer.draw();
      } else {
        // node not in current graph — switch to show-all and select
        if (!state.egoId){
          state.showAll = true;
          $('#show-all').textContent = 'Top-N only';
          refreshGraph();
          setTimeout(()=>selectPlace(id, true), 60);
        }
      }
    }
  }

  // ---------- Detail panel ----------
  function renderDetail(id){
    const wrap = $('#detail-body');
    if (!id){ wrap.innerHTML = defaultDetail(); return; }
    const st = NP.placeStats(id);
    if (!st){ wrap.innerHTML = defaultDetail(); return; }
    const { node, total, byYear, byMonth, byMode, topCompanions, topPartners } = st;

    // histogram bars
    const maxM = Math.max(1, ...byMonth);
    const histHtml = byMonth.map((c,i)=>{
      const h = Math.round((c/maxM)*44);
      return `<div class="b" style="height:${Math.max(1,h)}px" aria-label="${Math.floor((NP.monthRange[0]+i)/12)} month ${(NP.monthRange[0]+i)%12+1}: ${c} visits" title="${Math.floor((NP.monthRange[0]+i)/12)}-${String((NP.monthRange[0]+i)%12+1).padStart(2,'0')}: ${c}"></div>`;
    }).join('');

    const years = Object.keys(byYear).map(Number).sort();
    const yFirst = years[0]||'—', yLast = years[years.length-1]||'—';

    const modeHtml = Object.entries(byMode).sort((a,b)=>b[1]-a[1]).map(([m,c])=>{
      return `<span class="chip" style="pointer-events:none"><span class="swatch" style="background:${NP.MODE_COLORS[m]}"></span>${m} <strong style="margin-left:4px;color:var(--ember);font-family:var(--font-mono);font-size:11px">${c}</strong></span>`;
    }).join('');

    wrap.innerHTML = `
      <div class="detail-wrap">
        <button class="detail-close" aria-label="Clear selection" id="close-detail">×</button>
        <div class="panel-kicker">Selected place</div>
        <h2>${escapeHtml(node.name)}</h2>
        <div class="loc">${escapeHtml(node.location || 'Location unrecorded')} · ${escapeHtml(node.region)}</div>

        <div class="stat-grid">
          <div class="stat"><div class="n">${total}</div><div class="l">Trips</div></div>
          <div class="stat"><div class="n">${topPartners.length}</div><div class="l">Linked places</div></div>
          <div class="stat"><div class="n">${yFirst}</div><div class="l">First year</div></div>
        </div>

        <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:14px;">${modeHtml}</div>

        <div class="section-label" style="margin-top:4px">Visits by month</div>
        <div class="hist" role="img" aria-label="Monthly visits from ${NP.yearRange[0]} to ${NP.yearRange[1]}">${histHtml}</div>
        <div class="hist-axis"><span>${NP.yearRange[0]}</span><span>${Math.floor((NP.yearRange[0]+NP.yearRange[1])/2)}</span><span>${NP.yearRange[1]}</span></div>

        ${topCompanions.length ? `
          <div class="section-label" style="margin-top:14px">Top companions here</div>
          <div class="list">
            ${topCompanions.map(c=>`<div class="row"><span>${escapeHtml(c.name)}</span><span class="n">${c.count}</span></div>`).join('')}
          </div>
        ` : ''}

        ${topPartners.length ? `
          <div class="section-label" style="margin-top:14px">Most-linked destinations</div>
          <div class="list" id="partner-list">
            ${topPartners.map(p=>`<div class="row"><button data-id="${p.id}">${escapeHtml(p.name)}</button><span class="n">${p.count}</span></div>`).join('')}
          </div>
        ` : ''}

        <div style="display:flex; gap:6px; margin-top:14px;">
          <button class="chip" id="ego-btn" aria-pressed="false">Filter to ego-network</button>
          <button class="chip" id="focus-only" aria-pressed="false">Center view</button>
        </div>
      </div>`;
    $('#close-detail').addEventListener('click', ()=>{
      state.selectedId = null;
      renderer.setFocus(null);
      $('#detail-body').innerHTML = defaultDetail();
    });
    $('#ego-btn').addEventListener('click', ()=>{
      state.egoId = id;
      refreshGraph();
    });
    $('#focus-only').addEventListener('click', ()=>{
      selectPlace(id, true);
    });
    $$('#partner-list button').forEach(b => {
      b.addEventListener('click', ()=> selectPlace(b.dataset.id, true));
    });
  }
  function defaultDetail(){
    return `<div class="panel-kicker">Detail</div>
      <h2 style="font-family:var(--font-display);font-size:22px;font-weight:500;margin:6px 0 2px">No place selected</h2>
      <div class="detail-empty">
        Click any node on the map to see its <em>full diary record</em>:
        trips, years, companions, top destinations, and a monthly visit histogram.
        Use <em>search</em> or the <em>Top-N</em> slider to navigate.
      </div>
      <div class="section-label" style="margin-top:22px">Quick jumps</div>
      <div class="list" id="quick-jumps">
        ${NP.nodes.slice().sort((a,b)=>b.visits-a.visits).slice(0,10).map(n=>`
          <div class="row"><button data-id="${n.id}">${escapeHtml(n.name)}</button><span class="n">${n.visits}</span></div>
        `).join('')}
      </div>`;
  }
  function wireQuickJumps(){
    document.addEventListener('click', (e)=>{
      const b = e.target.closest('#quick-jumps button');
      if (b) selectPlace(b.dataset.id, true);
    });
  }

  // ---------- Timeline ----------
  function drawTimeline(){
    const c = $('#tl-canvas');
    const rect = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    c.width = rect.width * dpr; c.height = rect.height * dpr;
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,rect.width,rect.height);

    const bars = NP.monthHist;
    const maxC = Math.max(...bars.map(b=>b.count));
    const pad = 10;
    const W = rect.width - pad*2;
    const H = rect.height - pad*2;
    const bw = W / bars.length;

    // year gridlines + labels
    ctx.strokeStyle = 'rgba(108,98,87,0.2)';
    ctx.lineWidth = 1;
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.fillStyle = 'rgba(107,98,87,0.8)';
    for (let y=NP.yearRange[0]; y<=NP.yearRange[1]; y++){
      const idx = (y - NP.yearRange[0]) * 12;
      const x = pad + idx*bw;
      ctx.beginPath(); ctx.moveTo(x, pad); ctx.lineTo(x, rect.height-pad); ctx.stroke();
      ctx.fillText(y, x+3, rect.height-pad-1);
    }

    // bars (per-month)
    for (let i=0; i<bars.length; i++){
      const b = bars[i];
      const inRange = (b.key >= state.mMin && b.key <= state.mMax);
      const h = (b.count / maxC) * H;
      ctx.fillStyle = inRange ? '#B5341E' : 'rgba(140,130,117,0.55)';
      ctx.fillRect(pad + i*bw + 0.5, rect.height - pad - h, Math.max(1, bw-1), h);
    }

    // selection overlay — month-granular
    const i0 = state.mMin - NP.monthRange[0];
    const i1 = state.mMax - NP.monthRange[0];
    const x0 = pad + i0*bw;
    const x1 = pad + (i1+1)*bw;
    // dim outside selection
    ctx.fillStyle = 'rgba(243,234,219,0.55)';
    if (x0 > pad) ctx.fillRect(pad, pad, x0-pad, rect.height-pad*2);
    if (x1 < rect.width - pad) ctx.fillRect(x1, pad, (rect.width-pad)-x1, rect.height-pad*2);
    // border
    ctx.strokeStyle = 'rgba(26,22,20,0.8)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x0+0.5, pad+0.5, Math.max(1, x1-x0-1), rect.height - pad*2 - 1);

    // legend
    const totalInRange = bars.filter(b=>b.key>=state.mMin && b.key<=state.mMax).reduce((s,b)=>s+b.count, 0);
    $('#tl-legend').innerHTML = `<strong>${totalInRange.toLocaleString()}</strong> trips · <span class="muted">${fmtMonthKey(state.mMin)} – ${fmtMonthKey(state.mMax)}</span>`;
  }
  function wireTimelineInteractions(){
    const c = $('#tl-canvas');
    let dragging = null;
    const kAt = (clientX)=>{
      const rect = c.getBoundingClientRect();
      const pad = 10;
      const W = rect.width - pad*2;
      const totalMonths = NP.monthRange[1] - NP.monthRange[0] + 1;
      const bw = W / totalMonths;
      const idx = Math.max(0, Math.min(totalMonths-1, Math.floor((clientX - rect.left - pad) / bw)));
      return NP.monthRange[0] + idx;
    };
    const sync = ()=>{
      if (wireDateInputs._sync) wireDateInputs._sync();
    };
    c.addEventListener('mousedown',(e)=>{
      const k = kAt(e.clientX);
      dragging = { anchor: k };
      state.mMin = k; state.mMax = k;
      sync();
      drawTimeline(); refreshGraph();
      e.preventDefault();
    });
    window.addEventListener('mousemove',(e)=>{
      if (!dragging) return;
      const k = kAt(e.clientX);
      state.mMin = Math.min(dragging.anchor, k);
      state.mMax = Math.max(dragging.anchor, k);
      sync();
      drawTimeline(); refreshGraph();
    });
    window.addEventListener('mouseup',()=>{ dragging = null; });
    // double-click to reset
    c.addEventListener('dblclick', ()=>{
      state.mMin = NP.monthRange[0]; state.mMax = NP.monthRange[1];
      sync(); drawTimeline(); refreshGraph();
    });
  }

  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]); }

  // ---------- Labels toggle ----------
  function wireLabelsToggle(){
    const cb = $('#tw-labels');
    if (!cb) return;
    cb.addEventListener('change', (e)=>{
      document.body.classList.toggle('no-labels', !e.target.checked);
      renderer.draw();
    });
  }

  // ---------- Canvas controls ----------
  function wireCanvasControls(){
    $('#btn-zoom-in').addEventListener('click', ()=>renderer.zoomBy(1.25));
    $('#btn-zoom-out').addEventListener('click', ()=>renderer.zoomBy(0.8));
    $('#btn-fit').addEventListener('click', ()=>renderer.resetView());
  }

  // ---------- Keyboard on canvas (a11y) ----------
  function wireCanvasKeys(){
    canvas.addEventListener('keydown', (e)=>{
      const step = 40;
      if (e.key === 'ArrowLeft'){ renderer.tx += step; renderer.draw(); e.preventDefault(); }
      else if (e.key === 'ArrowRight'){ renderer.tx -= step; renderer.draw(); e.preventDefault(); }
      else if (e.key === 'ArrowUp'){ renderer.ty += step; renderer.draw(); e.preventDefault(); }
      else if (e.key === 'ArrowDown'){ renderer.ty -= step; renderer.draw(); e.preventDefault(); }
      else if (e.key === '+' || e.key === '='){ renderer.zoomBy(1.25); e.preventDefault(); }
      else if (e.key === '-'){ renderer.zoomBy(0.8); e.preventDefault(); }
      else if (e.key === '0'){ renderer.resetView(); e.preventDefault(); }
      else if (e.key === 'Escape'){
        if (state.selectedId){ state.selectedId = null; renderer.setFocus(null); renderDetail(null); }
      }
    });
  }

  // ---------- Init ----------
  function init(){
    renderer = new NP.Renderer(canvas, { onHover, onClick });
    renderModeChips();
    renderRegionChips();
    populateCompanions();
    // wireYearSlider();  // removed — Year Range slider deleted; the timeline brush owns year filtering
    wireDateInputs();
    wireTopN();
    wireSearch();
    wireLayoutSeg();
    wireEgo();
    wireClears();
    wireCanvasControls();
    wireCanvasKeys();
    wireLabelsToggle();
    wireQuickJumps();
    $('#detail-body').innerHTML = defaultDetail();
    drawTimeline();
    wireTimelineInteractions();
    window.addEventListener('resize', drawTimeline);
    refreshGraph();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
