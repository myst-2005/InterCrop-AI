import React from 'react';
import { Clock, TrendingUp, AlertCircle, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { CropRecommendation } from '../services/geminiService';

interface CropCardProps {
  crop: CropRecommendation;
  index: number;
}

const CropCard: React.FC<CropCardProps> = ({ crop, index }) => {
  const getRiskColor = (score: number) => {
    if (score <= 3) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    if (score <= 7) return 'text-orange-600 bg-orange-50 border-orange-100';
    return 'text-red-600 bg-red-50 border-red-100';
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white p-6 rounded-3xl shadow-lg border border-emerald-50 hover:shadow-xl transition-all group"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded-full shadow-sm" 
              style={{ backgroundColor: crop.color }}
            />
            <h3 className="text-2xl font-bold text-emerald-900 group-hover:text-emerald-600 transition-colors">
              {crop.cropName}
            </h3>
          </div>
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-lg">
            <TrendingUp className="w-5 h-5" />
            {crop.allocationPercentage}% Land Allocation
          </div>
        </div>
        <div className={`px-4 py-2 rounded-2xl border-2 font-bold flex items-center gap-2 ${getRiskColor(crop.riskScore)}`}>
          <AlertCircle className="w-5 h-5" />
          Risk: {crop.riskScore}/10
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
          <div className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Duration
          </div>
          <div className="text-emerald-900 font-bold">{crop.duration}</div>
        </div>
        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
          <div className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Est. Profit
          </div>
          <div className="text-emerald-900 font-bold">{crop.profitEstimate}</div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1">
          <Info className="w-3 h-3" /> Why this crop?
        </div>
        <p className="text-emerald-800 leading-relaxed text-sm italic">
          "{crop.reasoning}"
        </p>
      </div>

      <div className="mt-4 pt-4 border-t border-emerald-50 flex items-center justify-between text-sm">
        <span className="text-emerald-600 font-medium">Expected Yield:</span>
        <span className="text-emerald-900 font-bold">{crop.expectedYield}</span>
      </div>
    </motion.div>
  );
};

export default CropCard;
