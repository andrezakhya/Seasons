#!/usr/bin/env node
// Validates everything in data/ so a typo in a pull request can't break the site.
// Usage: node scripts/validate.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const fail = (file, msg) => errors.push(`${file}: ${msg}`);

function load(name) {
  const file = `data/${name}.json`;
  try {
    const data = JSON.parse(readFileSync(join(root, file), "utf8"));
    if (!Array.isArray(data)) fail(file, "top level must be an array");
    return { file, data: Array.isArray(data) ? data : [] };
  } catch (e) {
    fail(file, `invalid JSON: ${e.message}`);
    return { file, data: [] };
  }
}

const SEASONS = ["winter", "spring", "summer", "fall"];
const isMonth = (m) => Number.isInteger(m) && m >= 1 && m <= 12;
const isSlug = (s) => typeof s === "string" && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s);
const isStr = (s) => typeof s === "string" && s.trim().length > 0;
const isUrl = (s) => typeof s === "string" && /^https:\/\//.test(s);

function uniqueIds(file, items) {
  const seen = new Set();
  items.forEach((it, i) => {
    const where = `[${i}] ${it?.id ?? it?.name ?? "?"}`;
    if (!isSlug(it.id)) fail(file, `${where}: id must be a lowercase-kebab-case slug`);
    if (seen.has(it.id)) fail(file, `${where}: duplicate id "${it.id}"`);
    seen.add(it.id);
  });
  return seen;
}

function months(file, where, key, arr, { allowEmpty = false } = {}) {
  if (!Array.isArray(arr) || (!allowEmpty && !arr.length)) return fail(file, `${where}: "${key}" must be a non-empty array of months`);
  arr.forEach((m) => { if (!isMonth(m)) fail(file, `${where}: "${key}" has invalid month ${JSON.stringify(m)} (use 1–12)`); });
  if (new Set(arr).size !== arr.length) fail(file, `${where}: "${key}" has duplicate months`);
}

// produce
const produce = load("produce");
const produceIds = uniqueIds(produce.file, produce.data);
produce.data.forEach((p, i) => {
  const w = `[${i}] ${p.id}`;
  if (!isStr(p.name)) fail(produce.file, `${w}: missing name`);
  if (!["fruit", "vegetable", "herb"].includes(p.type)) fail(produce.file, `${w}: type must be fruit, vegetable, or herb`);
  if (!isStr(p.emoji)) fail(produce.file, `${w}: missing emoji`);
  if (!isStr(p.tip)) fail(produce.file, `${w}: missing tip`);
  months(produce.file, w, "months", p.months);
  months(produce.file, w, "peak", p.peak, { allowEmpty: true });
  (p.peak || []).forEach((m) => { if (!p.months?.includes(m)) fail(produce.file, `${w}: peak month ${m} is not in "months"`); });
});

// recipes
const recipes = load("recipes");
uniqueIds(recipes.file, recipes.data);
recipes.data.forEach((r, i) => {
  const w = `[${i}] ${r.id}`;
  if (!isStr(r.title)) fail(recipes.file, `${w}: missing title`);
  if (!SEASONS.includes(r.season)) fail(recipes.file, `${w}: season must be one of ${SEASONS.join(", ")}`);
  if (!Array.isArray(r.produce) || !r.produce.length) fail(recipes.file, `${w}: "produce" must list at least one produce id`);
  (r.produce || []).forEach((id) => { if (!produceIds.has(id)) fail(recipes.file, `${w}: unknown produce id "${id}" (add it to produce.json first)`); });
  if (!isStr(r.time)) fail(recipes.file, `${w}: missing time`);
  if (!Number.isInteger(r.serves) || r.serves < 1) fail(recipes.file, `${w}: serves must be a positive integer`);
  ["ingredients", "steps"].forEach((k) => {
    if (!Array.isArray(r[k]) || !r[k].length || !r[k].every(isStr)) fail(recipes.file, `${w}: "${k}" must be a non-empty array of strings`);
  });
  if ("camp" in r && typeof r.camp !== "boolean") fail(recipes.file, `${w}: camp must be true or false`);
});

// campsites
const camps = load("campsites");
uniqueIds(camps.file, camps.data);
const TERRAIN = ["desert", "beach", "mountain", "island", "grassland"];
camps.data.forEach((c, i) => {
  const w = `[${i}] ${c.id}`;
  ["name", "park", "highlights", "tip", "reservations"].forEach((k) => { if (!isStr(c[k])) fail(camps.file, `${w}: missing ${k}`); });
  if (!Array.isArray(c.seasons) || !c.seasons.length || !c.seasons.every((s) => SEASONS.includes(s))) fail(camps.file, `${w}: seasons must be a non-empty subset of ${SEASONS.join(", ")}`);
  if (!TERRAIN.includes(c.terrain)) fail(camps.file, `${w}: terrain must be one of ${TERRAIN.join(", ")}`);
  if (typeof c.driveHours !== "number" || c.driveHours <= 0 || c.driveHours > 12) fail(camps.file, `${w}: driveHours must be a number of hours from DTLA`);
  months(camps.file, w, "bestMonths", c.bestMonths);
  if (!isUrl(c.url)) fail(camps.file, `${w}: url must start with https://`);
});

// resources
const res = load("resources");
res.data.forEach((r, i) => {
  const w = `[${i}] ${r.name}`;
  ["name", "kind", "description"].forEach((k) => { if (!isStr(r[k])) fail(res.file, `${w}: missing ${k}`); });
  if (!isUrl(r.url)) fail(res.file, `${w}: url must start with https://`);
  if (r.repo !== null && r.repo !== undefined && !isUrl(r.repo)) fail(res.file, `${w}: repo must be an https:// URL or null`);
});

// Every month should have something in season
for (let m = 1; m <= 12; m++) {
  if (!produce.data.some((p) => p.months?.includes(m))) fail(produce.file, `no produce listed for month ${m}`);
}
SEASONS.forEach((s) => {
  if (!camps.data.some((c) => c.seasons?.includes(s))) fail(camps.file, `no campsites for ${s}`);
});

if (errors.length) {
  console.error(`✗ ${errors.length} problem${errors.length > 1 ? "s" : ""} found:\n`);
  errors.forEach((e) => console.error("  • " + e));
  process.exit(1);
}
console.log(`✓ Data looks good: ${produce.data.length} produce, ${recipes.data.length} recipes, ${camps.data.length} campsites, ${res.data.length} resources.`);
