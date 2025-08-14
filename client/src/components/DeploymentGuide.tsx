import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Smartphone, 
  Download, 
  Code, 
  Settings, 
  CheckCircle, 
  AlertTriangle,
  ExternalLink,
  Copy,
  Terminal,
  Folder
} from 'lucide-react';
import { useState } from 'react';

export function DeploymentGuide() {
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCommand(label);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  const CommandBlock = ({ title, command, description }: { title: string; command: string; description: string }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">{title}</h4>
        <Button
          variant="outline"
          size="sm"
          onClick={() => copyToClipboard(command, title)}
          className="h-8 px-2"
        >
          {copiedCommand === title ? (
            <CheckCircle className="h-3 w-3" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      </div>
      <div className="bg-gray-900 text-gray-100 p-3 rounded-md font-mono text-sm overflow-x-auto">
        {command}
      </div>
      <p className="text-xs text-gray-600">{description}</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-6 w-6 text-blue-600" />
            Android APK Deployment Guide
          </CardTitle>
          <CardDescription>
            Complete guide to build and deploy separate Android APKs for passengers and drivers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Prerequisites */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Prerequisites:</strong> Ensure you have Node.js 18+, Android Studio, and Java JDK 11+ installed.
            </AlertDescription>
          </Alert>

          {/* Step 1: Install Dependencies */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
              Install Required Dependencies
            </h3>
            
            <div className="space-y-4">
              <CommandBlock
                title="Install Capacitor and Android Platform"
                command="npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init"
                description="Initialize Capacitor for hybrid app development"
              />

              <CommandBlock
                title="Add Android Platform"
                command="npx cap add android"
                description="Add Android platform to your project"
              />
            </div>
          </div>

          {/* Step 2: Project Structure */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
              Project Structure for Dual Apps
            </h3>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="font-mono text-sm space-y-1">
                <div>📁 ridehail-app/</div>
                <div className="ml-4">📁 client/</div>
                <div className="ml-8">📁 src/</div>
                <div className="ml-12">📁 components/</div>
                <div className="ml-16">📄 AppConfig.tsx</div>
                <div className="ml-16">📄 NearbyDriversMap.tsx</div>
                <div className="ml-16">📄 OpenStreetMap.tsx</div>
                <div className="ml-8">📄 App.tsx</div>
                <div className="ml-4">📁 android/ (generated)</div>
                <div className="ml-4">📄 capacitor.config.ts</div>
                <div className="ml-4">📄 package.json</div>
              </div>
            </div>
          </div>

          {/* Step 3: Configuration Files */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</span>
              Create Configuration Files
            </h3>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">capacitor.config.ts</h4>
                <div className="bg-gray-900 text-gray-100 p-4 rounded-md font-mono text-sm overflow-x-auto">
{`import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: process.env.BUILD_TYPE === 'driver' 
    ? 'com.ridehail.driver' 
    : 'com.ridehail.passenger',
  appName: process.env.BUILD_TYPE === 'driver' 
    ? 'RideHail Driver' 
    : 'RideHail Passenger',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    backgroundColor: process.env.BUILD_TYPE === 'driver' 
      ? '#10b981' 
      : '#3b82f6'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: process.env.BUILD_TYPE === 'driver' 
        ? '#10b981' 
        : '#3b82f6'
    },
    StatusBar: {
      backgroundColor: process.env.BUILD_TYPE === 'driver' 
        ? '#10b981' 
        : '#3b82f6'
    },
    Geolocation: {
      permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION']
    }
  }
};

export default config;`}
                </div>
              </div>
            </div>
          </div>

          {/* Step 4: Build Scripts */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">4</span>
              Update package.json Build Scripts
            </h3>

            <div className="bg-gray-900 text-gray-100 p-4 rounded-md font-mono text-sm overflow-x-auto">
{`{
  "scripts": {
    "build:passenger": "VITE_BUILD_TYPE=passenger vite build",
    "build:driver": "VITE_BUILD_TYPE=driver vite build",
    "android:passenger:dev": "BUILD_TYPE=passenger npm run build:passenger && npx cap sync android",
    "android:driver:dev": "BUILD_TYPE=driver npm run build:driver && npx cap sync android",
    "android:passenger:build": "BUILD_TYPE=passenger npm run build:passenger && npx cap sync android && cd android && ./gradlew assembleRelease",
    "android:driver:build": "BUILD_TYPE=driver npm run build:driver && npx cap sync android && cd android && ./gradlew assembleRelease"
  }
}`}
            </div>
          </div>

          {/* Step 5: Build APKs */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">5</span>
              Build Android APKs
            </h3>

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    🎯 Passenger App
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <CommandBlock
                    title="Development Build"
                    command="npm run android:passenger:dev"
                    description="Build and sync for Android Studio development"
                  />
                  
                  <CommandBlock
                    title="Production Release"
                    command="npm run android:passenger:build"
                    description="Create signed production APK"
                  />
                  
                  <Badge variant="outline" className="bg-blue-100 text-blue-700">
                    Output: android/app/build/outputs/apk/release/app-release.apk
                  </Badge>
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-green-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    🚗 Driver App
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <CommandBlock
                    title="Development Build"
                    command="npm run android:driver:dev"
                    description="Build and sync for Android Studio development"
                  />
                  
                  <CommandBlock
                    title="Production Release"
                    command="npm run android:driver:build"
                    description="Create signed production APK"
                  />
                  
                  <Badge variant="outline" className="bg-green-100 text-green-700">
                    Output: android/app/build/outputs/apk/release/app-release.apk
                  </Badge>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Step 6: Signing and Distribution */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">6</span>
              App Signing & Distribution
            </h3>

            <Alert>
              <Settings className="h-4 w-4" />
              <AlertDescription>
                For production releases, you need to sign your APKs. Create a keystore file and configure signing in android/app/build.gradle
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <CommandBlock
                title="Generate Keystore"
                command="keytool -genkey -v -keystore ridehail-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias ridehail"
                description="Create a keystore for signing APKs (keep this secure!)"
              />

              <CommandBlock
                title="Sign APK manually (if needed)"
                command="jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore ridehail-keystore.jks app-release-unsigned.apk ridehail"
                description="Manually sign APK if automatic signing fails"
              />
            </div>
          </div>

          {/* Step 7: Testing */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">7</span>
              Testing on Device
            </h3>

            <div className="space-y-3">
              <div className="grid md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <Terminal className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <h4 className="font-medium mb-1">ADB Install</h4>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                      adb install app-release.apk
                    </code>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <Download className="h-8 w-8 mx-auto mb-2 text-green-600" />
                    <h4 className="font-medium mb-1">Direct Install</h4>
                    <p className="text-xs text-gray-600">
                      Transfer APK and install on device
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <ExternalLink className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                    <h4 className="font-medium mb-1">Play Console</h4>
                    <p className="text-xs text-gray-600">
                      Upload to Play Store for testing
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Key Differences */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Key Differences Between Apps</h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2 text-blue-700">🎯 Passenger App Features</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>• Book rides and view nearby drivers</li>
                  <li>• QRIS payment integration</li>
                  <li>• Real-time driver tracking</li>
                  <li>• Order history and receipts</li>
                  <li>• Rate and review drivers</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2 text-green-700">🚗 Driver App Features</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>• Accept and manage ride requests</li>
                  <li>• Subscription management system</li>
                  <li>• Earnings tracking and reports</li>
                  <li>• Location sharing and GPS tracking</li>
                  <li>• Bid on available rides</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Troubleshooting */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Common Issues:</strong>
              <ul className="mt-2 space-y-1 text-sm">
                <li>• Ensure Android SDK and Build Tools are properly installed</li>
                <li>• Check that ANDROID_HOME environment variable is set</li>
                <li>• Verify that the Android device has "Unknown Sources" enabled</li>
                <li>• For location features, ensure location permissions are granted</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Final Notes */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-800 mb-2">✅ Final Deployment Checklist</h4>
            <div className="grid md:grid-cols-2 gap-2 text-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>Environment variables configured</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>Icons and splash screens added</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>App permissions configured</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>APKs signed for release</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>Tested on physical devices</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>Play Store listing prepared</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}