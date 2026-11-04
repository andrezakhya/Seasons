// Seasons LA: no framework, no build step. Data lives in /data/*.json.

const REPO = "andrezakhya/Seasons";
const BRANCH = "main";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const SEASONS = {
  winter: { name: "Winter", emoji: "❄️", months: [12, 1, 2] },
  spring: { name: "Spring", emoji: "🌸", months: [3, 4, 5] },
  summer: { name: "Summer", emoji: "☀️", months: [6, 7, 8] },
  fall:   { name: "Fall",   emoji: "🍂", months: [9, 10, 11] },
};
const SEASON_ORDER = ["winter", "spring", "summer", "fall"];
const TYPE_LABEL = { fruit: "Fruit", vegetable: "Vegetables", herb: "Herbs" };
const TERRAIN_EMOJI = { desert: "🌵", beach: "🌊", mountain: "🏔️", island: "🏝️", grassland: "🌾" };

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const safeUrl = (u) => (/^https?:\/\//i.test(u || "") ? u : "#");
const seasonOf = (m) => SEASON_ORDER.find((s) => SEASONS[s].months.includes(m));
const prevM = (m) => (m === 1 ? 12 : m - 1);
const nextM = (m) => (m === 12 ? 1 : m + 1);

const today = new Date().getMonth() + 1;
const state = {
  month: today,
  type: "all",
  peakOnly: false,
  recipeSeason: null, // follows the month unless picked
  campOnly: false,
  campSeason: null,
  search: "",
};

let produce = [], recipes = [], camps = [], resources = [];
let produceById = new Map();

/* ---------- URL state ---------- */
function readUrl() {
  const p = new URLSearchParams(location.search);
  const m = parseInt(p.get("month"), 10);
  if (m >= 1 && m <= 12) state.month = m;
}
function writeUrl() {
  const url = new URL(location.href);
  if (state.month === today) url.searchParams.delete("month");
  else url.searchParams.set("month", state.month);
  history.replaceState(null, "", url);
}

/* ---------- Render: hero ---------- */
function renderHero() {
  const season = seasonOf(state.month);
  document.body.dataset.season = season;
  $("#month-title").textContent = MONTHS[state.month - 1];
  $("#season-name").textContent = SEASONS[season].name;
  $("#season-emoji").textContent = SEASONS[season].emoji;

  const inSeason = produce.filter((p) => p.months.includes(state.month));
  const peaks = inSeason.filter((p) => p.peak.includes(state.month));
  const arriving = inSeason.filter((p) => !p.months.includes(prevM(state.month)));
  const highlight = (arriving.length ? arriving : peaks).slice(0, 3).map((p) => p.name);
  const lead = arriving.length ? "New this month:" : "At its best:";
  $("#hero-sub").innerHTML =
    `<strong>${inSeason.length}</strong> things in season, <strong>${peaks.length}</strong> at peak. ` +
    (highlight.length ? `${lead} ${esc(highlight.join(", "))}.` : "");

  $("#month-picker").innerHTML = MONTHS.map((name, i) => {
    const m = i + 1;
    const s = seasonOf(m);
    return `<button role="tab" data-month="${m}" aria-selected="${m === state.month}" class="${m === today ? "is-today" : ""}" title="${name}${m === today ? " (this month)" : ""}">
      ${name.slice(0, 3)}<span class="dot" style="background:var(--${s})"></span></button>`;
  }).join("");
}

/* ---------- Render: produce ---------- */
function miniMonths(item, cls = "mini-months") {
  return `<div class="${cls}" aria-hidden="true">${MONTHS.map((_, i) => {
    const m = i + 1;
    const c = [item.peak?.includes(m) ? "pk" : item.months.includes(m) ? "on" : "", m === state.month ? "cur" : ""].join(" ");
    return `<span class="${c}"></span>`;
  }).join("")}</div>`;
}

function renderProduce() {
  const m = state.month;
  let items = produce.filter((p) => p.months.includes(m));
  if (state.type !== "all") items = items.filter((p) => p.type === state.type);
  if (state.peakOnly) items = items.filter((p) => p.peak.includes(m));
  // Peak first, then new arrivals, then alphabetical
  const score = (p) => (p.peak.includes(m) ? 0 : 2) + (!p.months.includes(prevM(m)) ? -1 : 0);
  items.sort((a, b) => score(a) - score(b) || a.name.localeCompare(b.name));

  const grid = $("#produce-grid");
  if (!items.length) {
    grid.innerHTML = `<div class="empty">Nothing matches. Try another filter or month.</div>`;
    return;
  }
  grid.innerHTML = items.map((p) => {
    const badges = [];
    if (p.peak.includes(m)) badges.push(`<span class="badge badge-peak">Peak</span>`);
    if (!p.months.includes(prevM(m))) badges.push(`<span class="badge badge-new">New</span>`);
    if (!p.months.includes(nextM(m))) badges.push(`<span class="badge badge-last">Last call</span>`);
    const uses = recipes.filter((r) => r.produce.includes(p.id));
    return `<article class="card produce-card">
      <div class="produce-top">
        <div class="produce-emoji" aria-hidden="true">${esc(p.emoji)}</div>
        <div><h3>${esc(p.name)}</h3><div class="produce-badges">${badges.join("")}<span class="badge badge-soft">${esc(TYPE_LABEL[p.type] || p.type)}</span></div></div>
      </div>
      <p>${esc(p.tip)}</p>
      ${uses.length ? `<div class="uses">🍳 ${uses.map((r) => `<a href="#recipe-${esc(r.id)}" data-recipe="${esc(r.id)}">${esc(r.title)}</a>`).join(" · ")}</div>` : ""}
      ${miniMonths(p)}
    </article>`;
  }).join("");
}

/* ---------- Render: calendar ---------- */
function renderCalendar() {
  const q = state.search.trim().toLowerCase();
  const head = `<thead><tr><th class="row-head" scope="col">Produce</th>${MONTHS.map((n, i) =>
    `<th scope="col" data-month="${i + 1}" class="${i + 1 === state.month ? "cur" : ""}" title="Jump to ${n}">${n.slice(0, 3)}</th>`).join("")}</tr></thead>`;
  const groups = ["fruit", "vegetable", "herb"].map((type) => {
    const rows = produce
      .filter((p) => p.type === type && (!q || p.name.toLowerCase().includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name));
    if (!rows.length) return "";
    return `<tr class="group"><th colspan="13">${TYPE_LABEL[type]}</th></tr>` + rows.map((p) =>
      `<tr><th class="row-head" scope="row">${esc(p.emoji)} ${esc(p.name)}</th>${MONTHS.map((n, i) => {
        const m = i + 1;
        const pk = p.peak.includes(m), on = p.months.includes(m);
        const cls = [pk ? "pk" : on ? "on" : "", m === state.month ? "cur" : ""].join(" ");
        const label = pk ? "peak" : on ? "in season" : "out of season";
        return `<td class="${cls}" title="${esc(p.name)}: ${label} in ${n}"><span></span><span class="sr-only">${label}</span></td>`;
      }).join("")}</tr>`).join("");
  }).join("");
  $("#calendar-table").innerHTML = head + `<tbody>${groups || `<tr><td colspan="13" class="empty">No produce matches “${esc(state.search)}”.</td></tr>`}</tbody>`;
}

/* ---------- Render: season tabs ---------- */
function renderSeasonTabs(el, active) {
  el.innerHTML = SEASON_ORDER.map((s) =>
    `<button data-season="${s}" aria-pressed="${s === active}">${SEASONS[s].emoji} ${SEASONS[s].name}</button>`).join("");
}

/* ---------- Render: recipes ---------- */
function renderRecipes() {
  const season = state.recipeSeason || seasonOf(state.month);
  renderSeasonTabs($("#recipe-season"), season);
  let list = recipes.filter((r) => r.season === season);
  if (state.campOnly) list = recipes.filter((r) => r.camp && r.season === season);
  const inNow = (id) => produceById.get(id)?.months.includes(state.month);
  list.sort((a, b) => b.produce.filter(inNow).length / b.produce.length - a.produce.filter(inNow).length / a.produce.length);

  $("#recipe-grid").innerHTML = list.length ? list.map((r) => `
    <article class="card recipe-card" id="recipe-${esc(r.id)}">
      <h3>${esc(r.title)}</h3>
      <div class="meta">⏱ ${esc(r.time)} · Serves ${esc(r.serves)} ${r.camp ? `<span class="badge badge-camp">🔥 Camp-friendly</span>` : ""}</div>
      <div class="chips">${r.produce.map((id) => {
        const p = produceById.get(id);
        return p ? `<span class="chip ${inNow(id) ? "in" : ""}" title="${inNow(id) ? "In season in " + MONTHS[state.month - 1] : "Not in season this month"}">${esc(p.emoji)} ${esc(p.name)}</span>` : "";
      }).join("")}</div>
      <details>
        <summary>Show recipe</summary>
        <h4>Ingredients</h4>
        <ul>${r.ingredients.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
        <h4>Method</h4>
        <ol>${r.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
      </details>
    </article>`).join("")
    : `<div class="empty">No ${state.campOnly ? "camp-friendly " : ""}recipes for ${SEASONS[season].name.toLowerCase()} yet. <a href="https://github.com/${REPO}/issues/new?template=recipe.yml" target="_blank" rel="noopener">Add one?</a></div>`;
}

/* ---------- Render: camping ---------- */
function renderCamps() {
  const season = state.campSeason || seasonOf(state.month);
  renderSeasonTabs($("#camp-season"), season);
  const list = camps.filter((c) => c.seasons.includes(season));
  list.sort((a, b) => (b.bestMonths.includes(state.month) - a.bestMonths.includes(state.month)) || a.driveHours - b.driveHours);
  const monthName = MONTHS[state.month - 1];

  $("#camp-grid").innerHTML = list.map((c) => {
    const q = encodeURIComponent(`${c.name}, ${c.park}`);
    const good = c.bestMonths.includes(state.month);
    return `<article class="card camp-card">
      <h3>${esc(TERRAIN_EMOJI[c.terrain] || "⛺")} ${esc(c.name)}</h3>
      <div class="park">${esc(c.park)}</div>
      <div class="camp-facts">
        <span class="fact">🚗 ~${esc(formatHours(c.driveHours))} from DTLA</span>
        <span class="fact">🎟 ${esc(c.reservations)}</span>
        ${good ? `<span class="badge badge-peak">Great in ${esc(monthName)}</span>` : ""}
      </div>
      <p>${esc(c.highlights)}</p>
      <p class="tip">💡 ${esc(c.tip)}</p>
      <div class="camp-months" aria-label="Best months: ${c.bestMonths.map((m) => MONTHS[m - 1]).join(", ")}">${MONTHS.map((n, i) =>
        `<span class="${c.bestMonths.includes(i + 1) ? "on" : ""} ${i + 1 === state.month ? "cur" : ""}">${n[0]}</span>`).join("")}</div>
      <div class="camp-links">
        <a href="${esc(safeUrl(c.url))}" target="_blank" rel="noopener">Official info ↗</a>
        <a href="https://www.google.com/maps/dir/?api=1&origin=Los+Angeles,+CA&destination=${q}" target="_blank" rel="noopener">Directions ↗</a>
        <a href="https://www.openstreetmap.org/search?query=${q}" target="_blank" rel="noopener">OpenStreetMap ↗</a>
      </div>
    </article>`;
  }).join("");
}
function formatHours(h) {
  const hrs = Math.floor(h), min = Math.round((h - hrs) * 60);
  return min ? `${hrs}h ${min}m` : `${hrs}h`;
}

/* ---------- Render: open source ---------- */
function renderResources() {
  $("#resource-grid").innerHTML = resources.map((r) => `
    <article class="card resource-card">
      <span class="badge badge-soft" style="align-self:flex-start">${esc(r.kind)}</span>
      <h3>${esc(r.name)}</h3>
      <p>${esc(r.description)}</p>
      <div class="links">
        <a href="${esc(safeUrl(r.url))}" target="_blank" rel="noopener">Website ↗</a>
        ${r.repo ? `<a href="${esc(safeUrl(r.repo))}" target="_blank" rel="noopener">Source ↗</a>` : ""}
      </div>
    </article>`).join("");

  const gh = `https://github.com/${REPO}`;
  $("#edit-produce").href = `${gh}/edit/${BRANCH}/data/produce.json`;
  $("#edit-recipes").href = `${gh}/edit/${BRANCH}/data/recipes.json`;
  $("#edit-camps").href = `${gh}/edit/${BRANCH}/data/campsites.json`;
  $("#issue-new").href = `${gh}/issues/new/choose`;
  $("#fork-link").href = `${gh}/fork`;
}

// Live data from the public GitHub REST API (no token; 60 req/hr per IP, so cache it).
async function ghFetch(path) {
  const key = `gh:${path}`;
  try {
    const hit = JSON.parse(sessionStorage.getItem(key) || "null");
    if (hit && Date.now() - hit.t < 10 * 60 * 1000) return hit.d;
  } catch {}
  const res = await fetch(`https://api.github.com/repos/${REPO}${path}`, { headers: { Accept: "application/vnd.github+json" } });
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  const d = await res.json();
  try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), d })); } catch {}
  return d;
}

