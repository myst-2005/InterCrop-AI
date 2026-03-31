import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { CropRecommendation } from '../services/geminiService';

interface LandSplitChartProps {
  crops: CropRecommendation[];
}

export default function LandSplitChart({ crops }: LandSplitChartProps) {
  const data = crops.map((crop) => ({
    name: crop.cropName,
    value: crop.allocationPercentage,
  }));

  return (
    <div className="bg-white p-6 rounded-3xl shadow-xl border border-emerald-100 h-[400px]">
      <h2 className="text-2xl font-bold text-emerald-900 mb-4 flex items-center gap-2">
        Land Allocation Split
      </h2>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
          >
            {crops.map((crop, index) => (
              <Cell key={`cell-${index}`} fill={crop.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
            itemStyle={{ fontWeight: 'bold' }}
          />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            formatter={(value) => <span className="text-emerald-900 font-bold">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
