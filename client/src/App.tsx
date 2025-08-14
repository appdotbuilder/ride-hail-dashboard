import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Car, 
  MapPin, 
  CreditCard, 
  Users, 
  Settings, 
  History,
  Menu,
  LogOut,
  Smartphone
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { trpc } from '@/utils/trpc';
import type { User, UserRole } from '../../server/src/schema';
import { getAppConfig, initializeApp } from '@/components/AppConfig';

// Components
import { UserRegistration } from '@/components/UserRegistration';
import { PassengerDashboard } from '@/components/PassengerDashboard';
import { DriverDashboard } from '@/components/DriverDashboard';
import { OrderHistory } from '@/components/OrderHistory';
import { NearbyDriversMap } from '@/components/NearbyDriversMap';
import { PWAInstaller, ServiceWorkerStatus } from '@/components/PWAInstaller';
import { MobileLayout } from '@/components/MobileLayout';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [appMode, setAppMode] = useState<'passenger' | 'driver'>('passenger');
  
  // Initialize app configuration based on mode
  const [appConfig, setAppConfig] = useState(getAppConfig());

  // Initialize app and detect mobile device
  useEffect(() => {
    // Check URL for mode parameter
    const urlParams = new URLSearchParams(window.location.search);
    const urlMode = urlParams.get('mode') as 'passenger' | 'driver';
    if (urlMode && (urlMode === 'passenger' || urlMode === 'driver')) {
      setAppMode(urlMode);
      // Update environment for proper config
      (window as any).__VITE_BUILD_TYPE__ = urlMode;
    }
    
    // Initialize app configuration
    initializeApp();
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Update app config when mode changes
  useEffect(() => {
    const newConfig = appMode === 'driver' ? 
      { ...getAppConfig(), userRole: 'driver' as const } : 
      { ...getAppConfig(), userRole: 'passenger' as const };
    setAppConfig(newConfig);
    
    // Reinitialize with new config
    document.title = newConfig.appName;
    document.documentElement.style.setProperty('--primary-color', newConfig.theme.primary);
  }, [appMode]);

  // Quick user simulation for demo purposes
  const simulateLogin = async (role: UserRole) => {
    setIsLoading(true);
    try {
      const userData = {
        email: `demo.${role}@example.com`,
        password: 'password123',
        full_name: role === 'passenger' ? 'Demo Passenger' : 'Demo Driver',
        phone: '+6281234567890',
        role
      };
      
      const user = await trpc.registerUser.mutate(userData);
      setCurrentUser(user);
    } catch (error) {
      console.error('Login simulation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  const handleModeSwitch = (mode: 'passenger' | 'driver') => {
    setAppMode(mode);
    setCurrentUser(null); // Logout when switching modes
    setActiveTab('dashboard');
    
    // Update URL parameter
    const url = new URL(window.location.href);
    url.searchParams.set('mode', mode);
    window.history.pushState({}, '', url.toString());
  };

  // Landing page for non-logged users
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
        <div className="container mx-auto px-4 py-6">
          {/* App Mode Switcher */}
          <div className="flex justify-center mb-6">
            <div className="bg-white rounded-full p-1 shadow-md border">
              <div className="flex">
                <Button
                  variant={appMode === 'passenger' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleModeSwitch('passenger')}
                  className={`rounded-full px-6 ${
                    appMode === 'passenger' 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  🎯 Passenger App
                </Button>
                <Button
                  variant={appMode === 'driver' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleModeSwitch('driver')}
                  className={`rounded-full px-6 ${
                    appMode === 'driver' 
                      ? 'bg-green-600 text-white hover:bg-green-700' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  🚗 Driver App
                </Button>
              </div>
            </div>
          </div>

          {/* Mobile-optimized Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div 
                className="p-2 rounded-xl"
                style={{ backgroundColor: appConfig.theme.primary }}
              >
                <span className="text-2xl">{appConfig.branding.logo}</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{appConfig.appName}</h1>
            </div>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              🚗 Your reliable ride-hailing platform connecting passengers with drivers
            </p>
            
            {/* PWA Install Component */}
            <div className="mt-6">
              <PWAInstaller appName={appConfig.appName} userRole={appConfig.userRole} />
            </div>
          </div>

          {/* Quick Demo Access - Mobile Optimized */}
          <div className="max-w-4xl mx-auto mb-8">
            <Card>
              <CardHeader className="text-center pb-4">
                <CardTitle className="flex items-center justify-center gap-2 text-lg md:text-xl">
                  <Settings className="h-5 w-5" />
                  Quick Demo Access
                </CardTitle>
                <CardDescription className="text-sm md:text-base">
                  Try the platform instantly as a passenger or driver
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Current Mode Demo */}
                  <Card className={`${
                    appMode === 'passenger' 
                      ? 'border-blue-200 bg-blue-50' 
                      : 'border-green-200 bg-green-50'
                  }`}>
                    <CardHeader className="pb-3">
                      <CardTitle className={`text-base md:text-lg flex items-center gap-2 ${
                        appMode === 'passenger' ? 'text-blue-700' : 'text-green-700'
                      }`}>
                        {appMode === 'passenger' ? (
                          <>
                            <Users className="h-5 w-5" />
                            Current Mode: Passenger Experience
                          </>
                        ) : (
                          <>
                            <Car className="h-5 w-5" />
                            Current Mode: Driver Experience
                          </>
                        )}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {appMode === 'passenger' 
                          ? 'Order rides, view nearby drivers, make payments'
                          : 'Accept orders, manage subscriptions, track earnings, bid on rides'
                        }
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Button 
                        onClick={() => simulateLogin(appMode)} 
                        disabled={isLoading}
                        className={`w-full ${
                          appMode === 'passenger' 
                            ? 'bg-blue-600 hover:bg-blue-700' 
                            : 'bg-green-600 hover:bg-green-700'
                        }`}
                        size={isMobile ? "lg" : "default"}
                      >
                        {isLoading 
                          ? 'Loading...' 
                          : `${appConfig.branding.logo} Try ${appMode === 'passenger' ? 'Passenger' : 'Driver'} Demo`
                        }
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Feature Comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <h4 className="font-medium text-blue-700 mb-2 flex items-center gap-2">
                        🎯 Passenger Features
                        {appMode === 'passenger' && <Badge variant="outline" className="text-xs">Active</Badge>}
                      </h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Book rides instantly</li>
                        <li>• View nearby drivers on map</li>
                        <li>• QRIS payment integration</li>
                        <li>• Real-time ride tracking</li>
                        <li>• Order history & receipts</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-green-700 mb-2 flex items-center gap-2">
                        🚗 Driver Features
                        {appMode === 'driver' && <Badge variant="outline" className="text-xs">Active</Badge>}
                      </h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Accept & manage ride requests</li>
                        <li>• Monthly subscription system</li>
                        <li>• Bid on available rides</li>
                        <li>• Earnings tracking & reports</li>
                        <li>• Real-time location sharing</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* User Registration */}
          <UserRegistration onUserRegistered={setCurrentUser} />

          {/* Features Overview - Mobile Optimized */}
          <div className="max-w-6xl mx-auto mt-12">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">Platform Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-white rounded-xl shadow-sm">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-lg md:text-xl font-semibold mb-2">Smart Matching</h3>
                <p className="text-gray-600 text-sm md:text-base">
                  Find the nearest available drivers with real-time location tracking
                </p>
              </div>
              <div className="text-center p-6 bg-white rounded-xl shadow-sm">
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg md:text-xl font-semibold mb-2">QRIS Payment</h3>
                <p className="text-gray-600 text-sm md:text-base">
                  Seamless cashless payments using QRIS technology
                </p>
              </div>
              <div className="text-center p-6 bg-white rounded-xl shadow-sm">
                <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Settings className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-lg md:text-xl font-semibold mb-2">Driver Subscriptions</h3>
                <p className="text-gray-600 text-sm md:text-base">
                  Monthly subscription model for drivers to access orders
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mobile Navigation Component
  const MobileNav = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[250px]">
          <SheetHeader className="mb-6">
            <SheetTitle className="flex items-center gap-2">
              <Car className="h-6 w-6 text-blue-600" />
              RideHail
            </SheetTitle>
          </SheetHeader>
          
          <div className="space-y-2">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Settings },
              { id: 'orders', label: 'Orders', icon: History },
              { id: 'map', label: 'Map', icon: MapPin },
              { id: 'profile', label: 'Profile', icon: Users }
            ].map((item) => (
              <Button
                key={item.id}
                variant={activeTab === item.id ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => {
                  setActiveTab(item.id);
                  setIsOpen(false);
                }}
              >
                <item.icon className="h-4 w-4 mr-2" />
                {item.label}
              </Button>
            ))}
            
            <div className="pt-4 border-t">
              <div className="px-3 py-2">
                <p className="text-sm text-gray-600 mb-1">Logged in as:</p>
                <p className="font-medium text-sm">{currentUser.full_name}</p>
                <Badge variant="outline" className="mt-2">
                  {appConfig.branding.logo} {currentUser.role === 'passenger' ? 'Passenger' : 'Driver'}
                </Badge>
              </div>
              
              <Button 
                variant="ghost" 
                className="w-full justify-start text-red-600 hover:text-red-700"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  };

  // Main dashboard for logged-in users
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-optimized Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14 md:h-16">
            <div className="flex items-center gap-3">
              <MobileNav />
              <div 
                className="p-1.5 md:p-2 rounded-lg"
                style={{ backgroundColor: appConfig.theme.primary }}
              >
                <span className="text-white text-lg md:text-xl">{appConfig.branding.logo}</span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">{appConfig.appName}</h1>
              <Badge 
                variant="outline" 
                className={`ml-2 text-xs md:text-sm ${
                  appMode === 'driver' 
                    ? 'bg-green-50 text-green-700 border-green-200' 
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}
              >
                {appConfig.branding.logo} {appMode === 'passenger' ? 'Passenger' : 'Driver'} Mode
              </Badge>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Welcome, {currentUser.full_name}
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-1" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mode Indicator */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 border-b">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge 
                className={`${
                  appMode === 'driver' 
                    ? 'bg-green-100 text-green-800 border-green-300' 
                    : 'bg-blue-100 text-blue-800 border-blue-300'
                } px-3 py-1`}
              >
                {appConfig.branding.logo} {appMode === 'passenger' ? 'Passenger' : 'Driver'} App Mode
              </Badge>
              <span className="text-sm text-gray-600">
                {appMode === 'passenger' 
                  ? 'Book rides, track drivers, make payments' 
                  : 'Accept orders, manage subscription, bid on rides'
                }
              </span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleModeSwitch(appMode === 'passenger' ? 'driver' : 'passenger')}
              className="text-xs"
            >
              Switch to {appMode === 'passenger' ? '🚗 Driver' : '🎯 Passenger'}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-4 md:py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Desktop Tabs */}
          <TabsList className="hidden md:grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Map
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Profile
            </TabsTrigger>
          </TabsList>

          {/* Mobile Bottom Navigation */}
          <div className="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t border-gray-200 z-40">
            <div className="grid grid-cols-4 h-16">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: Settings },
                { id: 'orders', label: 'Orders', icon: History },
                { id: 'map', label: 'Map', icon: MapPin },
                { id: 'profile', label: 'Profile', icon: Users }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex flex-col items-center justify-center space-y-1 transition-all duration-200 ${
                    activeTab === item.id 
                      ? `bg-opacity-10 ${appConfig.theme.primary.includes('#3b82f6') ? 'text-blue-600 bg-blue-50' : 'text-green-600 bg-green-50'}` 
                      : 'text-gray-500 hover:text-gray-700 active:scale-95'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content - with bottom padding for mobile nav */}
          <div className="pb-20 md:pb-0">
            <TabsContent value="dashboard" className="space-y-4 md:space-y-6">
              {appMode === 'passenger' ? (
                <PassengerDashboard user={currentUser} />
              ) : (
                <DriverDashboard user={currentUser} />
              )}
            </TabsContent>

            <TabsContent value="orders">
              <OrderHistory userId={currentUser.id} userRole={appMode} />
            </TabsContent>

            <TabsContent value="map">
              <NearbyDriversMap userRole={appMode} />
            </TabsContent>

            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg md:text-xl">Profile Information</CardTitle>
                  <CardDescription>Your account details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Full Name</label>
                        <p className="text-sm md:text-base text-gray-900 bg-gray-50 p-3 rounded-md">
                          {currentUser.full_name}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Email</label>
                        <p className="text-sm md:text-base text-gray-900 bg-gray-50 p-3 rounded-md">
                          {currentUser.email}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Phone</label>
                        <p className="text-sm md:text-base text-gray-900 bg-gray-50 p-3 rounded-md">
                          {currentUser.phone}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Role</label>
                        <div className="mt-1">
                          <Badge variant="secondary" className="text-sm">
                            {appConfig.branding.logo} {currentUser.role === 'passenger' ? 'Passenger' : 'Driver'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Member Since</label>
                      <p className="text-sm md:text-base text-gray-900">
                        {currentUser.created_at.toLocaleDateString('id-ID', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Mobile-specific profile actions */}
                  {isMobile && (
                    <div className="pt-4 border-t space-y-3">
                      <Button variant="outline" className="w-full" size="lg">
                        <Settings className="h-4 w-4 mr-2" />
                        Edit Profile
                      </Button>
                      <Button variant="outline" className="w-full" size="lg">
                        <Smartphone className="h-4 w-4 mr-2" />
                        App Settings
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Service Worker Status */}
      <ServiceWorkerStatus />
    </div>
  );
}

export default App;