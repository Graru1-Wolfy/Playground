const RETRACT_THRESHOLD = 48;
const SCROLL_DELTA_MIN = 8;
const LAYOUT_LOCK_MS = 320;

export interface ScrollRetractState {
  retracted: boolean;
  lastY: number;
  layoutLockedUntil: number;
}

export interface AnalyticalCollapseInput {
  scrollY: number;
  delta: number;
  collapsed: boolean;
  layoutLocked: boolean;
}

/** Collapse analytical results on scroll down; expand on scroll up or near top. */
export function nextAnalyticalCollapse(input: AnalyticalCollapseInput): boolean | null {
  if (input.layoutLocked) return null;

  const { scrollY, delta, collapsed } = input;

  if (scrollY <= RETRACT_THRESHOLD) {
    return collapsed ? false : null;
  }

  if (delta < -SCROLL_DELTA_MIN) {
    return collapsed ? false : null;
  }

  if (delta > SCROLL_DELTA_MIN) {
    return collapsed ? null : true;
  }

  return null;
}

export function bindAnalyticalCollapse(analytical: HTMLElement): () => void {
  const toggle = analytical.querySelector<HTMLButtonElement>("#analytical-toggle");
  const state: ScrollRetractState = {
    retracted: false,
    lastY: window.scrollY,
    layoutLockedUntil: 0,
  };

  const setCollapsed = (next: boolean): void => {
    if (next === state.retracted) return;

    const before = analytical.offsetHeight;
    const scrollY = window.scrollY;

    state.retracted = next;
    analytical.classList.toggle("analytical-collapsed", next);
    toggle?.setAttribute("aria-expanded", next ? "false" : "true");
    void analytical.offsetHeight;

    const after = analytical.offsetHeight;
    const delta = before - after;
    if (delta !== 0) {
      state.layoutLockedUntil = performance.now() + LAYOUT_LOCK_MS;
      window.scrollTo(0, Math.max(0, scrollY - delta));
      state.lastY = window.scrollY;
    }
  };

  toggle?.addEventListener("click", () => {
    setCollapsed(!state.retracted);
  });

  const update = (): void => {
    const y = window.scrollY;
    const delta = y - state.lastY;

    const next = nextAnalyticalCollapse({
      scrollY: y,
      delta,
      collapsed: state.retracted,
      layoutLocked: performance.now() < state.layoutLockedUntil,
    });

    if (next !== null) {
      setCollapsed(next);
    }

    state.lastY = y;
  };

  let ticking = false;
  const onScroll = (): void => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      update();
      ticking = false;
    });
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  return () => window.removeEventListener("scroll", onScroll);
}

/** @deprecated Use bindAnalyticalCollapse */
export const bindDefaultsScrollRetract = bindAnalyticalCollapse;

/** @deprecated Use nextAnalyticalCollapse */
export const nextRetractState = (input: {
  scrollY: number;
  delta: number;
  retracted: boolean;
  layoutLocked: boolean;
  mainGridTop: number | null;
}): boolean | null =>
  nextAnalyticalCollapse({
    scrollY: input.scrollY,
    delta: input.delta,
    collapsed: input.retracted,
    layoutLocked: input.layoutLocked,
  });
