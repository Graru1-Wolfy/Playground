export function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing #${id}`);
  return node as T;
}

export function debounce<T extends (...args: never[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return ((...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function setLiveStatus(state: "idle" | "loading" | "ready" | "error"): void {
  const pill = el<HTMLSpanElement>("live-status");
  pill.dataset.state = state;
  const labels: Record<typeof state, string> = {
    idle: "Idle",
    loading: "Computing…",
    ready: "Live",
    error: "Error",
  };
  const label = pill.querySelector(".live-label");
  if (label) {
    label.textContent = labels[state];
  } else {
    const dot = pill.querySelector(".live-dot");
    pill.textContent = "";
    if (dot) pill.appendChild(dot);
    const span = document.createElement("span");
    span.className = "live-label";
    span.textContent = labels[state];
    pill.appendChild(span);
  }
}

export function showElement(node: HTMLElement, visible: boolean): void {
  node.classList.toggle("hidden", !visible);
  node.setAttribute("aria-hidden", visible ? "false" : "true");
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