async function loadGitHub() {
  const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n));
  ghFetch("").then((repo) => {
    $("#stat-stars").textContent = fmt(repo.stargazers_count);
    $("#stat-forks").textContent = fmt(repo.forks_count);
    $("#stat-issues").textContent = fmt(repo.open_issues_count);
    $("#gh-stats").hidden = false;
    const s = $("#gh-stars");
    s.textContent = `★ ${fmt(repo.stargazers_count)}`;
    s.hidden = false;
  }).catch(() => {});

  ghFetch("/contributors?per_page=24").then((list) => {
    const el = $("#contributors");
    if (!Array.isArray(list) || !list.length) throw new Error("none");
    el.innerHTML = list.filter((c) => c.type !== "Bot").map((c) =>
      `<a href="${esc(safeUrl(c.html_url))}" target="_blank" rel="noopener" title="${esc(c.login)}: ${c.contributions} commit${c.contributions === 1 ? "" : "s"}">
        <img src="${esc(safeUrl(c.avatar_url))}&s=80" alt="${esc(c.login)}" loading="lazy" width="40" height="40" /></a>`).join("") +
      `<p class="muted small" style="width:100%;margin:6px 0 0">Your face could be here. <a href="https://github.com/${REPO}/blob/${BRANCH}/CONTRIBUTING.md" target="_blank" rel="noopener">Read the contributing guide →</a></p>`;
  }).catch(() => {
    $("#contributors").innerHTML = `<p class="muted small">Couldn't reach GitHub right now. <a href="https://github.com/${REPO}/graphs/contributors" target="_blank" rel="noopener">See contributors on GitHub →</a></p>`;
  });

  ghFetch("/commits?per_page=5").then((list) => {
    $("#commits").innerHTML = list.map((c) => {
      const msg = (c.commit?.message || "").split("\n")[0];
      const when = new Date(c.commit?.author?.date);
      const who = c.author?.login || c.commit?.author?.name || "someone";
      return `<li><a href="${esc(safeUrl(c.html_url))}" target="_blank" rel="noopener">${esc(msg)}</a>
        <time datetime="${esc(when.toISOString())}">${esc(who)} · ${esc(timeAgo(when))}</time></li>`;
    }).join("");
  }).catch(() => {
    $("#commits").innerHTML = `<li class="muted small"><a href="https://github.com/${REPO}/commits/${BRANCH}" target="_blank" rel="noopener">View the commit history on GitHub →</a></li>`;
  });
}
function timeAgo(d) {
  const s = (Date.now() - d.getTime()) / 1000;
  const units = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]];
  for (const [u, n] of units) if (s >= n) { const v = Math.floor(s / n); return `${v} ${u}${v > 1 ? "s" : ""} ago`; }
  return "just now";
}

