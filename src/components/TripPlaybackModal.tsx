import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  X, 
  Play, 
  Pause, 
  RotateCcw, 
  FastForward, 
  MapPin, 
  Clock, 
  Gauge, 
  Fuel, 
  AlertTriangle,
  Compass
} from 'lucide-react';
import { Trip, Vehicle } from '../types/fleet';

interface TripPlaybackModalProps {
  trip: Trip | null;
  vehicle?: Vehicle;
  onClose: () => void;
}

export const TripPlaybackModal: React.FC<TripPlaybackModalProps> = ({
  trip,
  vehicle: _vehicle,
  onClose,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const vehicleMarkerRef = useRef<L.Marker | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // Initialize Trip Map
  useEffect(() => {
    if (!trip || !mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    if ((mapContainerRef.current as unknown as { _leaflet_id?: unknown })._leaflet_id) {
      delete (mapContainerRef.current as unknown as { _leaflet_id?: unknown })._leaflet_id;
    }

    const firstPoint = trip.waypoints[0];
    if (!firstPoint) return;

    const map = L.map(mapContainerRef.current, {
      center: [firstPoint.lat, firstPoint.lng],
      zoom: 13,
      zoomControl: false,
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; CARTO &copy; OpenStreetMap',
    }).addTo(map);

    // Draw route polyline
    const latLngs = trip.waypoints.map(w => [w.lat, w.lng] as [number, number]);
    const routePolyline = L.polyline(latLngs, {
      color: '#06b6d4',
      weight: 4,
      opacity: 0.8,
    }).addTo(map);

    // Add Start & End pins
    L.circleMarker(latLngs[0], {
      radius: 7,
      color: '#10b981',
      fillColor: '#ffffff',
      fillOpacity: 1,
      weight: 3,
    }).addTo(map).bindPopup(`<strong>Trip Origin:</strong> ${trip.startLocation}`);

    L.circleMarker(latLngs[latLngs.length - 1], {
      radius: 7,
      color: '#ef4444',
      fillColor: '#ffffff',
      fillOpacity: 1,
      weight: 3,
    }).addTo(map).bindPopup(`<strong>Trip Destination:</strong> ${trip.endLocation}`);

    // Add incident waypoints
    trip.waypoints.forEach((wp) => {
      if (wp.event) {
        L.circleMarker([wp.lat, wp.lng], {
          radius: 6,
          color: '#f59e0b',
          fillColor: '#ef4444',
          fillOpacity: 0.9,
          weight: 2,
        }).addTo(map).bindPopup(`<strong>Event Alert:</strong> ${wp.event}<br/><span class="text-xs text-slate-500">${wp.timestamp}</span>`);
      }
    });

    // Create Vehicle Marker
    const vehicleIcon = L.divIcon({
      html: `
        <div class="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-500 border-2 border-white shadow-xl">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-slate-950" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
          </svg>
        </div>
      `,
      className: 'vehicle-playback-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const vMarker = L.marker(latLngs[0], { icon: vehicleIcon }).addTo(map);
    vehicleMarkerRef.current = vMarker;

    map.fitBounds(routePolyline.getBounds(), { padding: [40, 40] });
    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      if (mapContainerRef.current && (mapContainerRef.current as unknown as { _leaflet_id?: unknown })._leaflet_id) {
        delete (mapContainerRef.current as unknown as { _leaflet_id?: unknown })._leaflet_id;
      }
    };
  }, [trip]);

  // Playback loop
  useEffect(() => {
    if (!isPlaying || !trip) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= trip.waypoints.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1500 / playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, trip]);

  // Update marker position on index change
  useEffect(() => {
    if (!trip || !vehicleMarkerRef.current || !mapInstanceRef.current) return;
    const currentWp = trip.waypoints[currentIndex];
    if (!currentWp) return;
    vehicleMarkerRef.current.setLatLng([currentWp.lat, currentWp.lng]);

    // Optional pan if out of view
    mapInstanceRef.current.panTo([currentWp.lat, currentWp.lng], { animate: true, duration: 0.5 });
  }, [currentIndex, trip]);

  if (!trip) return null;

  const currentPoint = trip.waypoints[currentIndex];
  const progressPct = Math.round((currentIndex / (trip.waypoints.length - 1)) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-700 flex items-center justify-center text-cyan-400 font-bold">
              <Play className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white font-mono">{trip.vehicleReg} — Historical Trip Playback</h2>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  {trip.driverName}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {trip.startTime} &rarr; {trip.endTime} ({trip.durationMinutes} mins)
              </p>
            </div>
          </div>

          <button
            id="btn-close-trip-playback"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Map Stage */}
        <div className="flex-1 relative w-full h-full bg-slate-950">
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Floating Waypoint HUD */}
          <div className="absolute top-4 left-4 z-10 bg-slate-900/90 backdrop-blur border border-slate-800 rounded-xl p-3 shadow-xl text-xs space-y-1.5 min-w-[200px]">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Breadcrumb Telemetry HUD</span>
            <div className="flex justify-between">
              <span className="text-slate-400">Time:</span>
              <span className="font-mono text-cyan-300 font-bold">{currentPoint.timestamp}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Speed:</span>
              <span className={`font-mono font-bold ${currentPoint.speed > 80 ? 'text-red-400' : 'text-white'}`}>
                {currentPoint.speed} km/h
              </span>
            </div>
            {currentPoint.event && (
              <div className="p-1.5 bg-red-950/80 border border-red-800 text-red-200 rounded font-semibold text-[10px]">
                🚨 {currentPoint.event}
              </div>
            )}
          </div>

          {/* Trip Macro Metrics Pill */}
          <div className="absolute bottom-4 left-4 z-10 bg-slate-950/90 backdrop-blur border border-slate-800 rounded-xl p-2.5 shadow-xl text-xs text-slate-300 flex items-center space-x-4">
            <div>
              <span className="text-slate-500 block text-[9px]">DISTANCE</span>
              <span className="font-mono font-bold text-white">{trip.distanceKm} km</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px]">MAX SPEED</span>
              <span className="font-mono font-bold text-red-400">{trip.maxSpeedKmh} km/h</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px]">AVG SPEED</span>
              <span className="font-mono font-bold text-slate-200">{trip.avgSpeedKmh} km/h</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px]">FUEL CONSUMED</span>
              <span className="font-mono font-bold text-cyan-300">{trip.fuelConsumedLiters} L</span>
            </div>
          </div>
        </div>

        {/* Playback Controls Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">
          {/* Scrubber Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-slate-400 font-mono">
              <span>{trip.startLocation}</span>
              <span>Point {currentIndex + 1} of {trip.waypoints.length} ({progressPct}%)</span>
              <span>{trip.endLocation}</span>
            </div>
            <input
              id="range-trip-scrubber"
              type="range"
              min={0}
              max={trip.waypoints.length - 1}
              value={currentIndex}
              onChange={(e) => setCurrentIndex(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>

          {/* Buttons Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                id="btn-trip-reset"
                onClick={() => setCurrentIndex(0)}
                title="Restart Route"
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                id="btn-trip-play-pause"
                onClick={() => {
                  if (currentIndex >= trip.waypoints.length - 1) {
                    setCurrentIndex(0);
                  }
                  setIsPlaying(!isPlaying);
                }}
                className="flex items-center space-x-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs transition-colors shadow-lg cursor-pointer"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isPlaying ? 'Pause Playback' : 'Play Historical Route'}</span>
              </button>
            </div>

            {/* Speed multipliers */}
            <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs font-mono">
              <span className="text-[10px] text-slate-500 px-1 uppercase">Speed:</span>
              {[1, 2, 5, 10].map((spd) => (
                <button
                  key={spd}
                  id={`btn-trip-speed-${spd}x`}
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    playbackSpeed === spd
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
