import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Car, MapPin, CreditCard, Users, Settings, History, Plus } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { User, UserRole, Order, DriverProfile, DriverBid } from '../../server/src/schema';

// Components
import { UserRegistration } from '@/components/UserRegistration';
import { PassengerDashboard } from '@/components/PassengerDashboard';
import { DriverDashboard } from '@/components/DriverDashboard';
import { OrderHistory } from '@/components/OrderHistory';
import { NearbyDriversMap } from '@/components/NearbyDriversMap';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isLoading, setIsLoading] = useState(false);

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

  // Landing page for non-logged users
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Car className="h-10 w-10 text-blue-600" />
              <h1 className="text-4xl font-bold text-gray-900">RideHail</h1>
            </div>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              🚗 Your reliable ride-hailing platform connecting passengers with drivers
            </p>
          </div>

          {/* Quick Demo Access */}
          <div className="max-w-4xl mx-auto mb-12">
            <Card>
              <CardHeader>
                <CardTitle className="text-center flex items-center justify-center gap-2">
                  <Settings className="h-5 w-5" />
                  Quick Demo Access
                </CardTitle>
                <CardDescription className="text-center">
                  Try the platform instantly as a passenger or driver
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="border-blue-200 bg-blue-50">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="h-5 w-5 text-blue-600" />
                        Passenger Experience
                      </CardTitle>
                      <CardDescription>
                        Order rides, view nearby drivers, make payments
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        onClick={() => simulateLogin('passenger')} 
                        disabled={isLoading}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        {isLoading ? 'Loading...' : '🎯 Try as Passenger'}
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-green-200 bg-green-50">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Car className="h-5 w-5 text-green-600" />
                        Driver Experience
                      </CardTitle>
                      <CardDescription>
                        Accept orders, manage subscriptions, track earnings
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        onClick={() => simulateLogin('driver')} 
                        disabled={isLoading}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        {isLoading ? 'Loading...' : '🚗 Try as Driver'}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* User Registration */}
          <UserRegistration onUserRegistered={setCurrentUser} />

          {/* Features Overview */}
          <div className="max-w-6xl mx-auto mt-16">
            <h2 className="text-3xl font-bold text-center mb-12">Platform Features</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Smart Matching</h3>
                <p className="text-gray-600">Find the nearest available drivers with real-time location tracking</p>
              </div>
              <div className="text-center">
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">QRIS Payment</h3>
                <p className="text-gray-600">Seamless cashless payments using QRIS technology</p>
              </div>
              <div className="text-center">
                <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Settings className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Driver Subscriptions</h3>
                <p className="text-gray-600">Monthly subscription model for drivers to access orders</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main dashboard for logged-in users
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Car className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">RideHail</h1>
              <Badge variant="outline" className="ml-2">
                {currentUser.role === 'passenger' ? '🎯 Passenger' : '🚗 Driver'}
              </Badge>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Welcome, {currentUser.full_name}
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
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

          <TabsContent value="dashboard" className="space-y-6">
            {currentUser.role === 'passenger' ? (
              <PassengerDashboard user={currentUser} />
            ) : (
              <DriverDashboard user={currentUser} />
            )}
          </TabsContent>

          <TabsContent value="orders">
            <OrderHistory userId={currentUser.id} userRole={currentUser.role} />
          </TabsContent>

          <TabsContent value="map">
            <NearbyDriversMap userRole={currentUser.role} />
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Your account details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Full Name</label>
                    <p className="text-sm text-gray-900">{currentUser.full_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <p className="text-sm text-gray-900">{currentUser.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Phone</label>
                    <p className="text-sm text-gray-900">{currentUser.phone}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Role</label>
                    <Badge variant="secondary" className="mt-1">
                      {currentUser.role === 'passenger' ? '🎯 Passenger' : '🚗 Driver'}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Member Since</label>
                    <p className="text-sm text-gray-900">
                      {currentUser.created_at.toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;