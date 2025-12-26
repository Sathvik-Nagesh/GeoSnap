import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { GeoLocation } from '../types';
import { MapPin, Sparkles, Navigation } from 'lucide-react';

// NOTE: CSS is loaded in index.html via CDN to avoid import errors in ESM environment.

// Custom premium marker icon
const createCustomIcon = (isEstimated: boolean) => {
  const color = isEstimated ? '#6366f1' : '#10b981';
  const glowColor = isEstimated ? 'rgba(99, 102, 241, 0.4)' : 'rgba(16, 185, 129, 0.4)';
  
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        position: relative;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          position: absolute;
          width: 40px;
          height: 40px;
          background: ${glowColor};
          border-radius: 50%;
          animation: pulse 2s ease-in-out infinite;
        "></div>
        <div style="
          position: relative;
          width: 28px;
          height: 28px;
          background: linear-gradient(135deg, ${color} 0%, ${isEstimated ? '#4f46e5' : '#059669'} 100%);
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 4px 20px ${glowColor};
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
        </div>
      </div>
      <style>
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.5); opacity: 0; }
        }
      </style>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });
};

// Fallback Leaflet marker icons
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapDisplayProps {
  location: GeoLocation;
  displayName: string;
  isEstmated?: boolean;
}

// Helper component to update map view when props change
const ChangeView: React.FC<{ center: [number, number], zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    // Invalidate size to ensure all tiles load
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
    
    // Smooth animation to the new location
    map.flyTo(center, zoom, {
      duration: 1.5,
      easeLinearity: 0.25
    });
  }, [center, zoom, map]);
  
  // Also invalidate on window resize
  useEffect(() => {
    const handleResize = () => {
      map.invalidateSize();
    };
    
    window.addEventListener('resize', handleResize);
    
    // Initial invalidation
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 300);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [map]);
  
  return null;
};

const MapDisplay: React.FC<MapDisplayProps> = ({ location, displayName, isEstmated }) => {
  const position: [number, number] = [location.lat, location.lng];
  const customIcon = createCustomIcon(!!isEstmated);

  return (
    <div className="w-full h-full min-h-[400px] bg-[#09090b] relative z-0 group rounded-2xl overflow-hidden">
      <MapContainer 
        center={position} 
        zoom={13} 
        scrollWheelZoom={true} 
        dragging={true}
        doubleClickZoom={true}
        zoomControl={true}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="map-tiles opacity-80"
        />
        <ChangeView center={position} zoom={13} />
        <Marker position={position} icon={customIcon}>
          <Popup className="custom-popup">
            {/* Premium Popup Content */}
            <div className="min-w-[220px] p-1">
              {/* Status Badge */}
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-zinc-700/50">
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  isEstmated 
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' 
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {isEstmated ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                      AI Estimated
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      GPS Verified
                    </>
                  )}
                </div>
              </div>
              
              {/* Location Name */}
              <p className="text-sm font-semibold text-zinc-100 leading-snug mb-3">
                {displayName}
              </p>
              
              {/* Coordinates */}
              <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono bg-zinc-800/50 p-2.5 rounded-lg border border-zinc-700/30">
                <div className="text-center">
                  <span className="block text-[9px] text-zinc-500 uppercase font-bold mb-0.5">Lat</span>
                  <span className="text-zinc-200">{location.lat.toFixed(5)}</span>
                </div>
                <div className="w-px h-6 bg-zinc-700" />
                <div className="text-center">
                  <span className="block text-[9px] text-zinc-500 uppercase font-bold mb-0.5">Lng</span>
                  <span className="text-zinc-200">{location.lng.toFixed(5)}</span>
                </div>
              </div>
              
              {/* Open in Maps Link */}
              <a 
                href={`https://www.google.com/maps?q=${location.lat},${location.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center justify-center gap-2 w-full py-2 bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-300 text-xs font-medium rounded-lg transition-colors border border-zinc-700/30"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                Open in Google Maps
              </a>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
      
      {/* Premium vignette overlay */}
      <div className="absolute inset-0 pointer-events-none rounded-2xl z-[400]" style={{
        boxShadow: 'inset 0 0 80px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,0,0,0.3)'
      }} />
      
      {/* Corner accent */}
      <div className="absolute top-4 right-4 z-[500] pointer-events-none">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${
          isEstmated 
            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' 
            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
        }`}>
          {isEstmated ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              AI Location
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Exact Location
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapDisplay;