// App configuration for different builds (Passenger vs Driver)
export interface AppConfig {
  appName: string;
  appId: string;
  version: string;
  userRole: 'passenger' | 'driver';
  theme: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  features: {
    maps: boolean;
    payments: boolean;
    notifications: boolean;
    offline: boolean;
    gps: boolean;
  };
  branding: {
    logo: string;
    icon: string;
    splashScreen: string;
    statusBarColor: string;
  };
}

// Passenger App Configuration
export const PASSENGER_CONFIG: AppConfig = {
  appName: 'RideHail Passenger',
  appId: 'com.ridehail.passenger',
  version: '1.0.0',
  userRole: 'passenger',
  theme: {
    primary: '#3b82f6', // Blue
    secondary: '#1e40af',
    accent: '#60a5fa',
    background: '#f8fafc'
  },
  features: {
    maps: true,
    payments: true,
    notifications: true,
    offline: true,
    gps: true
  },
  branding: {
    logo: '🎯',
    icon: '/icons/passenger-icon.png',
    splashScreen: '/icons/passenger-splash.png',
    statusBarColor: '#3b82f6'
  }
};

// Driver App Configuration
export const DRIVER_CONFIG: AppConfig = {
  appName: 'RideHail Driver',
  appId: 'com.ridehail.driver',
  version: '1.0.0',
  userRole: 'driver',
  theme: {
    primary: '#10b981', // Green
    secondary: '#047857',
    accent: '#34d399',
    background: '#f0fdf4'
  },
  features: {
    maps: true,
    payments: true,
    notifications: true,
    offline: true,
    gps: true
  },
  branding: {
    logo: '🚗',
    icon: '/icons/driver-icon.png',
    splashScreen: '/icons/driver-splash.png',
    statusBarColor: '#10b981'
  }
};

// Get current app configuration based on build environment or URL parameter
export function getAppConfig(): AppConfig {
  // Check URL parameters first for demo purposes
  const urlParams = new URLSearchParams(window.location.search);
  const urlBuildType = urlParams.get('mode');
  
  // Then check environment variable
  const buildType = urlBuildType || import.meta.env.VITE_BUILD_TYPE || 'passenger';
  return buildType === 'driver' ? DRIVER_CONFIG : PASSENGER_CONFIG;
}

// PWA Manifest generator
export function generateManifest(config: AppConfig) {
  return {
    name: config.appName,
    short_name: config.appName.split(' ')[1], // "Passenger" or "Driver"
    description: `${config.appName} - Your reliable ride-hailing companion`,
    start_url: '/',
    display: 'standalone',
    theme_color: config.theme.primary,
    background_color: config.theme.background,
    orientation: 'portrait-primary',
    scope: '/',
    lang: 'en-US',
    categories: ['transportation', 'travel', 'navigation'],
    icons: [
      {
        src: '/icons/icon-72x72.png',
        sizes: '72x72',
        type: 'image/png',
        purpose: 'maskable any'
      },
      {
        src: '/icons/icon-96x96.png',
        sizes: '96x96',
        type: 'image/png',
        purpose: 'maskable any'
      },
      {
        src: '/icons/icon-128x128.png',
        sizes: '128x128',
        type: 'image/png',
        purpose: 'maskable any'
      },
      {
        src: '/icons/icon-144x144.png',
        sizes: '144x144',
        type: 'image/png',
        purpose: 'maskable any'
      },
      {
        src: '/icons/icon-152x152.png',
        sizes: '152x152',
        type: 'image/png',
        purpose: 'maskable any'
      },
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable any'
      },
      {
        src: '/icons/icon-384x384.png',
        sizes: '384x384',
        type: 'image/png',
        purpose: 'maskable any'
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable any'
      }
    ],
    screenshots: [
      {
        src: '/screenshots/mobile-home.png',
        sizes: '390x844',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Home screen'
      },
      {
        src: '/screenshots/mobile-map.png',
        sizes: '390x844',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Map view'
      }
    ],
    shortcuts: [
      {
        name: 'Quick Ride',
        short_name: 'Ride',
        description: 'Book a ride quickly',
        url: '/?shortcut=quick-ride',
        icons: [{ src: '/icons/shortcut-ride.png', sizes: '96x96' }]
      },
      {
        name: 'View Map',
        short_name: 'Map',
        description: 'See nearby drivers',
        url: '/?shortcut=map',
        icons: [{ src: '/icons/shortcut-map.png', sizes: '96x96' }]
      }
    ],
    related_applications: [
      {
        platform: 'play',
        url: `https://play.google.com/store/apps/details?id=${config.appId}`,
        id: config.appId
      }
    ],
    prefer_related_applications: false
  };
}

