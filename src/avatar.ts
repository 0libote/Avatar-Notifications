/**
 * Avatar overlay window.
 *
 * - Renders the chosen pixel buddy (idle bob, blink, alert bounce).
 * - Drag anywhere to move; position is saved to settings.
 * - Click the buddy to open the dashboard.
 * - Shows a speech bubble + badge with the unread summary.
 */
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  getNotifications,
  getSettings,
  onNotificationsUpdated,
  quitApp,
  setAvatarPosition,
  showDashboard,
} from "./shared/api";
import { drawBuddy, getBuddy, validateBuddies } from "./shared/buddies";
import { summarizeUnread, type AppSettings, type TrackedNotification } from "./shared/types";

const SNOOZE_KEY = "notifbuddy-snooze-until";

const stage = document.getElementById("stage")!;
const bubble = document.getElementById("bubble")!;
const bubbleText = document.getElementById("bubble-text")!;
const buddyWrap = document.getElementById("buddy-wrap")!;
const canvas = document.getElementById("buddy") as HTMLCanvasElement;
const badge = document.getElementById("badge")!;
const zzz = document.getElementById("zzz")!;
const captionText = document.getElementById("caption-text")!;
const btnOpen = document.getElementById("btn-open")!;
const btnSnooze = document.getElementById("btn-snooze")!;
const btnQuit = document.getElementById("btn-quit")!;

let settings: AppSettings | null = null;
let items: TrackedNotification[] = [];
let blinkFrame: 0 | 1 = 0;
let savePosTimer: number | undefined;

function isSnoozed(): boolean {
  return Date.now() < Number(localStorage.getItem(SNOOZE_KEY) ?? 0);
}

function unreadCount(): number {
  return items.filter((n) => !n.read).length;
}

function render(): void {
  if (!settings) return;
  const buddy = getBuddy(settings.characterId);
  const unread = unreadCount();
  const snoozed = isSnoozed();

  drawBuddy(canvas, buddy.id, snoozed ? 1 : blinkFrame, settings.avatarSize);
  stage.style.opacity = String(settings.opacity);

  buddyWrap.classList.toggle("has-unread", unread > 0 && !snoozed);

  if (unread > 0) {
    badge.textContent = unread > 99 ? "99+" : String(unread);
    badge.classList.remove("hidden");
    bubbleText.textContent = summarizeUnread(items);
    bubble.classList.remove("hidden");
  } else {
    badge.classList.add("hidden");
    bubble.classList.add("hidden");
  }

  zzz.classList.toggle("hidden", !snoozed);
  btnSnooze.classList.toggle("active", snoozed);
  captionText.textContent = snoozed ? `${buddy.name} is napping…` : `${buddy.name} • watching`;
}

function onNewItems(next: TrackedNotification[]): void {
  const before = unreadCount();
  items = next;
  const after = unreadCount();
  if (after > before) {
    buddyWrap.classList.remove("just-arrived");
    // Re-trigger the wiggle animation.
    void buddyWrap.offsetWidth;
    buddyWrap.classList.add("just-arrived");
  }
  render();
}

async function refresh(): Promise<void> {
  try {
    onNewItems(await getNotifications());
  } catch {
    /* backend not up yet (browser preview) — ignore */
  }
}

function scheduleSavePosition(): void {
  window.clearTimeout(savePosTimer);
  savePosTimer = window.setTimeout(async () => {
    try {
      const pos = await getCurrentWindow().outerPosition();
      await setAvatarPosition(pos.x, pos.y);
    } catch {
      /* ignore */
    }
  }, 800);
}

// Drag-to-move: start a native drag on left-press that isn't on a button,
// unless it turns out to be a click (opens dashboard instead).
let downAt: { x: number; y: number } | null = null;

stage.addEventListener("pointerdown", async (e) => {
  if ((e.target as HTMLElement).closest("#controls")) return;
  if (e.button !== 0) return;
  downAt = { x: e.clientX, y: e.clientY };
  try {
    await getCurrentWindow().startDragging();
  } catch {
    /* browser preview */
  }
});

stage.addEventListener("pointerup", async (e) => {
  if (!downAt) return;
  const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
  downAt = null;
  if (moved < 6 && !(e.target as HTMLElement).closest("#controls")) {
    try {
      await showDashboard();
    } catch {
      /* browser preview */
    }
  } else {
    scheduleSavePosition();
  }
});

btnOpen.addEventListener("click", async (e) => {
  e.stopPropagation();
  try {
    await showDashboard();
  } catch {
    /* ignore */
  }
});

btnSnooze.addEventListener("click", (e) => {
  e.stopPropagation();
  if (isSnoozed()) {
    localStorage.removeItem(SNOOZE_KEY);
  } else {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + 30 * 60 * 1000));
  }
  render();
});

btnQuit.addEventListener("click", async (e) => {
  e.stopPropagation();
  try {
    await quitApp();
  } catch {
    /* ignore */
  }
});

async function init(): Promise<void> {
  const problems = validateBuddies();
  if (problems.length > 0) console.warn("buddy art issues:", problems);
  try {
    settings = await getSettings();
  } catch {
    // Browser preview fallback so the UI can be developed with vite.
    settings = {
      watchedApps: [],
      characterId: "blob",
      avatarSize: 96,
      opacity: 1,
      pollIntervalSecs: 5,
      avatarX: null,
      avatarY: null,
    };
  }
  try {
    await onNotificationsUpdated((next) => onNewItems(next));
  } catch {
    /* browser preview */
  }
  await refresh();
  render();
  window.setInterval(refresh, 4000);
  window.setInterval(() => {
    if (isSnoozed()) {
      render();
      return;
    }
    // Natural blink every ~3.6s.
    blinkFrame = 1;
    render();
    window.setTimeout(() => {
      blinkFrame = 0;
      render();
    }, 160);
  }, 3600);
}

void init();
