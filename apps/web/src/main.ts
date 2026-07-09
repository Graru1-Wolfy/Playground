import { registerSW } from "virtual:pwa-register";
import { initApp } from "./app.js";

if (import.meta.env.PROD) {
  registerSW({ immediate: true });
}

initApp();
