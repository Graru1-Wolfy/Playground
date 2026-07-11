import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.playground.tf2bouncechecker",
  appName: "TF2 Bounce Checker",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
};

export default config;
