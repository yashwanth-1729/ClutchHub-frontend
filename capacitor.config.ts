import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.clutchhub.app',
  appName: 'ClutchHub',
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#030308',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
  },
};

export default config;
