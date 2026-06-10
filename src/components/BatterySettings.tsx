import { useEffect, useState } from 'react';
import tauriApi from '../services/tauri';
import { BatteryStatus } from '../types';
import { Battery, Zap, Plane, Activity, ShieldAlert, CheckCircle2 } from 'lucide-react';

export function BatterySettings() {
  const [status, setStatus] = useState<BatteryStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchStatus = async () => {
    try {
      const result = await tauriApi.battery.getStatus();
      setStatus(result);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch battery status');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleLimit = async () => {
    if (!status || !status.is_supported) return;
    setIsUpdating(true);
    try {
      await tauriApi.battery.setChargeLimit(!status.charge_limit_enabled);
      await fetchStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to update charge limit');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleOverride = async () => {
    if (!status || !status.is_supported) return;
    setIsUpdating(true);
    try {
      await tauriApi.battery.toggleSmartOverride(!status.smart_override_active);
      await fetchStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to update smart override');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error && !status) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3">
        <ShieldAlert className="w-5 h-5 flex-shrink-0" />
        <p>{error}</p>
      </div>
    );
  }

  if (!status?.is_supported) {
    return (
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-8 text-center max-w-2xl mx-auto shadow-lg">
        <div className="bg-slate-800/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700/50">
          <Battery className="w-8 h-8 text-slate-500" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Battery Limiter Not Supported</h2>
        <p className="text-slate-400 text-sm">
          Your current hardware or operating system does not support software-defined battery charge limits. This feature requires specific SMC/ACPI firmware capabilities (typically found on modern MacBooks or supported Windows laptops).
        </p>
      </div>
    );
  }

  const wearLevel = status.wear_level_percent || 0;
  const isHealthy = wearLevel < 20;

  return (
    <div className="animate-fade-in space-y-6 max-w-5xl mx-auto p-4">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-gradient-to-r from-emerald-900/40 via-teal-900/30 to-slate-900/40 backdrop-blur-md border border-emerald-500/20 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Zap className="w-6 h-6 animate-pulse" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white">Battery Lifespan Extender</h1>
          </div>
          <p className="text-slate-400 text-sm max-w-xl">
            Laptops permanently plugged in will degrade quickly. Limit your maximum charge capacity to 80% to vastly extend the physical lifespan of your lithium-ion cells.
          </p>
        </div>

        {/* Global Enable Toggle */}
        <div className="mt-4 md:mt-0 flex items-center gap-4 bg-slate-900/60 border border-slate-700/40 p-4 rounded-xl relative z-10 shadow-inner">
          <div className="text-right">
            <div className="text-xs text-slate-500 uppercase font-semibold">Lifespan Mode</div>
            <div className={`text-sm font-bold ${status.charge_limit_enabled ? 'text-emerald-400' : 'text-slate-400'}`}>
              {status.charge_limit_enabled ? 'Active (80% Limit)' : 'Disabled (100%)'}
            </div>
          </div>
          <button
            onClick={handleToggleLimit}
            disabled={isUpdating}
            className={`w-14 h-7 flex items-center rounded-full p-1 transition-colors duration-300 shadow-inner ${
              status.charge_limit_enabled ? 'bg-emerald-500' : 'bg-slate-700'
            } ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div
              className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${
                status.charge_limit_enabled ? 'translate-x-7' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4 text-sm flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-xs underline hover:text-white transition">Dismiss</button>
        </div>
      )}

      {/* Grid Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Health / Wear Level Card */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col items-center justify-center text-center relative h-72">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 absolute top-6 left-6">Battery Health</h3>
          
          <div className="relative flex items-center justify-center mt-6">
            <svg className="w-40 h-40 transform -rotate-90">
              {/* Background Track */}
              <circle cx="80" cy="80" r="68" stroke="currentColor" strokeWidth="12" className="text-slate-800" fill="transparent" />
              {/* Progress Track */}
              <circle
                cx="80"
                cy="80"
                r="68"
                stroke="currentColor"
                strokeWidth="12"
                className={`${isHealthy ? 'text-emerald-500' : 'text-amber-500'} transition-all duration-1000 ease-out`}
                strokeDasharray={2 * Math.PI * 68}
                strokeDashoffset={2 * Math.PI * 68 * (wearLevel / 100)}
                fill="transparent"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-bold tracking-tight text-white">
                {(100 - wearLevel).toFixed(1)}%
              </span>
              <span className="text-[10px] text-slate-400 font-semibold uppercase mt-1">Health</span>
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center">
            <div className="flex items-center gap-1.5 text-sm font-medium text-slate-300">
              {isHealthy ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Activity className="w-4 h-4 text-amber-500" />}
              <span>{isHealthy ? 'Your battery is in great condition' : 'Your battery is degrading'}</span>
            </div>
            <div className="text-xs text-slate-500 mt-1 flex gap-3">
              <span>Design: {status.design_capacity_mah} mAh</span>
              <span className="opacity-50">|</span>
              <span>Current Max: {status.current_max_capacity_mah} mAh</span>
            </div>
          </div>
        </div>

        {/* Travel / Smart Override Card */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between h-72">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-slate-300 font-semibold">
                <Plane className="w-5 h-5 text-amber-400" />
                <h3>Smart Travel Override</h3>
              </div>
              {status.smart_override_active && (
                <span className="animate-pulse bg-amber-500/20 text-amber-400 text-[10px] uppercase font-bold px-2 py-1 rounded-md border border-amber-500/30">
                  Override Active
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400 mt-2">
              Need extra juice for a long flight or cafe trip? Temporarily bypass the 80% limit and charge to 100%. 
              It automatically reverts to Lifespan Mode once you reconnect the charger later.
            </p>
          </div>

          <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800/50 mt-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-white">Charge to Full Capacity</div>
              <div className="text-xs text-slate-500 mt-1">Current Charge: <span className="text-amber-400 font-semibold">{status.current_charge_percent}%</span></div>
            </div>
            <button
              onClick={handleToggleOverride}
              disabled={isUpdating || (!status.charge_limit_enabled && !status.smart_override_active)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all shadow-md ${
                status.smart_override_active 
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50 hover:bg-amber-500/30' 
                : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
              } ${isUpdating || (!status.charge_limit_enabled && !status.smart_override_active) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {status.smart_override_active ? 'Cancel Override' : 'Charge to 100%'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
