// lib/constants.ts

// These values MUST match the PostgreSQL `asset_status` enum exactly:
// 'Available', 'Assigned', 'In Repair', 'Defective', 'Lost', 'Retired', 'Pending Disposal', 'Disposed'
export const ASSET_STATUSES = {
  // Workflow Dependent (Hidden from manual dropdown)
  ASSIGNED: 'Assigned',
  IN_REPAIR: 'In Repair',
  DISPOSED: 'Disposed',
  PENDING_DISPOSAL: 'Pending Disposal',

  // Permissible for Manual Override
  AVAILABLE: 'Available',
  LOST: 'Lost',
  DEFECTIVE: 'Defective',
  RETIRED: 'Retired',
} as const;

// Only statuses that exist in the DB enum and are safe for manual override
export const MANUAL_OVERRIDE_STATUSES = [
  ASSET_STATUSES.AVAILABLE,
  ASSET_STATUSES.LOST,
  ASSET_STATUSES.DEFECTIVE,
  ASSET_STATUSES.RETIRED,
];

export const WORKFLOW_GATED_STATUSES = [
  ASSET_STATUSES.ASSIGNED,
  ASSET_STATUSES.IN_REPAIR,
  ASSET_STATUSES.DISPOSED,
  ASSET_STATUSES.PENDING_DISPOSAL,
] as const;

export const STATUSES_REQUIRING_ASSIGNMENT_CLOSURE = new Set<string>([
  ASSET_STATUSES.AVAILABLE,
  ASSET_STATUSES.LOST,
  ASSET_STATUSES.DEFECTIVE,
  ASSET_STATUSES.RETIRED,
]);

// lib/theme-constants

// 1. Curated Colors mapped to Tailwind classes
export const STATUS_THEMES = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  orange: 'bg-orange-50 text-orange-700 border-orange-200',
  pink: 'bg-pink-50 text-pink-700 border-pink-200',
  gray: 'bg-gray-50 text-gray-700 border-gray-200',
  green: 'bg-green-50 text-green-700 border-green-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  slate: 'bg-slate-50 text-slate-700 border-slate-200',
} as const;

export type StatusTheme = keyof typeof STATUS_THEMES;

export const STATUS_COLORS: Array<{ label: string; value: StatusTheme; hex: string }> = [
  { label: 'Blue', value: 'blue', hex: '#3b82f6' },
  { label: 'Purple', value: 'purple', hex: '#a855f7' },
  { label: 'Orange', value: 'orange', hex: '#f97316' },
  { label: 'Pink', value: 'pink', hex: '#ec4899' },
  { label: 'Gray', value: 'gray', hex: '#64748b' },
  { label: 'Green', value: 'green', hex: '#22c55e' },
  { label: 'Red', value: 'red', hex: '#ef4444' },
  { label: 'Yellow', value: 'yellow', hex: '#eab308' },
  { label: 'Emerald', value: 'emerald', hex: '#10b981' },
  { label: 'Cyan', value: 'cyan', hex: '#06b6d4' },
  { label: 'Indigo', value: 'indigo', hex: '#6366f1' },
  { label: 'Slate', value: 'slate', hex: '#475569' },
];

// 2. Curated Icons (Strings that map to Lucide)
export const AVAILABLE_STATUS_ICONS = [
  // General Status & Alerts
  'Activity',
  'AlertCircle',
  'AlertTriangle',
  'CheckCircle2',
  'XCircle',
  'HelpCircle',
  'Info',

  // Hardware & Infrastructure
  'Box',
  'Server',
  'HardDrive',
  'Cpu',
  'Monitor',
  'Smartphone',
  'Terminal',

  // Network & Cloud
  'Cloud',
  'CloudLightning',
  'CloudOff',
  'Wifi',
  'WifiOff',
  'Network',
  'Globe',

  // Security & Access
  'Shield',
  'ShieldAlert',
  'ShieldCheck',
  'Lock',
  'Unlock',
  'Key',
  'Eye',
  'EyeOff',

  // Workflow & Lifecycle
  'Archive',
  'Clock',
  'Zap',
  'Wrench',
  'Settings',
  'Truck',
  'User',
  'Users',
  'Briefcase',
  'FileText',
];

// External Integrations

export const API_KEY_PREFIX = 'eitams_live_';

// Rate limit: reads from env, falls back to 100 req/min
export const API_RATE_LIMIT_MAX = Number(process.env.API_RATE_LIMIT_MAX) || 100;
export const API_RATE_LIMIT_WINDOW_SECONDS = Number(process.env.API_RATE_LIMIT_WINDOW_SECONDS) || 60;
