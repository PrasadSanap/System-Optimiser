import { useEffect, useState } from 'react';
import tauriApi from '../services/tauri';
import { getImpactIcon, getImpactColor } from '../utils/format';
import type { OptimizationSuggestion } from '../types';

export function Optimizations() {
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    try {
      const data = await tauriApi.optimization.getSuggestions();
      setSuggestions(data);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
      setIsLoading(false);
    }
  };

  const handleApply = async (id: string) => {
    try {
      await tauriApi.optimization.applyOptimization({
        optimization_id: id,
        confirm: true,
      });
      // Refresh suggestions
      fetchSuggestions();
    } catch (err) {
      console.error('Failed to apply optimization:', err);
    }
  };

  const filteredSuggestions = suggestions.filter((s) => {
    if (filter === 'all') return true;
    return s.category === filter;
  });

  const categories = ['all', 'startup', 'disk', 'memory', 'services', 'other'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading optimizations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Optimization Suggestions</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {suggestions.length} suggestions available
          </p>
        </div>
        <button
          onClick={fetchSuggestions}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
        >
          Refresh AI
        </button>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-4 py-2 rounded-lg capitalize transition-colors ${
              filter === cat
                ? 'bg-primary text-white'
                : 'bg-card border border-border hover:border-primary'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Suggestions List */}
      <div className="space-y-4">
        {filteredSuggestions.length === 0 ? (
          <div className="text-center py-12 bg-card border border-border rounded-lg">
            <span className="text-6xl mb-4 block">🎉</span>
            <h3 className="text-xl font-semibold mb-2">All Optimized!</h3>
            <p className="text-gray-500 dark:text-gray-400">
              No optimization suggestions available at this time.
            </p>
          </div>
        ) : (
          filteredSuggestions.map((suggestion) => (
            <OptimizationCard
              key={suggestion.id}
              suggestion={suggestion}
              onApply={handleApply}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface OptimizationCardProps {
  suggestion: OptimizationSuggestion;
  onApply: (id: string) => void;
}

function OptimizationCard({ suggestion, onApply }: OptimizationCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const impactColors = {
    low: 'border-green-500 bg-green-50 dark:bg-green-900/10',
    medium: 'border-amber-500 bg-amber-50 dark:bg-amber-900/10',
    high: 'border-red-500 bg-red-50 dark:bg-red-900/10',
  };

  const riskColors = {
    safe: 'text-green-600 dark:text-green-400',
    moderate: 'text-amber-600 dark:text-amber-400',
    advanced: 'text-red-600 dark:text-red-400',
  };

  return (
    <div className={`border-l-4 ${impactColors[suggestion.impact]} bg-card rounded-lg p-6`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-3 flex-1">
          <span className="text-3xl">{getImpactIcon(suggestion.impact)}</span>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="text-lg font-semibold">{suggestion.title}</h3>
              <span className={`text-xs font-medium ${getImpactColor(suggestion.impact)}`}>
                {suggestion.impact.toUpperCase()} IMPACT
              </span>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-3">{suggestion.description}</p>
            
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <span className="text-gray-500 dark:text-gray-400">Category:</span>
                <span className="font-medium capitalize">{suggestion.category}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-500 dark:text-gray-400">Risk:</span>
                <span className={`font-medium capitalize ${riskColors[suggestion.risk_level]}`}>
                  {suggestion.risk_level}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-500 dark:text-gray-400">Restart:</span>
                <span className="font-medium">{suggestion.requires_restart ? 'Yes' : 'No'}</span>
              </div>
              {suggestion.ai_confidence && (
                <div className="flex items-center space-x-2">
                  <span className="text-gray-500 dark:text-gray-400">AI Confidence:</span>
                  <span className="font-medium">{(suggestion.ai_confidence * 100).toFixed(0)}%</span>
                </div>
              )}
            </div>

            {suggestion.estimated_improvement && (
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <span className="text-sm text-blue-800 dark:text-blue-200">
                  💡 Estimated improvement: {suggestion.estimated_improvement}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-primary hover:underline"
        >
          {showDetails ? 'Hide Details' : 'Learn More'}
        </button>
        
        <div className="flex space-x-2">
          <button
            className="px-4 py-2 border border-border rounded-lg hover:bg-background transition-colors"
          >
            Dismiss
          </button>
          <button
            onClick={() => onApply(suggestion.id)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
          >
            Apply
          </button>
        </div>
      </div>

      {showDetails && (
        <div className="mt-4 pt-4 border-t border-border">
          <h4 className="font-semibold mb-2">Additional Information</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
            <li>This optimization can be rolled back if needed</li>
            <li>Changes will take effect {suggestion.requires_restart ? 'after restart' : 'immediately'}</li>
            <li>Risk level: {suggestion.risk_level} - suitable for {suggestion.risk_level === 'safe' ? 'all users' : suggestion.risk_level === 'moderate' ? 'experienced users' : 'advanced users only'}</li>
          </ul>
        </div>
      )}
    </div>
  );
}

// Made with Bob
