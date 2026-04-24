/* Networking Pepys — canvas renderer
   Draws edges + nodes with zoom/pan, hover, click, a11y fallback.
*/
(function(){
  const NP = window.NP;

  NP.Renderer = class {
    constructor(canvas, opts={}){
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.dpr = window.devicePixelRatio || 1;
      this.scale = 1; this.tx = 0; this.ty = 0;
      this.positions = {};
      this.nodes = [];           // [{id, r, color, label, visits}]
      this.edges = [];           // [{a, b, w, color}]
      this.hoverId = null;
      this.focusId = null;
      this.onHover = opts.onHover || (()=>{});
      this.onClick = opts.onClick || (()=>{});
      this.bind();
      this.resize();
      let _rt;
      window.addEventListener('resize', ()=>{
        if (_rt) cancelAnimationFrame(_rt);
        _rt = requestAnimationFrame(()=>this.resize());
      });
    }
    resize(){
      const rect = this.canvas.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width * this.dpr));
      const h = Math.max(1, Math.floor(rect.height * this.dpr));
      if (this.canvas.width !== w) this.canvas.width = w;
      if (this.canvas.height !== h) this.canvas.height = h;
      this.w = rect.width; this.h = rect.height;
      this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
      this.draw();
    }
    setGraph(nodes, edges, positions){
      this.nodes = nodes; this.edges = edges; this.positions = positions;
      this.draw();
    }
    setBackdrop(fn){ this.backdrop = fn; this.draw(); }
    setHover(id){ if (this.hoverId!==id){ this.hoverId = id; this.draw(); } }
    setFocus(id){ this.focusId = id; this.draw(); }

    worldFromClient(cx, cy){
      const rect = this.canvas.getBoundingClientRect();
      const x = (cx - rect.left - this.tx) / this.scale;
      const y = (cy - rect.top - this.ty) / this.scale;
      return {x, y};
    }
    hitTest(cx, cy){
      const rect = this.canvas.getBoundingClientRect();
      const x = cx - rect.left, y = cy - rect.top;
      // iterate in reverse so top-drawn wins
      for (let i=this.nodes.length-1; i>=0; i--){
        const n = this.nodes[i];
        const p = this.positions[n.id];
        if (!p) continue;
        const sx = p.x * this.scale + this.tx;
        const sy = p.y * this.scale + this.ty;
        const r = Math.max(3, n.r * Math.sqrt(this.scale)) + 3;
        if ((x-sx)*(x-sx) + (y-sy)*(y-sy) <= r*r) return n.id;
      }
      return null;
    }
    bind(){
      const c = this.canvas;
      let dragging = false, dragStart = null, moved = false;
      c.addEventListener('mousedown', (e)=>{
        dragging = true; dragStart = {x:e.clientX, y:e.clientY, tx:this.tx, ty:this.ty}; moved=false;
      });
      window.addEventListener('mouseup', (e)=>{
        if (dragging && !moved){
          const id = this.hitTest(e.clientX, e.clientY);
          this.onClick(id);
        }
        dragging = false;
      });
      window.addEventListener('mousemove', (e)=>{
        if (dragging){
          const dx = e.clientX - dragStart.x;
          const dy = e.clientY - dragStart.y;
          if (Math.abs(dx)+Math.abs(dy) > 3) moved = true;
          this.tx = dragStart.tx + dx; this.ty = dragStart.ty + dy;
          this.draw();
        } else {
          const id = this.hitTest(e.clientX, e.clientY);
          this.setHover(id);
          this.onHover(id, e.clientX, e.clientY);
        }
      });
      c.addEventListener('wheel', (e)=>{
        e.preventDefault();
        const rect = c.getBoundingClientRect();
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        const wx = (mx - this.tx)/this.scale, wy = (my - this.ty)/this.scale;
        const factor = Math.exp(-e.deltaY * 0.0015);
        this.scale = Math.max(0.25, Math.min(6, this.scale * factor));
        this.tx = mx - wx*this.scale; this.ty = my - wy*this.scale;
        this.draw();
      }, {passive:false});
    }
    zoomBy(f){
      const cx = this.w/2, cy = this.h/2;
      const wx = (cx - this.tx)/this.scale, wy = (cy - this.ty)/this.scale;
      this.scale = Math.max(0.25, Math.min(6, this.scale * f));
      this.tx = cx - wx*this.scale; this.ty = cy - wy*this.scale;
      this.draw();
    }
    resetView(){
      // fit all nodes
      if (!this.nodes.length) return;
      let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
      for (const n of this.nodes){
        const p = this.positions[n.id]; if (!p) continue;
        if (p.x<minX)minX=p.x; if (p.y<minY)minY=p.y;
        if (p.x>maxX)maxX=p.x; if (p.y>maxY)maxY=p.y;
      }
      const pad = 40;
      const sx = (this.w - pad*2) / Math.max(1, (maxX-minX));
      const sy = (this.h - pad*2) / Math.max(1, (maxY-minY));
      this.scale = Math.min(sx, sy, 2.4);
      const cx = (minX+maxX)/2, cy = (minY+maxY)/2;
      this.tx = this.w/2 - cx*this.scale;
      this.ty = this.h/2 - cy*this.scale;
      this.draw();
    }

    draw(){
      const ctx = this.ctx;
      ctx.clearRect(0,0,this.w,this.h);
      ctx.save();
      ctx.translate(this.tx, this.ty);
      ctx.scale(this.scale, this.scale);

      // Optional backdrop (e.g., geographic map) drawn in world space
      if (this.backdrop){
        try { this.backdrop(ctx, this); } catch(err){ /* ignore */ }
      }

      const hover = this.hoverId;
      const focus = this.focusId;
      // build quick lookup for connected set (for highlight on hover/focus)
      let highlightSet = null;
      const highlightId = focus || hover;
      if (highlightId){
        highlightSet = new Set([highlightId]);
        for (const e of this.edges){
          if (e.a === highlightId) highlightSet.add(e.b);
          else if (e.b === highlightId) highlightSet.add(e.a);
        }
      }

      // Edges pass 1: dim
      ctx.lineCap = 'round';
      for (const e of this.edges){
        const pa = this.positions[e.a], pb = this.positions[e.b];
        if (!pa || !pb) continue;
        const isHot = highlightSet && (e.a === highlightId || e.b === highlightId);
        if (highlightSet && !isHot){
          ctx.strokeStyle = 'rgba(60,45,35,0.06)';
          ctx.lineWidth = Math.max(0.4, e.w) / this.scale;
        } else if (isHot){
          continue; // draw later on top
        } else {
          ctx.strokeStyle = 'rgba(60,45,35,0.22)';
          ctx.lineWidth = Math.max(0.5, e.w) / this.scale;
        }
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
      }
      // Edges pass 2: highlighted on top
      if (highlightSet){
        for (const e of this.edges){
          if (e.a !== highlightId && e.b !== highlightId) continue;
          const pa = this.positions[e.a], pb = this.positions[e.b];
          if (!pa || !pb) continue;
          ctx.strokeStyle = 'rgba(181,52,30,0.70)';
          ctx.lineWidth = Math.max(1.2, e.w*1.4) / this.scale;
          ctx.beginPath();
          ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y);
          ctx.stroke();
        }
      }

      // Nodes
      for (const n of this.nodes){
        const p = this.positions[n.id]; if (!p) continue;
        const isFocus = n.id === focus;
        const isHover = n.id === hover;
        const inSet = highlightSet ? highlightSet.has(n.id) : true;
        const r = n.r / Math.sqrt(this.scale);
        // fill
        let fill, stroke, sw;
        if (isFocus){
          fill = '#B5341E'; stroke = '#F3EADB'; sw = 2.5 / this.scale;
        } else if (isHover){
          fill = '#C07A2E'; stroke = '#1A1614'; sw = 1.5 / this.scale;
        } else if (highlightSet && inSet){
          fill = '#C07A2E'; stroke = '#1A1614'; sw = 1/this.scale;
        } else if (highlightSet){
          fill = 'rgba(140,130,117,0.35)'; stroke = 'rgba(26,22,20,0.25)'; sw = 0.6/this.scale;
        } else {
          fill = '#8C8275'; stroke = '#1A1614'; sw = 1/this.scale;
        }
        ctx.fillStyle = fill;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = sw;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI*2);
        ctx.fill(); ctx.stroke();
      }

      // Labels for top-visit / focus / hover / connected
      ctx.font = `${12/this.scale}px 'EB Garamond', Georgia, serif`;
      ctx.fillStyle = '#1A1614';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      // threshold: always label focus/hover/connected; otherwise top-N by visits
      const labeled = new Set();
      if (focus) labeled.add(focus);
      if (hover) labeled.add(hover);
      if (highlightSet) highlightSet.forEach(id => labeled.add(id));
      // top-visit labels even w/o highlight — top 12
      const sortedByVisits = this.nodes.slice().sort((a,b)=>b.visits - a.visits).slice(0, highlightSet ? 0 : 14);
      sortedByVisits.forEach(n => labeled.add(n.id));

      for (const id of labeled){
        const n = this.nodes.find(nn => nn.id === id);
        if (!n) continue;
        const p = this.positions[id]; if (!p) continue;
        const r = n.r / Math.sqrt(this.scale);
        const txt = n.label;
        // measure
        const mx = p.x + r + 4/this.scale;
        const my = p.y;
        // Subtle halo so text stays legible against edges
        ctx.save();
        ctx.lineWidth = 3 / this.scale;
        ctx.strokeStyle = 'rgba(243,234,219,0.85)';
        ctx.strokeText(txt, mx, my);
        ctx.fillStyle = (id === focus) ? '#8A2815' : '#1A1614';
        ctx.fillText(txt, mx, my);
        ctx.restore();
      }
      ctx.restore();
    }
  };
})();
