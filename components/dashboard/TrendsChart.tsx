
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ProductivityPoint } from '../../services/statsService';

interface Props {
 data: ProductivityPoint[];
}

export const TrendsChart: React.FC<Props> = ({ data }) => {
 if (!data || data.length === 0) return null;

 return (
 <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 h-64 w-full">
 <div className="flex justify-between items-center mb-6">
 <div>
 <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Flujo de Trabajo</h3>
 <p className="text-[10px] text-slate-400 font-bold uppercase">Items procesados por hora</p>
 </div>
 <div className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-[10px] font-black uppercase">En Vivo</div>
 </div>
 <div className="h-40 w-full">
 <ResponsiveContainer width="100%" height="100%">
 <AreaChart data={data}>
 <defs>
 <linearGradient id="colorItems" x1="0" y1="0" x2="0" y2="1">
 <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
 <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
 </linearGradient>
 </defs>
 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
 <XAxis 
 dataKey="time" 
 axisLine={false} 
 tickLine={false} 
 tick={{fontSize: 9, fontWeight: 700, fill: '#94a3b8'}}
 interval="preserveStartEnd"
 />
 <YAxis hide domain={[0, 'auto']} />
 <Tooltip 
 contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }}
 itemStyle={{ color: '#3b82f6' }}
 />
 <Area 
 type="monotone" 
 dataKey="items" 
 stroke="#3b82f6" 
 strokeWidth={3}
 fillOpacity={1} 
 fill="url(#colorItems)" 
 animationDuration={1500}
 />
 </AreaChart>
 </ResponsiveContainer>
 </div>
 </div>
 );
};
