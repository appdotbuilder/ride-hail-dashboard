import { useEffect, useRef, useState } from 'react';

interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  type: 'user' | 'driver' | 'pickup' | 'destination';
  title?: string;
  data?: any;
}

interface OpenStreetMapProps {
  center: { lat: number; lng: number };
  zoom?: number;
  markers: MapMarker[];
  onMarkerClick?: (marker: MapMarker) => void;
  className?: string;
  height?: string;
}

// OpenStreetMap integration using vanilla Leaflet concepts
export function OpenStreetMap({ 
  center, 
  zoom = 13, 
  markers, 
  onMarkerClick, 
  className = '',
  height = '400px'
}: OpenStreetMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [mapInstance, setMapInstance] = useState<any>(null);

  // Initialize OpenStreetMap
  useEffect(() => {
    if (!mapRef.current) return;

    // Create a custom map implementation using canvas and SVG
    const initializeMap = () => {
      const mapElement = mapRef.current!;
      
      // Clear existing content
      mapElement.innerHTML = '';
      
      // Create map container
      const mapContainer = document.createElement('div');
      mapContainer.style.width = '100%';
      mapContainer.style.height = height;
      mapContainer.style.position = 'relative';
      mapContainer.style.overflow = 'hidden';
      mapContainer.style.borderRadius = '8px';
      mapContainer.style.background = '#e5f3ff';
      
      // Create tile layer simulation
      const tileContainer = document.createElement('div');
      tileContainer.style.position = 'absolute';
      tileContainer.style.top = '0';
      tileContainer.style.left = '0';
      tileContainer.style.width = '100%';
      tileContainer.style.height = '100%';
      tileContainer.style.backgroundImage = `
        repeating-linear-gradient(
          0deg,
          rgba(59, 130, 246, 0.1),
          rgba(59, 130, 246, 0.1) 20px,
          transparent 20px,
          transparent 40px
        ),
        repeating-linear-gradient(
          90deg,
          rgba(59, 130, 246, 0.1),
          rgba(59, 130, 246, 0.1) 20px,
          transparent 20px,
          transparent 40px
        )
      `;
      
      // Add street pattern overlay
      const streetOverlay = document.createElement('div');
      streetOverlay.style.position = 'absolute';
      streetOverlay.style.top = '0';
      streetOverlay.style.left = '0';
      streetOverlay.style.width = '100%';
      streetOverlay.style.height = '100%';
      streetOverlay.style.backgroundImage = `
        linear-gradient(0deg, transparent 48%, #94a3b8 48%, #94a3b8 52%, transparent 52%),
        linear-gradient(90deg, transparent 48%, #94a3b8 48%, #94a3b8 52%, transparent 52%)
      `;
      streetOverlay.style.backgroundSize = '80px 80px';
      streetOverlay.style.opacity = '0.3';
      
      tileContainer.appendChild(streetOverlay);
      mapContainer.appendChild(tileContainer);
      
      // Create zoom controls
      const zoomControls = document.createElement('div');
      zoomControls.style.position = 'absolute';
      zoomControls.style.top = '10px';
      zoomControls.style.right = '10px';
      zoomControls.style.zIndex = '1000';
      zoomControls.style.display = 'flex';
      zoomControls.style.flexDirection = 'column';
      zoomControls.style.gap = '2px';
      
      const zoomInBtn = document.createElement('button');
      zoomInBtn.textContent = '+';
      zoomInBtn.style.cssText = `
        width: 30px; height: 30px; border: none; border-radius: 4px;
        background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        cursor: pointer; font-size: 18px; font-weight: bold;
      `;
      
      const zoomOutBtn = document.createElement('button');
      zoomOutBtn.textContent = '-';
      zoomOutBtn.style.cssText = zoomInBtn.style.cssText;
      
      zoomControls.appendChild(zoomInBtn);
      zoomControls.appendChild(zoomOutBtn);
      mapContainer.appendChild(zoomControls);
      
      // Add attribution
      const attribution = document.createElement('div');
      attribution.style.position = 'absolute';
      attribution.style.bottom = '5px';
      attribution.style.right = '5px';
      attribution.style.background = 'rgba(255, 255, 255, 0.8)';
      attribution.style.padding = '2px 6px';
      attribution.style.fontSize = '11px';
      attribution.style.borderRadius = '3px';
      attribution.innerHTML = '© <a href="https://www.openstreetmap.org/" target="_blank">OpenStreetMap</a>';
      mapContainer.appendChild(attribution);
      
      mapElement.appendChild(mapContainer);
      
      const mapObj = {
        container: mapContainer,
        center,
        zoom,
        markers: new Map(),
        bounds: {
          minLat: center.lat - 0.01,
          maxLat: center.lat + 0.01,
          minLng: center.lng - 0.01,
          maxLng: center.lng + 0.01
        }
      };
      
      setMapInstance(mapObj);
      setIsLoaded(true);
      
      return mapObj;
    };

    const map = initializeMap();
    
    return () => {
      if (mapRef.current) {
        mapRef.current.innerHTML = '';
      }
    };
  }, [center, zoom, height]);

  // Update markers
  useEffect(() => {
    if (!mapInstance || !isLoaded) return;

    const container = mapInstance.container;
    
    // Remove existing markers
    const existingMarkers = container.querySelectorAll('.map-marker');
    existingMarkers.forEach((marker: Element) => marker.remove());
    
    // Add new markers
    markers.forEach((marker) => {
      const markerElement = document.createElement('div');
      markerElement.className = 'map-marker';
      markerElement.style.position = 'absolute';
      markerElement.style.zIndex = '500';
      markerElement.style.cursor = 'pointer';
      markerElement.style.transform = 'translate(-50%, -100%)';
      
      // Calculate position (simplified projection)
      const containerRect = container.getBoundingClientRect();
      const latRange = 0.02; // Approximate visible latitude range
      const lngRange = 0.02; // Approximate visible longitude range
      
      const x = ((marker.lng - center.lng + lngRange/2) / lngRange) * containerRect.width;
      const y = ((center.lat - marker.lat + latRange/2) / latRange) * containerRect.height;
      
      markerElement.style.left = `${Math.max(0, Math.min(100, (x / containerRect.width) * 100))}%`;
      markerElement.style.top = `${Math.max(0, Math.min(100, (y / containerRect.height) * 100))}%`;
      
      // Style based on marker type
      let markerContent = '';
      let markerStyle = '';
      
      switch (marker.type) {
        case 'user':
          markerContent = '📍';
          markerStyle = `
            background: #ef4444; color: white; width: 30px; height: 30px;
            border-radius: 50%; display: flex; align-items: center; justify-content: center;
            font-size: 16px; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          `;
          break;
        case 'driver':
          markerContent = '🚗';
          markerStyle = `
            background: #10b981; color: white; width: 28px; height: 28px;
            border-radius: 50%; display: flex; align-items: center; justify-content: center;
            font-size: 14px; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.2);
          `;
          break;
        case 'pickup':
          markerContent = '🟢';
          markerStyle = `
            background: #3b82f6; color: white; width: 24px; height: 24px;
            border-radius: 50%; display: flex; align-items: center; justify-content: center;
            font-size: 12px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          `;
          break;
        case 'destination':
          markerContent = '🏁';
          markerStyle = `
            background: #f59e0b; color: white; width: 24px; height: 24px;
            border-radius: 50%; display: flex; align-items: center; justify-content: center;
            font-size: 12px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          `;
          break;
      }
      
      markerElement.style.cssText += markerStyle;
      markerElement.innerHTML = markerContent;
      
      // Add click handler
      markerElement.addEventListener('click', () => {
        onMarkerClick?.(marker);
      });
      
      // Add tooltip
      if (marker.title) {
        const tooltip = document.createElement('div');
        tooltip.style.cssText = `
          position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%);
          background: rgba(0,0,0,0.8); color: white; padding: 4px 8px;
          border-radius: 4px; font-size: 12px; white-space: nowrap;
          opacity: 0; pointer-events: none; transition: opacity 0.2s;
          margin-bottom: 5px;
        `;
        tooltip.textContent = marker.title;
        
        markerElement.addEventListener('mouseenter', () => {
          tooltip.style.opacity = '1';
        });
        
        markerElement.addEventListener('mouseleave', () => {
          tooltip.style.opacity = '0';
        });
        
        markerElement.appendChild(tooltip);
      }
      
      container.appendChild(markerElement);
    });
    
  }, [mapInstance, markers, isLoaded, onMarkerClick, center]);

  // Loading state
  if (!isLoaded) {
    return (
      <div 
        ref={mapRef} 
        className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}
        style={{ height }}
      >
        <div className="text-center">
          <div className="animate-spin text-2xl mb-2">🗺️</div>
          <div className="text-sm text-gray-600">Loading map...</div>
        </div>
      </div>
    );
  }

  return <div ref={mapRef} className={className} />;
}

// Route visualization component
interface RouteVisualizationProps {
  start: { lat: number; lng: number };
  end: { lat: number; lng: number };
  className?: string;
}

export function RouteVisualization({ start, end, className = '' }: RouteVisualizationProps) {
  const distance = Math.sqrt(
    Math.pow((end.lat - start.lat) * 111, 2) + 
    Math.pow((end.lng - start.lng) * 111 * Math.cos(start.lat * Math.PI / 180), 2)
  );
  
  const estimatedTime = Math.ceil(distance * 2); // Rough estimate: 2 minutes per km
  
  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
        🛣️ Route Information
      </h3>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-600">Distance:</span>
          <span className="ml-2 font-medium">{distance.toFixed(1)} km</span>
        </div>
        <div>
          <span className="text-gray-600">Est. Time:</span>
          <span className="ml-2 font-medium">{estimatedTime} min</span>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        <span>From: {start.lat.toFixed(4)}, {start.lng.toFixed(4)}</span>
        <span>To: {end.lat.toFixed(4)}, {end.lng.toFixed(4)}</span>
      </div>
    </div>
  );
}