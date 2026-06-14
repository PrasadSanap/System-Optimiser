import { create } from 'zustand';
import type {
  SystemMetrics,
  ViewType,
  Settings,
  OptimizationSuggestion,
  StartupProgram,
  BootTimeInfo,
  FocusModeSettings,
  FocusModeStatus,
  MaintenanceConfig,
  MaintenanceLog,
  DeepSleepStatus,
  HardwareHealthData,
} from '../types';

interface AppStore {
  // UI State
  currentView: ViewType;
  darkMode: boolean;
  sidebarCollapsed: boolean;
  isMonitoring: boolean;
  
  // System Data
  systemMetrics: SystemMetrics | null;
  bootInfo: BootTimeInfo | null;
  startupPrograms: StartupProgram[];
  optimizations: OptimizationSuggestion[];
  
  // Settings
  settings: Settings | null;
  focusModeStatus: FocusModeStatus | null;
  focusModeSettings: FocusModeSettings | null;
  maintenanceConfig: MaintenanceConfig | null;
  maintenanceLogs: MaintenanceLog[];
  hardwareHealth: HardwareHealthData | null;
  isLoadingHardwareHealth: boolean;
  
  // Loading States
  isLoadingMetrics: boolean;
  isLoadingOptimizations: boolean;
  
  // Actions
  setCurrentView: (view: ViewType) => void;
  toggleDarkMode: () => void;
  toggleSidebar: () => void;
  setIsMonitoring: (monitoring: boolean) => void;
  setSystemMetrics: (metrics: SystemMetrics) => void;
  setBootInfo: (info: BootTimeInfo) => void;
  setStartupPrograms: (programs: StartupProgram[]) => void;
  setOptimizations: (optimizations: OptimizationSuggestion[]) => void;
  setSettings: (settings: Settings) => void;
  setFocusModeStatus: (status: FocusModeStatus) => void;
  setFocusModeSettings: (settings: FocusModeSettings) => void;
  setMaintenanceConfig: (config: MaintenanceConfig) => void;
  setMaintenanceLogs: (logs: MaintenanceLog[]) => void;
  setHardwareHealth: (data: HardwareHealthData) => void;
  setIsLoadingHardwareHealth: (loading: boolean) => void;
  setIsLoadingMetrics: (loading: boolean) => void;
  setIsLoadingOptimizations: (loading: boolean) => void;
  
  // Deep Sleep
  deepSleepStatus: DeepSleepStatus | null;
  setDeepSleepStatus: (status: DeepSleepStatus | null) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  // Initial UI State
  currentView: 'dashboard',
  darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
  sidebarCollapsed: false,
  isMonitoring: false,
  
  // Initial System Data
  systemMetrics: null,
  bootInfo: null,
  startupPrograms: [],
  optimizations: [],
  
  // Initial Settings
  settings: null,
  focusModeStatus: null,
  focusModeSettings: null,
  maintenanceConfig: null,
  maintenanceLogs: [],
  hardwareHealth: null,
  isLoadingHardwareHealth: false,
  
  // Initial Loading States
  isLoadingMetrics: false,
  isLoadingOptimizations: false,
  
  // Initial Deep Sleep State
  deepSleepStatus: null,
  
  // Actions
  setCurrentView: (view) => set({ currentView: view }),
  
  toggleDarkMode: () => set((state) => {
    const newDarkMode = !state.darkMode;
    // Update document class for Tailwind dark mode
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    return { darkMode: newDarkMode };
  }),
  
  toggleSidebar: () => set((state) => ({ 
    sidebarCollapsed: !state.sidebarCollapsed 
  })),
  
  setIsMonitoring: (monitoring) => set({ isMonitoring: monitoring }),
  setSystemMetrics: (metrics) => set({ systemMetrics: metrics }),
  setBootInfo: (info) => set({ bootInfo: info }),
  setStartupPrograms: (programs) => set({ startupPrograms: programs }),
  setOptimizations: (optimizations) => set({ optimizations }),
  setSettings: (settings) => set({ settings }),
  setFocusModeStatus: (status) => set({ focusModeStatus: status }),
  setFocusModeSettings: (settings) => set({ focusModeSettings: settings }),
  setMaintenanceConfig: (config) => set({ maintenanceConfig: config }),
  setMaintenanceLogs: (logs) => set({ maintenanceLogs: logs }),
  setHardwareHealth: (data) => set({ hardwareHealth: data }),
  setIsLoadingHardwareHealth: (loading) => set({ isLoadingHardwareHealth: loading }),
  setIsLoadingMetrics: (loading) => set({ isLoadingMetrics: loading }),
  setIsLoadingOptimizations: (loading) => set({ isLoadingOptimizations: loading }),
  setDeepSleepStatus: (status) => set({ deepSleepStatus: status }),
}));

// Initialize dark mode on app start
if (useAppStore.getState().darkMode) {
  document.documentElement.classList.add('dark');
}

// Made with Bob
