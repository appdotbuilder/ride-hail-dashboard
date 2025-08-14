import { ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { 
  Car, 
  Menu, 
  LogOut, 
  Settings, 
  History, 
  MapPin, 
  Users,
  Bell,
  Wifi,
  WifiOff,
  Battery,
  Signal,
  MoreVertical
} from 'lucide-react';
import type { User } from '../../../server/src/schema';

interface MobileLayoutProps {
  currentUser: User;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  children: ReactNode;
}

export function MobileLayout({ 
  currentUser, 
  activeTab, 
  onTabChange, 
  onLogout, 
  children 
}: MobileLayoutProps) {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Settings, shortLabel: 'Home' },
    { id: 'orders', label: 'Orders', icon: History, shortLabel: 'Orders' },
    { id: 'map', label: 'Map', icon: MapPin, shortLabel: 'Map' },
    { id: 'profile', label: 'Profile', icon: Users, shortLabel: 'Profile' }
  ];

  const currentTab = tabs.find(tab => tab.id === activeTab);

  // Mobile header with role-specific styling
  const headerBg = currentUser.role === 'passenger' ? 'bg-blue-600' : 'bg-green-600';
  const headerText = currentUser.role === 'passenger' ? 'text-blue-600' : 'text-green-600';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Mobile Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 safe-area-padding">
        <div className="px-4">
          {/* Main header bar */}
          <div className="flex items-center justify-between h-14">
            {/* Left side - Navigation */}
            <div className="flex items-center gap-3">
              <Sheet open={isNavOpen} onOpenChange={setIsNavOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-2">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] p-0">
                  <div className={`${headerBg} text-white p-4`}>
                    <SheetHeader className="text-left">
                      <div className="flex items-center gap-3">
                        <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                          <Car className="h-6 w-6" />
                        </div>
                        <div>
                          <SheetTitle className="text-white text-lg">RideHail</SheetTitle>
                          <p className="text-white text-opacity-80 text-sm">
                            {currentUser.role === 'passenger' ? '🎯 Passenger App' : '🚗 Driver App'}
                          </p>
                        </div>
                      </div>
                    </SheetHeader>
                  </div>
                  
                  <div className="p-4 space-y-2">
                    {tabs.map((tab) => (
                      <Button
                        key={tab.id}
                        variant={activeTab === tab.id ? 'default' : 'ghost'}
                        className={`w-full justify-start h-12 ${
                          activeTab === tab.id 
                            ? headerBg + ' text-white hover:' + headerBg 
                            : 'hover:bg-gray-100'
                        }`}
                        onClick={() => {
                          onTabChange(tab.id);
                          setIsNavOpen(false);
                        }}
                      >
                        <tab.icon className="h-5 w-5 mr-3" />
                        {tab.label}
                      </Button>
                    ))}
                  </div>
                  
                  {/* User info in sidebar */}
                  <div className="p-4 border-t mt-auto">
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-1">Signed in as:</p>
                      <p className="font-semibold text-gray-900">{currentUser.full_name}</p>
                      <p className="text-sm text-gray-600">{currentUser.email}</p>
                      <Badge variant="outline" className="mt-2">
                        {currentUser.role === 'passenger' ? '🎯 Passenger' : '🚗 Driver'}
                      </Badge>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        onLogout();
                        setIsNavOpen(false);
                      }}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>

              <div className={`bg-opacity-10 p-1.5 rounded-lg ${headerBg.replace('bg-', 'bg-opacity-10 bg-')}`}>
                <Car className={`h-5 w-5 ${headerText}`} />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">RideHail</h1>
              </div>
            </div>

            {/* Right side - Status indicators */}
            <div className="flex items-center gap-2">
              {/* Connection status */}
              <div className="flex items-center gap-1">
                {isOnline ? (
                  <Wifi className="h-4 w-4 text-green-600" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-600" />
                )}
              </div>

              {/* Notifications */}
              <Button variant="ghost" size="sm" className="p-2 relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  3
                </span>
              </Button>
            </div>
          </div>

          {/* Page title bar */}
          <div className="flex items-center justify-between py-2 border-t border-gray-100">
            <div className="flex items-center gap-2">
              {currentTab?.icon && <currentTab.icon className="h-5 w-5 text-gray-600" />}
              <h2 className="font-semibold text-gray-900">{currentTab?.label}</h2>
            </div>
            
            {/* Quick actions based on current tab */}
            {activeTab === 'map' && (
              <Badge variant="outline" className="text-xs">
                🎯 Live tracking
              </Badge>
            )}
            {activeTab === 'orders' && (
              <Badge variant="outline" className="text-xs">
                📋 History
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 container mx-auto px-4 py-4 pb-20 mobile-scroll">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 mobile-nav-bar">
        <div className="grid grid-cols-4 h-16 safe-area-padding">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center space-y-1 transition-all duration-200 ${
                activeTab === tab.id 
                  ? `${headerText} bg-opacity-5 ${headerBg.replace('bg-', 'bg-opacity-5 bg-')}` 
                  : 'text-gray-500 hover:text-gray-700 active:scale-95'
              }`}
            >
              <tab.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{tab.shortLabel}</span>
              {activeTab === tab.id && (
                <div className={`w-8 h-0.5 ${headerBg} rounded-full`} />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Offline indicator */}
      {!isOnline && (
        <div className="fixed top-16 left-4 right-4 z-50">
          <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 px-4 py-2 rounded-lg shadow-sm">
            <div className="flex items-center gap-2 text-sm">
              <WifiOff className="h-4 w-4" />
              <span className="font-medium">You're offline</span>
              <span className="text-yellow-700">- Some features may be limited</span>
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay for PWA updates */}
      <div id="update-overlay" className="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-xl p-6 m-4 max-w-sm text-center">
          <div className="animate-spin text-2xl mb-4">🔄</div>
          <h3 className="font-semibold mb-2">Updating RideHail</h3>
          <p className="text-sm text-gray-600">Please wait while we update the app...</p>
        </div>
      </div>
    </div>
  );
}

// Hook for mobile-specific functionality
export function useMobileFeatures() {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [orientation, setOrientation] = useState(screen.orientation?.angle || 0);

  // Detect virtual keyboard on mobile
  const detectKeyboard = () => {
    const initialHeight = window.visualViewport?.height || window.innerHeight;
    
    const handleResize = () => {
      const currentHeight = window.visualViewport?.height || window.innerHeight;
      const heightDiff = initialHeight - currentHeight;
      setIsKeyboardOpen(heightDiff > 150); // Threshold for keyboard detection
    };

    window.visualViewport?.addEventListener('resize', handleResize);
    window.addEventListener('resize', handleResize);

    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.removeEventListener('resize', handleResize);
    };
  };

  // Detect orientation changes
  const detectOrientation = () => {
    const handleOrientationChange = () => {
      setOrientation(screen.orientation?.angle || 0);
    };

    screen.orientation?.addEventListener('change', handleOrientationChange);

    return () => {
      screen.orientation?.removeEventListener('change', handleOrientationChange);
    };
  };

  return {
    isKeyboardOpen,
    orientation,
    isLandscape: Math.abs(orientation) === 90,
    detectKeyboard,
    detectOrientation
  };
}