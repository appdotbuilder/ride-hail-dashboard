import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Smartphone, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  Wifi,
  WifiOff,
  Battery,
  Signal
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAInstallerProps {
  appName?: string;
  userRole?: 'passenger' | 'driver';
}

export function PWAInstaller({ appName = 'RideHail', userRole }: PWAInstallerProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [installationStatus, setInstallationStatus] = useState<'idle' | 'installing' | 'success' | 'error'>('idle');
  const [deviceInfo, setDeviceInfo] = useState<{
    platform: string;
    isAndroid: boolean;
    isIOS: boolean;
    isMobile: boolean;
    supportsInstall: boolean;
  }>({
    platform: '',
    isAndroid: false,
    isIOS: false,
    isMobile: false,
    supportsInstall: false
  });

  useEffect(() => {
    // Detect device and platform
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform.toLowerCase();
    
    const deviceDetection = {
      platform: platform,
      isAndroid: /android/.test(userAgent),
      isIOS: /iphone|ipad|ipod/.test(userAgent),
      isMobile: /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent),
      supportsInstall: 'serviceWorker' in navigator && 'BeforeInstallPromptEvent' in window
    };
    
    setDeviceInfo(deviceDetection);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Listen for successful installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallationStatus('success');
      setDeferredPrompt(null);
    };

    // Listen for online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    setInstallationStatus('installing');
    
    try {
      // Show install prompt
      await deferredPrompt.prompt();
      
      // Wait for user choice
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setInstallationStatus('success');
      } else {
        setInstallationStatus('idle');
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Installation failed:', error);
      setInstallationStatus('error');
    }
  };

  // Don't show installer if already installed or not supported
  if (isInstalled) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4 text-center">
          <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <h3 className="font-semibold text-green-800 mb-1">App Installed! 🎉</h3>
          <p className="text-sm text-green-700">
            {appName} {userRole && `for ${userRole}s`} is ready to use
          </p>
          {!isOnline && (
            <Badge variant="outline" className="mt-2 bg-yellow-100 text-yellow-700 border-yellow-300">
              <WifiOff className="h-3 w-3 mr-1" />
              Offline Mode Available
            </Badge>
          )}
        </CardContent>
      </Card>
    );
  }

  // iOS installation instructions
  if (deviceInfo.isIOS) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Smartphone className="h-5 w-5 text-blue-600" />
            Install {appName} on iOS
          </CardTitle>
          <CardDescription>
            Add {appName} {userRole && `(${userRole})`} to your home screen for the best experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>How to install on iOS:</strong>
              <ol className="mt-2 ml-4 space-y-1 list-decimal">
                <li>Tap the Share button (📤) in Safari</li>
                <li>Scroll down and tap "Add to Home Screen"</li>
                <li>Customize the name and tap "Add"</li>
                <li>Find the app icon on your home screen</li>
              </ol>
            </AlertDescription>
          </Alert>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="text-center p-3 bg-white rounded-lg">
              <div className="text-2xl mb-1">📱</div>
              <div className="font-medium">Full Screen</div>
              <div className="text-gray-600">No browser bars</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg">
              <div className="text-2xl mb-1">🔄</div>
              <div className="font-medium">Offline Access</div>
              <div className="text-gray-600">Works without internet</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Android/PWA installation
  if (deviceInfo.isAndroid || deferredPrompt) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Download className="h-5 w-5 text-green-600" />
            Install {appName} App
            {userRole && (
              <Badge variant="outline" className="ml-2 bg-green-100 text-green-700">
                {userRole === 'passenger' ? '🎯 Passenger' : '🚗 Driver'} Version
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Get the full mobile experience with offline access and notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Installation status */}
          {installationStatus === 'installing' && (
            <Alert className="border-blue-200 bg-blue-50">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <AlertDescription className="text-blue-700">
                Installing {appName}... Please wait
              </AlertDescription>
            </Alert>
          )}

          {installationStatus === 'error' && (
            <Alert className="border-red-200 bg-red-50">
              <XCircle className="h-4 w-4" />
              <AlertDescription className="text-red-700">
                Installation failed. Please try again or install manually.
              </AlertDescription>
            </Alert>
          )}

          {/* Device compatibility info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-white rounded-lg">
              <div className="flex items-center justify-center mb-2">
                {deviceInfo.isAndroid ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                )}
              </div>
              <div className="text-sm font-medium">Android Compatible</div>
              <div className="text-xs text-gray-600">
                {deviceInfo.isAndroid ? 'Fully supported' : 'Limited support'}
              </div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg">
              <div className="flex items-center justify-center mb-2">
                {isOnline ? (
                  <Wifi className="h-5 w-5 text-green-600" />
                ) : (
                  <WifiOff className="h-5 w-5 text-red-600" />
                )}
              </div>
              <div className="text-sm font-medium">Connection Status</div>
              <div className="text-xs text-gray-600">
                {isOnline ? 'Online' : 'Offline'}
              </div>
            </div>
          </div>

          {/* App features */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">App Features:</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span>Offline maps</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span>Push notifications</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span>GPS tracking</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span>Quick access</span>
              </div>
            </div>
          </div>

          {/* Installation button */}
          <Button
            onClick={handleInstall}
            disabled={!deferredPrompt || installationStatus === 'installing'}
            className="w-full bg-green-600 hover:bg-green-700"
            size="lg"
          >
            {installationStatus === 'installing' ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Installing...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Install {appName} App
              </>
            )}
          </Button>

          {/* Manual installation fallback */}
          {!deferredPrompt && deviceInfo.isAndroid && (
            <div className="text-center">
              <p className="text-xs text-gray-600 mb-2">
                Can't see the install option?
              </p>
              <Button variant="outline" size="sm">
                Manual Installation Guide
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Fallback for unsupported devices
  return (
    <Card className="border-gray-200 bg-gray-50">
      <CardContent className="p-4 text-center">
        <Smartphone className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <h3 className="font-semibold text-gray-700 mb-1">Mobile App Available</h3>
        <p className="text-sm text-gray-600">
          For the best experience, access {appName} from a mobile browser
        </p>
        <div className="mt-3 text-xs text-gray-500">
          <div>Platform: {deviceInfo.platform || 'Unknown'}</div>
          <div>Mobile: {deviceInfo.isMobile ? 'Yes' : 'No'}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// Service Worker status component
export function ServiceWorkerStatus() {
  const [swStatus, setSWStatus] = useState<'unsupported' | 'installing' | 'installed' | 'error'>('unsupported');
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          setSWStatus('installed');
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            setUpdateAvailable(true);
          });
        })
        .catch((error) => {
          console.error('SW registration failed:', error);
          setSWStatus('error');
        });
    }
  }, []);

  if (swStatus === 'unsupported') return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {updateAvailable && (
        <Card className="border-blue-200 bg-blue-50 max-w-xs">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Update Available</span>
            </div>
            <Button size="sm" onClick={() => window.location.reload()}>
              Update App
            </Button>
          </CardContent>
        </Card>
      )}
      
      {swStatus === 'installed' && !updateAvailable && (
        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          App Ready
        </Badge>
      )}
    </div>
  );
}