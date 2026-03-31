import React, { useState, useRef, useCallback } from 'react';
import { MapPin, Droplets, FlaskConical, AlertTriangle, Sprout, Camera, X, Map as MapIcon, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleMap, useJsApiLoader, Marker, Polygon, DrawingManager, Autocomplete } from '@react-google-maps/api';

const LIBRARIES: ("drawing" | "geometry" | "places")[] = ["drawing", "geometry", "places"];

interface InputFormProps {
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

export default function InputForm({ onSubmit, isLoading }: InputFormProps) {
  const [landSize, setLandSize] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [soilType, setSoilType] = useState<string>('Loamy');
  const [pH, setPH] = useState<string>('');
  const [waterAvailability, setWaterAvailability] = useState<string>('Medium');
  const [riskPreference, setRiskPreference] = useState<string>('Medium');
  const [droneView, setDroneView] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 20.5937, lng: 78.9629 }); // India center
  const [polygonPath, setPolygonPath] = useState<any[]>([]);
  const [searchResult, setSearchResult] = useState<google.maps.places.Autocomplete | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: googleMapsApiKey,
    libraries: LIBRARIES
  });

  const onPolygonComplete = useCallback((polygon: any) => {
    if (!window.google || !window.google.maps.geometry) {
      console.error("Google Maps Geometry library not loaded");
      return;
    }

    const path = polygon.getPath();
    const areaInSqMeters = window.google.maps.geometry.spherical.computeArea(path);
    const acres = (areaInSqMeters / 4046.86).toFixed(2);
    
    setLandSize(acres);
    
    const pathArray = path.getArray().map((p: any) => ({
      lat: p.lat(),
      lng: p.lng()
    }));
    setPolygonPath(pathArray);
    
    // Set location to center of polygon
    const bounds = new window.google.maps.LatLngBounds();
    path.forEach((p: any) => bounds.extend(p));
    const center = bounds.getCenter();
    const locString = `${center.lat().toFixed(6)}, ${center.lng().toFixed(6)}`;
    setLocation(locString);
    
    polygon.setMap(null); // Remove the drawing instance, we'll render our own Polygon
  }, []);

  const handleClearMap = () => {
    setPolygonPath([]);
    setLandSize('');
  };

  const onLoadAutocomplete = (autocomplete: google.maps.places.Autocomplete) => {
    setSearchResult(autocomplete);
  };

  const onPlaceChanged = () => {
    if (searchResult !== null) {
      const place = searchResult.getPlace();
      if (place.geometry && place.geometry.location) {
        const newCenter = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        };
        setMapCenter(newCenter);
        setLocation(place.formatted_address || `${newCenter.lat.toFixed(6)}, ${newCenter.lng.toFixed(6)}`);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDroneView(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalDroneView = droneView;
    
    // If no drone view uploaded, but we have a polygon, generate a static map URL
    if (!finalDroneView && polygonPath.length > 0 && googleMapsApiKey) {
      const pathStr = polygonPath.map(p => `${p.lat},${p.lng}`).join('|');
      finalDroneView = `https://maps.googleapis.com/maps/api/staticmap?size=800x400&maptype=satellite&path=color:0xffffff|weight:2|fillcolor:0xffffff22|${pathStr}|${polygonPath[0].lat},${polygonPath[0].lng}&key=${googleMapsApiKey}`;
    }

    onSubmit({
      landSize: parseFloat(landSize),
      location,
      soilType,
      pH: pH ? parseFloat(pH) : undefined,
      waterAvailability,
      riskPreference,
      droneView: finalDroneView,
      polygonPath: polygonPath.length > 0 ? polygonPath : undefined,
    });
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const newCenter = { lat: position.coords.latitude, lng: position.coords.longitude };
        setMapCenter(newCenter);
        setLocation(`${newCenter.lat.toFixed(6)}, ${newCenter.lng.toFixed(6)}`);
        setShowMap(true);
      });
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="bg-white p-6 rounded-3xl shadow-xl space-y-6 border border-emerald-100"
    >
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-emerald-900 flex items-center gap-2">
          <Sprout className="w-6 h-6 text-emerald-600" />
          Land & Soil Details
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-emerald-800 uppercase tracking-wider">Land Size (Acres)</label>
            <input
              type="number"
              required
              value={landSize}
              onChange={(e) => setLandSize(e.target.value)}
              placeholder="e.g. 5"
              className="w-full p-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl focus:border-emerald-500 focus:ring-0 transition-all text-lg"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-emerald-800 uppercase tracking-wider">Location</label>
            <div className="relative">
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City or Coordinates"
                className="w-full p-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl focus:border-emerald-500 focus:ring-0 transition-all text-lg pr-24"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <button
                  type="button"
                  onClick={handleGetLocation}
                  className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-colors"
                  title="Get GPS Location"
                >
                  <MapPin className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowMap(true)}
                  className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-colors"
                  title="Open Map Picker"
                >
                  <MapIcon className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Map Modal */}
        <AnimatePresence>
          {showMap && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-emerald-950/40 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-white w-full max-w-4xl h-[80vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col"
              >
                <div className="p-6 border-b border-emerald-100 flex items-center justify-between bg-emerald-50/50">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-bold text-emerald-900 flex items-center gap-2">
                      <MapIcon className="w-6 h-6 text-emerald-600" />
                      Map Out Your Farm
                    </h3>
                    <p className="text-emerald-600 text-sm font-medium">
                      Use the drawing tool to outline your farm boundary.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowMap(false)}
                    className="p-3 hover:bg-emerald-100 rounded-2xl transition-colors text-emerald-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="flex-1 relative bg-emerald-50/30">
                  {!googleMapsApiKey ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-4">
                      <div className="p-4 bg-amber-100 rounded-full">
                        <AlertTriangle className="w-12 h-12 text-amber-600" />
                      </div>
                      <h4 className="text-xl font-bold text-emerald-900">Google Maps API Key Missing</h4>
                      <p className="text-emerald-700 max-w-md">
                        To use the farm mapping feature, you need to provide a Google Maps API key.
                      </p>
                      <div className="bg-white p-6 rounded-2xl border-2 border-emerald-100 text-left space-y-3 shadow-sm">
                        <p className="text-sm font-semibold text-emerald-800">How to fix:</p>
                        <ol className="text-sm text-emerald-700 list-decimal list-inside space-y-2">
                          <li>Go to the <span className="font-bold">Secrets</span> panel in AI Studio.</li>
                          <li>Add a new secret named <code className="bg-emerald-100 px-1 rounded">VITE_GOOGLE_MAPS_API_KEY</code>.</li>
                          <li>Paste your API key from the Google Cloud Console.</li>
                          <li>Refresh the page to apply changes.</li>
                        </ol>
                      </div>
                    </div>
                  ) : !isLoaded ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-600 border-t-transparent"></div>
                    </div>
                  ) : loadError ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-4">
                      <AlertTriangle className="w-12 h-12 text-red-600" />
                      <h4 className="text-xl font-bold text-red-900">Map Load Error</h4>
                      <p className="text-red-700">{loadError.message}</p>
                    </div>
                  ) : (
                    <>
                      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-full max-w-md px-4">
                        <Autocomplete
                          onLoad={onLoadAutocomplete}
                          onPlaceChanged={onPlaceChanged}
                        >
                          <input
                            type="text"
                            placeholder="Search for your farm location..."
                            className="w-full p-4 bg-white border-2 border-emerald-100 rounded-2xl shadow-xl focus:border-emerald-500 focus:ring-0 transition-all text-sm"
                            onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                          />
                        </Autocomplete>
                      </div>
                      <GoogleMap
                        mapContainerStyle={{ width: '100%', height: '100%' }}
                        center={mapCenter}
                        zoom={15}
                        options={{
                          mapTypeId: 'satellite',
                          disableDefaultUI: false,
                        }}
                      >
                        <DrawingManager
                          onPolygonComplete={onPolygonComplete}
                          options={{
                            drawingControl: true,
                            drawingControlOptions: {
                              position: window.google.maps.ControlPosition.TOP_RIGHT,
                              drawingModes: [window.google.maps.drawing.OverlayType.POLYGON],
                            },
                            polygonOptions: {
                              fillColor: '#10b981',
                              fillOpacity: 0.3,
                              strokeWeight: 2,
                              strokeColor: '#059669',
                              clickable: true,
                              editable: true,
                              zIndex: 1,
                            },
                          }}
                        />
                        {polygonPath.length > 0 && (
                          <Polygon
                            path={polygonPath}
                            options={{
                              fillColor: '#10b981',
                              fillOpacity: 0.3,
                              strokeWeight: 2,
                              strokeColor: '#059669',
                            }}
                          />
                        )}
                      </GoogleMap>
                    </>
                  )}
                </div>

                <div className="p-6 bg-emerald-50 border-t border-emerald-100 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="bg-white px-6 py-3 rounded-2xl border-2 border-emerald-100 shadow-sm">
                      <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Detected Area</div>
                      <div className="text-xl font-black text-emerald-900">
                        {landSize ? `${landSize} Acres` : '---'}
                      </div>
                    </div>
                    {polygonPath.length > 0 && (
                      <button
                        onClick={handleClearMap}
                        className="text-red-500 font-bold hover:text-red-600 transition-colors flex items-center gap-1"
                      >
                        <X className="w-4 h-4" />
                        Clear Drawing
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setShowMap(false)}
                    className="px-8 py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                  >
                    Confirm Boundary
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-emerald-800 uppercase tracking-wider">Soil Type</label>
            <select
              value={soilType}
              onChange={(e) => setSoilType(e.target.value)}
              className="w-full p-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl focus:border-emerald-500 focus:ring-0 transition-all text-lg appearance-none"
            >
              {['Loamy', 'Sandy', 'Clay', 'Silty', 'Peaty', 'Saline'].map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-emerald-800 uppercase tracking-wider">Soil pH (Optional)</label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                value={pH}
                onChange={(e) => setPH(e.target.value)}
                placeholder="e.g. 6.5"
                className="w-full p-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl focus:border-emerald-500 focus:ring-0 transition-all text-lg pl-12"
              />
              <FlaskConical className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-emerald-800 uppercase tracking-wider">Water Availability</label>
            <div className="flex gap-2">
              {['Low', 'Medium', 'High'].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setWaterAvailability(level)}
                  className={`flex-1 p-4 rounded-2xl border-2 transition-all flex items-center justify-center gap-2 ${
                    waterAvailability === level
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg'
                      : 'bg-emerald-50 border-emerald-100 text-emerald-800 hover:border-emerald-300'
                  }`}
                >
                  <Droplets className="w-5 h-5" />
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-emerald-800 uppercase tracking-wider">Risk Preference</label>
            <div className="flex gap-2">
              {['Low', 'Medium', 'High'].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setRiskPreference(level)}
                  className={`flex-1 p-4 rounded-2xl border-2 transition-all flex items-center justify-center gap-2 ${
                    riskPreference === level
                      ? 'bg-orange-600 border-orange-600 text-white shadow-lg'
                      : 'bg-orange-50 border-orange-100 text-orange-800 hover:border-orange-300'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5" />
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-emerald-800 uppercase tracking-wider flex items-center gap-2">
            <Camera className="w-4 h-4" />
            Drone View / Land Image (Optional)
          </label>
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`relative w-full h-48 rounded-3xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden ${
              droneView ? 'border-emerald-500 bg-emerald-50' : 'border-emerald-200 bg-emerald-50/50 hover:border-emerald-400'
            }`}
          >
            <AnimatePresence mode="wait">
              {droneView ? (
                <motion.div 
                  key="preview"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-full h-full relative"
                >
                  <img src={droneView} alt="Drone view" className="w-full h-full object-cover" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDroneView(null);
                    }}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              ) : (
                <motion.div 
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center space-y-2"
                >
                  <Camera className="w-10 h-10 text-emerald-300 mx-auto" />
                  <p className="text-emerald-600 font-medium">Click to upload drone view</p>
                  <p className="text-emerald-400 text-xs">Supports JPG, PNG</p>
                </motion.div>
              )}
            </AnimatePresence>
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className={`w-full p-6 rounded-3xl text-xl font-bold text-white shadow-2xl transition-all transform active:scale-95 ${
          isLoading
            ? 'bg-emerald-300 cursor-not-allowed'
            : 'bg-emerald-600 hover:bg-emerald-700 hover:-translate-y-1'
        }`}
      >
        {isLoading ? (
          <div className="flex items-center justify-center gap-3">
            <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
            Analyzing Data...
          </div>
        ) : (
          'Generate Farming Plan'
        )}
      </button>
    </motion.form>
  );
}
