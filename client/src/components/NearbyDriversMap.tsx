import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, Navigation, Car, Clock, RefreshCw, Zap } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { UserRole, DriverProfile, GetNearbyDriversInput } from '../../../server/src/schema';

interface NearbyDriversMapProps {
  userRole: UserRole;
}

export function NearbyDriversMap({ userRole }: NearbyDriversMapProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [nearbyDrivers, setNearbyDrivers] = useState<DriverProfile[]>([]);
  const [searchLocation, setSearchLocation] = useState<GetNearbyDriversInput>({
    latitude: -6.2088, // Default Jakarta coordinates
    longitude: 106.8456,
    radius_km: 5
  });
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    // Get user's current location if available
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ lat: latitude, lng: longitude });
          setSearchLocation(prev => ({ ...prev, latitude, longitude }));
        },
        (error) => {
          console.warn('Could not get current location:', error);
        }
      );
    }
  }, []);

  useEffect(() => {
    if (userRole === 'passenger') {
      loadNearbyDrivers();
    }
  }, [userRole]);

  const loadNearbyDrivers = async () => {
    setIsLoading(true);
    try {
      const drivers = await trpc.getNearbyDrivers.query(searchLocation);
      setNearbyDrivers(drivers);
    } catch (error) {
      console.error('Failed to load nearby drivers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDistance = (driverLat: number, driverLng: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (driverLat - searchLocation.latitude) * Math.PI / 180;
    const dLng = (driverLng - searchLocation.longitude) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(searchLocation.latitude * Math.PI / 180) *
      Math.cos(driverLat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getEstimatedArrival = (distance: number): number => {
    // Estimate 30 km/h average speed in city traffic
    const averageSpeed = 30;
    return Math.round((distance / averageSpeed) * 60); // Convert to minutes
  };

  const updateSearchLocation = (field: keyof GetNearbyDriversInput, value: number) => {
    setSearchLocation((prev: GetNearbyDriversInput) => ({ ...prev, [field]: value }));
  };

  const useCurrentLocation = () => {
    if (currentLocation) {
      setSearchLocation(prev => ({
        ...prev,
        latitude: currentLocation.lat,
        longitude: currentLocation.lng
      }));
    }
  };

  // Mock map representation using ASCII art
  const renderMockMap = () => {
    return (
      <div className="bg-gray-100 rounded-lg p-6 border-2 border-dashed border-gray-300">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-gray-700">🗺️ Map View</h3>
          <p className="text-sm text-gray-600">Visual representation of nearby drivers</p>
        </div>
        
        <div className="relative bg-blue-50 rounded-lg p-8 min-h-[300px]">
          {/* Search location marker */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="bg-red-500 text-white p-2 rounded-full">
              <MapPin className="h-6 w-6" />
            </div>
            <div className="text-center mt-1">
              <Badge variant="secondary">You are here</Badge>
            </div>
          </div>

          {/* Driver markers */}
          {nearbyDrivers.map((driver, index) => {
            const distance = calculateDistance(
              driver.current_latitude || searchLocation.latitude,
              driver.current_longitude || searchLocation.longitude
            );
            const angle = index * (360 / nearbyDrivers.length);
            const radius = Math.min(distance * 20, 100); // Scale for visualization
            
            const x = 50 + (radius * Math.cos(angle * Math.PI / 180));
            const y = 50 + (radius * Math.sin(angle * Math.PI / 180));

            return (
              <div
                key={driver.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${Math.max(10, Math.min(90, x))}%`,
                  top: `${Math.max(10, Math.min(90, y))}%`
                }}
              >
                <div className="bg-green-500 text-white p-2 rounded-full">
                  <Car className="h-4 w-4" />
                </div>
                <div className="text-center mt-1">
                  <Badge variant="outline" className="text-xs">
                    {distance.toFixed(1)}km
                  </Badge>
                </div>
              </div>
            );
          })}

          {/* Radius circle representation */}
          <div 
            className="absolute border-2 border-blue-300 border-dashed rounded-full opacity-30"
            style={{
              width: `${searchLocation.radius_km * 20}px`,
              height: `${searchLocation.radius_km * 20}px`,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          />
        </div>

        <div className="mt-4 flex items-center justify-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>Your Location</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Available Drivers</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 border-2 border-blue-300 border-dashed rounded-full"></div>
            <span>Search Radius</span>
          </div>
        </div>
      </div>
    );
  };

  if (userRole === 'driver') {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-green-600" />
              Driver Map View 🚗
            </CardTitle>
            <CardDescription>
              Map functionality for drivers - track your location and nearby orders
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <MapPin className="h-4 w-4" />
              <AlertDescription>
                <strong>Driver Map Features:</strong>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• Track your real-time location</li>
                  <li>• View nearby pending orders</li>
                  <li>• Optimize route planning</li>
                  <li>• Monitor service area coverage</li>
                </ul>
              </AlertDescription>
            </Alert>
            
            <div className="mt-6">
              {renderMockMap()}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">✅</div>
                  <div className="text-sm font-medium">Available</div>
                  <div className="text-xs text-green-700">Ready for orders</div>
                </CardContent>
              </Card>
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">📍</div>
                  <div className="text-sm font-medium">Location Active</div>
                  <div className="text-xs text-blue-700">GPS tracking on</div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            Find Nearby Drivers 🎯
          </CardTitle>
          <CardDescription>
            Discover available drivers in your area for quick ride booking
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Search Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-4 w-4" />
            Search Location
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Latitude</label>
              <Input
                type="number"
                step="0.0001"
                value={searchLocation.latitude}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateSearchLocation('latitude', parseFloat(e.target.value) || 0)
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Longitude</label>
              <Input
                type="number"
                step="0.0001"
                value={searchLocation.longitude}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateSearchLocation('longitude', parseFloat(e.target.value) || 0)
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Radius (km)</label>
              <Input
                type="number"
                min="1"
                max="50"
                value={searchLocation.radius_km}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateSearchLocation('radius_km', parseFloat(e.target.value) || 5)
                }
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={loadNearbyDrivers} 
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Searching...' : 'Find Drivers'}
            </Button>
            
            {currentLocation && (
              <Button 
                variant="outline" 
                onClick={useCurrentLocation}
                className="flex items-center gap-2"
              >
                <Zap className="h-4 w-4" />
                Use Current Location
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Map Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              🗺️ Driver Map
            </span>
            <Badge variant="outline">
              {nearbyDrivers.length} drivers found
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderMockMap()}
        </CardContent>
      </Card>

      {/* Drivers List */}
      {nearbyDrivers.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5 text-green-600" />
              Available Drivers ({nearbyDrivers.length})
            </CardTitle>
            <CardDescription>
              Drivers currently available in your search area
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {nearbyDrivers.map((driver) => {
                const distance = calculateDistance(
                  driver.current_latitude || searchLocation.latitude,
                  driver.current_longitude || searchLocation.longitude
                );
                const estimatedArrival = getEstimatedArrival(distance);
                const hasActiveSubscription = driver.subscription_expires_at && 
                  new Date() < driver.subscription_expires_at;

                return (
                  <div key={driver.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-green-100">
                          <Car className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold">Driver #{driver.id}</h3>
                          <p className="text-sm text-gray-600">
                            {driver.vehicle_type} - {driver.vehicle_plate}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant={driver.is_available ? 'default' : 'secondary'}>
                          {driver.is_available ? '✅ Available' : '⏸️ Busy'}
                        </Badge>
                        {hasActiveSubscription && (
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            📱 Premium
                          </Badge>
                        )}
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <div className="font-semibold text-blue-600">
                          {distance.toFixed(1)} km
                        </div>
                        <div className="text-gray-600">Distance</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-purple-600 flex items-center justify-center gap-1">
                          <Clock className="h-3 w-3" />
                          {estimatedArrival} min
                        </div>
                        <div className="text-gray-600">Arrival</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-green-600">
                          {driver.subscription_expires_at ? 
                            driver.subscription_expires_at.toLocaleDateString() : 'N/A'
                          }
                        </div>
                        <div className="text-gray-600">Sub. Expires</div>
                      </div>
                    </div>

                    {driver.current_latitude && driver.current_longitude && (
                      <div className="text-xs text-gray-500 text-center">
                        Location: {driver.current_latitude.toFixed(4)}, {driver.current_longitude.toFixed(4)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-gray-400 mb-2">
              🚗
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No drivers found</h3>
            <p className="text-gray-600">
              {isLoading ? 'Searching for drivers...' : 'Try expanding your search radius or check a different location.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-600" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              onClick={() => updateSearchLocation('radius_km', 2)}
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <div className="text-2xl">🎯</div>
              <div className="text-sm">
                <div className="font-medium">Nearby Only</div>
                <div className="text-gray-600">2km radius</div>
              </div>
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => updateSearchLocation('radius_km', 10)}
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <div className="text-2xl">🌍</div>
              <div className="text-sm">
                <div className="font-medium">Extended Search</div>
                <div className="text-gray-600">10km radius</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}