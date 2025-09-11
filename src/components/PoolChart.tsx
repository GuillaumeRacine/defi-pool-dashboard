/**
 * Pool Chart Component
 * Historical data visualization with interactive features
 */

'use client';

import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import { PoolTimeseriesPoint } from '@/types/pool';

interface PoolChartProps {
  data: PoolTimeseriesPoint[];
  title?: string;
}

type MetricType = 'tvl_usd' | 'apy' | 'volume_24h' | 'fees_24h';

export default function PoolChart({ data, title = "Pool Metrics" }: PoolChartProps) {
  const [selectedMetrics, setSelectedMetrics] = useState<Set<MetricType>>(new Set(['tvl_usd']));
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  // Filter data based on time range
  const filterDataByTimeRange = (data: PoolTimeseriesPoint[]) => {
    if (timeRange === 'all') return data;
    
    const now = new Date();
    const daysAgo = {
      '7d': 7,
      '30d': 30,
      '90d': 90
    }[timeRange];
    
    const cutoffDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
    
    return data.filter(point => {
      const pointDate = parseISO(point.date);
      return pointDate >= cutoffDate;
    });
  };

  const filteredData = filterDataByTimeRange(data);

  const toggleMetric = (metric: MetricType) => {
    const newMetrics = new Set(selectedMetrics);
    if (newMetrics.has(metric)) {
      newMetrics.delete(metric);
    } else {
      newMetrics.add(metric);
    }
    setSelectedMetrics(newMetrics);
  };

  const formatValue = (value: number, metric: MetricType) => {
    switch (metric) {
      case 'tvl_usd':
      case 'volume_24h':
      case 'fees_24h':
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

  const getMetricColor = (metric: MetricType) => {
    const colors = {
      tvl_usd: '#3B82F6',
      apy: '#10B981',
      volume_24h: '#F59E0B',
      fees_24h: '#8B5CF6'
    };
    return colors[metric];
  };

  const getMetricLabel = (metric: MetricType) => {
    const labels = {
      tvl_usd: 'Total Value Locked',
      apy: 'APY',
      volume_24h: '24h Volume',
      fees_24h: '24h Fees'
    };
    return labels[metric];
  };

  // Check which metrics have data
  const availableMetrics = (['tvl_usd', 'apy', 'volume_24h', 'fees_24h'] as MetricType[])
    .filter(metric => filteredData.some(point => point[metric] != null));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">
            {format(parseISO(label), 'MMM dd, yyyy')}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatValue(entry.value, entry.dataKey)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (filteredData.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <p>No data available for the selected time range</p>
            <p className="text-sm mt-2">Try selecting a different time period</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className="text-sm text-gray-500">
          {filteredData.length} data points
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 mb-6">
        {/* Time Range Selector */}
        <div className="flex border border-gray-300 rounded-lg overflow-hidden">
          {(['7d', '30d', '90d', 'all'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-sm ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {range.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Metric Toggles */}
        <div className="flex flex-wrap gap-2">
          {availableMetrics.map((metric) => (
            <button
              key={metric}
              onClick={() => toggleMetric(metric)}
              className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
                selectedMetrics.has(metric)
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {getMetricLabel(metric)}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filteredData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => format(parseISO(value), 'MMM dd')}
              stroke="#6b7280"
              fontSize={12}
            />
            <YAxis
              stroke="#6b7280"
              fontSize={12}
              tickFormatter={(value) => {
                if (selectedMetrics.has('apy') && selectedMetrics.size === 1) {
                  return `${value}%`;
                }
                if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
                if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
                if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
                return `$${value}`;
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {Array.from(selectedMetrics).map((metric) => (
              <Line
                key={metric}
                type="monotone"
                dataKey={metric}
                name={getMetricLabel(metric)}
                stroke={getMetricColor(metric)}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Data Quality Indicator */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex justify-between items-center text-sm text-gray-500">
          <span>
            Data range: {format(parseISO(filteredData[0].date), 'MMM dd, yyyy')} - {format(parseISO(filteredData[filteredData.length - 1].date), 'MMM dd, yyyy')}
          </span>
          <span>
            Last updated: {format(parseISO(filteredData[filteredData.length - 1].date), 'MMM dd, yyyy')}
          </span>
        </div>
      </div>
    </div>
  );
}