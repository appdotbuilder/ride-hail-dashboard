import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, User as UserIcon, Car } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { User, RegisterUserInput, UserRole } from '../../../server/src/schema';

interface UserRegistrationProps {
  onUserRegistered: (user: User) => void;
}

export function UserRegistration({ onUserRegistered }: UserRegistrationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<UserRole>('passenger');
  
  const [formData, setFormData] = useState<RegisterUserInput>({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    role: 'passenger'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const userData = { ...formData, role: activeTab };
      const user = await trpc.registerUser.mutate(userData);
      onUserRegistered(user);
    } catch (error) {
      console.error('Registration failed:', error);
      setError('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: keyof RegisterUserInput, value: string) => {
    setFormData((prev: RegisterUserInput) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-2xl">Create Account</CardTitle>
          <CardDescription className="text-center">
            Join RideHail as a passenger or driver
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as UserRole)}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="passenger" className="flex items-center gap-2">
                <UserIcon className="h-4 w-4" />
                Passenger
              </TabsTrigger>
              <TabsTrigger value="driver" className="flex items-center gap-2">
                <Car className="h-4 w-4" />
                Driver
              </TabsTrigger>
            </TabsList>

            <TabsContent value="passenger">
              <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-800 mb-2">🎯 Passenger Account</h3>
                <p className="text-sm text-blue-700">
                  As a passenger, you can book rides, view nearby drivers, and pay using QRIS.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="driver">
              <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <h3 className="font-semibold text-green-800 mb-2">🚗 Driver Account</h3>
                <p className="text-sm text-green-700">
                  As a driver, you can accept orders, manage subscriptions, and earn money. Monthly subscription required.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.full_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateFormData('full_name', e.target.value)
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+6281234567890"
                  value={formData.phone}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateFormData('phone', e.target.value)
                  }
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={formData.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateFormData('email', e.target.value)
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password (min. 6 characters)"
                value={formData.password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateFormData('password', e.target.value)
                }
                required
                minLength={6}
              />
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Creating Account...' : `Create ${activeTab === 'passenger' ? 'Passenger' : 'Driver'} Account`}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            By creating an account, you agree to our Terms of Service and Privacy Policy.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}