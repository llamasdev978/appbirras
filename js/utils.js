// Densidad del etanol ~0.8 g/ml (redondeo estándar usado en España para estas cuentas).
// 1 UBE (Unidad de Bebida Estándar) = 10 g de alcohol puro.
export function gramsOfAlcohol(ml, abv) {
  return (ml * (abv / 100) * 0.8);
}

export function toUBE(grams) {
  return grams / 10;
}

export function round1(n) {
  return Math.round(n * 10) / 10;
}

const AVATAR_COLORS = [
  "#ffb545", "#ff5e9e", "#5ee0ff", "#8b7bff",
  "#7cf29a", "#ff8a5e", "#ffe45e", "#ff5e5e",
];

export function colorForName(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function initials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");
}

export function formatTime(date) {
  return date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

export function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 1800);
}

export function vibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

const BEER_KEYWORDS = ["cerveza", "birra", "beer", "caña", "cana", "lager", "ipa", "pilsner", "stout"];

// Las bebidas son libres (nombre/emoji definidos por el usuario), así que
// identificamos "cerveza" por convención: emoji 🍺 o alguna palabra típica en el nombre.
export function isBeerDrink(drink) {
  if (!drink) return false;
  if (drink.emoji && drink.emoji.includes("🍺")) return true;
  const name = (drink.name || "").toLowerCase();
  return BEER_KEYWORDS.some((kw) => name.includes(kw));
}
