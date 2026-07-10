const RETRACT_THRESHOLD = 48;
const SCROLL_DELTA_MIN = 8;
const LAYOUT_LOCK_MS = 320;
const MAIN_GRID_RETRACT_OFFSET = 96;

export interface ScrollRetractState {
  retracted: boolean;
  lastY: number;
  layoutLockedUntil: number;
}

export interface ScrollRetractInput {
  scrollY: number;
  delta: number;
  retracted: boolean;
  layoutLocked: boolean;
  mainGridTop: number | null;
}

/** Decide whether hero results should expand, retract, or stay as-is. */
export function nextRetractState(input: ScrollRetractInput): boolean | null {
  if (input.layoutLocked) return null;

  const { scrollY, delta, retracted, mainGridTop } = input;

  if (scrollY <= RETRACT_THRESHOLD) {
    return retracted ? false : null;
  }

  if (delta < -SCROLL_DELTA_MIN) {
    return retracted ? false : null;
  }

  if (delta > SCROLL_DELTA_MIN && mainGridTop !== null && mainGridTop < MAIN_GRID_RETRACT_OFFSET) {
    return retracted ? null : true;
  }

  return null;
}

export function bindDefaultsScrollRetract(heroResults: HTMLElement): () => void {
  const mainGrid = document.querySelector<HTMLElement>(".main-grid");
  const state: ScrollRetractState = {
    retracted: false,
    lastY: window.scrollY,
    layoutLockedUntil: 0,
  };

  const setRetracted = (next: boolean): void => {
    if (next === state.retracted) return;

    const before = heroResults.offsetHeight;
    const scrollY = window.scrollY;

    state.retracted = next;
    heroResults.classList.toggle("results-retracted", next);
    void heroResults.offsetHeight;

    const after = heroResults.offsetHeight;
    const delta = before - after;
    if (delta !== 0) {
      state.layoutLockedUntil = performance.now() + LAYOUT_LOCK_MS;
      window.scrollTo(0, Math.max(0, scrollY - delta));
      state.lastY = window.scrollY;
    }
  };

  const update = (): void => {
    const y = window.scrollY;
    const delta = y - state.lastY;
    const mainGridTop = mainGrid?.getBoundingClientRect().top ?? null;

    const next = nextRetractState({
      scrollY: y,
      delta,
      retracted: state.retracted,
      layoutLocked: performance.now() < state.layoutLockedUntil,
      mainGridTop,
    });

    if (next !== null) {
      setRetracted(next);
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
