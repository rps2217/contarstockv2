/**
 * SparklineChart - Mini gráfico de tendencias para el dashboard
 * Muestra una línea de tendencia sin ejes ni labels
 */

import React, { memo, useState, useEffect } from 'react';

interface SparklineChartProps {
  data: number[];
  color?: string;
  height?: number;
  isDark?: boolean;
  showDot?: boolean;
}

// Componente interno que usa recharts (lazy loaded)
const SparklineChartInner = memo(({
  data,
  color,
  height,
  isDark,
  showDot
}: SparklineChartProps) => {
  const [RechartsComponents, setRechartsComponents] = useState<{
    ResponsiveContainer: any;
    LineChart: any;
    Line: any;
  } | null>(null);

  useEffect(() => {
    // Lazy load de recharts
    Promise.all([
      import('recharts').then(m => ({ 
        ResponsiveContainer: m.ResponsiveContainer, 
        LineChart: m.LineChart, 
        Line: m.Line 
      }))
    ]).then(([components]) => {
      setRechartsComponents(components);
    });
  }, []);

  if (!RechartsComponents) {
    return (
      <div 
        className={`w-full ${isDark ? 'bg-neutral-800' : 'bg-neutral-100'} rounded animate-pulse`} 
        style={{ height }} 
      />
    );
  }

  const { ResponsiveContainer, LineChart, Line } = RechartsComponents;
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

SparklineChartInner.displayName = 'SparklineChartInner';

// Componente principal con fallback
export const SparklineChart: React.FC<SparklineChartProps> = memo((props) => {
  if (!props.data || props.data.length === 0) {
    return (
      <div 
        className={`w-full ${props.isDark ? 'bg-neutral-800' : 'bg-neutral-100'} rounded animate-pulse`} 
        style={{ height: props.height }} 
      />
    );
  }

  return <SparklineChartInner {...props} />;
});

SparklineChart.displayName = 'SparklineChart';

export default SparklineChart;