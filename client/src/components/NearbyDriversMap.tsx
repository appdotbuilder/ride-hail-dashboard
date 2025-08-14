import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { 
  MapPin, 
  Navigation, 
  Car, 
  Clock, 
  RefreshCw, 
  Zap, 
  Settings,
  Maximize2,
  Target,
  Route,
  Users,
  Activity
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { UserRole, DriverProfile, GetNearbyDriversInput } from '../../../server/src/schema';
import { OpenStreetMap, RouteVisualization } from './OpenStreetMap';

interface NearbyDriversMapProps {
  userRole: UserRole;
}

interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  type: 'user' | 'driver' | 'pickup' | 'destination';
  title?: string;
  data?: any;
}

interface LocationState {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

export function NearbyDriversMap({ userRole }: NearbyDriversMapProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [nearbyDrivers, setNearbyDrivers] = useState<DriverProfile[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<DriverProfile | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  
  const [searchLocation, setSearchLocation] = useState<GetNearbyDriversInput>({
    latitude: -6.2088, // Default Jakarta coordinates
    longitude: 106.8456,
    radius_km: 5
  });
  
  const [currentLocation, setCurrentLocation] = useState<LocationState | null>(null);
  const [pickupLocation, setPickupLocation] = useState<LocationState | null>(null);
  const [destinationLocation, setDestinationLocation] = useState<LocationState | null>(null);

  // Geolocation tracking
  const startLocationTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser.');
      return;
    }

    setIsTracking(true);
    setLocationError(null);

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    };

    const success = (position: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = position.coords;
      const newLocation = {
        latitude,
        longitude,
        accuracy,
        timestamp: Date.now()
      };
      
      setCurrentLocation(newLocation);
      setSearchLocation(prev => ({ ...prev, latitude, longitude }));
      setLocationError(null);
    };

    const error = (error: GeolocationPositionError) => {
      setLocationError(`Location error: ${error.message}`);
      setIsTracking(false);
    };

    // Get current position
    navigator.geolocation.getCurrentPosition(success, error, options);

