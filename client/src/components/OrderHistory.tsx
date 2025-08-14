import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, MapPin, DollarSign, Car, User as UserIcon, Filter, RefreshCw } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Order, UserRole, OrderStatus, PaymentStatus } from '../../../server/src/schema';

interface OrderHistoryProps {
  userId: number;
  userRole: UserRole;
}

export function OrderHistory({ userId, userRole }: OrderHistoryProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');

  useEffect(() => {
    loadOrders();
  }, [userId, userRole]);

  useEffect(() => {
    applyFilters();
  }, [orders, statusFilter, paymentFilter]);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const orderData = await trpc.getUserOrders.query({ userId, role: userRole });
      setOrders(orderData);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...orders];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    if (paymentFilter !== 'all') {
      filtered = filtered.filter(order => order.payment_status === paymentFilter);
    }

    // Sort by created date (newest first)
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setFilteredOrders(filtered);
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'accepted': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'in_progress': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'completed': return 'bg-green-100 text-green-800 border-green-300';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPaymentStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case 'pending': return 'bg-orange-100 text-orange-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'refunded': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTotalEarnings = () => {
    return filteredOrders
      .filter(order => order.status === 'completed' && order.payment_status === 'paid')
      .reduce((sum, order) => sum + (order.final_fare || order.estimated_fare), 0);
  };

  const getOrderStats = () => {
    const completed = filteredOrders.filter(order => order.status === 'completed').length;
    const cancelled = filteredOrders.filter(order => order.status === 'cancelled').length;
    const pending = filteredOrders.filter(order => order.status === 'pending').length;
    
    return { completed, cancelled, pending };
  };

  const stats = getOrderStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Order History - {userRole === 'passenger' ? '🎯 My Rides' : '🚗 My Deliveries'}
          </CardTitle>
          <CardDescription>
            View and manage your {userRole === 'passenger' ? 'ride' : 'delivery'} history
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{filteredOrders.length}</div>
            <div className="text-sm text-gray-600">Total Orders</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              Rp {getTotalEarnings().toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">
              {userRole === 'passenger' ? 'Total Spent' : 'Total Earned'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Payment</label>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All payments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={loadOrders}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-gray-400 mb-2">
              {userRole === 'passenger' ? '🎯' : '🚗'}
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No orders found</h3>
            <p className="text-gray-600">
              {isLoading ? 'Loading orders...' : 'No orders match your current filters.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-blue-100">
                      {userRole === 'passenger' ? (
                        <Car className="h-4 w-4 text-blue-600" />
                      ) : (
                        <UserIcon className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold">Order #{order.id}</h3>
                      <p className="text-sm text-gray-600">
                        {order.created_at.toLocaleDateString()} at {order.created_at.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(order.status)}>
                      {order.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className={getPaymentStatusColor(order.payment_status)}>
                      {order.payment_status.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-green-700">Pickup</p>
                      <p className="text-sm text-gray-600">{order.pickup_address}</p>
                      <p className="text-xs text-gray-400">
                        {order.pickup_latitude}, {order.pickup_longitude}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-700">Destination</p>
                      <p className="text-sm text-gray-600">{order.destination_address}</p>
                      <p className="text-xs text-gray-400">
                        {order.destination_latitude}, {order.destination_longitude}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm">
                    {userRole === 'driver' && (
                      <div>
                        <span className="text-gray-600">Passenger:</span>
                        <span className="ml-1 font-medium">#{order.passenger_id}</span>
                      </div>
                    )}
                    {userRole === 'passenger' && order.driver_id && (
                      <div>
                        <span className="text-gray-600">Driver:</span>
                        <span className="ml-1 font-medium">#{order.driver_id}</span>
                      </div>
                    )}
                    {order.qris_payment_id && (
                      <div>
                        <span className="text-gray-600">Payment ID:</span>
                        <span className="ml-1 font-medium text-xs">{order.qris_payment_id}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="text-lg font-bold text-green-600">
                        Rp {(order.final_fare || order.estimated_fare).toLocaleString()}
                      </span>
                    </div>
                    {order.final_fare !== order.estimated_fare && (
                      <p className="text-xs text-gray-500">
                        Est: Rp {order.estimated_fare.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}