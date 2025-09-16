'use client';

import { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { defiLlamaAPI, PoolHistoricalPoint } from '@/lib/defi-api';

interface PoolChartProps {
  poolId: string;
  chain: string;
  chartType: 'tvl' | 'apy' | 'volume' | 'fees';
  title: string;
  color: string;
  days?: number;
}


export default function PoolChart({ poolId, chain, chartType, title, color, days = 30 }: PoolChartProps) {
  const [data, setData] = useState<PoolHistoricalPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeWindow, setSelectedTimeWindow] = useState(days);
  const [isLoadingChartData, setIsLoadingChartData] = useState(false);

  // Update selectedTimeWindow when days prop changes
  useEffect(() => {
    setSelectedTimeWindow(days);
  }, [days]);

  const loadChartData = useCallback(async () => {
    // Prevent multiple concurrent calls
    if (isLoadingChartData) {
      console.log('Chart data already loading, skipping...');
      return;
    }
    
    try {
      setIsLoadingChartData(true);
      setLoading(true);
      setError(null);
      
      console.log(`Loading chart data: poolId=${poolId}, chartType=${chartType}, days=${selectedTimeWindow}`);
      
      const response = await defiLlamaAPI.getPoolTimeSeries(poolId, selectedTimeWindow);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      if (response.data) {
        console.log(`Loaded ${response.data.length} data points for ${chartType} chart`);
        setData(response.data);
      } else {
        setData([]);
      }
    } catch (err) {
      console.error(`Failed to load ${chartType} chart data:`, err);
      setError(err instanceof Error ? err.message : 'Failed to load chart data');
    } finally {
      setLoading(false);
      setIsLoadingChartData(false);
    }
  }, [poolId, chartType, selectedTimeWindow, isLoadingChartData]);

  useEffect(() => {
    loadChartData();
  }, [loadChartData]);

  const getValueFromDataPoint = (point: PoolHistoricalPoint): number | null => {
    switch (chartType) {
      case 'tvl':
        return point.tvlUsd || null;
      case 'apy':
        return point.apy || null;
      case 'volume':
        return point.volumeUsd1d || null;
      case 'fees':
        return point.feesUsd1d || null;
      default:
        return null;
    }
  };

  const formatValue = (value: number): string => {
    switch (chartType) {
      case 'tvl':
      case 'volume':
      case 'fees':
        if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
        if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
        if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
        return `$${value.toFixed(2)}`;
      case 'apy':
        return `${value.toFixed(2)}%`;
      default:
        return value.toString();
    }
  };

  const formatXAxisLabel = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const chartData = data.map(point => ({
    date: point.date,
    value: getValueFromDataPoint(point),
    formattedDate: formatXAxisLabel(point.date)
  })).filter(point => point.value !== null);

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="mb-3">
          <h5 className="text-gray-300 font-medium text-sm">{title}</h5>
        </div>
        <div className="h-48 flex items-center justify-center">
          <div className="animate-pulse text-gray-500 text-sm">Loading chart data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="mb-3">
          <h5 className="text-gray-300 font-medium text-sm">{title}</h5>
        </div>
        <div className="h-48 flex items-center justify-center">
          <div className="text-red-400 text-sm text-center">
            <div>Failed to load chart</div>
            <div className="text-xs text-gray-500 mt-1">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="mb-3">
          <h5 className="text-gray-300 font-medium text-sm">{title}</h5>
        </div>
        <div className="h-48 flex items-center justify-center">
          <div className="text-gray-500 text-sm">No data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="mb-3">
        <h5 className="text-gray-300 font-medium text-sm">{title}</h5>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="formattedDate" 
              tick={{ fill: '#9CA3AF', fontSize: 10 }}
              stroke="#6B7280"
            />
            <YAxis 
              tick={{ fill: '#9CA3AF', fontSize: 10 }}
              stroke="#6B7280"
              tickFormatter={formatValue}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#F3F4F6'
              }}
              formatter={(value: number) => [formatValue(value), title]}
              labelStyle={{ color: '#9CA3AF' }}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: color }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}