    // Watch position changes
    const watchId = navigator.geolocation.watchPosition(success, error, options);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      setIsTracking(false);
    };
  }, []);

  useEffect(() => {
    // Auto-start location tracking for mobile experience
    const cleanup = startLocationTracking();
    return cleanup;
  }, [startLocationTracking]);

  useEffect(() => {
    if (userRole === 'passenger' && searchLocation) {
      loadNearbyDrivers();
    }
  }, [userRole, searchLocation]);

  const loadNearbyDrivers = useCallback(async () => {
    setIsLoading(true);
    try {
      const drivers = await trpc.getNearbyDrivers.query(searchLocation);
      setNearbyDrivers(drivers);
    } catch (error) {
      console.error('Failed to load nearby drivers:', error);
    } finally {
      setIsLoading(false);
    }
  }, [searchLocation]);

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
    const averageSpeed = userRole === 'driver' ? 35 : 30; // Slightly faster for drivers
    return Math.round((distance / averageSpeed) * 60);
  };

  // Prepare map markers
  const mapMarkers: MapMarker[] = [
    // Current user location
    ...(currentLocation ? [{
      id: 'user',
      lat: currentLocation.latitude,
      lng: currentLocation.longitude,
      type: 'user' as const,
      title: `Your Location (±${currentLocation.accuracy?.toFixed(0)}m)`
    }] : []),
    
    // Nearby drivers
    ...nearbyDrivers.map(driver => ({
      id: `driver-${driver.id}`,
      lat: driver.current_latitude || searchLocation.latitude,
      lng: driver.current_longitude || searchLocation.longitude,
      type: 'driver' as const,
      title: `Driver #${driver.id} - ${driver.vehicle_type} (${driver.vehicle_plate})`,
      data: driver
    })),
    
    // Pickup location
    ...(pickupLocation ? [{
      id: 'pickup',
      lat: pickupLocation.latitude,
      lng: pickupLocation.longitude,
      type: 'pickup' as const,
      title: 'Pickup Location'
    }] : []),
    
    // Destination location
    ...(destinationLocation ? [{
      id: 'destination',
      lat: destinationLocation.latitude,
      lng: destinationLocation.longitude,
      type: 'destination' as const,
      title: 'Destination'
    }] : [])
  ];

  const handleMarkerClick = (marker: MapMarker) => {
    if (marker.type === 'driver' && marker.data) {
      setSelectedDriver(marker.data);
    }
  };

  // Mobile-optimized quick actions
  const quickActions = [
    {
      id: 'refresh',
      icon: RefreshCw,
      label: 'Refresh',
      action: loadNearbyDrivers,
      variant: 'default' as const,
      loading: isLoading
    },
    {
      id: 'location',
      icon: Target,
      label: isTracking ? 'Tracking...' : 'My Location',
      action: startLocationTracking,
      variant: 'outline' as const,
      disabled: isTracking
    },
    {
      id: 'nearby',
      icon: Zap,
      label: '2km',
      action: () => setSearchLocation(prev => ({ ...prev, radius_km: 2 })),
      variant: 'outline' as const
    },
    {
      id: 'extended',
      icon: Route,
      label: '10km',
      action: () => setSearchLocation(prev => ({ ...prev, radius_km: 10 })),
      variant: 'outline' as const
    }
  ];

  // Driver-specific view
  if (userRole === 'driver') {
    return (
      <div className="space-y-4 pb-6">
        {/* Header Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4 text-center">
              <Activity className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">
                {isTracking ? '✅' : '❌'}
              </div>
              <div className="text-sm font-medium text-green-700">
                {isTracking ? 'Online' : 'Offline'}
              </div>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4 text-center">
              <Users className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">0</div>
              <div className="text-sm font-medium text-blue-700">Active Orders</div>
            </CardContent>
          </Card>
        </div>

        {/* Location Status */}
        {locationError && (
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-700">
              📍 {locationError}
            </AlertDescription>
          </Alert>
        )}

        {currentLocation && (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-700">
              📍 Location active: {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
              {currentLocation.accuracy && ` (±${currentLocation.accuracy.toFixed(0)}m)`}
            </AlertDescription>
          </Alert>
        )}

        {/* Driver Map */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-lg">
              <span className="flex items-center gap-2">
                🗺️ Driver Map
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <OpenStreetMap
              center={{ lat: currentLocation?.latitude || searchLocation.latitude, lng: currentLocation?.longitude || searchLocation.longitude }}
              zoom={14}
              markers={mapMarkers}
              onMarkerClick={handleMarkerClick}
              height={isFullscreen ? '60vh' : '300px'}
            />
            
            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              {quickActions.map(action => (
                <Button
                  key={action.id}
                  variant={action.variant}
                  size="sm"
                  onClick={action.action}
                  disabled={action.disabled || action.loading}
                  className="flex items-center gap-2"
                >
                  <action.icon className={`h-4 w-4 ${action.loading ? 'animate-spin' : ''}`} />
                  {action.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Service Area Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Navigation className="h-5 w-5 text-blue-600" />
              Service Area
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Coverage Radius</span>
                <Badge variant="outline">{searchLocation.radius_km} km</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Location Updates</span>
                <Badge variant={isTracking ? 'default' : 'secondary'}>
                  {isTracking ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              {currentLocation?.accuracy && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">GPS Accuracy</span>
                  <Badge variant="outline">±{currentLocation.accuracy.toFixed(0)}m</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Passenger view
  return (
    <div className="space-y-4 pb-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4 text-center">
            <Car className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-600">
              {nearbyDrivers.length}
            </div>
            <div className="text-sm font-medium text-blue-700">Drivers Found</div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4 text-center">
            <Target className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-600">
              {searchLocation.radius_km}km
            </div>
            <div className="text-sm font-medium text-green-700">Search Radius</div>
          </CardContent>
        </Card>
      </div>

      {/* Location Error */}
      {locationError && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-700">
            📍 {locationError}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Map */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <span className="flex items-center gap-2">
              🗺️ Live Driver Map
            </span>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-xs">
                {nearbyDrivers.filter(d => d.is_available).length} available
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <OpenStreetMap
            center={{ 
              lat: currentLocation?.latitude || searchLocation.latitude, 
              lng: currentLocation?.longitude || searchLocation.longitude 
            }}
            zoom={13}
            markers={mapMarkers}
            onMarkerClick={handleMarkerClick}
            height={isFullscreen ? '60vh' : '350px'}
          />
          
          {/* Map Legend */}
          <div className="flex flex-wrap gap-4 justify-center text-xs text-gray-600 border-t pt-3">
            <div className="flex items-center gap-1">
              <span>📍</span>
              <span>You</span>
            </div>
            <div className="flex items-center gap-1">
              <span>🚗</span>
              <span>Drivers</span>
            </div>
            <div className="flex items-center gap-1">
              <span>🟢</span>
              <span>Pickup</span>
            </div>
            <div className="flex items-center gap-1">
              <span>🏁</span>
              <span>Destination</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            {quickActions.map(action => (
              <Button
                key={action.id}
                variant={action.variant}
                size="sm"
                onClick={action.action}
                disabled={action.disabled || action.loading}
                className="flex items-center gap-2 flex-1 min-w-[100px]"
              >
                <action.icon className={`h-4 w-4 ${action.loading ? 'animate-spin' : ''}`} />
                {action.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Route Planning */}
      {pickupLocation && destinationLocation && (
        <RouteVisualization
          start={{ lat: pickupLocation.latitude, lng: pickupLocation.longitude }}
          end={{ lat: destinationLocation.latitude, lng: destinationLocation.longitude }}
        />
      )}

      {/* Driver List */}
      {nearbyDrivers.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-green-600" />
              Available Drivers ({nearbyDrivers.filter(d => d.is_available).length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {nearbyDrivers
                .filter(driver => driver.is_available)
                .sort((a, b) => {
                  const distA = calculateDistance(
                    a.current_latitude || searchLocation.latitude,
                    a.current_longitude || searchLocation.longitude
                  );
                  const distB = calculateDistance(
                    b.current_latitude || searchLocation.latitude,
                    b.current_longitude || searchLocation.longitude
                  );
                  return distA - distB;
                })
                .map((driver) => {
                  const distance = calculateDistance(
                    driver.current_latitude || searchLocation.latitude,
                    driver.current_longitude || searchLocation.longitude
                  );
                  const estimatedArrival = getEstimatedArrival(distance);
                  const hasActiveSubscription = driver.subscription_expires_at && 
                    new Date() < driver.subscription_expires_at;

                  return (
                    <div 
                      key={driver.id} 
                      className={`border rounded-lg p-4 transition-all duration-200 ${
                        selectedDriver?.id === driver.id 
                          ? 'border-blue-300 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedDriver(driver)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-green-100">
                            <Car className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm">Driver #{driver.id}</h3>
                            <p className="text-xs text-gray-600">
                              {driver.vehicle_type} - {driver.vehicle_plate}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant="default" className="text-xs">
                            ✅ Available
                          </Badge>
                          {hasActiveSubscription && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">
                              ⭐ Premium
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div className="text-center">
                          <div className="font-semibold text-blue-600">
                            {distance.toFixed(1)}km
                          </div>
                          <div className="text-gray-500">Distance</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-purple-600 flex items-center justify-center gap-1">
                            <Clock className="h-3 w-3" />
                            {estimatedArrival}min
                          </div>
                          <div className="text-gray-500">ETA</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-green-600">
                            {hasActiveSubscription ? '✅' : '❌'}
                          </div>
                          <div className="text-gray-500">Active</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-4xl mb-4">🚗</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {isLoading ? 'Searching...' : 'No drivers found'}
            </h3>
            <p className="text-gray-600 text-sm">
              {isLoading 
                ? 'Looking for available drivers in your area...'
                : 'Try expanding your search radius or check a different location.'
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Advanced Settings Sheet */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="w-full">
            <Settings className="h-4 w-4 mr-2" />
            Advanced Settings
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[400px]">
          <SheetHeader>
            <SheetTitle>Search Settings</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-2">Search Center</label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  step="0.0001"
                  value={searchLocation.latitude}
                  onChange={(e) => setSearchLocation(prev => ({ 
                    ...prev, 
                    latitude: parseFloat(e.target.value) || 0 
                  }))}
                  placeholder="Latitude"
                />
                <Input
                  type="number"
                  step="0.0001"
                  value={searchLocation.longitude}
                  onChange={(e) => setSearchLocation(prev => ({ 
                    ...prev, 
                    longitude: parseFloat(e.target.value) || 0 
                  }))}
                  placeholder="Longitude"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Search Radius: {searchLocation.radius_km} km
              </label>
              <input
                type="range"
                min="1"
                max="20"
                step="1"
                value={searchLocation.radius_km}
                onChange={(e) => setSearchLocation(prev => ({ 
                  ...prev, 
                  radius_km: parseInt(e.target.value) 
                }))}
                className="w-full"
              />
            </div>

            {currentLocation && (
              <Button 
                onClick={() => setSearchLocation(prev => ({
                  ...prev,
                  latitude: currentLocation.latitude,
                  longitude: currentLocation.longitude
                }))}
                className="w-full"
              >
                <Target className="h-4 w-4 mr-2" />
                Use Current Location
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Selected Driver Details */}
      {selectedDriver && (
        <Sheet open={!!selectedDriver} onOpenChange={() => setSelectedDriver(null)}>
          <SheetContent side="bottom" className="h-[300px]">
            <SheetHeader>
              <SheetTitle>Driver #{selectedDriver.id} Details</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600">Vehicle</label>
                  <p className="font-medium">{selectedDriver.vehicle_type}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">License Plate</label>
                  <p className="font-medium">{selectedDriver.vehicle_plate}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Status</label>
                  <Badge variant={selectedDriver.is_available ? 'default' : 'secondary'}>
                    {selectedDriver.is_available ? '✅ Available' : '⏸️ Busy'}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Distance</label>
                  <p className="font-medium">
                    {calculateDistance(
                      selectedDriver.current_latitude || searchLocation.latitude,
                      selectedDriver.current_longitude || searchLocation.longitude
                    ).toFixed(1)} km
                  </p>
                </div>
              </div>
              
              <Button 
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={() => {
                  // TODO: Implement order creation
                  console.log('Creating order for driver:', selectedDriver.id);
                  setSelectedDriver(null);
                }}
              >
                📱 Request Ride
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}