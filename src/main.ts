/**
 * Dashboard window: inbox, watchlist, buddy picker, display settings.
 */
import { PhysicalPosition, primaryMonitor, Window } from "@tauri-apps/api/window";
import {
  clearRead,
  dismissNotification,
  getListenerStatus,
  getNotifications,
  getSettings,
  markAllRead,
  markRead,
  onNotificationsUpdated,
  quitApp,
  requestNotificationAccess,
  saveSettings,
  setAvatarPosition,
  simulateNotification,
} from "./shared/api";
import { BUDDIES, drawBuddy } from "./shared/buddies";
import {
  timeAgo,
  type AppSettings,
  type TrackedNotification,
} from "./shared/types";

const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;

const inboxEl = $("inbox");
const inboxEmpty = $("inbox-empty");
const unreadPill = $("unread-pill");
const subtitle = $("subtitle");
const listenerDetail = $("listener-detail");
const btnAccess = $<HTMLButtonElement>("btn-access");
const watchlistEl = $("watchlist");
const watchInput = $("watch-input") as HTMLInputElement;
const buddyGrid = $("buddy-grid");
const sizeInput = $("size") as HTMLInputElement;
const opacityInput = $("opacity") as HTMLInputElement;
const sizeVal = $("size-val");
const opacityVal = $("opacity-val");
const appFilters = $("app-filters");
const miniBuddy = $("mini-buddy") as HTMLCanvasElement;

let settings: AppSettings | null = null;
let items: TrackedNotification[] = [];
let mainFilter: "all" | "unread" = "all";
let appFilter: string | null = null;
let saveTimer: number | undefined;

const SIM_PRESETS: Record<string, [string, string]> = {
  Outlook: ["New email: Q3 planning", "Priya sent “Q3 planning — please review by EOD”."],
  Teams: ["New message in Product", "Marcus: can you look at the deploy logs when free?"],
  Slack: ["Mention in #launches", "Aisha mentioned you: final copy is ready 🎉"],
};

function persistSoon(): void {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    if (settings) void saveSettings(settings);
  }, 400);
}

function unread(): TrackedNotification[] {
  return items.filter((n) => !n.read);
}

function renderHeader(): void {
  const u = unread().length;
  unreadPill.textContent = u === 0 ? "All caught up ✨" : `${u} unread`;
  unreadPill.classList.toggle("hot", u > 0);
  subtitle.textContent =
    u === 0
      ? "Your pixel pal is watching 👀"
      : `Your buddy spotted ${u} thing${u === 1 ? "" : "s"} you might've missed 💌`;
  if (settings) drawBuddy(miniBuddy, settings.characterId, 0, 52);
}

function visibleItems(): TrackedNotification[] {
  return items.filter((n) => {
    if (mainFilter === "unread" && n.read) return false;
    if (appFilter && n.app !== appFilter) return false;
    return true;
  });
}

function renderInbox(): void {
  const list = visibleItems();
  inboxEl.innerHTML = "";
  inboxEmpty.classList.toggle("hidden", list.length > 0);
  for (const n of list) {
    const li = document.createElement("li");
    li.className = `notif ${n.read ? "read-item" : "unread"}`;
    li.innerHTML = `
      <div class="dot"></div>
      <div class="body">
        <span class="app-tag"></span><span class="time"></span>
        <h3></h3>
        <p></p>
      </div>
      <div class="actions"></div>`;
    li.querySelector(".app-tag")!.textContent = n.app;
    li.querySelector(".time")!.textContent = timeAgo(n.receivedAt);
    li.querySelector("h3")!.textContent = n.title || "(no title)";
    li.querySelector("p")!.textContent = n.body || "";
    const actions = li.querySelector(".actions")!;
    if (!n.read) {
      const done = document.createElement("button");
      done.textContent = "✓";
      done.title = "Mark read";
      done.onclick = () => void markRead(n.id).then(refresh);
      actions.appendChild(done);
    }
    const del = document.createElement("button");
    del.textContent = "✕";
    del.title = "Dismiss";
    del.onclick = () => void dismissNotification(n.id).then(refresh);
    actions.appendChild(del);
    inboxEl.appendChild(li);
  }

  // Per-app quick filters.
  const apps = [...new Set(items.map((n) => n.app))].sort();
  appFilters.innerHTML = "";
  for (const app of apps) {
    const b = document.createElement("button");
    b.className = `chip${appFilter === app ? " active" : ""}`;
    const count = items.filter((n) => n.app === app && !n.read).length;
    b.textContent = count > 0 ? `${app} (${count})` : app;
    b.onclick = () => {
      appFilter = appFilter === app ? null : app;
      renderInbox();
    };
    appFilters.appendChild(b);
  }
}

