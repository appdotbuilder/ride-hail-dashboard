import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, CreditCard, Car, Clock, DollarSign, CheckCircle, AlertCircle, Navigation } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { User, Order, CreateOrderInput, DriverBid } from '../../../server/src/schema';

interface PassengerDashboardProps {
  user: User;
}

export function PassengerDashboard({ user }: PassengerDashboardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [orderBids, setOrderBids] = useState<DriverBid[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const [orderForm, setOrderForm] = useState<CreateOrderInput>({
    passenger_id: user.id,
    pickup_latitude: -6.2088, // Default Jakarta coordinates
    pickup_longitude: 106.8456,
    pickup_address: '',
    destination_latitude: -6.1751,
    destination_longitude: 106.8650,
    destination_address: '',
    estimated_fare: 0
  });

  // Load recent orders
  useEffect(() => {
    const loadRecentOrders = async () => {
      try {
        const orders = await trpc.getUserOrders.query({ userId: user.id, role: 'passenger' });
        setRecentOrders(orders.slice(0, 3)); // Show only 3 recent orders
      } catch (error) {
        console.error('Failed to load orders:', error);
      }
    };
    loadRecentOrders();
  }, [user.id]);

  // Calculate estimated fare based on distance
  const calculateEstimatedFare = () => {
    const distance = Math.sqrt(
      Math.pow(orderForm.destination_latitude - orderForm.pickup_latitude, 2) +
      Math.pow(orderForm.destination_longitude - orderForm.pickup_longitude, 2)
    );
    const baseFare = 5000;
    const perKmRate = 3000;
    const estimatedFare = baseFare + (distance * 100 * perKmRate); // Convert to rough km
    setOrderForm((prev: CreateOrderInput) => ({ 
      ...prev, 
      estimated_fare: Math.round(estimatedFare) 
    }));
  };

  useEffect(() => {
    if (orderForm.pickup_address && orderForm.destination_address) {
      calculateEstimatedFare();
    }
  }, [orderForm.pickup_address, orderForm.destination_address]);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const order = await trpc.createOrder.mutate(orderForm);
      setCurrentOrder(order);
      setMessage('🎉 Order created! Drivers are now bidding on your ride.');
      
      // Start checking for bids
      setTimeout(loadOrderBids, 2000);
    } catch (error) {
      console.error('Failed to create order:', error);
      setMessage('Failed to create order. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadOrderBids = async () => {
    if (!currentOrder) return;
    
    try {
      const bids = await trpc.getOrderBids.query({ orderId: currentOrder.id });
      setOrderBids(bids);
    } catch (error) {
      console.error('Failed to load bids:', error);
    }
  };

  const handleAcceptBid = async (bidId: number) => {
    if (!currentOrder) return;
    
    setIsLoading(true);
    try {
      await trpc.acceptBid.mutate({
        order_id: currentOrder.id,
        bid_id: bidId,
        passenger_id: user.id
      });
      
      setMessage('✅ Bid accepted! Your driver is on the way.');
      // Refresh order status
      const orders = await trpc.getUserOrders.query({ userId: user.id, role: 'passenger' });
      const updatedOrder = orders.find(o => o.id === currentOrder.id);
      if (updatedOrder) {
        setCurrentOrder(updatedOrder);
      }
    } catch (error) {
      console.error('Failed to accept bid:', error);
      setMessage('Failed to accept bid. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!currentOrder) return;
    
    setIsLoading(true);
    try {
      await trpc.processQrisPayment.mutate({
        order_id: currentOrder.id,
        passenger_id: user.id,
        amount: currentOrder.final_fare || currentOrder.estimated_fare
      });
      
      setMessage('💳 Payment processed successfully!');
      setCurrentOrder(null);
    } catch (error) {
      console.error('Payment failed:', error);
      setMessage('Payment failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrderForm = (field: keyof CreateOrderInput, value: string | number) => {
    setOrderForm((prev: CreateOrderInput) => ({ ...prev, [field]: value }));
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

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            Welcome Back, {user.full_name}! 🎯
          </CardTitle>
          <CardDescription>
            Ready for your next ride? Book a driver or track your current order.
          </CardDescription>
        </CardHeader>
      </Card>

      {message && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {/* Current Order Status */}
      {currentOrder && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5 text-green-600" />
              Current Order #{currentOrder.id}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge className={getStatusColor(currentOrder.status)}>
                {currentOrder.status.toUpperCase()}
              </Badge>
              <span className="text-sm text-gray-600">
                Payment: {currentOrder.payment_status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Pickup:</span>
                <p className="text-gray-600">{currentOrder.pickup_address}</p>
              </div>
              <div>
                <span className="font-medium">Destination:</span>
                <p className="text-gray-600">{currentOrder.destination_address}</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-medium">
                Fare: Rp {(currentOrder.final_fare || currentOrder.estimated_fare).toLocaleString()}
              </span>
              {currentOrder.status === 'completed' && currentOrder.payment_status === 'pending' && (
                <Button onClick={handlePayment} disabled={isLoading} size="sm">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pay with QRIS
                </Button>
              )}
            </div>

            {/* Show bids if order is pending */}
            {currentOrder.status === 'pending' && orderBids.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium">Driver Bids:</h4>
                {orderBids.map((bid) => (
                  <div key={bid.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">Driver #{bid.driver_id}</div>
                      <div className="text-sm text-gray-600">
                        Arrives in {bid.estimated_arrival_minutes} minutes
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">Rp {bid.bid_amount.toLocaleString()}</span>
                      <Button 
                        size="sm" 
                        onClick={() => handleAcceptBid(bid.id)}
                        disabled={isLoading}
                      >
                        Accept
                      </Button>
                    </div>
                  </div>
                ))}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={loadOrderBids}
                  className="w-full"
                >
                  Refresh Bids
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Book New Ride Form */}
      {!currentOrder && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-blue-600" />
              Book a New Ride
            </CardTitle>
            <CardDescription>
              Enter your pickup and destination to find available drivers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Pickup Address</label>
                  <Input
                    placeholder="Enter pickup location"
                    value={orderForm.pickup_address}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateOrderForm('pickup_address', e.target.value)
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Destination Address</label>
                  <Input
                    placeholder="Enter destination"
                    value={orderForm.destination_address}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateOrderForm('destination_address', e.target.value)
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 text-sm">
                <div>
                  <label className="block text-xs font-medium mb-1">Pickup Lat</label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={orderForm.pickup_latitude}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateOrderForm('pickup_latitude', parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Pickup Lng</label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={orderForm.pickup_longitude}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateOrderForm('pickup_longitude', parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Dest Lat</label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={orderForm.destination_latitude}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateOrderForm('destination_latitude', parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Dest Lng</label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={orderForm.destination_longitude}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateOrderForm('destination_longitude', parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Estimated Fare:</span>
                </div>
                <span className="text-xl font-bold text-green-600">
                  Rp {orderForm.estimated_fare.toLocaleString()}
                </span>
              </div>

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? 'Booking Ride...' : '🚗 Book Ride'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Recent Orders */}
      {recentOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-600" />
              Recent Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">#{order.id}</div>
                    <div className="text-sm text-gray-600">
                      {order.pickup_address} → {order.destination_address}
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
    </div>
  );
}