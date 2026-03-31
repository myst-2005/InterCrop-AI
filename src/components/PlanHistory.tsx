import React from 'react';
import { History, Calendar, MapPin, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';

interface PlanHistoryProps {
  plans: any[];
  onSelect: (plan: any) => void;
}

export default function PlanHistory({ plans, onSelect }: PlanHistoryProps) {
  if (plans.length === 0) {
    return (
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-emerald-100 text-center space-y-4">
        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
          <History className="w-8 h-8 text-emerald-300" />
        </div>
        <h3 className="text-xl font-bold text-emerald-900">No saved plans yet</h3>
        <p className="text-emerald-600">Generate your first farming plan to see it here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-emerald-900 flex items-center gap-2 px-2">
        <History className="w-6 h-6 text-emerald-600" />
        Saved Plans
      </h2>
      <div className="grid grid-cols-1 gap-4">
        {plans.map((plan, index) => (
          <motion.button
            key={plan.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onSelect(plan)}
            className="bg-white p-5 rounded-3xl shadow-md border border-emerald-50 hover:border-emerald-200 hover:shadow-lg transition-all text-left group"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2 text-emerald-600 font-bold">
                <Calendar className="w-4 h-4" />
                {new Date(plan.createdAt).toLocaleDateString()}
              </div>
              <div className="bg-emerald-50 px-3 py-1 rounded-full text-emerald-700 text-xs font-bold uppercase tracking-wider">
                {plan.landSize} Acres
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-lg">
                <MapPin className="w-4 h-4 text-emerald-400" />
                {plan.location}
              </div>
              <div className="flex items-center gap-2 text-emerald-600 font-medium">
                <TrendingUp className="w-4 h-4" />
                Est. Profit: {plan.recommendation.totalExpectedProfit}
              </div>
            </div>

            <div className="mt-4 flex gap-2 overflow-hidden">
              {plan.recommendation.crops.map((crop: any, i: number) => (
                <span key={i} className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-lg whitespace-nowrap">
                  {crop.cropName}
                </span>
              ))}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