function renderWatchlist(): void {
  if (!settings) return;
  watchlistEl.innerHTML = "";
  settings.watchedApps.forEach((w, i) => {
    const li = document.createElement("li");
    li.className = `watch-row${w.enabled ? "" : " off"}`;
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = w.enabled;
    cb.title = "Watch this app";
    cb.onchange = () => {
      if (!settings) return;
      settings.watchedApps[i].enabled = cb.checked;
      persistSoon();
      renderWatchlist();
    };
    const name = document.createElement("span");
    name.className = "name";
    name.textContent = w.name;
    const rm = document.createElement("button");
    rm.className = "rm";
    rm.textContent = "Remove";
    rm.onclick = () => {
      if (!settings) return;
      settings.watchedApps.splice(i, 1);
      persistSoon();
      renderWatchlist();
    };
    li.append(cb, name, rm);
    watchlistEl.appendChild(li);
  });
}

function renderBuddies(): void {
  if (!settings) return;
  buddyGrid.innerHTML = "";
  for (const b of BUDDIES) {
    const card = document.createElement("div");
    card.className = `buddy-card${settings.characterId === b.id ? " selected" : ""}`;
    const cv = document.createElement("canvas");
    card.appendChild(cv);
    const h = document.createElement("h3");
    h.textContent = b.name;
    const p = document.createElement("p");
    p.textContent = b.blurb;
    card.append(h, p);
    drawBuddy(cv, b.id, 0, 72);
    card.onclick = () => {
      if (!settings) return;
      settings.characterId = b.id;
      persistSoon();
      renderBuddies();
      renderHeader();
    };
    buddyGrid.appendChild(card);
  }
}

function renderDisplay(): void {
  if (!settings) return;
  sizeInput.value = String(settings.avatarSize);
  opacityInput.value = String(settings.opacity);
  sizeVal.textContent = `${settings.avatarSize}px`;
  opacityVal.textContent = `${Math.round(settings.opacity * 100)}%`;
}

function renderAll(): void {
  renderHeader();
  renderInbox();
  renderWatchlist();
  renderBuddies();
  renderDisplay();
}

async function refresh(): Promise<void> {
  try {
    items = await getNotifications();
  } catch {
    return; // backend not up (browser preview)
  }
  renderHeader();
  renderInbox();
}

async function refreshListener(): Promise<void> {
  try {
    const s = await getListenerStatus();
    listenerDetail.textContent = s.supported
      ? `Status: ${s.access}. ${s.detail}`
      : s.detail;
    btnAccess.style.display = s.supported ? "" : "none";
    if (s.supported) btnAccess.textContent = s.access === "granted" ? "Re-check access" : "Request access";
  } catch {
    listenerDetail.textContent = "Backend not running (browser preview).";
  }
}

async function pinAvatar(corner: "tl" | "tr" | "bl" | "br"): Promise<void> {
  try {
    const avatar = await Window.getByLabel("avatar");
    if (!avatar) return;
    const monitor = await primaryMonitor();
    const winSize = await avatar.outerSize();
    const m = 16;
    let x = 0;
    let y = 0;
    if (monitor) {
      const area = monitor.workArea;
      if (corner === "tl") {
        x = area.position.x + m;
        y = area.position.y + m;
      } else if (corner === "tr") {
        x = area.position.x + area.size.width - winSize.width - m;
        y = area.position.y + m;
      } else if (corner === "bl") {
        x = area.position.x + m;
        y = area.position.y + area.size.height - winSize.height - m;
      } else {
        x = area.position.x + area.size.width - winSize.width - m;
        y = area.position.y + area.size.height - winSize.height - m;
      }
      await avatar.setPosition(new PhysicalPosition(x, y));
      await setAvatarPosition(x, y);
    }
  } catch {
    /* browser preview */
  }
}

