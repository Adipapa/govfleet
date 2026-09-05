import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Vehicle, Geofence } from '../types/fleet';
import { 
  Layers, 
  Crosshair, 
  Ruler, 
  Eye, 
  EyeOff, 
  Compass, 
  MapPin, 
  Info,
  ShieldAlert,
  Flame,
  Maximize2
} from 'lucide-react';

interface MapViewProps {
  vehicles: Vehicle[];
  geofences: Geofence[];
  selectedVehicleId: string | null;
  onSelectVehicle: (vehicleId: string) => void;
  onOpenVehicleDossier: (vehicle: Vehicle) => void;
  onReplayTrip?: (vehicle: Vehicle) => void;
}

type TileProvider = 'streets' | 'satellite' | 'dark' | 'light';

const TILE_LAYERS: Record<TileProvider, { name: string; url: string; attribution: string }> = {
  dark: {
    name: 'Tactical Night (Dark)',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap',
  },
  satellite: {
    name: 'Satellite Reconnaissance',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
  },
  streets: {
    name: 'Standard Street Map',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
  light: {
    name: 'Government Operations (Light)',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO &copy; OpenStreetMap',
  },
};

export const MapView: React.FC<MapViewProps> = ({
  vehicles,
  geofences,
  selectedVehicleId,
  onSelectVehicle,
  onOpenVehicleDossier,
  onReplayTrip,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const geofencesLayerRef = useRef<L.LayerGroup | null>(null);
  const measureLayerRef = useRef<L.LayerGroup | null>(null);

  const [activeTileProvider, setActiveTileProvider] = useState<TileProvider>('light');
  const [showGeofences, setShowGeofences] = useState<boolean>(true);
  const [showTrafficLegend, setShowTrafficLegend] = useState<boolean>(true);
  const [measuringMode, setMeasuringMode] = useState<boolean>(false);
  const [measurePoints, setMeasurePoints] = useState<[number, number][]>([]);
  const [measuredDistanceKm, setMeasuredDistanceKm] = useState<number | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    if ((mapContainerRef.current as unknown as { _leaflet_id?: unknown })._leaflet_id) {
      delete (mapContainerRef.current as unknown as { _leaflet_id?: unknown })._leaflet_id;
    }

    // Centered at Greater Banjul / Gambia corridor
    const map = L.map(mapContainerRef.current, {
      center: [13.41, -16.65],
      zoom: 12,
      zoomControl: false,
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    const initialTile = TILE_LAYERS.light;
    const tileLayer = L.tileLayer(initialTile.url, {
      maxZoom: 19,
      attribution: initialTile.attribution,
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    const geofencesGroup = L.layerGroup().addTo(map);
    const markersGroup = L.layerGroup().addTo(map);
    const measureGroup = L.layerGroup().addTo(map);

    geofencesLayerRef.current = geofencesGroup;
    markersLayerRef.current = markersGroup;
    measureLayerRef.current = measureGroup;
    mapInstanceRef.current = map;

    // Ensure map tiles calculate correct dimensions
    const resizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 100);

    // Map click for ruler distance measurement
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (!measuringMode) return;

      const newPoint: [number, number] = [e.latlng.lat, e.latlng.lng];
      setMeasurePoints((prev) => {
        const next = [...prev, newPoint];
        if (next.length >= 2) {
          const p1 = L.latLng(next[0][0], next[0][1]);
          const p2 = L.latLng(next[1][0], next[1][1]);
          const distMeters = p1.distanceTo(p2);
          setMeasuredDistanceKm(Number((distMeters / 1000).toFixed(2)));
        }
        return next;
      });
    });

    return () => {
      clearTimeout(resizeTimer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      if (mapContainerRef.current && (mapContainerRef.current as unknown as { _leaflet_id?: unknown })._leaflet_id) {
        delete (mapContainerRef.current as unknown as { _leaflet_id?: unknown })._leaflet_id;
      }
    };
  }, []);

  // Update Tile Layer
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;

    const layerInfo = TILE_LAYERS[activeTileProvider];
    tileLayerRef.current.setUrl(layerInfo.url);
  }, [activeTileProvider]);

  // Render Geofences
  useEffect(() => {
    if (!geofencesLayerRef.current || !mapInstanceRef.current) return;

    geofencesLayerRef.current.clearLayers();

    if (!showGeofences) return;

    geofences.forEach((geo) => {
      const color = geo.restrictedZone 
        ? '#ef4444' 
        : geo.category === 'Hospital' 
        ? '#06b6d4' 
        : geo.category === 'Airport'
        ? '#f59e0b'
        : '#3b82f6';

      const polygon = L.polygon(geo.coordinates, {
        color: color,
        fillColor: color,
        fillOpacity: 0.15,
        weight: 2,
        dashArray: geo.restrictedZone ? '6, 6' : undefined,
      });

      polygon.bindPopup(`
        <div class="p-2 text-slate-900 font-sans min-w-[200px]">
          <div class="flex items-center justify-between border-b pb-1 mb-1.5">
            <span class="text-xs font-bold text-slate-900">${geo.name}</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded ${geo.restrictedZone ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'} font-semibold">
              ${geo.category}
            </span>
          </div>
          <div class="text-xs space-y-1 text-slate-700">
            <div><strong>Department Scope:</strong> ${geo.departmentScope || 'All Agencies'}</div>
            <div><strong>Speed Limit:</strong> ${geo.speedLimitKmh} km/h</div>
            <div><strong>Alert on Entry:</strong> ${geo.alertOnEntry ? 'Active' : 'Disabled'}</div>
            <div><strong>Alert on Exit:</strong> ${geo.alertOnExit ? 'Active' : 'Disabled'}</div>
          </div>
        </div>
      `);

      geofencesLayerRef.current?.addLayer(polygon);
    });
  }, [geofences, showGeofences]);

  // Render Vehicles Markers
  useEffect(() => {
    if (!markersLayerRef.current || !mapInstanceRef.current) return;

    markersLayerRef.current.clearLayers();

    vehicles.forEach((veh) => {
      const isSelected = veh.id === selectedVehicleId;
      const isEmergency = veh.status === 'emergency';
      const isMoving = veh.status === 'moving';
      const isIdle = veh.status === 'idling';
      const isParked = veh.status === 'parked';
      const isUnauthorized = veh.status === 'unauthorized';
      const isOffline = veh.status === 'offline';

      let statusColor = '#3b82f6';
      let statusBgClass = 'bg-blue-500';
      if (isEmergency) {
        statusColor = '#ef4444';
        statusBgClass = 'bg-red-500 animate-ping';
      } else if (isUnauthorized) {
        statusColor = '#d946ef';
        statusBgClass = 'bg-fuchsia-500';
      } else if (isMoving) {
        statusColor = '#10b981';
        statusBgClass = 'bg-emerald-500';
      } else if (isIdle) {
        statusColor = '#f59e0b';
        statusBgClass = 'bg-amber-500';
      } else if (isOffline) {
        statusColor = '#64748b';
        statusBgClass = 'bg-slate-500';
      }

      // Custom HTML Marker with heading rotation
      const markerHtml = `
        <div class="relative cursor-pointer transition-transform ${isSelected ? 'scale-125 z-50' : 'hover:scale-110'}">
          ${isEmergency ? `
            <div class="absolute -inset-2 rounded-full bg-red-500/40 animate-ping"></div>
          ` : ''}
          <div class="flex items-center justify-center w-8 h-8 rounded-full shadow-lg border-2 ${
            isSelected ? 'border-white ring-4 ring-cyan-500' : 'border-slate-900'
          }" style="background-color: ${statusColor}">
            <div style="transform: rotate(${veh.heading}deg)" class="transition-transform duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-slate-900" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
              </svg>
            </div>
          </div>
          <!-- Vehicle Label Tag -->
          <div class="absolute top-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.5 rounded bg-white/90 border border-slate-200 text-[10px] text-slate-900 font-mono shadow-md font-semibold pointer-events-none">
            ${veh.regNumber} ${veh.speedKmh > 0 ? `(${veh.speedKmh}k)` : ''}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-vehicle-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([veh.currentLocation.lat, veh.currentLocation.lng], {
        icon: customIcon,
        zIndexOffset: isSelected ? 1000 : isEmergency ? 900 : 100,
      });

      marker.on('click', () => {
        onSelectVehicle(veh.id);
      });

      // Quick popup
      const popupHtml = `
        <div class="p-2.5 text-slate-900 font-sans min-w-[240px]">
          <div class="flex items-center justify-between border-b pb-1.5 mb-2">
            <div>
              <span class="font-bold text-sm text-slate-950">${veh.regNumber}</span>
              <span class="text-[11px] text-slate-500 block">${veh.make} ${veh.model}</span>
            </div>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
              isEmergency ? 'bg-red-100 text-red-700 border border-red-300' :
              isMoving ? 'bg-emerald-100 text-emerald-800' :
              isIdle ? 'bg-amber-100 text-amber-800' :
              'bg-slate-100 text-slate-800'
            }">
              ${veh.status}
            </span>
          </div>

          <div class="grid grid-cols-2 gap-2 text-xs text-slate-700 mb-3">
            <div>
              <span class="text-slate-500 block text-[10px]">CURRENT SPEED</span>
              <span class="font-mono font-bold text-slate-900 text-sm">${veh.speedKmh} km/h</span>
            </div>
            <div>
              <span class="text-slate-500 block text-[10px]">FUEL PROBE (TRIMAGO)</span>
              <span class="font-mono font-bold text-slate-900">${veh.currentFuelPercentage}% (${veh.currentFuelLiters}L)</span>
            </div>
            <div>
              <span class="text-slate-500 block text-[10px]">ASSIGNED DRIVER</span>
              <span class="font-medium text-slate-900">${veh.assignedDriver.name}</span>
            </div>
            <div>
              <span class="text-slate-500 block text-[10px]">SAFETY SCORE</span>
              <span class="font-mono font-bold ${
                veh.assignedDriver.safetyScore >= 85 ? 'text-emerald-600' :
                veh.assignedDriver.safetyScore >= 70 ? 'text-amber-600' : 'text-red-600'
              }">${veh.assignedDriver.safetyScore}/100</span>
            </div>
          </div>

          <div class="text-[11px] text-slate-500 mb-2 border-t pt-1.5">
            <strong>Location:</strong> ${veh.currentLocation.address}
          </div>

          <div class="flex space-x-1.5 pt-1">
            <button id="btn-popup-dossier-${veh.id}" class="flex-1 bg-cyan-700 hover:bg-cyan-800 text-slate-900 py-1 px-2 rounded text-xs font-semibold text-center transition-colors">
              Full Dossier
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('popupopen', () => {
        setTimeout(() => {
          const btn = document.getElementById(`btn-popup-dossier-${veh.id}`);
          if (btn) {
            btn.onclick = () => onOpenVehicleDossier(veh);
          }
        }, 50);
      });

      markersLayerRef.current?.addLayer(marker);
    });
  }, [vehicles, selectedVehicleId]);

  // Auto-pan if selected vehicle changes
  useEffect(() => {
    if (!selectedVehicleId || !mapInstanceRef.current) return;
    const veh = vehicles.find((v) => v.id === selectedVehicleId);
    if (veh) {
      mapInstanceRef.current.panTo([veh.currentLocation.lat, veh.currentLocation.lng], {
        animate: true,
        duration: 0.8,
      });
    }
  }, [selectedVehicleId]);

  // Render Measurement line
  useEffect(() => {
    if (!measureLayerRef.current) return;
    measureLayerRef.current.clearLayers();

    if (measurePoints.length > 0) {
      measurePoints.forEach((pt) => {
        const ptMarker = L.circleMarker(pt, {
          radius: 5,
          color: '#06b6d4',
          fillColor: '#ffffff',
          fillOpacity: 1,
        });
        measureLayerRef.current?.addLayer(ptMarker);
      });

      if (measurePoints.length >= 2) {
        const line = L.polyline(measurePoints, {
          color: '#06b6d4',
          weight: 3,
          dashArray: '5, 5',
        });
        measureLayerRef.current?.addLayer(line);
      }
    }
  }, [measurePoints]);

  const handleCenterFleet = () => {
    if (!mapInstanceRef.current || vehicles.length === 0) return;
    const bounds = L.latLngBounds(vehicles.map((v) => [v.currentLocation.lat, v.currentLocation.lng]));
    mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
  };

  const clearMeasurement = () => {
    setMeasurePoints([]);
    setMeasuredDistanceKm(null);
    setMeasuringMode(false);
  };

  return (
    <div className="relative w-full h-full bg-white overflow-hidden select-none">
      {/* Map DOM Container */}
      <div id="map-container" ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Top Left Controls: Provider & Toggles */}
      <div className="absolute top-4 left-4 z-10 flex flex-col space-y-2">
        {/* Layer Provider Picker */}
        <div className="bg-white/95 backdrop-blur border border-slate-200 rounded-lg p-1.5 shadow-xl text-xs flex items-center space-x-1.5">
          <Layers className="w-4 h-4 text-cyan-400 ml-1" />
          <select
            id="select-tile-layer"
            value={activeTileProvider}
            onChange={(e) => setActiveTileProvider(e.target.value as TileProvider)}
            aria-label="Map Tile Layer Provider"
            className="bg-slate-100 text-slate-900 rounded px-2 py-1 font-medium focus:outline-none cursor-pointer border border-slate-200"
          >
            {(Object.keys(TILE_LAYERS) as TileProvider[]).map((key) => (
              <option key={key} value={key}>
                {TILE_LAYERS[key].name}
              </option>
            ))}
          </select>
        </div>

        {/* Action Buttons */}
        <div className="bg-white/95 backdrop-blur border border-slate-200 rounded-lg p-1 shadow-xl flex flex-col space-y-1">
          <button
            id="btn-center-fleet"
            onClick={handleCenterFleet}
            title="Center All Fleet Vehicles"
            className="p-2 hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded transition-colors flex items-center space-x-2 text-xs"
          >
            <Crosshair className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Center Fleet</span>
          </button>

          <button
            id="btn-toggle-geofences"
            onClick={() => setShowGeofences(!showGeofences)}
            title="Toggle Government Geofences Overlay"
            className={`p-2 rounded transition-colors flex items-center space-x-2 text-xs ${
              showGeofences ? 'bg-cyan-950/60 text-cyan-300' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {showGeofences ? <Eye className="w-4 h-4 text-cyan-400" /> : <EyeOff className="w-4 h-4 text-slate-500" />}
            <span className="hidden sm:inline">Geofences ({geofences.length})</span>
          </button>

          <button
            id="btn-measure-tool"
            onClick={() => {
              if (measuringMode) {
                clearMeasurement();
              } else {
                setMeasuringMode(true);
                setMeasurePoints([]);
              }
            }}
            title="Measure Distance between two points"
            className={`p-2 rounded transition-colors flex items-center space-x-2 text-xs ${
              measuringMode ? 'bg-amber-950/80 text-amber-300 border border-amber-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Ruler className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">{measuringMode ? 'Measuring Active' : 'Measure Distance'}</span>
          </button>
        </div>
      </div>

      {/* Measurement Active Notification Banner */}
      {measuringMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-slate-900/95 border border-cyan-700 rounded-lg px-4 py-2 shadow-2xl text-xs flex items-center space-x-3">
          <Ruler className="w-4 h-4 text-cyan-400 animate-bounce" />
          <div>
            <span className="font-semibold text-slate-900">Geodesic Ruler: </span>
            <span className="text-slate-700">
              {measurePoints.length === 0 ? 'Click map for Origin point' :
               measurePoints.length === 1 ? 'Click map for Destination point' :
               `Calculated Distance: ${measuredDistanceKm} km`}
            </span>
          </div>
          <button
            id="btn-clear-ruler"
            onClick={clearMeasurement}
            className="ml-2 text-slate-500 hover:text-slate-900 px-2 py-0.5 bg-slate-100 rounded border border-slate-200"
          >
            Reset
          </button>
        </div>
      )}

      {/* Floating Bottom Status / Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-10 bg-white/85 backdrop-blur border border-slate-200 rounded-lg p-2.5 shadow-xl text-xs text-slate-700 max-w-sm hidden md:block">
        <div className="flex items-center justify-between font-bold text-slate-700 border-b border-slate-200 pb-1.5 mb-2">
          <span>Fleet State Legend</span>
          <span className="text-[10px] text-cyan-400 font-mono">QTS ENGINE V2.4</span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Moving (&gt;5 km/h)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>Idling (Ignition ON)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <span>Parked (Ignition OFF)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
            <span className="text-red-300 font-bold">Emergency / SOS</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-fuchsia-500"></span>
            <span>Unauthorized Off-Hours</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
            <span>Offline (Buffering)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
