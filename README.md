# 🍊 Seasons LA

**What's in season in Los Angeles, month by month, plus what to cook with it, where to camp, and what to watch.**

Seasons LA is a small, open-source site for people who shop at LA farmers markets, like sleeping outside, and love movies. It's split into four tabs: **Food**, **Camping**, **Movies**, and **Open source**.

- **Monthly view:** pick any month to see what SoCal farms are bringing to market. Each item is tagged *Peak*, *New*, or *Last call*.
- **Year at a glance:** a searchable produce × month calendar.
- **Recipes:** simple seasonal recipes, with the in-season ingredients highlighted. Filter for 🔥 camp-friendly ones.
- **Camping:** campgrounds within a day's drive of LA for winter (desert), spring (wildflowers and islands), summer (mountains), and fall (aspens and apples).
- **Movies:** must-see classics (not new releases). Check them off as you watch (saved in your browser), filter by genre, world cinema, or LA on screen, get a seasonal watchlist, or hit 🎲 to pick one. Also lists LA theaters that show classics on the big screen.
- **Open source:** live GitHub stats, contributors, and recent commits, plus a list of open-source projects worth knowing (Falling Fruit, iNaturalist, OpenStreetMap, and more).

There's no framework and no build step: just HTML, CSS, a bit of JavaScript, and **JSON files anyone can edit**.

## Run it locally

```sh
git clone https://github.com/andrezakhya/Seasons.git
cd Seasons
python3 -m http.server 8000   # or: npx serve .
# open http://localhost:8000
```

> Opening `index.html` directly with `file://` won't work, because browsers block `fetch()` of the JSON files. Use any static server.

Link to a tab with `#food`, `#food/calendar`, `#food/recipes`, `#camping`, `#movies`, or `#open-source`, and to a month with `?month=4` (for example `?month=4#camping`).

## Project layout

```
index.html              page shell
assets/styles.css       styles (light + dark, seasonal accent colors)
assets/app.js           rendering, filters, GitHub API widgets
data/produce.json       what's in season, and when it peaks
data/recipes.json       recipes linked to produce ids
data/campsites.json     campgrounds by season
data/movies.json        must-see movies
data/theaters.json      LA repertory theaters
data/resources.json     open-source projects we like
scripts/validate.mjs    data checks (run in CI on every PR)
.github/workflows/      GitHub Pages deploy + PR validation
```

## Contributing

The easiest way to help is to fix or add data. You don't need to know JavaScript. See **[CONTRIBUTING.md](CONTRIBUTING.md)**, or [open an issue](https://github.com/andrezakhya/Seasons/issues/new/choose) using one of the forms.

Before opening a PR, run:

```sh
node scripts/validate.mjs
```

## Deploying

Pushes to `main` deploy automatically to GitHub Pages through `.github/workflows/pages.yml`. To turn it on once, go to **Settings → Pages → Build and deployment → Source: GitHub Actions**.

Forking for another city? Change `REPO` at the top of `assets/app.js`, then replace the data files.

## License

- **Code:** [MIT](LICENSE)
- **Data** (`data/*.json`, including recipes): [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)

Seasonality varies year to year with weather and growers, so treat months as a guide. Campground conditions change too: always check the official site for closures, fire restrictions, and reservations.
