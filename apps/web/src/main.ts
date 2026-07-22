import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { initApp } from "./app.js";

async function configureNativeChrome(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await StatusBar.setBackgroundColor({ color: "#12161e" });
    await StatusBar.setStyle({ style: Style.Dark });
  } catch {
    /* StatusBar API unavailable on this platform build */
  }
}

async function bootstrap(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    document.documentElement.classList.add("native-shell");
  }
  await configureNativeChrome();
  if (
    import.meta.env.PROD &&
    import.meta.env.VITE_CAPACITOR !== "true" &&
    !Capacitor.isNativePlatform()
  ) {
    const { registerSW } = await import("virtual:pwa-register");
    registerSW({ immediate: true });
  }
  initApp();
}

void bootstrap();