// Capacitor configuration
export function generateCapacitorConfig(config: AppConfig) {
  return {
    appId: config.appId,
    appName: config.appName,
    webDir: 'dist',
    server: {
      androidScheme: 'https'
    },
    android: {
      buildOptions: {
        keystorePath: 'android/keystore.keystore',
        keystoreAlias: 'ridehail',
        releaseType: 'APK'
      },
      backgroundColor: config.theme.background
    },
    plugins: {
      SplashScreen: {
        launchShowDuration: 2000,
        backgroundColor: config.theme.primary,
        androidSplashResourceName: 'splash',
        androidScaleType: 'CENTER_CROP',
        showSpinner: false,
        androidSpinnerStyle: 'large',
        spinnerColor: '#ffffff'
      },
      StatusBar: {
        backgroundColor: config.theme.primary,
        style: 'dark'
      },
      Geolocation: {
        permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION']
      },
      LocalNotifications: {
        smallIcon: 'ic_stat_icon_config_sample',
        iconColor: config.theme.primary
      },
      PushNotifications: {
        presentationOptions: ['badge', 'sound', 'alert']
      },
      App: {
        launchUrl: 'ridehail://app'
      },
      Keyboard: {
        resize: 'body',
        style: 'dark',
        resizeOnFullScreen: true
      }
    }
  };
}

// Build scripts for different app versions
export const BUILD_COMMANDS = {
  'build:passenger': 'VITE_BUILD_TYPE=passenger vite build',
  'build:driver': 'VITE_BUILD_TYPE=driver vite build',
  'android:passenger': 'npm run build:passenger && npx cap sync android && npx cap open android',
  'android:driver': 'npm run build:driver && npx cap sync android && npx cap open android',
  'release:passenger': 'npm run build:passenger && npx cap sync android && cd android && ./gradlew assembleRelease',
  'release:driver': 'npm run build:driver && npx cap sync android && cd android && ./gradlew assembleRelease'
};

// Environment-specific settings
export function getEnvironmentConfig() {
  const isDevelopment = import.meta.env.DEV;
  const isProduction = import.meta.env.PROD;
  
  // Check URL parameters first, then environment variable
  const urlParams = new URLSearchParams(window.location.search);
  const urlBuildType = urlParams.get('mode');
  const buildType = urlBuildType || import.meta.env.VITE_BUILD_TYPE || 'passenger';
  
  return {
    isDevelopment,
    isProduction,
    buildType,
    apiUrl: isDevelopment 
      ? 'http://localhost:2022' 
      : 'https://api.ridehail.com',
    mapTileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    enableAnalytics: isProduction,
    enableLogging: isDevelopment,
    offline: {
      enabled: true,
      cacheDuration: 24 * 60 * 60 * 1000, // 24 hours
      maxCacheSize: 50 * 1024 * 1024 // 50MB
    }
  };
}

// Feature flags based on build type and environment
export function getFeatureFlags(config: AppConfig) {
  const env = getEnvironmentConfig();
  
  return {
    // Core features
    realTimeTracking: config.features.gps && config.features.maps,
    offlineSupport: config.features.offline && env.isProduction,
    pushNotifications: config.features.notifications,
    
    // Role-specific features
    passengerFeatures: {
      bookRide: config.userRole === 'passenger',
      viewDrivers: config.userRole === 'passenger',
      makePayment: config.userRole === 'passenger' && config.features.payments,
      rateDriver: config.userRole === 'passenger'
    },
    
    driverFeatures: {
      acceptOrders: config.userRole === 'driver',
      bidOnRides: config.userRole === 'driver',
      trackEarnings: config.userRole === 'driver',
      manageSubscription: config.userRole === 'driver'
    },
    
    // Debug features
    debugMode: env.isDevelopment,
    mockLocation: env.isDevelopment,
    verboseLogging: env.isDevelopment && env.enableLogging
  };
}

// App initialization
export function initializeApp() {
  const config = getAppConfig();
  const env = getEnvironmentConfig();
  const features = getFeatureFlags(config);
  
  // Set document title and theme
  document.title = config.appName;
  document.documentElement.style.setProperty('--primary-color', config.theme.primary);
  document.documentElement.style.setProperty('--secondary-color', config.theme.secondary);
  
  // Update meta theme-color
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', config.theme.primary);
  }
  
  // Log build information in development - show both modes
  if (features.debugMode) {
    console.log('🚗 RideHail App Initialized', {
      config: config.appName,
      buildType: config.userRole, // Use userRole from config instead of env
      version: config.version,
      features: Object.keys(features).filter(key => features[key as keyof typeof features]),
      availableFeatures: {
        passenger: features.passengerFeatures,
        driver: features.driverFeatures
      }
    });
  }
  
  return { config, env, features };
}