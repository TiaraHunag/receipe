import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tiara.receipe',
  appName: 'com.tiara.receipe',
  webDir: 'dist',
  // 讓 fetch/XMLHttpRequest 改走原生 URLSession,繞過 WebView 的 CORS 限制。
  // 只在 Xcode build 到實機/模擬器時生效,StackBlitz 瀏覽器預覽環境不受影響(仍會被 CORS 擋下)。
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
