import { useEffect, useState } from 'react';
import { useAppStore } from './store';
import tauriApi from './services/tauri';
import { formatBytes } from './utils/format';
import { AISuggestions } from './components/AISuggestions';
import { FocusModeSettingsModal } from './components/FocusModeSettingsModal';
import { MaintenanceSettingsModal } from './components/MaintenanceSettingsModal';
import DeepSleep from './components/DeepSleep';

function App() {
  const { 
    darkMode, toggleDarkMode, systemMetrics, setSystemMetrics, 
    focusModeStatus, setFocusModeStatus, focusModeSettings, setFocusModeSettings,
    maintenanceConfig, setMaintenanceConfig, maintenanceLogs, setMaintenanceLogs
  } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'ai' | 'deep_sleep' | 'boot' | 'optimizations' | 'performance' | 'settings'>('dashboard');
  const [isFocusModeSettingsOpen, setIsFocusModeSettingsOpen] = useState(false);
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);

  useEffect(() => {
    // Fetch initial metrics
    fetchMetrics();
    fetchFocusModeState();
    fetchMaintenanceState();

    // Set up interval to fetch metrics every 5 seconds
    const interval = setInterval(fetchMetrics, 5000);

    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    try {
      const metrics = await tauriApi.system.getMetrics();
      setSystemMetrics(metrics);
      setIsLoading(false);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
      setIsLoading(false);
    }
  };

  const fetchFocusModeState = async () => {
    try {
      const [status, settings] = await Promise.all([
        tauriApi.system.getFocusModeStatus(),
        tauriApi.system.getFocusModeSettings(),
      ]);
      setFocusModeStatus(status);
      setFocusModeSettings(settings);
    } catch (err) {
      console.error('Failed to fetch focus mode state:', err);
    }
  };

  const fetchMaintenanceState = async () => {
    try {
      const [config, logs] = await Promise.all([
        tauriApi.system.getMaintenanceConfig(),
        tauriApi.system.getMaintenanceLogs(),
      ]);
      setMaintenanceConfig(config);
      setMaintenanceLogs(logs);
    } catch (err) {
      console.error('Failed to fetch maintenance state:', err);
    }
  };

  const handleToggleFocusMode = async () => {
    if (!focusModeStatus) return;
    try {
      const newEnabledState = !focusModeStatus.is_enabled;
      await tauriApi.system.toggleFocusMode(newEnabledState);
      fetchFocusModeState();
    } catch (err) {
      console.error('Failed to toggle focus mode:', err);
    }
  };

  const handleSaveFocusModeSettings = async (settings: any) => {
    try {
      await tauriApi.system.updateFocusModeSettings(settings);
      fetchFocusModeState();
      setIsFocusModeSettingsOpen(false);
    } catch (err) {
      console.error('Failed to save focus mode settings:', err);
    }
  };

  const handleSaveMaintenanceConfig = async (config: any) => {
    try {
      await tauriApi.system.updateMaintenanceConfig(config);
      fetchMaintenanceState();
      setIsMaintenanceModalOpen(false);
    } catch (err) {
      console.error('Failed to save maintenance config:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground">Loading system metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center p-8 bg-red-100 dark:bg-red-900/20 rounded-lg">
          <p className="text-red-600 dark:text-red-400 font-semibold mb-2">Error</p>
          <p className="text-foreground">{error}</p>
          <button
            onClick={fetchMetrics}
            className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white text-xl font-bold">SO</span>
            </div>
            <div>
              <h1 className="text-xl font-bold">System Optimizer</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                AI-Powered Performance Dashboard
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Navigation */}
            <nav className="flex space-x-2">
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  currentView === 'dashboard'
                    ? 'bg-primary text-white'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                📊 Dashboard
              </button>
              <button
                onClick={() => setCurrentView('ai')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  currentView === 'ai'
                    ? 'bg-primary text-white'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                🤖 AI Assistant
              </button>
              <button
                onClick={() => setCurrentView('deep_sleep')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  currentView === 'deep_sleep'
                    ? 'bg-primary text-white'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                ❄️ Deep Sleep
              </button>
            </nav>
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle dark mode"
            >
              {darkMode ? '🌞' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {currentView === 'dashboard' && (
          <>
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">System Metrics</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Real-time monitoring of your system's performance
                </p>
              </div>
              <div className="mt-4 md:mt-0 flex items-center space-x-4">
                <button
                  onClick={handleToggleFocusMode}
                  className={`px-6 py-3 rounded-full font-bold shadow-lg transition-all transform hover:scale-105 flex items-center space-x-2 ${
                    focusModeStatus?.is_enabled
                      ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                >
                  <span className="text-xl">🎮</span>
                  <span>
                    {focusModeStatus?.is_enabled ? 'Focus Mode Active' : 'Enable Focus Mode'}
                  </span>
                </button>
                <button
                  onClick={() => setIsFocusModeSettingsOpen(true)}
                  className="p-3 bg-card border border-border rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shadow"
                  title="Focus Mode Settings"
                >
                  ⚙️
                </button>
              </div>
            </div>

            {systemMetrics && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                  title="CPU Usage"
                  value={`${systemMetrics.cpu.usage_percent.toFixed(1)}%`}
                  subtitle={`${systemMetrics.cpu.cores} Cores @ ${systemMetrics.cpu.frequency_mhz} MHz`}
                  percentage={systemMetrics.cpu.usage_percent}
                  icon="💻"
                />
                <MetricCard
                  title="Memory"
                  value={formatBytes(systemMetrics.memory.used_bytes)}
                  subtitle={`of ${formatBytes(systemMetrics.memory.total_bytes)} (${systemMetrics.memory.usage_percent.toFixed(1)}%)`}
                  percentage={systemMetrics.memory.usage_percent}
                  icon="🧠"
                />
                <MetricCard
                  title="Disk Usage"
                  value={`${systemMetrics.disk.usage_percent.toFixed(1)}%`}
                  subtitle={`${formatBytes(systemMetrics.disk.used_bytes)} used of ${formatBytes(systemMetrics.disk.total_bytes)}`}
                  percentage={systemMetrics.disk.usage_percent}
                  icon="💾"
                />
                <MetricCard
                  title="Network"
                  value={formatBytes(systemMetrics.network.bytes_sent + systemMetrics.network.bytes_received)}
                  subtitle={`Sent: ${formatBytes(systemMetrics.network.bytes_sent)} | Recv: ${formatBytes(systemMetrics.network.bytes_received)}`}
                  icon="🌐"
                />
              </div>
            )}

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              <FeatureCard
                title="Startup Optimizer"
                description="Manage startup programs & speed up boot time"
                icon="🚀"
                status="Active"
                onClick={() => setCurrentView('boot')}
              />
              <FeatureCard
                title="AI Recommendation Engine"
                description="Get smart optimization suggestions"
                icon="🧠"
                status="Active"
                onClick={() => setCurrentView('ai')}
              />
              <FeatureCard
                title="Automated Maintenance"
                description="Configure silent background tasks"
                icon="🧹"
                status={maintenanceConfig?.enabled ? "Active" : "Disabled"}
                onClick={() => setIsMaintenanceModalOpen(true)}
              />
            </div>
          </>
        )}
        {currentView === 'ai' && <AISuggestions />}
        {currentView === 'deep_sleep' && <DeepSleep />}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12 py-6">
        <div className="container mx-auto px-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>System Optimizer v1.0.0 - Built with Tauri + React</p>
        </div>
      </footer>

      {isFocusModeSettingsOpen && focusModeSettings && (
        <FocusModeSettingsModal
          initialSettings={focusModeSettings}
          onSave={handleSaveFocusModeSettings}
          onClose={() => setIsFocusModeSettingsOpen(false)}
        />
      )}

      {isMaintenanceModalOpen && maintenanceConfig && (
        <MaintenanceSettingsModal
          initialConfig={maintenanceConfig}
          logs={maintenanceLogs}
          onSave={handleSaveMaintenanceConfig}
          onClose={() => setIsMaintenanceModalOpen(false)}
        />
      )}
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  percentage?: number;
  icon: string;
}

function MetricCard({ title, value, subtitle, percentage, icon }: MetricCardProps) {
  const getColor = (pct?: number) => {
    if (!pct) return 'bg-blue-500';
    if (pct < 60) return 'bg-green-500';
    if (pct < 80) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <span className="text-3xl">{icon}</span>
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{subtitle}</p>
      {percentage !== undefined && (
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getColor(percentage)}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

interface FeatureCardProps {
  title: string;
  description: string;
  icon: string;
  status?: string;
  onClick?: () => void;
}

function FeatureCard({ title, description, icon, status, onClick }: FeatureCardProps) {
  return (
    <div 
      className={`bg-card border border-border rounded-lg p-6 ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow hover:border-primary' : 'opacity-60'}`}
      onClick={onClick}
    >
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{description}</p>
      {status && (
        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${status === 'Active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-200 dark:bg-gray-700'}`}>
          {status}
        </span>
      )}
    </div>
  );
}

export default App;

// Made with Bob
