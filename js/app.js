import { isConfigured } from "./firebase-config.js";
import * as db from "./db.js";
import {
  gramsOfAlcohol,
  toUBE,
  round1,
  colorForName,
  initials,
  formatTime,
  toast,
  isBeerDrink,
} from "./utils.js";

let people = [];
let drinks = [];
let logs = [];
let currentPersonId = null;
let currentView = "home";
let currentStatsTab = "general";

const els = {
  home: document.getElementById("view-home"),
  person: document.getElementById("view-person"),
  settings: document.getElementById("view-settings"),
  stats: document.getElementById("view-stats"),
  tabBtns: Array.from(document.querySelectorAll(".tab-btn")),
  tabPanels: {
    general: document.getElementById("tab-general"),
    beer: document.getElementById("tab-beer"),
    charts: document.getElementById("tab-charts"),
  },
  leaderboardGeneral: document.getElementById("leaderboard-general"),
  leaderboardGeneralEmpty: document.getElementById("leaderboard-general-empty"),
  leaderboardBeer: document.getElementById("leaderboard-beer"),
  leaderboardBeerEmpty: document.getElementById("leaderboard-beer-empty"),
  kpiRow: document.getElementById("kpi-row"),
  chartAlcohol: document.getElementById("chart-alcohol"),
  chartDrinktypes: document.getElementById("chart-drinktypes"),
  chartTimeline: document.getElementById("chart-timeline"),
  chartsEmpty: document.getElementById("charts-empty"),
  chartCards: Array.from(document.querySelectorAll("#tab-charts .chart-card")),
  peopleList: document.getElementById("people-list"),
  homeEmpty: document.getElementById("home-empty"),
  personName: document.getElementById("person-name"),
  summaryCount: document.getElementById("summary-count"),
  summaryGrams: document.getElementById("summary-grams"),
  summaryUbe: document.getElementById("summary-ube"),
  summaryRate: document.getElementById("summary-rate"),
  breakdownList: document.getElementById("breakdown-list"),
  recentList: document.getElementById("recent-list"),
  recentEmpty: document.getElementById("recent-empty"),
  settingsPeopleList: document.getElementById("settings-people-list"),
  settingsDrinksList: document.getElementById("settings-drinks-list"),
  fab: document.getElementById("fab-add"),
  pickerModal: document.getElementById("picker-modal"),
  pickerList: document.getElementById("picker-list"),
  configWarning: document.getElementById("config-warning"),
};

function showView(name) {
  currentView = name;
  els.home.hidden = name !== "home";
  els.person.hidden = name !== "person";
  els.settings.hidden = name !== "settings";
  els.stats.hidden = name !== "stats";
}

