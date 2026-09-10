import { vibrate } from "./utils.js";

const HOLD_DELAY = 280; // ms to trigger the radial menu
const HIT_RADIUS = 46; // px around an item that counts as "hovering" it

/**
 * Attaches press-and-hold radial menu behaviour to a button.
 * - Quick tap -> onTap() (used for a simple list-picker fallback)
 * - Press & hold -> opens a radial menu fanned above the button; sliding the
 *   finger over an item highlights it, lifting the finger there selects it.
 *
 * @param {HTMLElement} fabEl
 * @param {{ getItems: () => Array<{id:string, emoji?:string, name:string}>, onSelect: (id:string) => void, onTap?: () => void }} opts
 */
export function attachHoldMenu(fabEl, { getItems, onSelect, onTap }) {
  const layer = document.getElementById("radial-layer");
  let holdTimer = null;
  let radialOpen = false;
  let activeItemId = null;
  let itemEls = [];

  function clearHold() {
    clearTimeout(holdTimer);
    holdTimer = null;
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

  fabEl.addEventListener("pointerdown", (e) => {
    fabEl.setPointerCapture(e.pointerId);
    fabEl.classList.add("pressed");
    holdTimer = setTimeout(() => openRadial(e.clientX, e.clientY), HOLD_DELAY);
  });

  fabEl.addEventListener("pointermove", (e) => {
    if (radialOpen) updateActive(e.clientX, e.clientY);
  });

  fabEl.addEventListener("pointerup", () => {
    fabEl.classList.remove("pressed");
    const wasOpen = radialOpen;
    clearHold();
    if (wasOpen) {
      closeRadial(true);
    } else if (onTap) {
      onTap();
    }
  });

  fabEl.addEventListener("pointercancel", () => {
    fabEl.classList.remove("pressed");
    clearHold();
    if (radialOpen) closeRadial(false);
  });
}
