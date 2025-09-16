'use client';

import { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { defiLlamaAPI, TokenHistoricalPoint } from '@/lib/defi-api';

interface TokenChartProps {
  tokenSymbol: string;
  title: string;
  color: string;
  days?: number;
}

const TIME_WINDOWS = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: '1Y', days: 365 },
  { label: '3Y', days: 1095 },
  { label: 'Max', days: 1460 } // ~4 years, which should work reliably
];

export default function TokenChart({ tokenSymbol, title, color, days = 30 }: TokenChartProps) {
  const [data, setData] = useState<TokenHistoricalPoint[]>([]);
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
      console.log('Token chart data already loading, skipping...');
      return;
    }
    
    try {
      setIsLoadingChartData(true);
      setLoading(true);
      setError(null);
      
      console.log(`Loading token chart data: ${tokenSymbol}, days=${selectedTimeWindow}`);
      
      const response = await defiLlamaAPI.getTokenHistoricalData(tokenSymbol, selectedTimeWindow);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      if (response.data) {
        console.log(`Loaded ${response.data.length} price points for ${tokenSymbol}`);
        setData(response.data);
      } else {
        setData([]);
      }
    } catch (err) {
      console.error(`Failed to load ${tokenSymbol} price data:`, err);
      setError(err instanceof Error ? err.message : 'Failed to load price data');
    } finally {
      setLoading(false);
      setIsLoadingChartData(false);
    }
  }, [tokenSymbol, selectedTimeWindow, isLoadingChartData]);

  useEffect(() => {
    loadChartData();
  }, [loadChartData]);

  const formatPrice = (price: number): string => {
    if (price >= 1000) {
      return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$${price.toFixed(4)}`;
  };

  const formatXAxisLabel = (timestamp: number): string => {
    const date = new Date(timestamp);
    if (selectedTimeWindow <= 7) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (selectedTimeWindow <= 90) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    }
  };

  const chartData = data.map(point => ({
    timestamp: point.timestamp,
    price: point.price,
    formattedDate: formatXAxisLabel(point.timestamp)
  }));

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex justify-between items-center mb-3">
          <h5 className="text-gray-300 font-medium text-sm">{title}</h5>
          <div className="flex gap-1">
            {TIME_WINDOWS.map((window) => (
              <button
                key={window.days}
                disabled
                className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-500 cursor-not-allowed"
              >
                {window.label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-48 flex items-center justify-center">
          <div className="animate-pulse text-gray-500 text-sm">Loading price data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex justify-between items-center mb-3">
          <h5 className="text-gray-300 font-medium text-sm">{title}</h5>
          <div className="flex gap-1">
            {TIME_WINDOWS.map((window) => (
              <button
                key={window.days}
                onClick={(e) => {
                  e.stopPropagation();
                  console.log(`Retry loading token: ${window.label} (${window.days} days)`);
                  setSelectedTimeWindow(window.days);
                }}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  selectedTimeWindow === window.days
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {window.label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-48 flex items-center justify-center">
          <div className="text-red-400 text-sm text-center">
            <div>Failed to load price chart</div>
            <div className="text-xs text-gray-500 mt-1">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex justify-between items-center mb-3">
          <h5 className="text-gray-300 font-medium text-sm">{title}</h5>
          <div className="flex gap-1">
            {TIME_WINDOWS.map((window) => (
              <button
                key={window.days}
                onClick={(e) => {
                  e.stopPropagation();
                  console.log(`Retry loading token (no data): ${window.label} (${window.days} days)`);
                  setSelectedTimeWindow(window.days);
                }}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  selectedTimeWindow === window.days
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {window.label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-48 flex items-center justify-center">
          <div className="text-gray-500 text-sm">No price data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex justify-between items-center mb-3">
        <h5 className="text-gray-300 font-medium text-sm">{title}</h5>
        <div className="flex gap-1">
          {TIME_WINDOWS.map((window) => (
            <button
              key={window.days}
              onClick={(e) => {
                e.stopPropagation(); // Prevent parent card from collapsing
                console.log(`Token time window clicked: ${window.label} (${window.days} days), current: ${selectedTimeWindow}`);
                setSelectedTimeWindow(window.days);
              }}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                selectedTimeWindow === window.days
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {window.label}
            </button>
          ))}
        </div>
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
              tickFormatter={formatPrice}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#F3F4F6'
              }}
              formatter={(value: number) => [formatPrice(value), 'Price']}
              labelStyle={{ color: '#9CA3AF' }}
            />
            <Line 
              type="monotone" 
              dataKey="price" 
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