import React from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ChartData {
  name: string;
  "Pendapatan Kotor": number;
  "Pendapatan Bersih": number;
}

interface IncomeChartProps {
  data: ChartData[];
  chartType: 'bar' | 'line';
}

const IncomeChart: React.FC<IncomeChartProps> = ({ data, chartType }) => {
  const formatYAxis = (tickItem: number) => {
    if (tickItem >= 1000000) {
      return `${(tickItem / 1000000).toFixed(1)}M`;
    }
    if (tickItem >= 1000) {
      return `${(tickItem / 1000).toFixed(0)}K`;
    }
    return tickItem.toString();
  };
    
  const commonChartProps = {
    data: data,
    margin: {
        top: 5,
        right: 20,
        left: 20,
        bottom: 5,
      },
  };

  return (
    <div className="w-full h-80 bg-white p-4 rounded-lg shadow">
      <ResponsiveContainer width="100%" height="100%">
        {chartType === 'bar' ? (
            <BarChart {...commonChartProps}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} tickFormatter={formatYAxis} />
              <Tooltip 
                formatter={(value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(value)}
                cursor={{ fill: '#f5f3ff' }}
              />
              <Legend />
              <Bar dataKey="Pendapatan Kotor" fill="#a78bfa" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Pendapatan Bersih" fill="#6d28d9" radius={[4, 4, 0, 0]} />
            </BarChart>
        ) : (
            <LineChart {...commonChartProps}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} tickFormatter={formatYAxis} />
                <Tooltip 
                    formatter={(value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(value)}
                    cursor={{ stroke: '#c4b5fd', strokeWidth: 1 }}
                />
                <Legend />
                <Line type="monotone" dataKey="Pendapatan Kotor" stroke="#a78bfa" strokeWidth={2} activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="Pendapatan Bersih" stroke="#6d28d9" strokeWidth={2} activeDot={{ r: 8 }}/>
            </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};

export default IncomeChart;