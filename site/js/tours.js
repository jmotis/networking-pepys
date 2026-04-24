/* Guided tours — data only.
   Each tour is an ordered list of "chapters." A chapter can declare:
     - mMin / mMax  : month keys (year*12 + monthIdx, monthIdx 0..11)
     - modes        : Set-like array of transport modes (optional)
     - regions      : 'ANY' | array of region names
     - companions   : 'ANY' | array of companion strings
     - topN         : number | null (null = show all visible)
     - layout       : 'force' | 'concentric' | 'schematic'
     - selectLoc    : id of a location to focus in the detail panel (optional)
     - egoId        : id for ego-network mode (optional)
     - title        : chapter short title (shown in strip)
     - body         : longer narrative (shown in strip)
     - footnote     : optional gray line (date, citation)

   A tour also has:
     - id, title, kicker, summary, palette (accent color), icon (SVG path fragment)
*/
(function(){
  const NP = window.NP;

  const mKey = (y, m) => y*12 + m; // m is 0-indexed

  // Tour 1 — The Plague Year
  // Historical window: 25 March 1665 — 25 March 1666 (old-style Lady-Day calendar year).
  // We snap to whole months for the network filter: Mar 1665 – Mar 1666.
  const PLAGUE = {
    id: 'plague',
    title: 'The Plague Year',
    kicker: '25 March 1665 – 25 March 1666',
    summary: "As Bubonic plague empties London, watch Pepys' network contract from a dense urban weave to a coastal thread of Navy duty and refuge at Greenwich and Woolwich.",
    accent: '#5B2A1E',
    chapters: [
      {
        title: 'A warning in April',
        body: "April 1665. Rumours of plague in the parishes of St Giles and Drury Lane. Pepys still moves in his ordinary grooves — Navy Office in Seething Lane, coach rides to Whitehall, supper at taverns — but the count is already thickening in the bills of mortality.",
        footnote: 'Apr 1665 · business as usual',
        mMin: mKey(1665, 3),   // Apr 1665
        mMax: mKey(1665, 3),
        modes: ['walk','coach','boat','horse'],
        regions: 'ANY',
        companions: 'ANY',
        topN: 80,
        layout: 'schematic',
      },
      {
        title: 'The court flees, Pepys stays',
        body: "By summer, Charles II's court has decamped to Salisbury, then Oxford. Pepys sends his wife Elisabeth to Woolwich for safety. He remains, writing: the Navy must still be paid. His orbit tightens around the Tower, the Navy Office, and cross-river trips to Greenwich.",
        footnote: 'Jul–Aug 1665 · the Navy keeps working',
        mMin: mKey(1665, 6),   // Jul 1665
        mMax: mKey(1665, 7),   // Aug 1665
        modes: ['walk','coach','boat','horse'],
        regions: 'ANY',
        companions: 'ANY',
        topN: 80,
        layout: 'force',
      },
      {
        title: 'Greenwich and Woolwich',
        body: "In the worst weeks of September 1665, when the weekly death toll tops 7,000, Pepys sleeps at Greenwich and rides to Woolwich to see his wife. Boats replace coaches. The river becomes a lifeline — clean water between infected streets.",
        footnote: 'Sept–Oct 1665 · river-borne',
        mMin: mKey(1665, 8),   // Sep 1665
        mMax: mKey(1665, 9),   // Oct 1665
        modes: ['boat','walk','horse'],
        regions: 'ANY',
        companions: 'ANY',
        topN: 60,
        layout: 'schematic',
        selectLoc: 'greenwich',
      },
      {
        title: 'Winter contraction',
        body: "Frost suppresses the disease. The deathrate falls. But the network Pepys had before — the taverns, the New Exchange, the playhouses — is hollowed out. The shape of his movement is narrower, more dutiful: Whitehall, Navy Office, and home.",
        footnote: 'Nov 1665 – Feb 1666 · the cold helps',
        mMin: mKey(1665, 10),  // Nov 1665
        mMax: mKey(1666, 1),   // Feb 1666
        modes: ['walk','coach','boat','horse'],
        regions: 'ANY',
        companions: 'ANY',
        topN: 80,
        layout: 'force',
      },
      {
        title: 'A full year, after',
        body: "The plague year — March 1665 to March 1666, in the old calendar — compresses into a single network. Compared to the sprawl of 1660–1669, it looks like a city holding its breath: a handful of essential places, bound by boat and coach.",
        footnote: 'The twelve months, collapsed',
        mMin: mKey(1665, 2),   // Mar 1665
        mMax: mKey(1666, 2),   // Mar 1666
        modes: ['walk','coach','boat','horse','ship'],
        regions: 'ANY',
        companions: 'ANY',
        topN: 150,
        layout: 'force',
      },
    ],
  };

  // Tour 2 — The Great Fire of London
  // 1 Sep 1666 – 7 Sep 1666. Our data is month-granular, so we frame the
  // "fire week" inside September 1666 and before/after as Aug & Oct.
  const FIRE = {
    id: 'fire',
    title: 'The Great Fire',
    kicker: '1 – 7 September 1666',
    summary: "Six days that reshaped the city. Pepys's diary is the most famous eyewitness account — here is its geography, hour by hour.",
    accent: '#B5341E',
    chapters: [
      {
        title: 'The day before',
        body: "Saturday, 1 September 1666. Pepys is in bed past midnight after a long Sunday of office work. London is dry — no rain for weeks — and a stiff east wind rattles the eaves. Nothing unusual yet. The map shows his ordinary August: Navy Office, Whitehall, the Exchange, dinners at home.",
        footnote: 'Aug 1666 · the city intact',
        mMin: mKey(1666, 7),   // Aug 1666
        mMax: mKey(1666, 7),
        modes: ['walk','coach','boat','horse'],
        regions: 'ANY',
        companions: 'ANY',
        topN: 100,
        layout: 'schematic',
      },
      {
        title: '"A great fire in the city"',
        body: "3 a.m., 2 September. His maid Jane wakes him to see a fire. He climbs to a high window, judges it far off, and goes back to bed. At 7 a.m. he climbs the Tower with Sir John Robinson's little son. From there he sees it: 300 houses burning along the bridge, Fish Street on fire, and a wind driving it west.",
        footnote: '2 Sept · from the Tower',
        mMin: mKey(1666, 8),   // Sep 1666
        mMax: mKey(1666, 8),
        modes: ['walk','coach','boat','horse'],
        regions: ['City of London','Thames Dockyards'],
        companions: 'ANY',
        topN: 60,
        layout: 'schematic',
        selectLoc: 'tower of london',
      },
      {
        title: 'To the King at Whitehall',
        body: "Pepys takes a boat to Whitehall and finds the King and Duke of York. He carries the first official news of the scale of the fire. The King orders houses pulled down to make firebreaks. Pepys runs back by coach through streets \"full of people running and crying.\"",
        footnote: '2 Sept · noon, Whitehall',
        mMin: mKey(1666, 8),
        mMax: mKey(1666, 8),
        modes: ['boat','coach','walk'],
        regions: ['Westminster & Whitehall','City of London','Thames Dockyards'],
        companions: 'ANY',
        topN: 60,
        layout: 'schematic',
        selectLoc: 'white hall',
      },
      {
        title: 'Burying the cheese',
        body: "3 – 4 September. Pepys digs a pit in his garden to save his wine and \"a Parmazan cheese, as well as my papers.\" He watches St Paul's burn. Boats on the Thames are piled with furniture. His own office, the Navy Office, survives — barely — thanks to sailors dynamiting nearby houses.",
        footnote: '4 Sept · the Navy Office holds',
        mMin: mKey(1666, 8),
        mMax: mKey(1666, 8),
        modes: ['walk','boat'],
        regions: ['City of London','Thames Dockyards','Southwark & Lambeth'],
        companions: 'ANY',
        topN: 50,
        layout: 'schematic',
        selectLoc: 'navy office',
      },
      {
        title: 'Ashes',
        body: "7 September. The fire is out. Thirteen thousand houses, eighty-seven parish churches, and the medieval St Paul's are gone — but the Tower, London Bridge, and Pepys's own home are saved. The map of his October is haunted: the City's old dense cluster is missing. Business shifts to Whitehall, to the suburbs, to the yards.",
        footnote: 'Oct 1666 · the city after',
        mMin: mKey(1666, 9),   // Oct 1666
        mMax: mKey(1666, 9),
        modes: ['walk','coach','boat','horse'],
        regions: 'ANY',
        companions: 'ANY',
        topN: 120,
        layout: 'force',
      },
    ],
  };

  // Tour 3 — A Typical Tuesday
  // No specific date filter — we just tighten the mode to "walk" and emphasize
  // the commuter triangle: home, Navy Office, Whitehall. This is a didactic tour.
  const TUESDAY = {
    id: 'tuesday',
    title: 'A Typical Tuesday',
    kicker: "An ordinary working day in Pepys' London",
    summary: "Before the crises, there was the commute. Most of Pepys's 13,524 logged movements are not drama — they are the same half-mile repeated, day after day.",
    accent: '#C07A2E',
    chapters: [
      {
        title: 'The commute triangle',
        body: "Three places dominate Pepys's diary across all ten years: his home next to the Navy Office on Seething Lane, the Navy Office itself, and Whitehall up the river. Here is the full ten-year network on foot — the walking city of a mid-level civil servant.",
        footnote: 'Walking only · 1660–1669',
        mMin: mKey(1660, 0),
        mMax: mKey(1669, 11),
        modes: ['walk'],
        regions: 'ANY',
        companions: 'ANY',
        topN: 80,
        layout: 'force',
      },
      {
        title: 'By water',
        body: "For longer trips up the Thames — to Whitehall for a warrant, to Deptford to inspect a yard — Pepys takes a boat. The watermen are his Uber. Here is the river-system of his working life.",
        footnote: 'Boats only · 1660–1669',
        mMin: mKey(1660, 0),
        mMax: mKey(1669, 11),
        modes: ['boat'],
        regions: 'ANY',
        companions: 'ANY',
        topN: 80,
        layout: 'schematic',
      },
      {
        title: 'After work',
        body: "Evenings are for taverns, for music at home, for the theatre when it reopens in 1660, and for conversation with friends — Creed, Sandwich, Hewer, Coventry. Here are the taverns and inns he named by name.",
        footnote: 'Region: Taverns & Inns · 1660–1669',
        mMin: mKey(1660, 0),
        mMax: mKey(1669, 11),
        modes: ['walk','coach','boat','horse'],
        regions: ['Taverns & Inns'],
        companions: 'ANY',
        topN: 60,
        layout: 'force',
      },
      {
        title: 'The whole life',
        body: "Now lift every filter. Here is the entire ten-year Pepys — 912 places, 13,524 trips, every companion, every mode. A life rendered as a graph. Most of it, you will notice, is a commute.",
        footnote: 'All filters cleared',
        mMin: mKey(1660, 0),
        mMax: mKey(1669, 11),
        modes: ['walk','coach','boat','horse','ship'],
        regions: 'ANY',
        companions: 'ANY',
        topN: 200,
        layout: 'force',
      },
    ],
  };

  NP.TOURS = [PLAGUE, FIRE, TUESDAY];
  NP.TOURS_BY_ID = Object.fromEntries(NP.TOURS.map(t => [t.id, t]));
})();
