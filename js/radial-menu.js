import { vibrate } from "./utils.js";

// Umbral MUY por debajo del long-press nativo del móvil (~500ms) para que
// nuestro menú tome el control del gesto antes de que el sistema operativo
// tenga ocasión de interpretarlo como "seleccionar texto". Cualquier
// movimiento del dedo también abre el menú al instante.
const OPEN_DELAY = 100; // ms
const DRAG_THRESHOLD = 10; // px
const HIT_RADIUS = 46; // px alrededor de un item que cuenta como "encima"

/**
 * Attaches press menu behaviour to a button.
 * - Toque rápido y suelto (sin moverse, por debajo de OPEN_DELAY) -> onTap()
 *   (lista simple de selección, como alternativa accesible).
 * - Cualquier otro toque (se mantiene un poco o se arrastra) -> abre un menú
 *   radial fanned sobre el botón; deslizar sobre un item lo resalta, soltar
 *   ahí lo selecciona.
 *
 * @param {HTMLElement} fabEl
 * @param {{ getItems: () => Array<{id:string, emoji?:string, name:string}>, onSelect: (id:string) => void, onTap?: () => void }} opts
 */
export function attachHoldMenu(fabEl, { getItems, onSelect, onTap }) {
  const layer = document.getElementById("radial-layer");
  let openTimer = null;
  let radialOpen = false;
  let activeItemId = null;
  let itemEls = [];
  let startX = 0;
  let startY = 0;

  function clearOpenTimer() {
    clearTimeout(openTimer);
    openTimer = null;
  }

  function openRadial(x, y) {
    const items = getItems();
    if (!items.length) return;
    radialOpen = true;
    layer.innerHTML = "";
    layer.hidden = false;
    vibrate(12);

    const center = document.createElement("div");
    center.className = "radial-center";
    center.textContent = "🍻";
    center.style.left = x + "px";
    center.style.top = y + "px";
    layer.appendChild(center);

    const n = items.length;
    const radius = Math.min(140, 85 + n * 6);
    itemEls = items.map((item, i) => {
      const angle = n === 1 ? 90 : 180 - (180 / (n - 1)) * i; // fan across the upper semicircle
      const rad = (angle * Math.PI) / 180;
      const ix = Math.min(Math.max(x + radius * Math.cos(rad), 40), window.innerWidth - 40);
      const iy = Math.max(y - radius * Math.sin(rad), 40);
      const el = document.createElement("div");
      el.className = "radial-item";
      el.style.left = ix + "px";
      el.style.top = iy + "px";
      el.innerHTML = `${item.emoji || "🍹"}<span class="radial-item-label">${item.name}</span>`;
      layer.appendChild(el);
      return { id: item.id, el, x: ix, y: iy };
    });
    activeItemId = null;
  }

  function updateActive(px, py) {
    let closest = null;
    let closestDist = Infinity;
    for (const it of itemEls) {
      const d = Math.hypot(px - it.x, py - it.y);
      if (d < closestDist) {
        closestDist = d;
        closest = it;
      }
    }
    const newActiveId = closest && closestDist <= HIT_RADIUS ? closest.id : null;
    if (newActiveId !== activeItemId) {
      itemEls.forEach((it) => it.el.classList.toggle("active", it.id === newActiveId));
      if (newActiveId) vibrate(8);
      activeItemId = newActiveId;
    }
  }

  function closeRadial(commit) {
    if (commit && activeItemId) onSelect(activeItemId);
    layer.hidden = true;
    layer.innerHTML = "";
    radialOpen = false;
    activeItemId = null;
    itemEls = [];
  }

  // Bloquea el menú "copiar / seleccionar" que el navegador muestra por
  // defecto al mantener pulsado.
  fabEl.addEventListener("contextmenu", (e) => e.preventDefault());
  fabEl.addEventListener("selectstart", (e) => e.preventDefault());

  fabEl.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    fabEl.setPointerCapture(e.pointerId);
    fabEl.classList.add("pressed");
    startX = e.clientX;
    startY = e.clientY;
    openTimer = setTimeout(() => openRadial(startX, startY), OPEN_DELAY);
  });

  fabEl.addEventListener("pointermove", (e) => {
    if (!radialOpen) {
      const moved = Math.hypot(e.clientX - startX, e.clientY - startY);
      if (moved > DRAG_THRESHOLD) {
        clearOpenTimer();
        openRadial(startX, startY);
      }
    }
    if (radialOpen) updateActive(e.clientX, e.clientY);
  });

  fabEl.addEventListener("pointerup", () => {
    fabEl.classList.remove("pressed");
    const wasOpen = radialOpen;
    clearOpenTimer();
    if (wasOpen) {
      closeRadial(true);
    } else if (onTap) {
      onTap();
    }
  });

  fabEl.addEventListener("pointercancel", () => {
    fabEl.classList.remove("pressed");
    clearOpenTimer();
    if (radialOpen) closeRadial(false);
  });
}
