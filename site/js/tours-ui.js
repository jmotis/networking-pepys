/* Tours UI: intro modal + chapter strip.
   Depends on NP.TOURS (tours.js) and NP.applyTourChapter / NP.resetAllFilters (app.js).
*/
(function(){
  const NP = window.NP;
  const SEEN_KEY = 'np-intro-seen-v1';

  // ---------- Helpers ----------
  const h = (tag, attrs, ...children) => {
    const el = document.createElement(tag);
    if (attrs){
      for (const k in attrs){
        if (k === 'class') el.className = attrs[k];
        else if (k === 'html') el.innerHTML = attrs[k];
        else if (k.startsWith('on') && typeof attrs[k] === 'function') el.addEventListener(k.slice(2), attrs[k]);
        else el.setAttribute(k, attrs[k]);
      }
    }
    for (const c of children){
      if (c == null) continue;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return el;
  };

  // ---------- Intro modal ----------
  function buildIntroModal(){
    const modal = h('div', {class: 'np-modal', role: 'dialog', 'aria-label': 'Networking Pepys intro', id: 'np-intro'});
    const card  = h('div', {class: 'np-modal-card'});

    // Left column — hero / context
    const hero = h('div', {class: 'np-intro-hero'});
    hero.appendChild(h('div', {class: 'np-kicker'}, 'a networked reading of'));
    hero.appendChild(h('h2', {class: 'np-intro-title', html: 'The Diary of <em>Samuel Pepys</em>'}));
    hero.appendChild(h('div', {class: 'np-intro-sub'}, '1660 – 1669 · London'));
    hero.appendChild(h('p', {class: 'np-intro-body'},
      "Between the Restoration of Charles II and the disastrous Dutch raid on the Medway, Samuel Pepys — a mid-ranking naval clerk — kept a diary so compulsively geographic that it can be turned into a map of a city in motion."
    ));
    hero.appendChild(h('p', {class: 'np-intro-body'},
      "13,524 movements. 912 distinct places. A single life, rendered as a network."
    ));
    // Stat strip
    const stats = h('div', {class: 'np-stats'});
    stats.append(
      h('div', {class: 'np-stat'}, h('span', {class: 'np-stat-n'}, '912'), h('span', {class: 'np-stat-l'}, 'places')),
      h('div', {class: 'np-stat'}, h('span', {class: 'np-stat-n'}, '13,524'), h('span', {class: 'np-stat-l'}, 'trips')),
      h('div', {class: 'np-stat'}, h('span', {class: 'np-stat-n'}, '10'), h('span', {class: 'np-stat-l'}, 'years')),
    );
    hero.appendChild(stats);
    hero.appendChild(h('div', {class: 'np-source'},
      "Derived from the Latimer & Wheatley editions of the Diary, annotated by Phil Gyford. Method, caveats, and credits in About."
    ));

    // Right column — tour cards
    const pickerWrap = h('div', {class: 'np-intro-picker'});
    pickerWrap.appendChild(h('div', {class: 'np-kicker'}, 'Guided readings'));
    pickerWrap.appendChild(h('h3', {class: 'np-picker-title'}, 'Three ways in.'));
    pickerWrap.appendChild(h('p', {class: 'np-picker-sub'}, 'Each tour takes about two minutes. Filters drive themselves; narrative rides alongside.'));

    const grid = h('div', {class: 'np-tour-grid'});
    for (const t of NP.TOURS){
      const n = t.chapters.length;
      const card = h('button', {
        class: 'np-tour-card',
        'data-tour': t.id,
        style: `--accent:${t.accent}`,
        onclick: ()=>{ dismissIntro(); NP.startTour(t.id); },
      });
      card.appendChild(h('div', {class: 'np-tour-kicker'}, t.kicker));
      card.appendChild(h('div', {class: 'np-tour-title'}, t.title));
      card.appendChild(h('div', {class: 'np-tour-body'}, t.summary));
      card.appendChild(h('div', {class: 'np-tour-meta'},
        h('span', {class: 'np-tour-chapters'}, `${n} chapter${n===1?'':'s'}`),
        h('span', {class: 'np-tour-cta'}, 'Begin →')
      ));
      grid.appendChild(card);
    }
    pickerWrap.appendChild(grid);

    const freeBtn = h('button', {class: 'np-free-btn', onclick: dismissIntro},
      'Or explore freely — skip the tours'
    );
    pickerWrap.appendChild(freeBtn);

    card.append(hero, pickerWrap);
    modal.appendChild(card);

    // Click outside to dismiss
    modal.addEventListener('click', (e)=>{
      if (e.target === modal) dismissIntro();
    });
    // Escape to dismiss
    modal.addEventListener('keydown', (e)=>{
      if (e.key === 'Escape') dismissIntro();
    });
    return modal;
  }

  function showIntro(){
    if ($('#np-intro')) return;
    const modal = buildIntroModal();
    document.body.appendChild(modal);
    requestAnimationFrame(()=> modal.classList.add('open'));
    // Focus first tour card for keyboard users
    setTimeout(()=>{
      const first = modal.querySelector('.np-tour-card');
      if (first) first.focus();
    }, 100);
  }

  function dismissIntro(){
    const modal = $('#np-intro');
    if (!modal) return;
    modal.classList.remove('open');
    setTimeout(()=> modal.remove(), 260);
    try { localStorage.setItem(SEEN_KEY, '1'); } catch(e){}
  }

  // ---------- Tour chapter strip ----------
  let activeTour = null;
  let activeIdx = 0;

  function buildStrip(){
    const strip = h('div', {class: 'np-tour-strip', id: 'np-strip', role: 'region', 'aria-label': 'Guided tour'});
    strip.innerHTML = `
      <div class="np-strip-head">
        <div class="np-strip-title-wrap">
          <div class="np-strip-kicker"></div>
          <div class="np-strip-title"></div>
        </div>
        <div class="np-strip-progress" aria-hidden="true"></div>
        <button class="np-strip-exit" aria-label="Exit tour">Exit tour ×</button>
      </div>
      <div class="np-strip-body">
        <div class="np-strip-chapter">
          <div class="np-strip-ch-title"></div>
          <p class="np-strip-ch-body"></p>
          <div class="np-strip-ch-foot"></div>
        </div>
        <div class="np-strip-nav">
          <button class="np-strip-prev" aria-label="Previous chapter">← Prev</button>
          <div class="np-strip-counter" aria-live="polite"></div>
          <button class="np-strip-next" aria-label="Next chapter">Next →</button>
        </div>
      </div>
    `;
    strip.querySelector('.np-strip-exit').addEventListener('click', exitTour);
    strip.querySelector('.np-strip-prev').addEventListener('click', ()=> goChapter(activeIdx - 1));
    strip.querySelector('.np-strip-next').addEventListener('click', ()=>{
      if (activeIdx === activeTour.chapters.length - 1){ exitTour(); return; }
      goChapter(activeIdx + 1);
    });
    return strip;
  }

  function renderStrip(){
    if (!activeTour) return;
    const strip = $('#np-strip');
    strip.style.setProperty('--accent', activeTour.accent);
    strip.querySelector('.np-strip-kicker').textContent = activeTour.kicker;
    strip.querySelector('.np-strip-title').textContent = activeTour.title;
    const ch = activeTour.chapters[activeIdx];
    strip.querySelector('.np-strip-ch-title').textContent = ch.title;
    strip.querySelector('.np-strip-ch-body').textContent = ch.body;
    strip.querySelector('.np-strip-ch-foot').textContent = ch.footnote || '';
    strip.querySelector('.np-strip-counter').textContent =
      `Chapter ${activeIdx+1} of ${activeTour.chapters.length}`;
    // Progress dots
    const prog = strip.querySelector('.np-strip-progress');
    prog.innerHTML = '';
    activeTour.chapters.forEach((_, i)=>{
      const dot = h('button', {
        class: 'np-prog-dot' + (i === activeIdx ? ' active' : (i < activeIdx ? ' past' : '')),
        'aria-label': `Go to chapter ${i+1}`,
        onclick: ()=> goChapter(i),
      });
      prog.appendChild(dot);
    });
    // Prev/Next state
    strip.querySelector('.np-strip-prev').disabled = (activeIdx === 0);
    strip.querySelector('.np-strip-next').textContent =
      (activeIdx === activeTour.chapters.length - 1) ? 'Finish ✓' : 'Next →';
  }

  function goChapter(i){
    if (!activeTour) return;
    if (i < 0 || i >= activeTour.chapters.length) return;
    activeIdx = i;
    NP.applyTourChapter(activeTour.chapters[i]);
    renderStrip();
  }

  NP.startTour = function(tourId){
    const tour = NP.TOURS_BY_ID[tourId];
    if (!tour) return;
    activeTour = tour;
    activeIdx = 0;
    document.body.classList.add('np-tour-active');
    let strip = $('#np-strip');
    if (!strip){
      strip = buildStrip();
      document.body.appendChild(strip);
    }
    renderStrip();
    NP.applyTourChapter(tour.chapters[0]);
    requestAnimationFrame(()=> strip.classList.add('open'));
  };

  NP.exitTour = exitTour;
  function exitTour(){
    activeTour = null;
    document.body.classList.remove('np-tour-active');
    const strip = $('#np-strip');
    if (strip){
      strip.classList.remove('open');
      setTimeout(()=> strip.remove(), 260);
    }
    // Don't reset filters on exit — user may want to keep exploring from where the tour left them
  }

  // ---------- Tours launcher (top-bar button) ----------
  function buildLauncher(){
    const btn = h('button', {
      class: 'np-tours-launcher',
      'aria-label': 'Open guided tours',
      title: 'Guided tours & intro',
      onclick: showIntro,
    });
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9"/>
        <path d="M15.5 8.5 L10.5 10.5 L8.5 15.5 L13.5 13.5 Z" fill="currentColor" stroke="none"/>
      </svg>
      <span>Tours</span>
    `;
    return btn;
  }

  function $(s){ return document.querySelector(s); }

  // ---------- Init ----------
  function init(){
    // Place launcher in top bar
    const topbar = document.querySelector('.topbar');
    if (topbar){
      const launcher = buildLauncher();
      topbar.appendChild(launcher);
    }
    // Show intro on first visit
    let seen = false;
    try { seen = localStorage.getItem(SEEN_KEY) === '1'; } catch(e){}
    if (!seen){
      // Delay slightly so the network has a chance to render behind the modal
      setTimeout(showIntro, 400);
    }
    // Global shortcut: ESC exits tour
    window.addEventListener('keydown', (e)=>{
      if (e.key === 'Escape' && activeTour && !$('#np-intro')){ exitTour(); }
    });
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
