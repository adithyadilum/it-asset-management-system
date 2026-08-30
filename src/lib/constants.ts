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
  blue: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800',
  purple:
    'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800',
  orange:
    'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800',
  pink: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/30 dark:text-pink-400 dark:border-pink-800',
  gray: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-zinc-900/30 dark:text-zinc-400 dark:border-zinc-800',
  green:
    'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800',
  red: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
  yellow:
    'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-800',
  emerald:
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800',
  cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/30 dark:text-cyan-400 dark:border-cyan-800',
  indigo:
    'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800',
  slate:
    'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-800',
  // Already stored against custom statuses in the database but missing from
  // this map, so those statuses fell through to the grey fallback in both the
  // badge and the inventory donut -- the admin's chosen colour never appeared.
  violet:
    'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800',
  amber:
    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
} as const;

export type StatusTheme = keyof typeof STATUS_THEMES;

export const STATUS_COLORS: Array<{
  label: string;
  value: StatusTheme;
  hex: string;
}> = [
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
  { label: 'Violet', value: 'violet', hex: '#8b5cf6' },
  { label: 'Amber', value: 'amber', hex: '#d97706' },
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

// Rate limit: defaults to 100 req/min if not configured
export const API_RATE_LIMIT_MAX = 100;
export const API_RATE_LIMIT_WINDOW_SECONDS = 60;

// Bulk import
//
// Imports are submitted through a Server Action, and `serverActions.bodySizeLimit`
// in next.config.ts caps the whole request at 5 MB. A ceiling above that cap is
// unreachable: the framework rejects the request before the action body runs, so
// the user sees an opaque error instead of a validation message. Keep this value
// below that limit, and change both together.
export const MAX_IMPORT_FILE_BYTES = Math.floor(4.5 * 1024 * 1024);
export const MAX_IMPORT_FILE_LABEL = '4.5MB';

// Support
//
// Every "contact support" affordance in the app points here. Before this there
// was no support address anywhere in the codebase: the sidebar Support button
// navigated back to the dashboard, the 403 page's "Contact IT Support" button
// had no handler at all, and five different pages each invented their own
// wording ("your administrator", "your IT administrator", "the IT Helpdesk",
// "IT Support", "TIQRI IT Support") with nothing clickable behind any of them.
//
// TODO(owner): replace both placeholders with the real values before release.
// Everything already reads from here, so it is a two-line change.
export const SUPPORT_EMAIL = 'it-support@tiqri.com';
export const SUPPORT_URL = 'https://support.tiqri.com';

/** `mailto:` href, with a subject so tickets arrive pre-labelled. */
export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
  'EITAMS support request'
)}`;

/** One phrase, used everywhere, instead of five near-synonyms. */
export const SUPPORT_LABEL = 'IT Support';