function wire(): void {
  document.querySelectorAll("#filters button").forEach((b) => {
    b.addEventListener("click", () => {
      mainFilter = (b as HTMLElement).dataset.filter as "all" | "unread";
      document
        .querySelectorAll("#filters button")
        .forEach((x) => x.classList.toggle("active", x === b));
      renderInbox();
    });
  });

  $("btn-read-all").onclick = () => void markAllRead().then(refresh);
  $("btn-clear").onclick = () => void clearRead().then(refresh);

  document.querySelectorAll("[data-sim]").forEach((b) => {
    b.addEventListener("click", async () => {
      const app = (b as HTMLElement).dataset.sim!;
      const [title, body] = SIM_PRESETS[app] ?? ["Test notification", "Hello from NotifBuddy!"];
      try {
        items = await simulateNotification(app, title, body);
        renderHeader();
        renderInbox();
      } catch {
        /* ignore */
      }
    });
  });

  $("btn-watch-add").onclick = () => {
    if (!settings) return;
    const name = watchInput.value.trim();
    if (!name) return;
    if (!settings.watchedApps.some((w) => w.name.toLowerCase() === name.toLowerCase())) {
      settings.watchedApps.push({ name, enabled: true });
      persistSoon();
      renderWatchlist();
    }
    watchInput.value = "";
  };
  watchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") ($("btn-watch-add") as HTMLButtonElement).click();
  });
  $("btn-watch-reset").onclick = () => {
    if (!settings) return;
    settings.watchedApps = [
      { name: "Outlook", enabled: true },
      { name: "Teams", enabled: true },
      { name: "Slack", enabled: true },
      { name: "Gmail", enabled: false },
      { name: "Discord", enabled: false },
    ];
    persistSoon();
    renderWatchlist();
  };

  sizeInput.oninput = () => {
    if (!settings) return;
    settings.avatarSize = Number(sizeInput.value);
    sizeVal.textContent = `${settings.avatarSize}px`;
    persistSoon();
  };
  opacityInput.oninput = () => {
    if (!settings) return;
    settings.opacity = Number(opacityInput.value);
    opacityVal.textContent = `${Math.round(settings.opacity * 100)}%`;
    persistSoon();
  };

  document.querySelectorAll("[data-pos]").forEach((b) => {
    b.addEventListener("click", () =>
      void pinAvatar((b as HTMLElement).dataset.pos as "tl" | "tr" | "bl" | "br"),
    );
  });

  btnAccess.onclick = async () => {
    btnAccess.disabled = true;
    btnAccess.textContent = "Waiting on Windows…";
    try {
      await requestNotificationAccess();
    } catch {
      /* ignore */
    }
    await refreshListener();
    btnAccess.disabled = false;
  };

  $("btn-quit").onclick = () => void quitApp().catch(() => undefined);
}

async function init(): Promise<void> {
  wire();
  try {
    settings = await getSettings();
  } catch {
    settings = {
      watchedApps: [
        { name: "Outlook", enabled: true },
        { name: "Teams", enabled: true },
        { name: "Slack", enabled: true },
      ],
      characterId: "blob",
      avatarSize: 96,
      opacity: 1,
      pollIntervalSecs: 5,
      avatarX: null,
      avatarY: null,
    };
  }
  try {
    await onNotificationsUpdated((next) => {
      items = next;
      renderHeader();
      renderInbox();
    });
  } catch {
    /* browser preview */
  }
  renderAll();
  await refresh();
  await refreshListener();
  window.setInterval(refresh, 4000);
}

void init();
