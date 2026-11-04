import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.genescan.app",
  appName: "GeneScan",
  webDir: "dist",
  android: { allowMixedContent: false },
};

export default config;
