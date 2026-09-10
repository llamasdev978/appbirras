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
} from "./utils.js";

let people = [];
let drinks = [];
let logs = [];
let currentPersonId = null;
let currentView = "home";

const els = {
  home: document.getElementById("view-home"),
  person: document.getElementById("view-person"),
  settings: document.getElementById("view-settings"),
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
