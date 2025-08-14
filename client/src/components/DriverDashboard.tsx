import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Car, DollarSign, MapPin, Clock, CreditCard, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { User, Order, DriverProfile, CreateDriverProfileInput, UpdateDriverLocationInput, CreateDriverBidInput } from '../../../server/src/schema';

interface DriverDashboardProps {
  user: User;
}

export function DriverDashboard({ user }: DriverDashboardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);

  // Driver profile form
  const [profileForm, setProfileForm] = useState<CreateDriverProfileInput>({
    user_id: user.id,
    license_number: '',
    vehicle_type: '',
    vehicle_plate: ''
  });

  // Location form
  const [locationForm, setLocationForm] = useState<UpdateDriverLocationInput>({
    driver_id: 0,
    latitude: -6.2088,
    longitude: 106.8456,
    is_available: false
  });

  // Load driver data
  useEffect(() => {
    const loadDriverData = async () => {
      try {
        // Simulate checking if driver profile exists
        // In real implementation, this would be a separate API call
        const mockProfile: DriverProfile = {
          id: 1,
          user_id: user.id,
          license_number: 'DRV001',
          vehicle_type: 'Sedan',
          vehicle_plate: 'ABC123',
          is_available: false,
          current_latitude: -6.2088,
          current_longitude: 106.8456,
          subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Active subscription
          created_at: new Date(),
          updated_at: new Date()
        };
        
        setDriverProfile(mockProfile);
        setLocationForm(prev => ({ ...prev, driver_id: mockProfile.id }));
        setIsAvailable(mockProfile.is_available);
        setHasSubscription(mockProfile.subscription_expires_at ? new Date() < mockProfile.subscription_expires_at : false);
        
        if (hasSubscription) {
          loadAvailableOrders();
        }
        loadMyOrders();
      } catch (error) {
        console.error('Failed to load driver data:', error);
      }
    };

    loadDriverData();
  }, [user.id]);

  const loadAvailableOrders = async () => {
    try {
      const orders = await trpc.getAvailableOrders.query({ driverId: driverProfile?.id || 1 });
      setAvailableOrders(orders);
    } catch (error) {
      console.error('Failed to load available orders:', error);
    }
  };

  const loadMyOrders = async () => {
    try {
      const orders = await trpc.getUserOrders.query({ userId: user.id, role: 'driver' });
      setMyOrders(orders);
    } catch (error) {
      console.error('Failed to load my orders:', error);
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const profile = await trpc.createDriverProfile.mutate(profileForm);
      setDriverProfile(profile);
      setMessage('🎉 Driver profile created successfully!');
    } catch (error) {
      console.error('Failed to create profile:', error);
      setMessage('Failed to create driver profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateLocation = async () => {
    if (!driverProfile) return;
    
    setIsLoading(true);
    try {
      await trpc.updateDriverLocation.mutate({
        ...locationForm,
        is_available: isAvailable
      });
      setMessage(`📍 Location updated! Status: ${isAvailable ? 'Available' : 'Offline'}`);
    } catch (error) {
      console.error('Failed to update location:', error);
      setMessage('Failed to update location. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBidOnOrder = async (orderId: number, bidAmount: number, estimatedMinutes: number) => {
    if (!driverProfile || !hasSubscription) return;
    
    setIsLoading(true);
    try {
      const bidData: CreateDriverBidInput = {
        order_id: orderId,
        driver_id: driverProfile.id,
        bid_amount: bidAmount,
        estimated_arrival_minutes: estimatedMinutes
      };
      
      await trpc.createDriverBid.mutate(bidData);
      setMessage('✅ Bid submitted successfully!');
      loadAvailableOrders(); // Refresh orders
    } catch (error) {
      console.error('Failed to submit bid:', error);
      setMessage('Failed to submit bid. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscription = async () => {
    if (!driverProfile) return;
    
    setIsLoading(true);
    try {
      await trpc.createDriverSubscription.mutate({
        driver_id: driverProfile.id,
        subscription_type: 'monthly',
        amount: 100000 // Rp 100,000 per month
      });
      setMessage('💳 Subscription payment processed! You can now accept orders.');
      setHasSubscription(true);
      loadAvailableOrders();
    } catch (error) {
      console.error('Failed to process subscription:', error);
      setMessage('Subscription payment failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfileForm = (field: keyof CreateDriverProfileInput, value: string) => {
    setProfileForm((prev: CreateDriverProfileInput) => ({ ...prev, [field]: value }));
  };

  const updateLocationForm = (field: keyof UpdateDriverLocationInput, value: number) => {
    setLocationForm((prev: UpdateDriverLocationInput) => ({ ...prev, [field]: value }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // If no driver profile exists, show creation form
  if (!driverProfile) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5 text-green-600" />
              Complete Your Driver Profile
            </CardTitle>
            <CardDescription>
              Set up your driver profile to start accepting ride orders
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">License Number</label>
                  <Input
                    placeholder="Enter your license number"
                    value={profileForm.license_number}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateProfileForm('license_number', e.target.value)
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Vehicle Type</label>
                  <Input
                    placeholder="e.g., Sedan, SUV, Motorcycle"
                    value={profileForm.vehicle_type}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateProfileForm('vehicle_type', e.target.value)
                    }
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Vehicle Plate Number</label>
                <Input
                  placeholder="Enter your vehicle plate number"
                  value={profileForm.vehicle_plate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateProfileForm('vehicle_plate', e.target.value)
                  }
                  required
                />
              </div>
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? 'Creating Profile...' : '🚗 Create Driver Profile'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome & Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5 text-green-600" />
            Driver Dashboard - Welcome {user.full_name}! 🚗
          </CardTitle>
          <CardDescription>
            Manage your availability, accept orders, and track your earnings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{myOrders.length}</div>
              <div className="text-sm text-blue-700">Total Orders</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {myOrders.reduce((sum, order) => sum + (order.final_fare || 0), 0).toLocaleString()}
              </div>
              <div className="text-sm text-green-700">Earnings (Rp)</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Badge variant={isAvailable ? 'default' : 'secondary'}>
                {isAvailable ? '✅ Available' : '⏸️ Offline'}
              </Badge>
              <div className="text-sm text-purple-700 mt-1">Current Status</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {message && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {/* Subscription Status */}
      {!hasSubscription && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <CreditCard className="h-5 w-5" />
              Subscription Required
            </CardTitle>
            <CardDescription className="text-orange-700">
              Subscribe to monthly plan to start accepting orders
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">Monthly Driver Subscription</div>
                <div className="text-sm text-orange-700">Access to all ride orders</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-orange-600">Rp 100,000</div>
                <Button onClick={handleSubscription} disabled={isLoading} size="sm">
                  {isLoading ? 'Processing...' : 'Subscribe Now'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {hasSubscription && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-5 w-5" />
              Active Subscription ✅
            </CardTitle>
            <CardDescription className="text-green-700">
              Your subscription is active until {driverProfile.subscription_expires_at?.toLocaleDateString()}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Location & Availability */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            Location & Availability
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Available for Orders</label>
            <Switch
              checked={isAvailable}
              onCheckedChange={setIsAvailable}
              disabled={!hasSubscription}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Current Latitude</label>
              <Input
                type="number"
                step="0.0001"
                value={locationForm.latitude}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateLocationForm('latitude', parseFloat(e.target.value) || 0)
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Current Longitude</label>
              <Input
                type="number"
                step="0.0001"
                value={locationForm.longitude}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateLocationForm('longitude', parseFloat(e.target.value) || 0)
                }
              />
            </div>
          </div>

          <Button 
            onClick={handleUpdateLocation} 
            disabled={isLoading || !hasSubscription} 
            className="w-full"
          >
            {isLoading ? 'Updating...' : '📍 Update Location'}
          </Button>
        </CardContent>
      </Card>

      {/* Available Orders */}
      {hasSubscription && availableOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-600" />
              Available Orders ({availableOrders.length})
            </CardTitle>
            <CardDescription>
              Submit bids for orders in your area
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {availableOrders.map((order) => (
                <div key={order.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge className={getStatusColor(order.status)}>
                      Order #{order.id}
                    </Badge>
                    <span className="font-medium text-green-600">
                      Rp {order.estimated_fare.toLocaleString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Pickup:</span>
                      <p className="text-gray-600">{order.pickup_address}</p>
                    </div>
                    <div>
                      <span className="font-medium">Destination:</span>
                      <p className="text-gray-600">{order.destination_address}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => handleBidOnOrder(order.id, order.estimated_fare, 15)}
                      disabled={isLoading}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Bid {order.estimated_fare.toLocaleString()} (15 min)
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleBidOnOrder(order.id, order.estimated_fare + 5000, 10)}
                      disabled={isLoading}
                    >
                      Quick Bid +5K (10 min)
                    </Button>
                  </div>
                </div>
              ))}
              <Button 
                variant="outline" 
                onClick={loadAvailableOrders}
                className="w-full"
              >
                🔄 Refresh Orders
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Orders */}
      {myOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              My Orders ({myOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myOrders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">#{order.id}</div>
                    <div className="text-sm text-gray-600">
                      {order.pickup_address} → {order.destination_address}
                    </div>
                    <div className="text-xs text-gray-500">
                      {order.created_at.toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={getStatusColor(order.status)} variant="secondary">
                      {order.status}
                    </Badge>
                    <div className="text-sm font-medium mt-1">
                      Rp {(order.final_fare || order.estimated_fare).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vehicle Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5 text-gray-600" />
            Vehicle Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">License:</span>
              <p className="text-gray-600">{driverProfile.license_number}</p>
            </div>
            <div>
              <span className="font-medium">Vehicle Type:</span>
              <p className="text-gray-600">{driverProfile.vehicle_type}</p>
            </div>
            <div>
              <span className="font-medium">Plate Number:</span>
              <p className="text-gray-600">{driverProfile.vehicle_plate}</p>
            </div>
            <div>
              <span className="font-medium">Member Since:</span>
              <p className="text-gray-600">{driverProfile.created_at.toLocaleDateString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}