import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.snapservice.app',
  appName: 'Snap Service',
  webDir: 'public',
  ios: {
    allowsLinkPreview: false,
    scrollEnabled: true,
    contentInset: 'automatic',
    backgroundColor: '#0a0a0f',
  },
  server: {
    cleartext: true,
  },
};

export default config;
