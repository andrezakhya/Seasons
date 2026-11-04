# Contributing to Seasons LA

Thanks for helping! Almost everything on the site comes from four JSON files in [`data/`](data/), so most contributions are a few lines of JSON.

## No-code route

[Open an issue](https://github.com/andrezakhya/Seasons/issues/new/choose) and pick **Produce**, **Recipe**, or **Campsite**. Someone will turn it into a PR.

## Editing the data

1. Click the ✏️ pencil on the file in GitHub (or fork and clone).
2. Make your change, following the shapes below.
3. Run `node scripts/validate.mjs` if you can. CI runs it on every PR either way.
4. Open a pull request and say *why* (a farmer told you, a market report, personal experience).

### `data/produce.json`

```json
{
  "id": "blood-orange",          // lowercase-kebab-case, unique
  "name": "Blood oranges",
  "type": "fruit",               // fruit | vegetable | herb
  "emoji": "🍊",
  "months": [12, 1, 2, 3, 4],    // 1 = January … 12 = December
  "peak": [1, 2, 3],             // must be a subset of months (can be [])
  "tip": "One or two sentences on choosing, storing, or using it."
}
```

Months should reflect **what shows up at LA-area farmers markets from Southern and Central California growers**, not what's available year-round at the grocery store.

### `data/recipes.json`

```json
{
  "id": "citrus-fennel-salad",
  "title": "Blood Orange, Fennel & Avocado Salad",
  "season": "winter",            // winter | spring | summer | fall
  "produce": ["blood-orange", "fennel"],  // ids from produce.json
  "time": "15 min",
  "serves": 4,
  "camp": true,                  // optional: works on a camp stove or fire
  "ingredients": ["…"],
  "steps": ["…"]
}
```

Please only submit recipes you wrote yourself or that come from your family. Don't copy from cookbooks or websites. Recipes are shared under CC BY-SA 4.0.

### `data/campsites.json`

```json
{
  "id": "jumbo-rocks",
  "name": "Jumbo Rocks Campground",
  "park": "Joshua Tree National Park",
  "seasons": ["winter", "spring", "fall"],
  "terrain": "desert",           // desert | beach | mountain | island | grassland
  "driveHours": 2.5,             // rough, from downtown LA, no traffic
  "bestMonths": [10, 11, 12, 1, 2, 3, 4],
  "highlights": "What makes it great.",
  "tip": "Something practical: water, cold nights, bears, permits.",
  "reservations": "Recreation.gov",
  "url": "https://…"             // official page (https only)
}
```

### `data/resources.json`

Open-source or open-data projects that are useful to LA cooks, foragers, and campers. Include `repo` if the source is public; otherwise set it to `null`.

## Code changes

The site is vanilla HTML, CSS, and JS with no build step. Keep it that way: no frameworks or bundlers, and keep dependencies to zero. Test locally with `python3 -m http.server` and check both light and dark mode, plus a phone-width window.

## Code of conduct

Be kind. Disagreements about whether figs have one season or two are welcome. Rudeness isn't.