function tsToDate(ts) {
  return ts && ts.toDate ? ts.toDate() : new Date();
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function computeStats(personId) {
  const personLogs = logs.filter((l) => l.personId === personId);
  let grams = 0;
  const breakdown = new Map();
  for (const log of personLogs) {
    const drink = drinks.find((d) => d.id === log.drinkId);
    if (!drink) continue;
    grams += gramsOfAlcohol(drink.ml, drink.abv);
    breakdown.set(drink.id, (breakdown.get(drink.id) || 0) + 1);
  }
  let rate = 0;
  if (personLogs.length >= 2) {
    const times = personLogs.map((l) => tsToDate(l.createdAt).getTime());
    const spanHours = (Math.max(...times) - Math.min(...times)) / 3600000;
    if (spanHours > 0) rate = personLogs.length / spanHours;
  }
  return { count: personLogs.length, grams, ube: toUBE(grams), rate, breakdown, logs: personLogs };
}

function renderPeopleList() {
  els.peopleList.innerHTML = "";
  els.homeEmpty.hidden = people.length > 0;
  for (const person of people) {
    const stats = computeStats(person.id);
    const btn = document.createElement("button");
    btn.className = "person-card";
    btn.innerHTML = `
      <span class="avatar" style="background:${colorForName(person.name)}">${initials(person.name)}</span>
      <span class="person-card-info">
        <span class="person-card-name">${escapeHtml(person.name)}</span>
        <span class="person-card-stat">${stats.count} bebidas · ${round1(stats.grams)} g alcohol</span>
      </span>
      <span class="person-card-chevron">›</span>
    `;
    btn.addEventListener("click", () => openPerson(person.id));
    els.peopleList.appendChild(btn);
  }
}

function openPerson(id) {
  currentPersonId = id;
  showView("person");
  renderPersonDetail();
}

function renderPersonDetail() {
  const person = people.find((p) => p.id === currentPersonId);
  if (!person) {
    showView("home");
    return;
  }
  const stats = computeStats(currentPersonId);
  els.personName.textContent = person.name;
  els.summaryCount.textContent = stats.count;
  els.summaryGrams.textContent = round1(stats.grams);
  els.summaryUbe.textContent = round1(stats.ube);
  els.summaryRate.textContent = round1(stats.rate);

  els.breakdownList.innerHTML = "";
  if (stats.breakdown.size === 0) {
    els.breakdownList.innerHTML = `<p class="empty-hint">Sin datos todavía</p>`;
  }
  for (const [drinkId, count] of stats.breakdown) {
    const drink = drinks.find((d) => d.id === drinkId);
    if (!drink) continue;
    const row = document.createElement("div");
    row.className = "breakdown-item";
    row.innerHTML = `<span class="emoji">${drink.emoji}</span><span class="breakdown-item-name">${escapeHtml(drink.name)}</span><span class="breakdown-item-count">${drinkId ? stats.breakdown.get(drinkId) : ""}</span>`;
    els.breakdownList.appendChild(row);
  }

  const recent = [...stats.logs]
    .sort((a, b) => tsToDate(b.createdAt) - tsToDate(a.createdAt))
    .slice(0, 8);
  els.recentList.innerHTML = "";
  els.recentEmpty.hidden = recent.length > 0;
  for (const log of recent) {
    const drink = drinks.find((d) => d.id === log.drinkId);
    const row = document.createElement("div");
    row.className = "recent-item";
    row.innerHTML = `
      <span class="emoji">${drink ? drink.emoji : "🍹"}</span>
      <span class="recent-item-name">${drink ? escapeHtml(drink.name) : "Bebida eliminada"}</span>
      <span class="recent-item-time">${formatTime(tsToDate(log.createdAt))}</span>
      <button class="recent-item-del" aria-label="Eliminar">✕</button>
    `;
    row.querySelector(".recent-item-del").addEventListener("click", () => db.deleteLog(log.id));
    els.recentList.appendChild(row);
  }
}

function renderSettings() {
  els.settingsPeopleList.innerHTML = "";
  for (const person of people) {
    const row = document.createElement("div");
    row.className = "settings-item";
    row.innerHTML = `<span class="emoji">👤</span><span class="settings-item-name">${escapeHtml(person.name)}</span><button class="settings-item-del" aria-label="Eliminar">✕</button>`;
    row.querySelector(".settings-item-del").addEventListener("click", () => {
      if (confirm(`¿Eliminar a ${person.name}? Se borrará su historial visible.`)) db.deletePerson(person.id);
    });
    els.settingsPeopleList.appendChild(row);
  }

  els.settingsDrinksList.innerHTML = "";
  for (const drink of drinks) {
    const row = document.createElement("div");
    row.className = "settings-item";
    row.innerHTML = `<span class="emoji">${drink.emoji}</span><span class="settings-item-name">${escapeHtml(drink.name)} · ${drink.ml}ml · ${drink.abv}%</span><button class="settings-item-del" aria-label="Eliminar">✕</button>`;
    row.querySelector(".settings-item-del").addEventListener("click", () => {
      if (confirm(`¿Eliminar ${drink.name}?`)) db.deleteDrink(drink.id);
    });
    els.settingsDrinksList.appendChild(row);
  }
}

function rerenderCurrent() {
  renderPeopleList();
  if (currentView === "person") renderPersonDetail();
  if (currentView === "settings") renderSettings();
  if (currentView === "stats") renderStatsTab();
}

// ---------- Stats (leaderboards + charts) ----------
function medalFor(rank) {
  return rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : `${rank + 1}`;
}

function renderLeaderboard(container, emptyEl, entries, formatValue) {
  container.innerHTML = "";
  emptyEl.hidden = entries.length > 0;
  if (!entries.length) return;
  const max = Math.max(...entries.map((e) => e.value), 1);
  entries.forEach((entry, i) => {
    const pct = entry.value > 0 ? Math.max((entry.value / max) * 100, 4) : 0;
    const row = document.createElement("div");
    row.className = "leaderboard-row" + (i === 0 && entry.value > 0 ? " is-first" : "");
    row.innerHTML = `
      <span class="leaderboard-rank">${medalFor(i)}</span>
      <span class="avatar avatar-sm" style="background:${colorForName(entry.name)}">${initials(entry.name)}</span>
      <span class="leaderboard-info">
        <span class="leaderboard-name">${escapeHtml(entry.name)}</span>
        <span class="leaderboard-bar-track"><span class="leaderboard-bar-fill" style="width:${pct}%"></span></span>
      </span>
      <span class="leaderboard-value">${formatValue(entry.value)}</span>
    `;
    container.appendChild(row);
  });
}

function renderLeaderboardGeneral() {
  const entries = people
    .map((p) => ({ name: p.name, value: computeStats(p.id).grams }))
    .sort((a, b) => b.value - a.value);
  renderLeaderboard(els.leaderboardGeneral, els.leaderboardGeneralEmpty, entries, (v) => `${round1(v)} g`);
}

function renderLeaderboardBeer() {
  const entries = people
    .map((p) => {
      const count = logs.filter(
        (l) => l.personId === p.id && isBeerDrink(drinks.find((d) => d.id === l.drinkId))
      ).length;
      return { name: p.name, value: count };
    })
    .filter((e) => e.value > 0)
    .sort((a, b) => b.value - a.value);
  renderLeaderboard(els.leaderboardBeer, els.leaderboardBeerEmpty, entries, (v) => `${v} 🍺`);
}

function computeGlobalStats() {
  const totalDrinks = logs.length;
  const totalGrams = people.reduce((sum, p) => sum + computeStats(p.id).grams, 0);
  const activePeople = people.filter((p) => computeStats(p.id).count > 0).length;
  let rate = 0;
  if (logs.length >= 2) {
    const times = logs.map((l) => tsToDate(l.createdAt).getTime());
    const spanHours = (Math.max(...times) - Math.min(...times)) / 3600000;
    if (spanHours > 0) rate = logs.length / spanHours;
  }
  return { totalDrinks, totalGrams, activePeople, rate };
}

function computeDrinkTypeCounts() {
  const counts = new Map();
  for (const log of logs) counts.set(log.drinkId, (counts.get(log.drinkId) || 0) + 1);
  return drinks
    .map((d) => ({ label: `${d.emoji} ${d.name}`, value: counts.get(d.id) || 0 }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);
}

function renderBarChart(container, data, seriesClass, formatValue) {
  container.innerHTML = "";
  if (!data.length) {
    container.innerHTML = `<p class="empty-hint">Sin datos todavía</p>`;
    return;
  }
  const max = Math.max(...data.map((d) => d.value));
  for (const d of data) {
    const pct = max > 0 ? Math.max((d.value / max) * 100, 3) : 0;
    const row = document.createElement("div");
    row.className = "bar-row";
    row.innerHTML = `
      <span class="bar-label">${escapeHtml(d.label)}</span>
      <span class="bar-track"><span class="bar-fill ${seriesClass}" style="width:${pct}%"></span></span>
      <span class="bar-value">${formatValue(d.value)}</span>
    `;
    container.appendChild(row);
  }
}

function renderTimelineChart(container, logsSorted) {
  container.innerHTML = "";
  if (logsSorted.length < 2) {
    container.innerHTML = `<p class="empty-hint">Necesitas al menos 2 bebidas registradas para ver esta gráfica.</p>`;
    return;
  }
  const width = 320;
  const height = 160;
  const padL = 6;
  const padR = 6;
  const padT = 14;
  const padB = 14;
  const times = logsSorted.map((l) => tsToDate(l.createdAt).getTime());
  const t0 = times[0];
  const t1 = times[times.length - 1];
  const span = Math.max(t1 - t0, 1);
  const total = logsSorted.length;
  const points = logsSorted.map((l, i) => {
    const x = padL + ((tsToDate(l.createdAt).getTime() - t0) / span) * (width - padL - padR);
    const y = padT + (1 - (i + 1) / total) * (height - padT - padB);
    return [x, y];
  });
  const linePath = points.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  const baseline = height - padB;
  const areaPath = `${linePath} L${points[points.length - 1][0]},${baseline} L${points[0][0]},${baseline} Z`;
  const last = points[points.length - 1];

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" class="line-chart-svg" role="img" aria-label="Bebidas acumuladas a lo largo del tiempo">
      <line x1="${padL}" y1="${baseline}" x2="${width - padR}" y2="${baseline}" class="chart-axis" />
      <path d="${areaPath}" class="chart-area" />
      <path d="${linePath}" class="chart-line" />
      <circle cx="${last[0]}" cy="${last[1]}" r="4" class="chart-dot" />
    </svg>
    <div class="chart-timeline-labels">
      <span>${formatTime(new Date(t0))}</span>
      <span class="chart-timeline-end-label">${total} bebidas · ${formatTime(new Date(t1))}</span>
    </div>
  `;
}

function renderChartsTab() {
  const hasData = logs.length > 0;
  els.chartsEmpty.hidden = hasData;
  els.kpiRow.hidden = !hasData;
  for (const card of els.chartCards) card.hidden = !hasData;
  if (!hasData) return;

  const g = computeGlobalStats();
  els.kpiRow.innerHTML = `
    <div class="kpi-tile"><span class="kpi-value">${g.totalDrinks}</span><span class="kpi-label">bebidas totales</span></div>
    <div class="kpi-tile"><span class="kpi-value">${round1(g.totalGrams)}</span><span class="kpi-label">g alcohol total</span></div>
    <div class="kpi-tile"><span class="kpi-value">${g.activePeople}</span><span class="kpi-label">personas activas</span></div>
    <div class="kpi-tile"><span class="kpi-value">${round1(g.rate)}</span><span class="kpi-label">bebidas/hora (grupo)</span></div>
  `;

  const alcoholData = people
    .map((p) => ({ label: p.name, value: computeStats(p.id).grams }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);
  renderBarChart(els.chartAlcohol, alcoholData, "series-1", (v) => `${round1(v)} g`);

  renderBarChart(els.chartDrinktypes, computeDrinkTypeCounts(), "series-2", (v) => `${v}`);

  const sortedLogs = [...logs].sort((a, b) => tsToDate(a.createdAt) - tsToDate(b.createdAt));
  renderTimelineChart(els.chartTimeline, sortedLogs);
}

function renderStatsTab() {
  if (currentStatsTab === "general") renderLeaderboardGeneral();
  else if (currentStatsTab === "beer") renderLeaderboardBeer();
  else renderChartsTab();
}

function showStatsTab(tab) {
  currentStatsTab = tab;
  for (const btn of els.tabBtns) {
    const active = btn.dataset.tab === tab;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-selected", String(active));
  }
  for (const [key, panel] of Object.entries(els.tabPanels)) panel.hidden = key !== tab;
  renderStatsTab();
}

for (const btn of els.tabBtns) {
  btn.addEventListener("click", () => showStatsTab(btn.dataset.tab));
}

// ---------- Picker modal (tap fallback, no hold needed) ----------
function openPickerModal() {
  if (!drinks.length) {
    toast("Añade bebidas primero en ⚙️ Ajustes");
    return;
  }
  els.pickerList.innerHTML = "";
  for (const drink of drinks) {
    const btn = document.createElement("button");
    btn.className = "picker-item";
    btn.innerHTML = `<span class="emoji">${drink.emoji}</span><span>${escapeHtml(drink.name)}</span>`;
    btn.addEventListener("click", () => {
      addDrinkLog(drink.id);
      closePickerModal();
    });
    els.pickerList.appendChild(btn);
  }
  els.pickerModal.hidden = false;
}
function closePickerModal() {
  els.pickerModal.hidden = true;
}
document.getElementById("picker-backdrop").addEventListener("click", closePickerModal);
document.getElementById("picker-cancel").addEventListener("click", closePickerModal);

function addDrinkLog(drinkId) {
  if (!currentPersonId) return;
  db.addLog(currentPersonId, drinkId);
  const drink = drinks.find((d) => d.id === drinkId);
  const person = people.find((p) => p.id === currentPersonId);
  toast(`${drink ? drink.emoji : "🍹"} ${drink ? drink.name : ""} para ${person ? person.name : ""}`);
}

// ---------- Navigation wiring ----------
document.getElementById("btn-open-settings").addEventListener("click", () => {
  showView("settings");
  renderSettings();
});
document.getElementById("btn-back-from-settings").addEventListener("click", () => showView("home"));
document.getElementById("btn-back-home").addEventListener("click", () => showView("home"));
document.getElementById("btn-open-stats").addEventListener("click", () => {
  showView("stats");
  showStatsTab(currentStatsTab);
});
document.getElementById("btn-back-from-stats").addEventListener("click", () => showView("home"));

// ---------- Add person / drink forms ----------
document.getElementById("form-add-person").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("input-person-name");
  const name = input.value.trim();
  if (!name) return;
  db.addPerson(name);
  input.value = "";
});

document.getElementById("form-add-drink").addEventListener("submit", (e) => {
  e.preventDefault();
  const emoji = document.getElementById("input-drink-emoji").value.trim();
  const name = document.getElementById("input-drink-name").value.trim();
  const ml = Number(document.getElementById("input-drink-ml").value);
  const abv = Number(document.getElementById("input-drink-abv").value);
  if (!name || !ml || Number.isNaN(abv)) return;
  db.addDrink({ emoji, name, ml, abv });
  e.target.reset();
});

// ---------- FAB ----------
els.fab.addEventListener("click", () => openPickerModal());

// ---------- Config warning ----------
document.getElementById("config-warning-close").addEventListener("click", () => {
  els.configWarning.hidden = true;
});

// ---------- Boot ----------
if (!isConfigured) {
  els.configWarning.hidden = false;
} else {
  db.listenPeople((list) => {
    people = list;
    rerenderCurrent();
  });
  db.listenDrinks((list) => {
    drinks = list;
    rerenderCurrent();
  });
  db.listenLogs((list) => {
    logs = list;
    rerenderCurrent();
  });
}
