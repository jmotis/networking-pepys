# Network 4 — Pepys's Transportation Network, 1660

A directed transportation network built from a close reading of `years/diary_1660.txt`
(the complete diary for January 1659/60 – December 1660).

## Files

- **`nodes.csv`** — 333 places (`id,name,location`). Nodes are places Pepys physically
  visited: houses, taverns, churches, offices, playhouses, towns on journeys, and the
  ships he lived aboard during the spring voyage.
- **`edges.csv`** — 2,123 directed trips (`source,target,year,month,day,mode,companion`).
  One edge per leg of travel, in chronological order.

## Construction rules

- **Nodes are places; edges are trips.** An edge is created each time Pepys travels
  from one place to another on a given day.
- **Continuity.** Travel is continuous: every edge departs from the node of the previous
  arrival. Each day starts and ends at home *or at wherever Pepys actually spent the
  night* (e.g. inns on the Cambridge journey in February, Mrs. Crisp's house in late
  March, his lodging at The Hague in May, my Lord's lodgings on 2 September and
  22 October, Mr. Hunt's on 8 August). The full year forms a single unbroken walk
  (verified programmatically: 0 continuity breaks).
- **Edge attributes.** `year/month/day` give the diary date (month numeric);
  `mode` is one of `walk`, `coach`, `boat`, `horse`, `wagon` (walk is the default where
  the diary gives no mode; `boat` covers wherries, barges and canal schuits); `companion`
  lists the people who travelled *with* Pepys on that leg (people merely met at the
  destination are not companions). Notes in parentheses mark companions who joined or
  left part-way (e.g. "set down at the Savoy").

## Contextual inferences

Ambiguous place-words were resolved from context, and change meaning through the year:

- **"Home"** = Axe Yard, Westminster (`home_axe_yard`) until 17 July 1660, when Pepys
  moved to his official house at the Navy Office (`home_seething_lane`, Seething Lane,
  City of London). His night at Commissioner Willoughby's (11 July) and the moving day
  itself are modelled explicitly.
- **"My office"** = Mr. Downing's Exchequer office, Westminster (`exchequer_office`)
  until March; from July it means the **Navy Office**, Seething Lane (`navy_office`),
  kept as a separate node from his adjoining house, following the convention of the
  earlier networks. During August–December "the office" at Whitehall means the
  **Privy Seal Office** (`privy_seal_office`).
- **"My Lord's" / "my Lord's lodgings"** = Lord Montagu's (Earl of Sandwich's) lodgings
  at Whitehall (`my_lords_lodgings_whitehall`); in early March, while my Lord lodged at
  Mr. Crew's, visits "to my Lord" are mapped to `mr_crews_house`.
- **"My father's"** = John Pepys Sr.'s house, Salisbury Court (`father_house_salisbury_court`).
- **The voyage (23 March – 8 June).** Ships are nodes: Pepys boards the *Swiftsure* at
  the Tower on 23 March, transfers to the *Naseby* (renamed *Royal Charles* on 23 May)
  on 2 April, and lives aboard until landing at Deal on 8 June. Boat trips to other
  ships of the fleet (*London*, *Speaker*, *Plymouth*, *Essex*, *Assistance*) and the
  shore excursions in Holland (Scheveningen, The Hague, Delft, Loosduinen) and Kent
  (Deal, Dover) are all edges.
- Unnamed stops ("an alehouse", "a cook's shop") are kept as coarse area-level nodes
  (e.g. `alehouse_westminster`, `alehouse_city`) rather than dropped, to preserve
  continuity.

Days with no recorded movement (e.g. 15 January, 7 September, 15/18/20 December)
contribute no edges.
