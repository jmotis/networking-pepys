# Networking Pepys — static site bundle

A self-contained copy of the interactive diary-network explorer. Drop this
folder on any static host (GitHub Pages, Netlify, S3, a plain Apache/nginx
document root) and it will run.

## Contents

```
site/
  index.html        Main application shell
  styles.css        Plague & Fire palette, layout, components
  data/
    data.js         Precompiled node + edge arrays (window.NP.raw)
    nodes.csv       912 places, columns: id,name,location
    edges.csv       13,523 trips, columns: source,target,year,month,day,mode,companion
  js/
    data.js         Aggregation, filtering, regional classification
    layouts.js      Force / concentric / geographic layouts + map backdrop
    renderer.js     Canvas graph renderer (pan, zoom, hover, labels)
    app.js          UI wiring, state, timeline, detail panel
    tours.js        Guided tour definitions (plague, fire, typical Tuesday)
    tours-ui.js     Intro modal + chapter strip UI
    about.js        About modal + dataset download buttons
```

## Local preview

Because the page loads `data/data.js` and sibling CSS/JS via relative paths,
you need a local HTTP server (opening `index.html` with `file://` will trip
browser CORS rules). Any of these work:

```sh
# Python 3
python3 -m http.server 8080

# Node (if you have npx)
npx serve .

# PHP
php -S localhost:8080
```

Then visit `http://localhost:8080/`.

## Deploying

No build step. Upload the contents of `site/` to your host's web root.

- **GitHub Pages:** push `site/` as the repository root (or set Pages source
  to `/site`).
- **Netlify / Vercel:** point the publish directory at `site/`.
- **S3 / CloudFront:** upload the folder; set `index.html` as the index
  document.

## Editing content

- **About copy:** edit `ABOUT_BODY` at the top of `js/about.js`.
- **Tour chapters:** see `js/tours.js` — each tour is an object with `id`,
  `title`, `summary`, `chapters[]`, each chapter carries a `filter` that
  mutates app state.
- **Palette / type:** CSS custom properties at the top of `styles.css`.

## Data provenance

Place and trip data is derived from *The Diary of Samuel Pepys* (public
domain; Henry B. Wheatley edition, 1893). See the About page inside the app
for full source & method notes.
