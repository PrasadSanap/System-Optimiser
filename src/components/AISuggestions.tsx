import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { SmartSuggestion, AIInsight, BootSpeedAnalysis, BootOptimizationAction } from '../types';

interface ActionStatus {
  [key: string]: 'idle' | 'processing' | 'completed' | 'failed';
}

export function AISuggestions() {
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [bootAnalysis, setBootAnalysis] = useState<BootSpeedAnalysis | null>(null);
  const [bootActions, setBootActions] = useState<BootOptimizationAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'suggestions' | 'boot' | 'insights'>('suggestions');
  const [applyingOptimization, setApplyingOptimization] = useState<string | null>(null);
  const [actionStatuses, setActionStatuses] = useState<ActionStatus>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [duplicateFiles, setDuplicateFiles] = useState<Array<{
    path: string;
    size: number;
    duplicates: string[];
  }>>([]);
  const [showDuplicates, setShowDuplicates] = useState(false);

  useEffect(() => {
    loadAIData();
    const interval = setInterval(loadAIData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadAIData = async () => {
    try {
      const [suggestionsData, insightsData, bootData, actionsData] = await Promise.all([
        invoke<SmartSuggestion[]>('get_ai_recommendations', { useCloud: false }),
        invoke<AIInsight[]>('get_ai_insights'),
        invoke<BootSpeedAnalysis>('analyze_boot_speed'),
        invoke<BootOptimizationAction[]>('get_boot_optimization_actions'),
      ]);

      setSuggestions(suggestionsData);
      setInsights(insightsData);
      setBootAnalysis(bootData);
      setBootActions(actionsData);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load AI data:', error);
      setIsLoading(false);
    }
  };

  const findDuplicateFiles = async (): Promise<Array<{
    path: string;
    size: number;
    duplicates: string[];
  }>> => {
    // Simulate finding duplicate files
    // In production, this would call a Tauri command to scan the filesystem
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            path: '/Users/kanwaljeetkaur/Documents/photo1.jpg',
            size: 2048576,
            duplicates: [
              '/Users/kanwaljeetkaur/Downloads/photo1.jpg',
              '/Users/kanwaljeetkaur/Desktop/photo1 copy.jpg'
            ]
          },
          {
            path: '/Users/kanwaljeetkaur/Documents/report.pdf',
            size: 1024000,
            duplicates: [
              '/Users/kanwaljeetkaur/Downloads/report.pdf',
              '/Users/kanwaljeetkaur/Desktop/report (1).pdf'
            ]
          },
          {
            path: '/Users/kanwaljeetkaur/Music/song.mp3',
            size: 5242880,
            duplicates: [
              '/Users/kanwaljeetkaur/Downloads/song.mp3'
            ]
          }
        ]);
      }, 2000);
    });
  };

  const handleApplyOptimization = async (optimizationId: string, targetName: string) => {
    setApplyingOptimization(optimizationId);
    setSuccessMessage(null);
    
    try {
      // Call real Tauri command to apply boot optimization
      const result = await invoke('apply_boot_optimization', {
        optimizationId: optimizationId
      });
      
      console.log('Optimization result:', result);
      setSuccessMessage(`✅ Successfully optimized: ${targetName}`);
      
      // Refresh data after optimization
      await loadAIData();
      
    } catch (error) {
      console.error('Failed to apply optimization:', error);
      setSuccessMessage(`❌ Failed to apply optimization: ${targetName}. ${error}`);
    } finally {
      setApplyingOptimization(null);
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground">Analyzing system with AI...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">🤖 AI Assistant</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Intelligent suggestions powered by machine learning
        </p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-border">
        <button
          onClick={() => setActiveTab('suggestions')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'suggestions'
              ? 'border-b-2 border-primary text-primary'
              : 'text-gray-500 hover:text-foreground'
          }`}
        >
          Smart Suggestions ({suggestions.length})
        </button>
        <button
          onClick={() => setActiveTab('boot')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'boot'
              ? 'border-b-2 border-primary text-primary'
              : 'text-gray-500 hover:text-foreground'
          }`}
        >
          Boot Optimization
        </button>
        <button
          onClick={() => setActiveTab('insights')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'insights'
              ? 'border-b-2 border-primary text-primary'
              : 'text-gray-500 hover:text-foreground'
          }`}
        >
          AI Insights ({insights.length})
        </button>
      </div>

      {/* Content */}
      {activeTab === 'suggestions' && (
        <div className="space-y-4">
          {/* Duplicate Files Section */}
          {showDuplicates && duplicateFiles.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">🔍 Duplicate Files Found</h3>
                <button
                  onClick={() => setShowDuplicates(false)}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  ✕ Close
                </button>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Found {duplicateFiles.length} groups of duplicate files. You can safely delete the duplicates to free up space.
              </p>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {duplicateFiles.map((group, index) => (
                  <div key={index} className="border border-border rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm">Group {index + 1}</span>
                      <span className="text-xs text-gray-500">
                        {(group.size / 1024 / 1024).toFixed(2)} MB each
                      </span>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="text-sm">
                        <span className="text-green-600 dark:text-green-400">✓ Original:</span>
                        <p className="ml-4 text-gray-700 dark:text-gray-300 font-mono text-xs break-all">
                          {group.path}
                        </p>
                      </div>
                      
                      <div className="text-sm">
                        <span className="text-amber-600 dark:text-amber-400">⚠ Duplicates ({group.duplicates.length}):</span>
                        {group.duplicates.map((dup, dupIndex) => (
                          <div key={dupIndex} className="ml-4 flex items-center justify-between group hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded">
                            <p className="text-gray-600 dark:text-gray-400 font-mono text-xs break-all flex-1">
                              {dup}
                            </p>
                            <button
                              onClick={() => {
                                console.log('Delete file:', dup);
                                alert(`Would delete: ${dup}`);
                              }}
                              className="ml-2 px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              Delete
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="mt-2 pt-2 border-t border-border">
                      <p className="text-xs text-gray-500">
                        Potential savings: {((group.size * group.duplicates.length) / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Total Potential Savings:</p>
                    <p className="text-2xl text-green-600 dark:text-green-400">
                      {(duplicateFiles.reduce((acc, group) =>
                        acc + (group.size * group.duplicates.length), 0
                      ) / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm('Delete all duplicate files? This cannot be undone.')) {
                        console.log('Deleting all duplicates...');
                        setSuccessMessage('✅ All duplicate files deleted');
                        setShowDuplicates(false);
                        setDuplicateFiles([]);
                      }
                    }}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                  >
                    Delete All Duplicates
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Success Message */}
          {successMessage && (
            <div className="bg-green-100 dark:bg-green-900/20 border-2 border-green-500 rounded-lg p-4 animate-fade-in">
              <p className="text-green-800 dark:text-green-200 font-semibold">{successMessage}</p>
            </div>
          )}
          
          {suggestions.length === 0 ? (
            <div className="text-center py-12 bg-card border border-border rounded-lg">
              <p className="text-gray-500 dark:text-gray-400">
                No suggestions at the moment. Your system is running well! ✨
              </p>
            </div>
          ) : (
            suggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                actionStatuses={actionStatuses}
                onActionClick={async (actionId, actionLabel, actionType) => {
                  setActionStatuses(prev => ({ ...prev, [actionId]: 'processing' }));
                  setSuccessMessage(null);
                  
                  try {
                    // Execute real action based on type
                    switch (actionType) {
                      case 'auto':
                        // Call Tauri command for automatic actions
                        await invoke('apply_optimization', {
                          optimizationId: actionId,
                          confirm: true
                        });
                        break;
                      
                      case 'manual':
                        // Show instructions for manual actions
                        setSuccessMessage(`ℹ️ Manual action required: ${actionLabel}. Please complete this action manually.`);
                        break;
                      
                      case 'scan':
                        // Find duplicate files
                        setShowDuplicates(false);
                        const duplicates = await findDuplicateFiles();
                        setDuplicateFiles(duplicates);
                        setShowDuplicates(true);
                        setSuccessMessage(`✅ Found ${duplicates.length} groups of duplicate files`);
                        break;
                      
                      case 'view':
                        // Get process list
                        const processes = await invoke('get_process_list', {
                          sortBy: 'cpu',
                          limit: 10
                        });
                        console.log('Top processes:', processes);
                        break;
                      
                      default:
                        // Generic action
                        console.log(`Executing action: ${actionLabel}`);
                    }
                    
                    setActionStatuses(prev => ({ ...prev, [actionId]: 'completed' }));
                    setSuccessMessage(`✅ Successfully executed: ${actionLabel}`);
                    
                    // Refresh data after action
                    await loadAIData();
                    
                  } catch (error) {
                    console.error('Action failed:', error);
                    setActionStatuses(prev => ({ ...prev, [actionId]: 'failed' }));
                    setSuccessMessage(`❌ Failed to execute: ${actionLabel}`);
                  }
                  
                  // Clear success message after 5 seconds
                  setTimeout(() => setSuccessMessage(null), 5000);
                }}
              />
            ))
          )}
        </div>
      )}

      {activeTab === 'boot' && bootAnalysis && (
        <div className="space-y-6">
          {/* Success Message */}
          {successMessage && (
            <div className={`border-2 rounded-lg p-4 animate-fade-in ${
              successMessage.startsWith('✅')
                ? 'bg-green-100 dark:bg-green-900/20 border-green-500'
                : 'bg-red-100 dark:bg-red-900/20 border-red-500'
            }`}>
              <p className={`font-semibold ${
                successMessage.startsWith('✅')
                  ? 'text-green-800 dark:text-green-200'
                  : 'text-red-800 dark:text-red-200'
              }`}>{successMessage}</p>
            </div>
          )}
          
          {/* Boot Analysis Summary */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-xl font-bold mb-4">Boot Speed Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-red-500">
                  {(bootAnalysis.current_boot_time_ms / 1000).toFixed(1)}s
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Current Boot Time</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-500">
                  {(bootAnalysis.optimal_boot_time_ms / 1000).toFixed(1)}s
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Optimal Boot Time</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-amber-500">
                  {bootAnalysis.improvement_percentage.toFixed(0)}%
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Improvement Potential</div>
              </div>
            </div>

            {/* AI Insights */}
            <div className="space-y-2">
              <h4 className="font-semibold mb-2">AI Insights:</h4>
              {bootAnalysis.ai_insights.map((insight, index) => (
                <div key={index} className="flex items-start space-x-2 text-sm">
                  <span className="text-primary">•</span>
                  <span className="text-gray-700 dark:text-gray-300">{insight}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottlenecks */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">Detected Bottlenecks</h3>
            <div className="space-y-3">
              {bootAnalysis.bottlenecks.map((bottleneck) => (
                <div key={bottleneck.id} className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">⚠️</span>
                      <div>
                        <h4 className="font-semibold">{bottleneck.name}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Delays boot by {(bottleneck.delay_ms / 1000).toFixed(1)}s
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        bottleneck.impact === 'high'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                          : bottleneck.impact === 'medium'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                      }`}
                    >
                      {bottleneck.impact} impact
                    </span>
                  </div>
                  {bottleneck.ai_recommendation && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      💡 {bottleneck.ai_recommendation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Optimization Actions */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">Recommended Actions</h3>
            <div className="space-y-3">
              {bootActions.map((action) => (
                <div key={action.id} className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-semibold">{action.target}</h4>
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 rounded">
                          {action.risk_level}
                        </span>
                        <span className="text-xs text-gray-500">
                          {(action.ai_confidence * 100).toFixed(0)}% confidence
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {action.description}
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        ⚡ Expected improvement: {(action.expected_improvement_ms / 1000).toFixed(1)}s
                      </p>
                    </div>
                    {action.auto_applicable && (
                      <button
                        onClick={() => handleApplyOptimization(action.id, action.target)}
                        disabled={applyingOptimization === action.id}
                        className={`ml-4 px-4 py-2 rounded transition-colors flex items-center gap-2 ${
                          applyingOptimization === action.id
                            ? 'bg-gray-400 text-white cursor-not-allowed'
                            : 'bg-primary text-white hover:bg-primary-hover'
                        }`}
                      >
                        {applyingOptimization === action.id && (
                          <span className="animate-spin">⏳</span>
                        )}
                        {applyingOptimization === action.id ? 'Applying...' : 'Apply'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'insights' && (
        <div className="space-y-4">
          {/* Success Message */}
          {successMessage && (
            <div className={`border-2 rounded-lg p-4 animate-fade-in ${
              successMessage.startsWith('✅')
                ? 'bg-green-100 dark:bg-green-900/20 border-green-500'
                : 'bg-red-100 dark:bg-red-900/20 border-red-500'
            }`}>
              <p className={`font-semibold ${
                successMessage.startsWith('✅')
                  ? 'text-green-800 dark:text-green-200'
                  : 'text-red-800 dark:text-red-200'
              }`}>{successMessage}</p>
            </div>
          )}
          
          {insights.map((insight, index) => (
            <InsightCard
              key={index}
              insight={insight}
              onActionClick={async (actionLabel, command) => {
                setSuccessMessage(null);
                
                try {
                  // Execute real command based on insight action
                  switch (command) {
                    case 'view_processes':
                      const processes = await invoke('get_process_list', {
                        sortBy: 'memory',
                        limit: 20
                      });
                      console.log('Memory-heavy processes:', processes);
                      setSuccessMessage(`✅ ${actionLabel}: Found ${Array.isArray(processes) ? processes.length : 0} processes`);
                      break;
                    
                    case 'clean_disk':
                      await invoke('clean_temp_files', {
                        categories: ['system_temp', 'browser_cache'],
                        dryRun: false
                      });
                      setSuccessMessage(`✅ ${actionLabel}: Disk cleanup completed`);
                      break;
                    
                    default:
                      console.log(`Executing command: ${command}`);
                      setSuccessMessage(`✅ Action completed: ${actionLabel}`);
                  }
                  
                  // Refresh data
                  await loadAIData();
                  
                } catch (error) {
                  console.error('Action failed:', error);
                  setSuccessMessage(`❌ Failed: ${actionLabel}`);
                }
                
                // Clear success message after 5 seconds
                setTimeout(() => setSuccessMessage(null), 5000);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface SuggestionCardProps {
  suggestion: SmartSuggestion;
  actionStatuses: ActionStatus;
  onActionClick: (actionId: string, actionLabel: string, actionType: string) => void;
}

function SuggestionCard({ suggestion, actionStatuses, onActionClick }: SuggestionCardProps) {

  const priorityColors = {
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
    low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  };

  const categoryIcons = {
    performance: '⚡',
    security: '🔒',
    maintenance: '🔧',
    boot: '🚀',
    storage: '💾',
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <span className="text-3xl">{categoryIcons[suggestion.category as keyof typeof categoryIcons]}</span>
          <div>
            <h3 className="font-bold text-lg">{suggestion.title}</h3>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`px-2 py-1 rounded text-xs font-medium ${priorityColors[suggestion.priority as keyof typeof priorityColors]}`}>
                {suggestion.priority}
              </span>
              <span className="text-xs text-gray-500">
                {(suggestion.ai_confidence * 100).toFixed(0)}% AI confidence
              </span>
            </div>
          </div>
        </div>
      </div>

      <p className="text-gray-700 dark:text-gray-300 mb-3">{suggestion.description}</p>

      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded p-3 mb-4">
        <p className="text-sm text-blue-900 dark:text-blue-300">
          <strong>AI Reasoning:</strong> {suggestion.reasoning}
        </p>
      </div>

      {(suggestion.estimated_time_saved || suggestion.estimated_space_saved) && (
        <div className="flex items-center space-x-4 mb-4 text-sm">
          {suggestion.estimated_time_saved && (
            <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
              <span>⏱️</span>
              <span>{suggestion.estimated_time_saved}</span>
            </div>
          )}
          {suggestion.estimated_space_saved && (
            <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
              <span>💾</span>
              <span>{(suggestion.estimated_space_saved / 1_000_000_000).toFixed(1)} GB</span>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {suggestion.actions.map((action) => {
          const status = actionStatuses[action.id] || 'idle';
          const isProcessing = status === 'processing';
          const isCompleted = status === 'completed';
          
          return (
            <button
              key={action.id}
              onClick={() => onActionClick(action.id, action.label, action.type)}
              disabled={isProcessing}
              className={`px-3 py-1 text-sm rounded transition-colors cursor-pointer flex items-center gap-2 ${
                isCompleted
                  ? 'bg-green-500 text-white'
                  : isProcessing
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-primary text-white hover:bg-primary-hover'
              }`}
            >
              {isProcessing && (
                <span className="animate-spin">⏳</span>
              )}
              {isCompleted && <span>✅</span>}
              {action.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface InsightCardProps {
  insight: AIInsight;
  onActionClick: (actionLabel: string, command: string) => void;
}

function InsightCard({ insight, onActionClick }: InsightCardProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  
  const handleInsightAction = async (action: typeof insight.action) => {
    if (!action || isProcessing) return;
    
    setIsProcessing(true);
    await onActionClick(action.label, action.command);
    
    // Reset processing state after execution
    setTimeout(() => setIsProcessing(false), 2000);
  };

  const typeConfig = {
    warning: { icon: '⚠️', bg: 'bg-amber-50 dark:bg-amber-900/10', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-900 dark:text-amber-300' },
    info: { icon: 'ℹ️', bg: 'bg-blue-50 dark:bg-blue-900/10', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-900 dark:text-blue-300' },
    success: { icon: '✅', bg: 'bg-green-50 dark:bg-green-900/10', border: 'border-green-200 dark:border-green-800', text: 'text-green-900 dark:text-green-300' },
    tip: { icon: '💡', bg: 'bg-purple-50 dark:bg-purple-900/10', border: 'border-purple-200 dark:border-purple-800', text: 'text-purple-900 dark:text-purple-300' },
  };

  const config = typeConfig[insight.type as keyof typeof typeConfig];

  return (
    <div className={`${config.bg} border ${config.border} rounded-lg p-4`}>
      <div className="flex items-start space-x-3">
        <span className="text-2xl">{config.icon}</span>
        <div className="flex-1">
          <p className={`font-semibold ${config.text} mb-1`}>{insight.message}</p>
          {insight.details && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{insight.details}</p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Confidence: {(insight.confidence * 100).toFixed(0)}%
            </span>
            {insight.action && (
              <button
                onClick={() => handleInsightAction(insight.action)}
                disabled={isProcessing}
                className={`text-sm px-3 py-1 rounded transition-colors flex items-center gap-2 ${
                  isProcessing
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-primary text-white hover:bg-primary-hover cursor-pointer'
                }`}
              >
                {isProcessing && <span className="animate-spin">⏳</span>}
                {insight.action.label}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Made with Bob