/* ---------- Wiring ---------- */
function renderAll() {
  renderHero();
  renderProduce();
  renderCalendar();
  renderRecipes();
  renderCamps();
}
function setMonth(m) {
  state.month = m;
  state.recipeSeason = null;
  state.campSeason = null;
  writeUrl();
  renderAll();
}

function bind() {
  $("#prev-month").addEventListener("click", () => setMonth(prevM(state.month)));
  $("#next-month").addEventListener("click", () => setMonth(nextM(state.month)));
  $("#month-picker").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-month]");
    if (b) setMonth(+b.dataset.month);
  });
  $("#calendar-table").addEventListener("click", (e) => {
    const th = e.target.closest("th[data-month]");
    if (th) setMonth(+th.dataset.month);
  });
  document.addEventListener("keydown", (e) => {
    if (e.target.matches("input, textarea")) return;
    if (e.key === "ArrowLeft") setMonth(prevM(state.month));
    if (e.key === "ArrowRight") setMonth(nextM(state.month));
  });
  $("#type-filter").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-type]");
    if (!b) return;
    state.type = b.dataset.type;
    $("#type-filter").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b));
    renderProduce();
  });
  $("#peak-only").addEventListener("change", (e) => { state.peakOnly = e.target.checked; renderProduce(); });
  $("#calendar-search").addEventListener("input", (e) => { state.search = e.target.value; renderCalendar(); });
  $("#recipe-season").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-season]");
    if (b) { state.recipeSeason = b.dataset.season; renderRecipes(); }
  });
  $("#camp-only").addEventListener("change", (e) => { state.campOnly = e.target.checked; renderRecipes(); });
  $("#camp-season").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-season]");
    if (b) { state.campSeason = b.dataset.season; renderCamps(); }
  });
  // Clicking a recipe link on a produce card switches to that recipe's season and opens it
  $("#produce-grid").addEventListener("click", (e) => {
    const a = e.target.closest("a[data-recipe]");
    if (!a) return;
    const r = recipes.find((x) => x.id === a.dataset.recipe);
    if (!r) return;
    e.preventDefault();
    state.recipeSeason = r.season;
    state.campOnly = false;
    $("#camp-only").checked = false;
    renderRecipes();
    const card = document.getElementById(`recipe-${r.id}`);
    card.querySelector("details").open = true;
    card.scrollIntoView({ block: "center" });
    card.focus?.();
  });
}

async function init() {
  readUrl();
  bind();
  try {
    const load = (f) => fetch(`data/${f}.json`).then((r) => { if (!r.ok) throw new Error(f); return r.json(); });
    [produce, recipes, camps, resources] = await Promise.all(["produce", "recipes", "campsites", "resources"].map(load));
  } catch (err) {
    $("#hero-sub").textContent = "Couldn't load the data. If you opened index.html directly, serve the folder instead (e.g. `python3 -m http.server`).";
    console.error(err);
    return;
  }
  produceById = new Map(produce.map((p) => [p.id, p]));
  renderAll();
  renderResources();
  loadGitHub();
}

init();
