/* About modal + topbar launcher.
   Independent of tours — shares .np-modal styling but uses its own ids.
*/
(function(){
  // ---------- DOM helper ----------
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

  // ---------- About body ----------
  // Edit the paragraphs below with the project write-up. Plain strings become <p> blocks.
  // You can add headings by pushing {h: "Heading text"} into ABOUT_BODY.
  const ABOUT_BODY = [
    { h: "About this project" },
    "Networking Pepys is a networked reading of Samuel Pepys' diary (1660–1669). It reframes a ten-year prose record — the Restoration court, the Plague, the Fire, the Dutch raid on the Medway — as a graph of places visited and the trips between them.",
    "[Add project context here: course, assignment, authorship, methodology notes, framing questions, intended audience, limitations. This paragraph is a placeholder — edit about.js or the source HTML to replace it.]",
    { h: "Sources & method" },
    "Place and trip data derive from the Latimer and Wheatley editions of the Diary, annotated and cross-referenced against Phil Gyford's pepysdiary.com. Entries were parsed into discrete movements; named locations were consolidated into canonical places. Dates are preserved to the day; transport modes (walk, coach, boat, horse, ship) and companions are recorded where the diary states them explicitly.",
    "[Replace with your own methodology paragraph — describe parsing choices, ambiguities, consolidation rules, and any caveats about the data.]",
    { h: "Credits" },
    "[Replace with credits — names, affiliations, acknowledgements, course info.]",
  ];

  // ---------- Modal ----------
  let modalEl = null;

  function buildModal(){
    const modal = h('div', {class: 'np-modal np-about-modal', role: 'dialog', 'aria-label': 'About this project', id: 'np-about'});
    const card  = h('div', {class: 'np-modal-card np-about-card'});

    // Close button
    const close = h('button', {
      class: 'np-modal-close',
      'aria-label': 'Close about',
      onclick: dismiss,
    }, '×');

    const body = h('div', {class: 'np-about-body'});
    body.appendChild(h('div', {class: 'np-kicker'}, 'About'));
    body.appendChild(h('h2', {class: 'np-about-title', html: 'Networking <em>Pepys</em>'}));
    body.appendChild(h('div', {class: 'np-about-sub'}, 'The geography of the diary, 1660–1669'));

    // Render paragraphs / headings from ABOUT_BODY
    for (const item of ABOUT_BODY){
      if (typeof item === 'string'){
        body.appendChild(h('p', {class: 'np-about-p'}, item));
      } else if (item && item.h){
        body.appendChild(h('h3', {class: 'np-about-h'}, item.h));
      }
    }

    // ---------- Dataset download section ----------
    const dl = h('div', {class: 'np-about-download'});
    dl.appendChild(h('h3', {class: 'np-about-h'}, 'Download the dataset'));
    dl.appendChild(h('p', {class: 'np-about-p np-about-p-muted'},
      'The data powering this visualization is available as two CSV files: places (912 rows) and trips (13,523 rows). Free to use with attribution.'
    ));

    const btnRow = h('div', {class: 'np-dl-row'});
    btnRow.appendChild(h('button', {
      class: 'np-dl-btn',
      onclick: () => downloadCsv('nodes.csv', 'pepys-places.csv'),
    }, iconDownload(), h('span', {class: 'np-dl-label'},
      h('strong', {}, 'Places'),
      h('span', {class: 'np-dl-meta'}, '912 rows · id, name, location')
    )));
    btnRow.appendChild(h('button', {
      class: 'np-dl-btn',
      onclick: () => downloadCsv('edges.csv', 'pepys-trips.csv'),
    }, iconDownload(), h('span', {class: 'np-dl-label'},
      h('strong', {}, 'Trips'),
      h('span', {class: 'np-dl-meta'}, '13,523 rows · source, target, date, mode, companion')
    )));
    btnRow.appendChild(h('button', {
      class: 'np-dl-btn np-dl-btn-primary',
      onclick: downloadBoth,
    }, iconDownload(), h('span', {class: 'np-dl-label'},
      h('strong', {}, 'Both files'),
      h('span', {class: 'np-dl-meta'}, 'Downloads places & trips together')
    )));
    dl.appendChild(btnRow);

    body.appendChild(dl);

    card.appendChild(close);
    card.appendChild(body);
    modal.appendChild(card);

    // Click backdrop to close
    modal.addEventListener('click', (e)=>{ if (e.target === modal) dismiss(); });

    document.body.appendChild(modal);
    return modal;
  }

  function iconDownload(){
    const wrap = h('span', {class: 'np-dl-icon'});
    wrap.innerHTML = `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 4v11"/>
        <path d="M7 10l5 5 5-5"/>
        <path d="M5 20h14"/>
      </svg>
    `;
    return wrap;
  }

  function show(){
    if (!modalEl) modalEl = buildModal();
    requestAnimationFrame(()=> modalEl.classList.add('open'));
    document.body.classList.add('np-modal-open');
  }

  function dismiss(){
    if (!modalEl) return;
    modalEl.classList.remove('open');
    document.body.classList.remove('np-modal-open');
    setTimeout(()=>{ if (modalEl && modalEl.parentNode) modalEl.parentNode.removeChild(modalEl); modalEl = null; }, 220);
  }

  // ---------- Download helpers ----------
  async function fetchText(path){
    const res = await fetch(path + (window.__T || ''));
    if (!res.ok) throw new Error('Failed to fetch ' + path + ': ' + res.status);
    return await res.text();
  }

  function triggerBlobDownload(text, filename, type='text/csv;charset=utf-8'){
    const blob = new Blob([text], {type});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(()=>{
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
  }

  async function downloadCsv(srcName, downloadAs){
    try {
      const text = await fetchText('data/' + srcName);
      triggerBlobDownload(text, downloadAs);
    } catch (e){
      alert('Could not download ' + srcName + ': ' + e.message);
    }
  }

  async function downloadBoth(){
    // Fire off two sequential downloads, browser UI permitting
    try {
      const placesText = await fetchText('data/nodes.csv');
      triggerBlobDownload(placesText, 'pepys-places.csv');
      await new Promise(r => setTimeout(r, 300));
      const tripsText = await fetchText('data/edges.csv');
      triggerBlobDownload(tripsText, 'pepys-trips.csv');
    } catch (e){
      alert('Download failed: ' + e.message);
    }
  }

  // ---------- Launcher button ----------
  function buildLauncher(){
    const btn = h('button', {
      class: 'np-about-launcher',
      'aria-label': 'About this project',
      title: 'About & dataset',
      onclick: show,
    });
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9"/>
        <path d="M12 8.5 L12 12.5"/>
        <circle cx="12" cy="16" r="0.6" fill="currentColor" stroke="none"/>
        <circle cx="12" cy="16" r="0.6" fill="currentColor"/>
      </svg>
      <span>About</span>
    `;
    return btn;
  }

  // ---------- Init ----------
  function init(){
    const topbar = document.querySelector('.topbar');
    if (topbar){
      const launcher = buildLauncher();
      topbar.appendChild(launcher);
    }
    // ESC closes About
    window.addEventListener('keydown', (e)=>{
      if (e.key === 'Escape' && modalEl){ dismiss(); }
    });
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
