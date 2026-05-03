import { useEffect, useState } from 'react';
import tauriApi from '../services/tauri';
import { formatDuration } from '../utils/format';
import type { BootTimeInfo, StartupProgram } from '../types';

export function BootAnalysis() {
  const [bootInfo, setBootInfo] = useState<BootTimeInfo | null>(null);
  const [startupPrograms, setStartupPrograms] = useState<StartupProgram[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [boot, programs] = await Promise.all([
        tauriApi.boot.getBootTime(),
        tauriApi.boot.getStartupPrograms(),
      ]);
      setBootInfo(boot);
      setStartupPrograms(programs);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to fetch boot data:', err);
      setIsLoading(false);
    }
  };

  const handleToggleProgram = async (programId: string, currentlyEnabled: boolean) => {
    try {
      await tauriApi.boot.toggleStartupProgram({
        program_id: programId,
        enabled: !currentlyEnabled,
      });
      // Refresh the list
      const programs = await tauriApi.boot.getStartupPrograms();
      setStartupPrograms(programs);
    } catch (err) {
      console.error('Failed to toggle program:', err);
    }
  };

  const filteredPrograms = startupPrograms.filter((p) => {
    if (filter === 'enabled') return p.enabled;
    if (filter === 'disabled') return !p.enabled;
    return true;
  });

  const enabledCount = startupPrograms.filter((p) => p.enabled).length;
  const totalDelay = startupPrograms
    .filter((p) => p.enabled)
    .reduce((sum, p) => sum + p.estimated_delay_ms, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading boot analysis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Boot Time Overview */}
      {bootInfo && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard
            label="Current Boot Time"
            value={formatDuration(bootInfo.current_boot_time_ms)}
            icon="⏱️"
            trend={bootInfo.current_boot_time_ms < bootInfo.average_boot_time_ms ? 'up' : 'down'}
          />
          <StatCard
            label="Average Boot Time"
            value={formatDuration(bootInfo.average_boot_time_ms)}
            icon="📊"
          />
          <StatCard
            label="Best Time"
            value={formatDuration(bootInfo.best_boot_time_ms)}
            icon="🏆"
          />
          <StatCard
            label="Worst Time"
            value={formatDuration(bootInfo.worst_boot_time_ms)}
            icon="⚠️"
          />
        </div>
      )}

      {/* Startup Programs Summary */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Startup Programs Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-background rounded-lg">
            <div className="text-3xl font-bold text-primary">{startupPrograms.length}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total Programs</div>
          </div>
          <div className="text-center p-4 bg-background rounded-lg">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">{enabledCount}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Enabled</div>
          </div>
          <div className="text-center p-4 bg-background rounded-lg">
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              {formatDuration(totalDelay)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Estimated Delay</div>
          </div>
        </div>
      </div>

      {/* Startup Programs List */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Startup Programs</h2>
          <div className="flex space-x-2">
            <FilterButton
              label="All"
              active={filter === 'all'}
              onClick={() => setFilter('all')}
            />
            <FilterButton
              label="Enabled"
              active={filter === 'enabled'}
              onClick={() => setFilter('enabled')}
            />
            <FilterButton
              label="Disabled"
              active={filter === 'disabled'}
              onClick={() => setFilter('disabled')}
            />
          </div>
        </div>

        <div className="space-y-3">
          {filteredPrograms.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No startup programs found
            </div>
          ) : (
            filteredPrograms.map((program) => (
              <ProgramItem
                key={program.id}
                program={program}
                onToggle={handleToggleProgram}
              />
            ))
          )}
        </div>
      </div>

      {/* AI Suggestion */}
      {enabledCount > 5 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <span className="text-2xl">💡</span>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                AI Suggestion
              </h3>
              <p className="text-blue-800 dark:text-blue-200 mb-3">
                You have {enabledCount} programs starting with your system. Disabling high-impact
                programs could reduce boot time by approximately {formatDuration(totalDelay / 2)}.
              </p>
              <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                Apply Suggested Optimizations
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  icon: string;
  trend?: 'up' | 'down';
}

function StatCard({ label, value, icon, trend }: StatCardProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        {trend && (
          <span className={trend === 'up' ? 'text-green-600' : 'text-red-600'}>
            {trend === 'up' ? '↑' : '↓'}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
    </div>
  );
}

interface FilterButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function FilterButton({ label, active, onClick }: FilterButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg transition-colors ${
        active
          ? 'bg-primary text-white'
          : 'bg-background border border-border hover:border-primary'
      }`}
    >
      {label}
    </button>
  );
}

interface ProgramItemProps {
  program: StartupProgram;
  onToggle: (id: string, enabled: boolean) => void;
}

function ProgramItem({ program, onToggle }: ProgramItemProps) {
  const impactColors = {
    low: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20',
    medium: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/20',
    high: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20',
  };

  return (
    <div className="flex items-center justify-between p-4 bg-background border border-border rounded-lg hover:border-primary transition-colors">
      <div className="flex items-center space-x-4 flex-1">
        <button
          onClick={() => onToggle(program.id, program.enabled)}
          className={`w-12 h-6 rounded-full transition-colors relative ${
            program.enabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
          }`}
        >
          <div
            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
              program.enabled ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>

        <div className="flex-1">
          <div className="font-semibold">{program.name}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{program.path}</div>
          {program.publisher && (
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Publisher: {program.publisher}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="text-right">
          <div className="text-sm font-medium">{formatDuration(program.estimated_delay_ms)}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Estimated delay</div>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${impactColors[program.impact]}`}
        >
          {program.impact.toUpperCase()}
        </span>
      </div>
    </div>
  );
}

// Made with Bob
