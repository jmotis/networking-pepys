/* Networking Pepys — data preprocessing helpers
   Exposed on window.NP.
*/
(function(){
  const NP = window.NP = window.NP || {};
  const D = window.PEPYS_DATA;
  if (!D) { console.error('PEPYS_DATA missing'); return; }

  // Edge tuple indices: [s, t, y, m, d, mo, co]
  const E = D.edges.map(e => ({
    s: e[0], t: e[1], y: e[2], m: e[3], d: e[4], mode: e[5], co: e[6]
  }));

  // Index nodes by id
  const nodeById = {};
  D.nodes.forEach(n => { nodeById[n.id] = n; });

  // Companion list: flatten semicolon-separated entries; count occurrences
  const companionCounts = {};
  for (const e of E){
    if (!e.co) continue;
    const parts = e.co.split(';').map(s=>s.trim()).filter(Boolean);
    for (const p of parts) companionCounts[p] = (companionCounts[p]||0)+1;
  }
  const companions = Object.entries(companionCounts).sort((a,b)=>b[1]-a[1]).map(([name,count])=>({name,count}));

  // Regions present (ordered by frequency in nodes)
  const regionCounts = {};
  D.nodes.forEach(n => { regionCounts[n.region] = (regionCounts[n.region]||0)+1; });
  const regions = Object.entries(regionCounts).sort((a,b)=>b[1]-a[1]).map(([name,count])=>({name,count}));

  // Year range
  let minY=Infinity, maxY=-Infinity;
  for (const e of E){ if (e.y<minY) minY=e.y; if (e.y>maxY) maxY=e.y; }

  // Months list: { y, m, key: y*12+m }
  const monthBins = {};
  for (const e of E){
    const key = e.y*12 + (e.m-1);
    monthBins[key] = (monthBins[key]||0)+1;
  }
  const monthStart = minY*12;
  const monthEnd = maxY*12 + 11;
  const monthHist = [];
  for (let k=monthStart; k<=monthEnd; k++) monthHist.push({ key:k, y: Math.floor(k/12), m: (k%12)+1, count: monthBins[k]||0 });

  // Mode palette
  const MODE_COLORS = {
    walk:  '#6B6257',
    coach: '#B5341E',
    boat:  '#2E6A7A',
    horse: '#8A5A2B',
    ship:  '#4A4A8A',
  };

  NP.nodes = D.nodes;
  NP.nodeById = nodeById;
  NP.edges = E;
  NP.companions = companions;
  NP.regions = regions;
  NP.yearRange = [minY, maxY];
  NP.monthHist = monthHist;
  NP.monthRange = [monthStart, monthEnd];
  NP.MODE_COLORS = MODE_COLORS;

  // Build filtered pair counts given current filter state
  // filter: { yMin, yMax, modes:Set, companions:Set|null ('ANY'), regions:Set|null ('ANY') }
  NP.computeFilteredGraph = function(f){
    const pair = new Map();     // key "a|b" -> { a, b, count }
    const nodeVisits = new Map(); // id -> count
    const inc = (id) => nodeVisits.set(id, (nodeVisits.get(id)||0)+1);
    const checkCo = (co) => {
      if (!f.companions || f.companions === 'ANY') return true;
      if (!co) return false;
      const parts = co.split(';').map(s=>s.trim());
      for (const p of parts) if (f.companions.has(p)) return true;
      return false;
    };
    const checkRegion = (nodeId) => {
      if (!f.regions || f.regions === 'ANY') return true;
      const n = nodeById[nodeId];
      if (!n) return false;
      return f.regions.has(n.region);
    };

    const mKey = (a,b) => a<b ? a+'|'+b : b+'|'+a;

    for (const e of E){
      const mk = e.y*12 + (e.m-1);
      if (mk < f.mMin || mk > f.mMax) continue;
      if (!f.modes.has(e.mode)) continue;
      if (!checkCo(e.co)) continue;
      // region: require at least one endpoint in selected regions
      if (f.regions && f.regions !== 'ANY'){
        const sn = nodeById[e.s], tn = nodeById[e.t];
        if (!((sn && f.regions.has(sn.region)) || (tn && f.regions.has(tn.region)))) continue;
      }
      const k = mKey(e.s, e.t);
      let p = pair.get(k);
      if (!p){ p = { a: e.s, b: e.t, count: 0, modes: {} }; pair.set(k, p); }
      p.count++;
      p.modes[e.mode] = (p.modes[e.mode]||0) + 1;
      inc(e.s); inc(e.t);
    }
    return { pair, nodeVisits };
  };

  // For a given place, return detailed stats (all-time, unfiltered)
  NP.placeStats = function(id){
    const node = nodeById[id];
    if (!node) return null;
    let total = 0;
    const byYear = {};
    const byMonth = new Array(monthHist.length).fill(0);
    const byMode = {};
    const coCounts = {};
    const partnerCounts = {};
    for (const e of E){
      if (e.s !== id && e.t !== id) continue;
      total++;
      byYear[e.y] = (byYear[e.y]||0)+1;
      const idx = e.y*12 + (e.m-1) - monthStart;
      if (idx>=0 && idx<byMonth.length) byMonth[idx]++;
      byMode[e.mode] = (byMode[e.mode]||0)+1;
      if (e.co){
        for (const p of e.co.split(';').map(s=>s.trim()).filter(Boolean)){
          coCounts[p] = (coCounts[p]||0)+1;
        }
      }
      const other = e.s === id ? e.t : e.s;
      partnerCounts[other] = (partnerCounts[other]||0) + 1;
    }
    const topCompanions = Object.entries(coCounts).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([n,c])=>({name:n,count:c}));
    const topPartners = Object.entries(partnerCounts).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([id,c])=>({id, name: (nodeById[id]||{}).name || id, count:c}));
    return { node, total, byYear, byMonth, byMode, topCompanions, topPartners };
  };
})();
