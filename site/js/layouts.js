/* Networking Pepys — force-directed / concentric / schematic-geographic layouts.
   Canvas-based for performance.
*/
(function(){
  const NP = window.NP;

  // ---------- Schematic geography ----------
  // Rough normalized coordinates (0..1) for known London regions + outlying landmarks.
  // x is east-west (0 = far west), y is north-south (0 = north).
  // Thames runs roughly east-west around y ~ 0.55
  const REGION_XY = {
    'Westminster & Whitehall': [0.32, 0.52],
    'Strand & Holborn':        [0.42, 0.45],
    'City of London':          [0.58, 0.48],
    'Thames Dockyards':        [0.80, 0.60],
    'Southwark & Lambeth':     [0.48, 0.66],
    'Middlesex & Suburbs':     [0.42, 0.28],
    'Countryside':             [0.12, 0.22],
    'Ships & Abroad':          [0.88, 0.88],
    'Taverns & Inns':          [0.52, 0.40],
    'London (unspecified)':    [0.50, 0.45],
    'Other':                   [0.20, 0.78],
  };
  // fine-tuning for a few specific location strings
  const LOC_XY = {
    'greenwich': [0.88, 0.58], 'deptford': [0.82, 0.62], 'woolwich': [0.94, 0.60],
    'bankside, southwark': [0.46, 0.68], 'ratcliffe': [0.78, 0.54],
  };

  function seedRand(seed){
    let s = seed;
    return function(){
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }

  NP.layoutSchematic = function(nodes, width, height){
    const positions = {};
    const pad = 60;
    const W = width - pad*2, H = height - pad*2;
    for (const n of nodes){
      const loc = (n.location||'').toLowerCase();
      let xy = LOC_XY[loc] || REGION_XY[n.region] || [0.5, 0.5];
      const r = seedRand(hashCode(n.id));
      // jitter within region cluster
      const spread = (n.region === 'Ships & Abroad' || n.region === 'Countryside') ? 0.12 : 0.07;
      const jx = (r() - 0.5) * spread;
      const jy = (r() - 0.5) * spread;
      positions[n.id] = {
        x: pad + (xy[0] + jx) * W,
        y: pad + (xy[1] + jy) * H,
      };
    }
    return positions;
  };

  // ---------- Geographic backdrop ----------
  // Stylized, schematic map of London + SE England used in 'schematic' layout.
  // Drawn in world-space (post-transform) — the renderer handles pan/zoom.
  // Uses the same pad + normalized (0..1) mapping as layoutSchematic.
  NP.makeMapBackdrop = function(width, height){
    const pad = 60;
    const W = width - pad*2, H = height - pad*2;
    const P = (nx, ny) => ({ x: pad + nx*W, y: pad + ny*H });

    // Thames path (control points in normalized space, flowing west -> east)
    const thamesPoints = [
      [0.02, 0.80], [0.12, 0.70], [0.22, 0.64],
      [0.30, 0.60], [0.36, 0.62], [0.44, 0.68],  // big southward loop at Lambeth
      [0.50, 0.62], [0.56, 0.55], [0.62, 0.56],
      [0.68, 0.62], [0.74, 0.64],                 // Isle of Dogs loop
      [0.78, 0.58], [0.82, 0.60], [0.86, 0.64],
      [0.92, 0.68], [1.02, 0.74],
    ].map(([x,y]) => P(x,y));

    // Landmarks to label on the map (different from graph nodes)
    const landmarks = [
      // [nx, ny, 'LABEL', alignment-hint]
      [0.32, 0.38, 'WESTMINSTER', 'center'],
      [0.44, 0.32, 'HOLBORN', 'center'],
      [0.58, 0.35, 'CITY', 'center'],
      [0.72, 0.46, 'EAST END', 'center'],
      [0.46, 0.78, 'SOUTHWARK', 'center'],
      [0.28, 0.80, 'LAMBETH', 'center'],
      [0.82, 0.68, 'DEPTFORD', 'right'],
      [0.90, 0.54, 'GREENWICH', 'right'],
      [0.96, 0.62, 'WOOLWICH', 'right'],
      [0.14, 0.22, 'MIDDLESEX', 'center'],
      [0.04, 0.08, 'N', 'compass'],
    ];

    // North-shore dots for Fleet ditch, Tower, etc. (subtle visual anchors)
    const dots = [
      [0.40, 0.50, 'Fleet'],
      [0.66, 0.50, 'Tower'],
      [0.32, 0.54, 'Whitehall'],
    ];

    return function(ctx){
      ctx.save();

      // Land tint (subtle warm vellum) — filled rectangle with soft edge
      ctx.globalAlpha = 0.45;
      const grad = ctx.createLinearGradient(P(0,0).x, P(0,0).y, P(1,1).x, P(1,1).y);
      grad.addColorStop(0, 'rgba(229,213,186,0.35)');
      grad.addColorStop(1, 'rgba(200,178,147,0.18)');
      ctx.fillStyle = grad;
      ctx.fillRect(P(-0.05,-0.05).x, P(-0.05,-0.05).y,
                   P(1.10,1.10).x - P(-0.05,-0.05).x,
                   P(1.10,1.10).y - P(-0.05,-0.05).y);
      ctx.globalAlpha = 1;

      // Coastline / outer boundary — rough hand-drawn feel (dashed and offset)
      ctx.strokeStyle = 'rgba(120,88,60,0.22)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4,6]);
      ctx.beginPath();
      const outline = [[0.02,0.02],[0.98,0.02],[0.98,0.98],[0.02,0.98],[0.02,0.02]]
        .map(([x,y])=>P(x,y));
      outline.forEach((p,i)=> i===0 ? ctx.moveTo(p.x,p.y) : ctx.lineTo(p.x,p.y));
      ctx.stroke();
      ctx.setLineDash([]);

      // Thames: wide translucent band, darker centerline
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(120,150,170,0.30)';
      ctx.lineWidth = 22;
      ctx.beginPath();
      thamesPoints.forEach((p,i)=>{
        if (i===0) ctx.moveTo(p.x, p.y);
        else {
          const prev = thamesPoints[i-1];
          const cx = (prev.x + p.x)/2, cy = (prev.y + p.y)/2;
          ctx.quadraticCurveTo(prev.x, prev.y, cx, cy);
        }
      });
      // final point
      const last = thamesPoints[thamesPoints.length-1];
      ctx.lineTo(last.x, last.y);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(80,110,130,0.55)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label for the Thames
      ctx.save();
      ctx.font = "italic 14px 'EB Garamond', Georgia, serif";
      ctx.fillStyle = 'rgba(60,90,110,0.85)';
      const tp = P(0.56, 0.50);
      ctx.fillText('R. Thames', tp.x, tp.y);
      ctx.restore();

      // Zone labels (all caps, spaced tracking, subtle)
      ctx.save();
      ctx.font = "600 10px 'JetBrains Mono', monospace";
      ctx.fillStyle = 'rgba(70,55,45,0.50)';
      ctx.textBaseline = 'middle';
      landmarks.forEach(([nx,ny,label,kind])=>{
        const p = P(nx,ny);
        if (kind === 'compass'){
          // Tiny compass rose
          ctx.save();
          ctx.strokeStyle = 'rgba(70,55,45,0.55)';
          ctx.fillStyle = 'rgba(70,55,45,0.85)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 10, 0, Math.PI*2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(p.x, p.y-14); ctx.lineTo(p.x-4, p.y); ctx.lineTo(p.x, p.y-4); ctx.lineTo(p.x+4, p.y); ctx.closePath();
          ctx.fill();
          ctx.font = "bold 9px 'JetBrains Mono', monospace";
          ctx.textAlign = 'center';
          ctx.fillText('N', p.x, p.y+14);
          ctx.restore();
          return;
        }
        ctx.textAlign = kind === 'right' ? 'right' : 'center';
        const offX = kind === 'right' ? -4 : 0;
        // letter-spacing fake by drawing spaced text
        const spaced = label.split('').join(' ');
        ctx.fillText(spaced, p.x + offX, p.y);
      });
      ctx.restore();

      // Anchor dots
      ctx.save();
      ctx.fillStyle = 'rgba(120,88,60,0.35)';
      ctx.font = "italic 10px 'EB Garamond', Georgia, serif";
      dots.forEach(([nx,ny,label])=>{
        const p = P(nx,ny);
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.8, 0, Math.PI*2); ctx.fill();
        ctx.fillText(label, p.x+4, p.y-2);
      });
      ctx.restore();

      ctx.restore();
    };
  };

  // ---------- Concentric (ego-like, rings by visit count) ----------
  NP.layoutConcentric = function(nodes, width, height, nodeVisits, focusId){
    // bucket nodes into rings: focus(0), top tier(1), mid(2), rest(3)
    const cx = width/2, cy = height/2;
    // sort by visits desc
    const sorted = nodes.slice().sort((a,b) => (nodeVisits.get(b.id)||0) - (nodeVisits.get(a.id)||0));
    const positions = {};
    const n = sorted.length;
    if (n===0) return positions;
    // ring sizes proportional to viewport
    const maxR = Math.min(width, height) * 0.44;
    // Figure ring cutoffs dynamically
    const r1 = 4, r2 = Math.min(24, Math.ceil(n*0.12)), r3 = Math.min(80, Math.ceil(n*0.35));
    const rings = [
      {count: 0, radius: 0, nodes: []},       // focus
      {count: r1, radius: maxR*0.30, nodes: []},
      {count: r2, radius: maxR*0.58, nodes: []},
      {count: r3, radius: maxR*0.82, nodes: []},
      {count: Infinity, radius: maxR*1.05, nodes: []},
    ];
    // place focus if given
    let startIdx = 0;
    if (focusId){
      const idx = sorted.findIndex(nn => nn.id === focusId);
      if (idx >= 0){
        positions[focusId] = { x: cx, y: cy };
        rings[0].nodes.push(focusId);
        sorted.splice(idx, 1);
      }
    }
    // distribute into remaining rings
    let taken = 0;
    for (let ri = 1; ri < rings.length; ri++){
      const want = rings[ri].count - (rings[ri-1] ? rings[ri-1].count : 0);
      const end = Math.min(sorted.length, taken + want);
      for (let i=taken; i<end; i++) rings[ri].nodes.push(sorted[i].id);
      taken = end;
    }
    // place any leftovers on the outermost
    for (let i=taken; i<sorted.length; i++) rings[rings.length-1].nodes.push(sorted[i].id);

    for (let ri = 1; ri < rings.length; ri++){
      const ring = rings[ri];
      const k = ring.nodes.length;
      if (!k) continue;
      const offset = (ri % 2 === 0 ? 0 : Math.PI/k);
      for (let i=0; i<k; i++){
        const a = (i / k) * Math.PI * 2 + offset;
        positions[ring.nodes[i]] = {
          x: cx + Math.cos(a) * ring.radius,
          y: cy + Math.sin(a) * ring.radius,
        };
      }
    }
    return positions;
  };

  // ---------- Force-directed ----------
  // Simple Barnes-Hut-free force sim. Acceptable for ≤400 visible nodes.
  NP.ForceLayout = class {
    constructor(nodes, edges, width, height, opts={}){
      // seed nodes on a spiral so they don't all overlap
      const n = nodes.length;
      this.nodes = nodes.map((node, i) => {
        const a = i * 2.399963; // golden-angle
        const r = Math.sqrt(i/Math.max(1,n)) * Math.min(width, height) * 0.35;
        return {
          id: node.id,
          x: width/2 + Math.cos(a) * r,
          y: height/2 + Math.sin(a) * r,
          vx: 0, vy: 0,
        };
      });
      this.index = {};
      this.nodes.forEach(nn => this.index[nn.id]=nn);
      // edges: array of { a, b, count }
      this.edges = edges.filter(e => this.index[e.a] && this.index[e.b]);
      this.width = width; this.height = height;
      this.alpha = 1;
      this.alphaDecay = opts.alphaDecay || 0.022;
      this.repulsion = opts.repulsion || 900;
      this.linkDist = opts.linkDist || 90;
      this.linkStrength = opts.linkStrength || 0.02;
      this.gravity = opts.gravity || 0.025;
      this.damping = 0.72;
      this.maxVelocity = 40;
      this.pinned = opts.pinned || null; // {id -> {x,y}}
    }
    step(){
      if (this.alpha < 0.01) return false;
      const n = this.nodes.length;
      const nodes = this.nodes;
      // repulsion (O(n^2))
      for (let i=0; i<n; i++){
        const a = nodes[i];
        for (let j=i+1; j<n; j++){
          const b = nodes[j];
          let dx = a.x - b.x, dy = a.y - b.y;
          let d2 = dx*dx + dy*dy;
          if (d2 < 0.01) { d2 = 0.01; dx = 0.1; dy = 0.1; }
          const d = Math.sqrt(d2);
          const force = this.repulsion / d2;
          const fx = (dx/d) * force;
          const fy = (dy/d) * force;
          a.vx += fx; a.vy += fy;
          b.vx -= fx; b.vy -= fy;
        }
      }
      // links
      for (const e of this.edges){
        const a = this.index[e.a], b = this.index[e.b];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.max(0.1, Math.sqrt(dx*dx + dy*dy));
        const w = Math.log(1 + e.count) / Math.log(20);
        const strength = this.linkStrength * (0.5 + w);
        let f = (d - this.linkDist) * strength;
        // clamp link force magnitude
        f = Math.max(-8, Math.min(8, f));
        const fx = (dx/d) * f;
        const fy = (dy/d) * f;
        a.vx += fx; a.vy += fy;
        b.vx -= fx; b.vy -= fy;
      }
      // gravity
      const cx = this.width/2, cy = this.height/2;
      for (const p of nodes){
        p.vx += (cx - p.x) * this.gravity;
        p.vy += (cy - p.y) * this.gravity;
      }
      // integrate
      for (const p of nodes){
        p.vx *= this.damping;
        p.vy *= this.damping;
        // clamp
        const vm = Math.sqrt(p.vx*p.vx + p.vy*p.vy);
        if (vm > this.maxVelocity){ p.vx = p.vx/vm * this.maxVelocity; p.vy = p.vy/vm * this.maxVelocity; }
        p.x += p.vx * this.alpha;
        p.y += p.vy * this.alpha;
      }
      if (this.pinned){
        for (const id in this.pinned){
          const p = this.index[id];
          if (p){ p.x = this.pinned[id].x; p.y = this.pinned[id].y; p.vx = 0; p.vy = 0; }
        }
      }
      this.alpha *= (1 - this.alphaDecay);
      return true;
    }
    positions(){
      const out = {};
      for (const n of this.nodes) out[n.id] = { x: n.x, y: n.y };
      return out;
    }
  };

  function hashCode(s){
    let h=0; for (let i=0;i<s.length;i++) h = (h*31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }
  NP.hashCode = hashCode;
})();
