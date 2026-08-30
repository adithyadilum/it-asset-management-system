// ---------------------------------------------------------------------------
// API Key Types
// ---------------------------------------------------------------------------

export const API_KEY_SCOPES = [
  'read:assets',
  'read:assets:by-user',
  'write:assets',
  'read:users',
  'read:maintenance',
  'read:disposals',
  'read:financials',
] as const;

export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

// Grouped for the UI scope selector
export const API_KEY_SCOPE_GROUPS: Record<
  string,
  { scope: ApiKeyScope; label: string; description: string }[]
> = {
  Assets: [
    {
      scope: 'read:assets',
      label: 'Read Assets',
      description: 'View full asset inventory',
    },
    {
      scope: 'read:assets:by-user',
      label: 'Read Assets by User',
      description: 'Lookup assets assigned to a specific employee',
    },
    {
      scope: 'write:assets',
      label: 'Write Assets',
      description: 'Create and update assets via API',
    },
  ],
  Users: [
    {
      scope: 'read:users',
      label: 'Read Users',
      description: 'View user directory',
    },
  ],
  Operations: [
    {
      scope: 'read:maintenance',
      label: 'Read Maintenance',
      description: 'View maintenance tickets',
    },
    {
      scope: 'read:disposals',
      label: 'Read Disposals',
      description: 'View disposal requests',
    },
  ],
  Finance: [
    {
      scope: 'read:financials',
      label: 'Read Financials',
      description: 'View financial data and depreciation',
    },
  ],
};

// What the UI displays (plaintext key is NEVER included)
export type ApiKeyDisplay = {
  id: string;
  name: string;
  keyPrefix: string;
  keySuffix: string;
  scopes: ApiKeyScope[];
  createdByName: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  isRevoked: boolean;
  isExpired: boolean; // Computed: expiresAt !== null && expiresAt < now
  createdAt: Date;
};

// ---------------------------------------------------------------------------
// Webhook Types
// ---------------------------------------------------------------------------

export const WEBHOOK_EVENT_TYPES = [
  'asset.created',
  'asset.status_changed',
  'assignment.created',
  'assignment.returned',
  'maintenance.created',
  'maintenance.completed',
  'disposal.requested',
  'disposal.approved',
  'ping',
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

// Grouped for the UI event selector checkboxes
export const WEBHOOK_EVENT_GROUPS: Record<
  string,
  { event: WebhookEventType; label: string }[]
> = {
  'Asset Lifecycle': [
    { event: 'asset.created', label: 'Asset Created' },
    { event: 'asset.status_changed', label: 'Asset Status Changed' },
  ],
  Assignments: [
    { event: 'assignment.created', label: 'Assignment Created' },
    { event: 'assignment.returned', label: 'Assignment Returned' },
  ],
  Maintenance: [
    { event: 'maintenance.created', label: 'Maintenance Ticket Created' },
    { event: 'maintenance.completed', label: 'Maintenance Completed' },
  ],
  Disposals: [
    { event: 'disposal.requested', label: 'Disposal Requested' },
    { event: 'disposal.approved', label: 'Disposal Approved' },
  ],
};

export type WebhookSubscriptionDisplay = {
  id: string;
  name: string;
  url: string;
  events: WebhookEventType[];
  isActive: boolean;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
};

// Standardized webhook event envelope
export type WebhookEnvelope = {
  event_id: string;
  event_type: WebhookEventType;
  created_at: string; // ISO 8601
  data: Record<string, unknown>;
};
