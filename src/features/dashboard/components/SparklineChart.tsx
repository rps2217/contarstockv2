/**
 * SparklineChart - Mini gráfico de tendencias para el dashboard
 * Muestra una línea de tendencia sin ejes ni labels
 */

import React, { memo } from 'react';
import { ResponsiveContainer, LineChart, Line } from 'recharts';

interface SparklineChartProps {
  data: number[];
  color?: string;
  height?: number;
  isDark?: boolean;
  showDot?: boolean;
}

export const SparklineChart: React.FC<SparklineChartProps> = memo(({
  data,
  color = '#3b82f6',
  height = 32,
  isDark = true,
  showDot = false
}) => {
  if (!data || data.length === 0) {
    return (
      <div 
        className={`w-full ${isDark ? 'bg-neutral-800' : 'bg-neutral-100'} rounded animate-pulse`} 
        style={{ height }}
      />
    );
  }

  // Convertir array de números a formato para recharts
  const chartData = data.map((value, index) => ({ value, index }));

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={showDot}
            isAnimationActive={true}
            animationDuration={800}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

SparklineChart.displayName = 'SparklineChart';

export default SparklineChart;