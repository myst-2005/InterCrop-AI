import React, { useMemo } from 'react';
import { TrendingUp, AlertTriangle, Info, RefreshCw, Save, ChevronLeft, Map as MapIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { GoogleMap, useJsApiLoader, Polygon } from '@react-google-maps/api';
import polygonClipping from 'polygon-clipping';
import { RecommendationResponse } from '../services/geminiService';
import CropCard from './CropCard';
import LandSplitChart from './LandSplitChart';

const LIBRARIES: ("drawing" | "geometry" | "places")[] = ["drawing", "geometry", "places"];

interface DashboardProps {
  data: RecommendationResponse;
  onRegenerate: () => void;
  onSave: () => void;
  onBack: () => void;
  isSaving: boolean;
  droneView?: string | null;
  polygonPath?: { lat: number; lng: number }[] | null;
}

export default function Dashboard({ data, onRegenerate, onSave, onBack, isSaving, droneView, polygonPath }: DashboardProps) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: LIBRARIES
  });

  const mapCenter = useMemo(() => {
    if (polygonPath && polygonPath.length > 0) {
      const lats = polygonPath.map(p => p.lat);
      const lngs = polygonPath.map(p => p.lng);
      return {
        lat: (Math.min(...lats) + Math.max(...lats)) / 2,
        lng: (Math.min(...lngs) + Math.max(...lngs)) / 2
      };
    }
    return { lat: 20.5937, lng: 78.9629 };
  }, [polygonPath]);

  const cropStrips = useMemo(() => {
    if (!polygonPath || polygonPath.length === 0) return [];
    
    const lats = polygonPath.map(p => p.lat);
    const lngs = polygonPath.map(p => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const latRange = maxLat - minLat;
    
    // Convert polygonPath to polygon-clipping format [[lng, lat]]
    const farmPoly: [number, number][][] = [
      polygonPath.map(p => [p.lng, p.lat])
    ];
    // Close the loop if not closed
    if (farmPoly[0][0][0] !== farmPoly[0][farmPoly[0].length - 1][0] || 
        farmPoly[0][0][1] !== farmPoly[0][farmPoly[0].length - 1][1]) {
      farmPoly[0].push([...farmPoly[0][0]]);
    }
    
    let currentLat = maxLat;
    return data.crops.map((crop) => {
      const height = (crop.allocationPercentage / 100) * latRange;
      const nextLat = currentLat - height;
      
      // Create a strip rectangle that is wider than the polygon
      const stripRect: [number, number][][] = [[
        [minLng - 0.01, currentLat],
        [maxLng + 0.01, currentLat],
        [maxLng + 0.01, nextLat],
        [minLng - 0.01, nextLat],
        [minLng - 0.01, currentLat]
      ]];
      
      // Intersect the strip with the farm polygon
      const intersection = polygonClipping.intersection(farmPoly, stripRect);
      
      // Convert back to Google Maps format [{lat, lng}]
      // intersection is MultiPolygon: [Polygon, Polygon, ...]
      // where Polygon is [Ring, Ring, ...]
      const paths = intersection.map(poly => 
        poly[0].map(coord => ({ lat: coord[1], lng: coord[0] }))
      );
      
      const result = {
        paths,
        color: crop.color,
        name: crop.cropName
      };
      
      currentLat = nextLat;
      return result;
    });
  }, [polygonPath, data.crops]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onBack}
          className="p-4 bg-white rounded-2xl shadow-md border border-emerald-50 hover:bg-emerald-50 transition-all text-emerald-600 font-bold flex items-center gap-2"
        >
          <ChevronLeft className="w-6 h-6" />
          Back to Inputs
        </button>
        <div className="flex gap-4">
          <button
            onClick={onRegenerate}
            className="p-4 bg-white rounded-2xl shadow-md border border-emerald-50 hover:bg-emerald-50 transition-all text-emerald-600 font-bold flex items-center gap-2"
          >
            <RefreshCw className="w-6 h-6" />
            Regenerate
          </button>
          <button
            onClick={onSave}
            disabled={isSaving}
            className={`p-4 rounded-2xl shadow-md font-bold flex items-center gap-2 transition-all ${
              isSaving
                ? 'bg-emerald-300 text-white cursor-not-allowed'
                : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:-translate-y-1'
            }`}
          >
            <Save className="w-6 h-6" />
            {isSaving ? 'Saving...' : 'Save Plan'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-emerald-900 p-8 rounded-[40px] shadow-2xl text-white relative overflow-hidden"
          >
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-3 text-emerald-300 font-bold tracking-widest uppercase text-sm">
                <TrendingUp className="w-5 h-5" />
                Overall Strategy
              </div>
              <h1 className="text-4xl md:text-5xl font-black leading-tight">
                Est. Profit: <span className="text-emerald-400">{data.totalExpectedProfit}</span>
              </h1>
              <div className="flex flex-wrap gap-4">
                <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-orange-400" />
                  <div className="text-left">
                    <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Risk Profile</div>
                    <div className="font-bold">{data.overallRisk}</div>
                  </div>
                </div>
              </div>
              <p className="text-emerald-100/80 text-lg leading-relaxed italic border-l-4 border-emerald-400 pl-6 py-2">
                "{data.summary}"
              </p>
              {data.distributionAdvice && (
                <div className="mt-6 p-6 bg-white/5 rounded-3xl border border-white/10 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-widest">
                    <MapIcon className="w-4 h-4" />
                    Land Distribution Guide
                  </div>
                  <p className="text-emerald-50 text-sm leading-relaxed">
                    {data.distributionAdvice}
                  </p>
                </div>
              )}
            </div>
            <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl" />
            <div className="absolute -left-20 -top-20 w-60 h-60 bg-emerald-400/5 rounded-full blur-3xl" />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.crops.map((crop, index) => (
              <CropCard key={index} crop={crop} index={index} />
            ))}
          </div>
        </div>

        <div className="space-y-8">
          {droneView && (
            <div className="bg-white p-4 rounded-3xl shadow-xl border border-emerald-100 space-y-3">
              <h3 className="text-lg font-bold text-emerald-900 flex items-center gap-2">
                <Info className="w-5 h-5 text-emerald-600" />
                Drone View Analysis
              </h3>
              <div className="aspect-video rounded-2xl overflow-hidden border border-emerald-50 relative group">
                {polygonPath && isLoaded ? (
                  <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '100%' }}
                    center={mapCenter}
                    zoom={16}
                    options={{
                      mapTypeId: 'satellite',
                      disableDefaultUI: true,
                      gestureHandling: 'cooperative'
                    }}
                  >
                    {/* Draw the clipped crop polygons */}
                    {cropStrips.map((strip, idx) => (
                      <Polygon
                        key={idx}
                        paths={strip.paths}
                        options={{
                          fillColor: strip.color,
                          fillOpacity: 0.6,
                          strokeWeight: 0,
                          clickable: false,
                        }}
                      />
                    ))}
                    {/* Draw the main boundary outline */}
                    <Polygon
                      path={polygonPath}
                      options={{
                        fillColor: '#000000',
                        fillOpacity: 0,
                        strokeColor: '#ffffff',
                        strokeWeight: 2,
                        zIndex: 10
                      }}
                    />
                  </GoogleMap>
                ) : (
                  <img src={droneView || ''} alt="Drone view" className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4 pointer-events-none">
                  <p className="text-white text-xs font-medium">Interactive Allocation Overlay</p>
                </div>
              </div>
              
              <div className="space-y-3 pt-2">
                <div className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Land Allocation Map</div>
                <div className="grid grid-cols-1 gap-2">
                  {data.crops.map((crop, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full shadow-sm" 
                          style={{ backgroundColor: crop.color }}
                        />
                        <span className="text-sm font-bold text-emerald-900">{crop.cropName}</span>
                      </div>
                      <span className="text-sm font-black text-emerald-600">{crop.allocationPercentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <LandSplitChart crops={data.crops} />
          
          <div className="bg-white p-6 rounded-3xl shadow-xl border border-emerald-100 space-y-4">
            <h3 className="text-xl font-bold text-emerald-900 flex items-center gap-2">
              <Info className="w-6 h-6 text-emerald-600" />
              Quick Actions
            </h3>
            <div className="space-y-3">
              <button className="w-full p-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-2xl transition-all text-left flex items-center justify-between group">
                Download PDF Report
                <TrendingUp className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-all" />
              </button>
              <button className="w-full p-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-2xl transition-all text-left flex items-center justify-between group">
                Share with Consultant
                <TrendingUp className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-all" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
