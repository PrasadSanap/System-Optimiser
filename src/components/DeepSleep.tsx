import { useEffect, useState, useMemo } from 'react';
import { useAppStore } from '../store';
import tauriApi from '../services/tauri';
import { formatBytes } from '../utils/format';
import { 
  Snowflake, 
  Settings, 
  Play, 
  Plus, 
  Trash2, 
  Shield, 
  Check, 
  Moon, 
  HelpCircle,
  RefreshCw,
  Gauge
} from 'lucide-react';

export default function DeepSleep() {
  const { deepSleepStatus, setDeepSleepStatus } = useAppStore();
  const [activeProcesses, setActiveProcesses] = useState<any[]>([]);
  const [isLoadingActive, setIsLoadingActive] = useState(false);
  const [whitelistInput, setWhitelistInput] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Poll status periodically (every 2 seconds)
  useEffect(() => {
    let active = true;

    const fetchStatus = async () => {
      try {
        const status = await tauriApi.deepSleep.getStatus();
        if (active) {
          setDeepSleepStatus(status);
        }
      } catch (err: any) {
        console.error('Failed to fetch Deep Sleep status:', err);
        if (active) {
          setErrorMessage('Could not communicate with deep sleep service.');
        }
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [setDeepSleepStatus]);

  // Fetch running processes to show "freeze candidates"
  const fetchActiveProcesses = async () => {
    setIsLoadingActive(true);
    try {
      // Fetch top processes by memory
      const list = await tauriApi.system.getProcessList({ sort_by: 'memory', limit: 20 });
      
      // Filter out processes that are already frozen, whitelisted, or the app itself
      const whitelistSet = new Set(
        (deepSleepStatus?.whitelist || []).map(w => w.toLowerCase())
      );
      const frozenPids = new Set(
        (deepSleepStatus?.suspended_processes || []).map(p => p.pid)
      );

      const filtered = list.filter((p: any) => {
        const nameLower = p.name.toLowerCase();
        
        // Skip current app
        if (nameLower.includes('system-optimizer') || nameLower.includes('system_optimizer')) {
          return false;
        }
        // Skip frozen
        if (frozenPids.has(p.pid)) {
          return false;
        }
        // Skip Whitelisted
        const isWhitelisted = Array.from(whitelistSet).some(w => nameLower === w || nameLower.includes(w));
        if (isWhitelisted) {
          return false;
        }
        
        // Only show apps with non-trivial memory usage (> 10MB) to reduce noise
        return p.memory_bytes > 10 * 1024 * 1024;
      });

      setActiveProcesses(filtered);
    } catch (err) {
      console.error('Failed to fetch active processes:', err);
    } finally {
      setIsLoadingActive(false);
    }
  };

  useEffect(() => {
    if (deepSleepStatus?.enabled) {
      fetchActiveProcesses();
      const interval = setInterval(fetchActiveProcesses, 5000);
      return () => clearInterval(interval);
    }
  }, [deepSleepStatus?.enabled, deepSleepStatus?.suspended_processes]);

  // Calculate total RAM saved
  const totalSavedBytes = useMemo(() => {
    if (!deepSleepStatus?.suspended_processes) return 0;
    return deepSleepStatus.suspended_processes.reduce((acc, p) => acc + p.memory_bytes, 0);
  }, [deepSleepStatus?.suspended_processes]);

  // Actions
  const handleToggle = async () => {
    if (!deepSleepStatus) return;
    setIsUpdating(true);
    try {
      const nextEnabled = !deepSleepStatus.enabled;
      const nextStatus = await tauriApi.deepSleep.updateConfig(
        nextEnabled,
        deepSleepStatus.inactivity_timeout_secs,
        deepSleepStatus.whitelist
      );
      setDeepSleepStatus(nextStatus);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to toggle deep sleep.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleTimeoutChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!deepSleepStatus) return;
    const nextTimeout = parseInt(e.target.value, 10);
    setIsUpdating(true);
    try {
      const nextStatus = await tauriApi.deepSleep.updateConfig(
        deepSleepStatus.enabled,
        nextTimeout,
        deepSleepStatus.whitelist
      );
      setDeepSleepStatus(nextStatus);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update inactivity timer.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddWhitelist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deepSleepStatus || !whitelistInput.trim()) return;
    
    const item = whitelistInput.trim();
    // Prevent duplicates
    if (deepSleepStatus.whitelist.some(w => w.toLowerCase() === item.toLowerCase())) {
      setWhitelistInput('');
      return;
    }

    const nextWhitelist = [...deepSleepStatus.whitelist, item];
    setIsUpdating(true);
    try {
      const nextStatus = await tauriApi.deepSleep.updateConfig(
        deepSleepStatus.enabled,
        deepSleepStatus.inactivity_timeout_secs,
        nextWhitelist
      );
      setDeepSleepStatus(nextStatus);
      setWhitelistInput('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to add item to whitelist.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveWhitelist = async (itemToRemove: string) => {
    if (!deepSleepStatus) return;
    const nextWhitelist = deepSleepStatus.whitelist.filter(w => w !== itemToRemove);
    setIsUpdating(true);
    try {
      const nextStatus = await tauriApi.deepSleep.updateConfig(
        deepSleepStatus.enabled,
        deepSleepStatus.inactivity_timeout_secs,
        nextWhitelist
      );
      setDeepSleepStatus(nextStatus);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to remove item from whitelist.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleThaw = async (pid: number) => {
    try {
      const nextStatus = await tauriApi.deepSleep.thawProcess(pid);
      setDeepSleepStatus(nextStatus);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to wake up process.');
    }
  };

  const handleFreeze = async (p: any) => {
    try {
      const nextStatus = await tauriApi.deepSleep.freezeProcess(p.pid, p.name, p.memory_bytes);
      setDeepSleepStatus(nextStatus);
      // Remove from active process list locally for visual responsiveness
      setActiveProcesses(prev => prev.filter(item => item.pid !== p.pid));
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to freeze process.');
    }
  };

  return (
    <div className="animate-fade-in p-6 max-w-6xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-gradient-to-r from-blue-900/40 via-cyan-900/30 to-slate-900/40 backdrop-blur-md border border-cyan-500/20 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-cyan-500/15 border border-cyan-500/30 rounded-xl text-cyan-400">
              <Snowflake className="w-6 h-6 animate-pulse" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white">Deep Sleep Freezer</h1>
          </div>
          <p className="text-slate-400 text-sm max-w-xl">
            Automatically suspend idle background apps (SIGSTOP/NtSuspendProcess) to drop their RAM and CPU to near 0%, freezing their state without data loss. Re-opens instantly when focused.
          </p>
        </div>

        {/* Global Enable Toggle */}
        <div className="mt-4 md:mt-0 flex items-center gap-4 bg-slate-900/60 border border-slate-700/40 p-4 rounded-xl relative z-10">
          <div className="text-right">
            <div className="text-xs text-slate-500 uppercase font-semibold">Service Status</div>
            <div className={`text-sm font-bold ${deepSleepStatus?.enabled ? 'text-cyan-400' : 'text-slate-400'}`}>
              {deepSleepStatus?.enabled ? 'Active Monitoring' : 'Disabled'}
            </div>
          </div>
          <button
            onClick={handleToggle}
            disabled={isUpdating || !deepSleepStatus}
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${
              deepSleepStatus?.enabled ? 'bg-cyan-500' : 'bg-slate-700'
            } ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                deepSleepStatus?.enabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4 text-sm flex items-center justify-between shadow-lg animate-fade-in">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-xs underline hover:text-white transition">Dismiss</button>
        </div>
      )}

      {/* Primary Analytics grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Memory Saved Gauge Card */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col items-center justify-between text-center relative overflow-hidden h-64">
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none"></div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Total Saved Memory</h3>
            <p className="text-xs text-slate-500 mt-1">Reclaimed RAM from frozen processes</p>
          </div>

          <div className="relative flex items-center justify-center my-2">
            {/* Circular SVG Gauge */}
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="52"
                stroke="currentColor"
                strokeWidth="8"
                className="text-slate-800"
                fill="transparent"
              />
              <circle
                cx="64"
                cy="64"
                r="52"
                stroke="currentColor"
                strokeWidth="8"
                className="text-cyan-500 transition-all duration-700 ease-out"
                strokeDasharray={2 * Math.PI * 52}
                strokeDashoffset={
                  2 * Math.PI * 52 * (1 - Math.min(totalSavedBytes / (8 * 1024 * 1024 * 1024), 1))
                }
                fill="transparent"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-bold tracking-tight text-white">
                {totalSavedBytes > 0 ? formatBytes(totalSavedBytes) : '0 MB'}
              </span>
              <span className="text-[10px] text-cyan-400 font-semibold uppercase mt-0.5 flex items-center gap-1">
                <Moon className="w-3 h-3" /> Sleeping
              </span>
            </div>
          </div>

          <span className="text-xs text-slate-500">
            {deepSleepStatus?.suspended_processes.length || 0} applications currently frozen
          </span>
        </div>

        {/* Configurations Card */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4 h-64 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-300 font-semibold mb-2">
              <Settings className="w-4 h-4 text-cyan-400" />
              <h3>Suspension Timer</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Select how long an application must remain inactive or minimized in the background before freezing it.
            </p>
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium">Inactivity Threshold</label>
              <select
                value={deepSleepStatus?.inactivity_timeout_secs || 1800}
                onChange={handleTimeoutChange}
                disabled={!deepSleepStatus || isUpdating}
                className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition"
              >
                <option value={5}>5 seconds (Test Mode)</option>
                <option value={300}>5 minutes</option>
                <option value={900}>15 minutes</option>
                <option value={1800}>30 minutes</option>
                <option value={3600}>1 hour</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-950/40 p-3 border border-slate-800/40 rounded-xl">
            <HelpCircle className="w-4 h-4 flex-shrink-0 text-cyan-500/60" />
            <span>Switching back to a sleeping app wakes it up instantly.</span>
          </div>
        </div>

        {/* Whitelist Manager Card */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-lg h-64 flex flex-col justify-between">
          <div className="space-y-3 flex-grow overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 text-slate-300 font-semibold">
              <Shield className="w-4 h-4 text-cyan-400" />
              <h3>Whitelist</h3>
            </div>
            <p className="text-xs text-slate-500">
              Process names (e.g. `spotify`, `chrome`) that should never be frozen automatically.
            </p>

            {/* Whitelist Tag Box */}
            <div className="flex-grow overflow-y-auto pr-1 space-y-1.5 min-h-0 py-1">
              {deepSleepStatus?.whitelist && deepSleepStatus.whitelist.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {deepSleepStatus.whitelist.map((w) => (
                    <span
                      key={w}
                      className="inline-flex items-center gap-1 bg-slate-800 border border-slate-700 text-xs px-2.5 py-0.5 rounded-full text-slate-300 font-medium"
                    >
                      {w}
                      <button
                        onClick={() => handleRemoveWhitelist(w)}
                        disabled={isUpdating}
                        className="text-slate-500 hover:text-red-400 transition"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-600 italic py-4">No whitelisted apps.</div>
              )}
            </div>
          </div>

          <form onSubmit={handleAddWhitelist} className="mt-3 flex gap-2">
            <input
              type="text"
              placeholder="e.g. spotify"
              value={whitelistInput}
              onChange={(e) => setWhitelistInput(e.target.value)}
              disabled={isUpdating || !deepSleepStatus}
              className="flex-grow bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition"
            />
            <button
              type="submit"
              disabled={isUpdating || !whitelistInput.trim() || !deepSleepStatus}
              className="bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </form>
        </div>
      </div>

      {/* Main Lists Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Suspended Apps Table */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col min-h-[350px]">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
              </span>
              <h3 className="font-semibold text-white">Currently Frozen Apps</h3>
            </div>
            <span className="text-xs bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-lg border border-cyan-500/20 font-medium">
              {deepSleepStatus?.suspended_processes.length || 0} sleeping
            </span>
          </div>

          <div className="flex-grow overflow-x-auto">
            {deepSleepStatus?.suspended_processes && deepSleepStatus.suspended_processes.length > 0 ? (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-slate-500 font-semibold border-b border-slate-800/40 pb-2">
                    <th className="py-2">Process Name</th>
                    <th className="py-2">PID</th>
                    <th className="py-2">RAM Saved</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30">
                  {deepSleepStatus.suspended_processes.map((p) => (
                    <tr key={p.pid} className="hover:bg-slate-800/10 group transition-colors">
                      <td className="py-3 font-semibold text-slate-200 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                        {p.name}
                      </td>
                      <td className="py-3 text-slate-500">`{p.pid}`</td>
                      <td className="py-3 text-cyan-400 font-medium">{formatBytes(p.memory_bytes)}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleThaw(p.pid)}
                          className="inline-flex items-center gap-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 px-2.5 py-1 rounded-lg border border-cyan-500/30 font-semibold transition"
                        >
                          <Play className="w-3 h-3 fill-current" /> Wake Up
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                <div className="p-3 bg-slate-800/40 border border-slate-700/40 text-slate-500 rounded-full">
                  <Snowflake className="w-8 h-8 opacity-40" />
                </div>
                <div className="text-slate-400 font-medium text-sm">No applications are currently frozen</div>
                <p className="text-slate-600 text-xs max-w-xs leading-relaxed">
                  When applications run in the background for longer than the threshold timer, they will show up here.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Active Apps - Freeze Candidate Table */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col min-h-[350px]">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800/60 pb-3">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-slate-400" />
              <h3 className="font-semibold text-white">Active Memory Consumers</h3>
            </div>
            <button
              onClick={fetchActiveProcesses}
              disabled={isLoadingActive || !deepSleepStatus?.enabled}
              className="text-slate-500 hover:text-white transition disabled:opacity-30"
              title="Refresh active process list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingActive ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex-grow overflow-x-auto">
            {!deepSleepStatus?.enabled ? (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                <div className="p-3 bg-slate-800/40 border border-slate-700/40 text-slate-500 rounded-full">
                  <Moon className="w-8 h-8 opacity-40" />
                </div>
                <div className="text-slate-400 font-medium text-sm">Deep Sleep Mode is Off</div>
                <p className="text-slate-600 text-xs max-w-xs leading-relaxed">
                  Turn on the Deep Sleep Freezer service toggle above to inspect active memory candidates and enable automatic freeze tasks.
                </p>
              </div>
            ) : activeProcesses.length > 0 ? (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-slate-500 font-semibold border-b border-slate-800/40 pb-2">
                    <th className="py-2">Process Name</th>
                    <th className="py-2">PID</th>
                    <th className="py-2">RAM Usage</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30">
                  {activeProcesses.map((p) => (
                    <tr key={p.pid} className="hover:bg-slate-800/10 group transition-colors">
                      <td className="py-3 font-semibold text-slate-300">{p.name}</td>
                      <td className="py-3 text-slate-500">`{p.pid}`</td>
                      <td className="py-3 text-slate-400 font-medium">{formatBytes(p.memory_bytes)}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleFreeze(p)}
                          className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 font-semibold transition"
                          title="Instantly put this application to sleep"
                        >
                          <Moon className="w-3 h-3 text-cyan-400 fill-cyan-400/20" /> Freeze
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                <div className="p-3 bg-slate-800/40 border border-slate-700/40 text-slate-500 rounded-full">
                  <Check className="w-8 h-8 text-cyan-400" />
                </div>
                <div className="text-slate-400 font-medium text-sm">No heavy active apps detected</div>
                <p className="text-slate-600 text-xs max-w-xs leading-relaxed">
                  All active processes are either whitelisted, frozen, or consume less than 10 MB of RAM.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
