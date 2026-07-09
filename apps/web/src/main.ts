import { Capacitor } from "@capacitor/core";
import { initApp } from "./app.js";

async function bootstrap(): Promise<void> {
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
