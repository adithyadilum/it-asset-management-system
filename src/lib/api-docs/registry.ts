import { extendZodWithOpenApi, OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { omniSearchQuerySchema } from '../validations/omni-search';
import { updateNotificationRuleSchema } from '../validations/settings';

// Apply the OpenAPI extensions to the Zod library
extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

// ==========================================
// 1. Security Components Registration
// ==========================================

registry.registerComponent('securitySchemes', 'MobileBearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'Mobile authorization JWT token (issued during device pairing)',
});

registry.registerComponent('securitySchemes', 'CookieAuth', {
  type: 'apiKey',
  in: 'cookie',
  name: 'next-auth.session-token',
  description: 'Session cookie used for web UI application authentication',
});

registry.registerComponent('securitySchemes', 'X-API-Key', {
  type: 'apiKey',
  in: 'header',
  name: 'x-api-key',
  description: 'External integration API key (sent in request headers)',
});

// ==========================================
// 2. Shared Schema Definitions
// ==========================================

const ErrorResponseSchema = registry.register(
  'ErrorResponse',
  z.object({
    error: z.string().openapi({ description: 'The error message details.' }),
  })
);

const NotificationRuleSchema = registry.register(
  'NotificationRule',
  z.object({
    id: z.number(),
    ruleKey: z.string(),
    displayName: z.string(),
    category: z.enum(['HARDWARE_LIFECYCLE', 'OPERATIONAL', 'SECURITY', 'FINANCIAL']),
    isEnabled: z.boolean(),
    thresholdDays: z.number().nullable(),
    channelInApp: z.boolean(),
    channelEmail: z.boolean(),
    channelTeams: z.boolean(),
    updatedById: z.string().nullable(),
    updatedAt: z.date(),
  })
);

// ==========================================
// 3. Path Registrations
// ==========================================

// --- Group: User Profile ---

registry.registerPath({
  method: 'get',
  path: '/v1/profile',
  summary: 'Get Authenticated User Profile',
  description: 'Returns profile details for the currently logged-in user. Authenticated via the mobile JWT Bearer token.',
  security: [{ MobileBearerAuth: [] }],
  tags: ['User Profile'],
  responses: {
    200: {
      description: 'Successful profile retrieval',
      content: {
        'application/json': {
          schema: z.object({
            data: z.object({
              id: z.string(),
              name: z.string(),
              email: z.string().email(),
              role: z.enum(['GlobalAdmin', 'ITOperator', 'FinancialAuditor', 'Employee']),
            }),
          }),
        },
      },
    },
    401: { description: 'Unauthorized (invalid or missing JWT token)', content: { 'application/json': { schema: ErrorResponseSchema } } },
    404: { description: 'User not found', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

// --- Group: Search ---

registry.registerPath({
  method: 'get',
  path: '/v1/search',
  summary: 'Omni Search',
  description: 'Performs multi-entity queries across Assets, Users, and Reports. Authenticated via the web session cookie.',
  security: [{ CookieAuth: [] }],
  tags: ['Search'],
  request: {
    query: omniSearchQuerySchema,
  },
  responses: {
    200: {
      description: 'Successful search results retrieved',
      content: {
        'application/json': {
          schema: z.object({
            query: z.string(),
            assets: z.array(
              z.object({
                id: z.string(),
                assetTag: z.string(),
                name: z.string(),
                serialNumber: z.string(),
                category: z.string(),
              })
            ),
            users: z.array(
              z.object({
                id: z.string(),
                name: z.string(),
                email: z.string().email(),
                department: z.string(),
              })
            ),
            reports: z.array(
              z.object({
                id: z.string(),
                label: z.string(),
                description: z.string(),
                href: z.string(),
              })
            ),
          }),
        },
      },
    },
    400: { description: 'Invalid search query parameter', content: { 'application/json': { schema: ErrorResponseSchema } } },
    401: { description: 'Unauthorized session', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

// --- Group: Device Operations (Scanner & Activity) ---

registry.registerPath({
  method: 'post',
  path: '/v1/scan',
  summary: 'Process QR Barcode Scan',
  description: 'Submits a scanned QR/barcode payload. Authenticated via either the Mobile JWT Bearer token or Web Dashboard session cookie.',
  security: [{ MobileBearerAuth: [] }, { CookieAuth: [] }],
  tags: ['Device Operations'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            barcode: z.string().openapi({ description: 'The scanned asset tag or serial barcode string' }),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Scan processed successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
    },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: 'get',
  path: '/v1/activity/recent',
  summary: 'Get Recent System Activities',
  description: 'Returns the 5 most recent system audit log events. Authenticated via the mobile JWT Bearer token.',
  security: [{ MobileBearerAuth: [] }],
  tags: ['Device Operations'],
  responses: {
    200: {
      description: 'Successfully fetched recent activity events',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(
              z.object({
                id: z.number(),
                action: z.string(),
                event: z.string(),
                entityType: z.string(),
                entityLabel: z.string(),
                performedBy: z
                  .object({
                    name: z.string(),
                    email: z.string(),
                  })
                  .nullable(),
                performedAt: z.date(),
              })
            ),
          }),
        },
      },
    },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

// --- Group: Notifications ---

registry.registerPath({
  method: 'get',
  path: '/v1/notifications',
  summary: 'Get Notifications',
  description: 'Returns a paginated list of notifications for the logged-in user. Authenticated via the web session cookie.',
  security: [{ CookieAuth: [] }],
  tags: ['Notifications'],
  parameters: [
    {
      name: 'limit',
      in: 'query',
      required: false,
      schema: { type: 'integer', default: 10 },
      description: 'Number of notifications to return (max 100)',
    },
    {
      name: 'offset',
      in: 'query',
      required: false,
      schema: { type: 'integer', default: 0 },
      description: 'Pagination offset',
    },
  ],
  responses: {
    200: {
      description: 'List of notifications successfully retrieved',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.array(z.any()),
            pagination: z.object({
              limit: z.number(),
              offset: z.number(),
              total: z.number(),
              returned: z.number(),
            }),
          }),
        },
      },
    },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: 'get',
  path: '/v1/notifications/unread-count',
  summary: 'Get Unread Notifications Count',
  description: 'Returns the count of unread notifications. Authenticated via the web session cookie.',
  security: [{ CookieAuth: [] }],
  tags: ['Notifications'],
  responses: {
    200: {
      description: 'Count retrieved successfully',
      content: {
        'application/json': {
          schema: z.object({
            count: z.number(),
          }),
        },
      },
    },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/v1/notifications/read-all',
  summary: 'Mark All Notifications as Read',
  description: 'Marks all notifications for the user as read. Authenticated via the web session cookie.',
  security: [{ CookieAuth: [] }],
  tags: ['Notifications'],
  responses: {
    200: {
      description: 'All notifications marked as read',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
    },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/v1/notifications/{id}/read',
  summary: 'Mark Notification as Read',
  description: 'Marks a single notification as read by ID. Authenticated via the web session cookie.',
  security: [{ CookieAuth: [] }],
  tags: ['Notifications'],
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'The unique ID of the notification' }),
    }),
  },
  responses: {
    200: {
      description: 'Notification marked as read',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.any(),
          }),
        },
      },
    },
    400: { description: 'Notification ID missing' },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponseSchema } } },
    404: { description: 'Notification not found', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: 'get',
  path: '/v1/portal/notifications',
  summary: 'Get Portal Alerts (Employee)',
  description: 'Returns alerts for the employee portal view. Authenticated via the web session cookie (Employee role required).',
  security: [{ CookieAuth: [] }],
  tags: ['Notifications'],
  responses: {
    200: {
      description: 'Portal alerts retrieved',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.array(z.any()),
          }),
        },
      },
    },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponseSchema } } },
    403: { description: 'Forbidden: Insufficient permissions', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

// --- Group: Notification Rules ---

registry.registerPath({
  method: 'get',
  path: '/v1/settings/notification-rules',
  summary: 'Get Notification Rules',
  description: 'Returns system-wide notification rule triggers. Authenticated via the web session cookie (Management permissions required).',
  security: [{ CookieAuth: [] }],
  tags: ['Notification Rules Settings'],
  responses: {
    200: {
      description: 'Notification rules retrieved successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.array(NotificationRuleSchema),
          }),
        },
      },
    },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponseSchema } } },
    403: { description: 'Forbidden: Insufficient permissions', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: 'put',
  path: '/v1/settings/notification-rules/{id}',
  summary: 'Update Notification Rule',
  description: 'Updates a specific notification rule settings by ID. Authenticated via the web session cookie (Management permissions required).',
  security: [{ CookieAuth: [] }],
  tags: ['Notification Rules Settings'],
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'The numeric database ID of the rule' }),
    }),
    body: {
      content: {
        'application/json': {
          schema: updateNotificationRuleSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Notification rule updated successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: NotificationRuleSchema,
          }),
        },
      },
    },
    400: { description: 'Validation failed or invalid JSON body', content: { 'application/json': { schema: ErrorResponseSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponseSchema } } },
    403: { description: 'Forbidden: Insufficient permissions', content: { 'application/json': { schema: ErrorResponseSchema } } },
    404: { description: 'Notification rule not found', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

// --- Group: External API Integrations ---

registry.registerPath({
  method: 'get',
  path: '/v1/external/assets',
  summary: 'Fetch Assets List',
  description: 'Retrieves hardware/software assets for third-party scripts. Authenticated via header API Key.',
  security: [{ 'X-API-Key': [] }],
  tags: ['External Integrations'],
  parameters: [
    {
      name: 'limit',
      in: 'query',
      required: false,
      schema: { type: 'integer', default: 50, minimum: 1, maximum: 200 },
      description: 'Max number of assets to return',
    },
    {
      name: 'offset',
      in: 'query',
      required: false,
      schema: { type: 'integer', default: 0, minimum: 0 },
      description: 'Offset for pagination',
    },
    {
      name: 'status',
      in: 'query',
      required: false,
      schema: { type: 'string' },
      description: 'Filter assets by status (e.g., Available, Assigned, In Repair)',
    },
    {
      name: 'pillar',
      in: 'query',
      required: false,
      schema: { type: 'string' },
      description: 'Filter assets by category pillar (e.g. Hardware, Software, Furniture)',
    },
  ],
  responses: {
    200: {
      description: 'Paginated assets successfully retrieved',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.array(z.any()),
            pagination: z.object({
              limit: z.number(),
              offset: z.number(),
              total: z.number(),
              returned: z.number(),
            }),
          }),
        },
      },
    },
    400: { description: 'Invalid limit or offset parameter', content: { 'application/json': { schema: ErrorResponseSchema } } },
    401: { description: 'Unauthorized / Invalid API Key', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: 'get',
  path: '/v1/external/assets/user/{employee_id}',
  summary: 'Fetch Assets Assigned to Employee',
  description: 'Retrieves all assets currently assigned to a user by employee UUID. Authenticated via header API Key.',
  security: [{ 'X-API-Key': [] }],
  tags: ['External Integrations'],
  request: {
    params: z.object({
      employee_id: z.string().openapi({ description: 'The UUID of the employee' }),
    }),
  },
  responses: {
    200: {
      description: 'List of assigned assets retrieved successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.object({
              employee: z.any(),
              assigned_assets: z.array(z.any()),
              total_assigned: z.number(),
            }),
          }),
        },
      },
    },
    400: { description: 'Invalid UUID format', content: { 'application/json': { schema: ErrorResponseSchema } } },
    401: { description: 'Unauthorized / Invalid API Key', content: { 'application/json': { schema: ErrorResponseSchema } } },
    404: { description: 'Employee not found', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: 'post',
  path: '/v1/external/assets',
  summary: 'Create Asset (External API)',
  description: 'Registers a new hardware, software, or office asset. Authenticated via header API Key (requires write:assets scope).',
  security: [{ 'X-API-Key': [] }],
  tags: ['External Integrations'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            pillar: z.enum(['Hardware', 'Software', 'Office Furniture', 'Office Electronics']),
            categoryId: z.number(),
            brandId: z.number(),
            modelId: z.number(),
            name: z.string(),
            serialNumber: z.string().optional(),
            locationId: z.number().optional(),
            ownerId: z.number().optional(),
            condition: z.enum(['New', 'Excellent', 'Fair', 'Poor', 'Damaged']).optional(),
            purchaseDate: z.string().openapi({ description: 'ISO Date string' }),
            basePrice: z.number(),
            shippingCost: z.number().optional(),
            tax: z.number().optional(),
            currencyCode: z.string().max(3).optional(),
            warrantyMonths: z.number().optional(),
            vendorId: z.number(),
            notes: z.string().optional(),
            instanceAttributes: z.record(z.string(), z.any()).optional(),
            licenseType: z.enum(['Perpetual', 'Subscription', 'Open Source / Free']).optional(),
            totalSeats: z.number().optional(),
            licenseStartDate: z.string().optional(),
            licenseExpiryDate: z.string().optional(),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Asset registered successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.object({
              id: z.string(),
              assetTag: z.string(),
            }),
          }),
        },
      },
    },
    400: { description: 'Validation failed or model not found', content: { 'application/json': { schema: ErrorResponseSchema } } },
    401: { description: 'Unauthorized / Invalid API Key', content: { 'application/json': { schema: ErrorResponseSchema } } },
    403: { description: 'Forbidden: Insufficient scopes', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: 'get',
  path: '/v1/external/users',
  summary: 'View User Directory',
  description: 'Retrieves EITAMS active user directory. Authenticated via header API Key (requires read:users scope).',
  security: [{ 'X-API-Key': [] }],
  tags: ['External Integrations'],
  parameters: [
    {
      name: 'limit',
      in: 'query',
      required: false,
      schema: { type: 'integer', default: 50, minimum: 1, maximum: 200 },
      description: 'Max number of users to return',
    },
    {
      name: 'offset',
      in: 'query',
      required: false,
      schema: { type: 'integer', default: 0, minimum: 0 },
      description: 'Offset for pagination',
    },
    {
      name: 'q',
      in: 'query',
      required: false,
      schema: { type: 'string' },
      description: 'Search string (matches name or email)',
    },
  ],
  responses: {
    200: {
      description: 'List of users retrieved successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.array(
              z.object({
                id: z.string(),
                name: z.string(),
                email: z.string(),
                role: z.string(),
                isActive: z.boolean(),
                createdAt: z.string(),
                department: z.object({
                  id: z.number(),
                  name: z.string(),
                  shortCode: z.string(),
                  costCenterId: z.string(),
                }).nullable(),
              })
            ),
            pagination: z.object({
              limit: z.number(),
              offset: z.number(),
              total: z.number(),
              returned: z.number(),
            }),
          }),
        },
      },
    },
    401: { description: 'Unauthorized / Invalid API Key', content: { 'application/json': { schema: ErrorResponseSchema } } },
    403: { description: 'Forbidden: Insufficient scopes', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: 'get',
  path: '/v1/external/maintenance',
  summary: 'View Maintenance Tickets',
  description: 'Retrieves list of active or completed asset maintenance tickets. Authenticated via header API Key (requires read:maintenance scope).',
  security: [{ 'X-API-Key': [] }],
  tags: ['External Integrations'],
  parameters: [
    {
      name: 'limit',
      in: 'query',
      required: false,
      schema: { type: 'integer', default: 50, minimum: 1, maximum: 200 },
      description: 'Max number of tickets to return',
    },
    {
      name: 'offset',
      in: 'query',
      required: false,
      schema: { type: 'integer', default: 0, minimum: 0 },
      description: 'Offset for pagination',
    },
    {
      name: 'status',
      in: 'query',
      required: false,
      schema: { type: 'string', enum: ['ACTIVE', 'COMPLETED', 'CANCELLED'] },
      description: 'Filter tickets by status',
    },
  ],
  responses: {
    200: {
      description: 'List of maintenance tickets retrieved successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.array(z.any()),
            pagination: z.object({
              limit: z.number(),
              offset: z.number(),
              total: z.number(),
              returned: z.number(),
            }),
          }),
        },
      },
    },
    401: { description: 'Unauthorized / Invalid API Key', content: { 'application/json': { schema: ErrorResponseSchema } } },
    403: { description: 'Forbidden: Insufficient scopes', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: 'get',
  path: '/v1/external/disposals',
  summary: 'View Disposal Requests',
  description: 'Retrieves list of asset disposal requests. Authenticated via header API Key (requires read:disposals scope).',
  security: [{ 'X-API-Key': [] }],
  tags: ['External Integrations'],
  parameters: [
    {
      name: 'limit',
      in: 'query',
      required: false,
      schema: { type: 'integer', default: 50, minimum: 1, maximum: 200 },
      description: 'Max number of requests to return',
    },
    {
      name: 'offset',
      in: 'query',
      required: false,
      schema: { type: 'integer', default: 0, minimum: 0 },
      description: 'Offset for pagination',
    },
    {
      name: 'status',
      in: 'query',
      required: false,
      schema: { type: 'string', enum: ['Pending Approval', 'Approved', 'Rejected', 'Completed'] },
      description: 'Filter requests by status',
    },
  ],
  responses: {
    200: {
      description: 'List of disposal requests retrieved successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.array(z.any()),
            pagination: z.object({
              limit: z.number(),
              offset: z.number(),
              total: z.number(),
              returned: z.number(),
            }),
          }),
        },
      },
    },
    401: { description: 'Unauthorized / Invalid API Key', content: { 'application/json': { schema: ErrorResponseSchema } } },
    403: { description: 'Forbidden: Insufficient scopes', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: 'get',
  path: '/v1/external/financials',
  summary: 'View Financial Ledger',
  description: 'Retrieves financial valuation, original pricing, and depreciation status for all active assets. Authenticated via header API Key (requires read:financials scope).',
  security: [{ 'X-API-Key': [] }],
  tags: ['External Integrations'],
  parameters: [
    {
      name: 'limit',
      in: 'query',
      required: false,
      schema: { type: 'integer', default: 50, minimum: 1, maximum: 200 },
      description: 'Max number of records to return',
    },
    {
      name: 'offset',
      in: 'query',
      required: false,
      schema: { type: 'integer', default: 0, minimum: 0 },
      description: 'Offset for pagination',
    },
  ],
  responses: {
    200: {
      description: 'Asset financial metrics retrieved successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.array(
              z.object({
                id: z.string(),
                assetTag: z.string(),
                name: z.string(),
                category: z.string(),
                purchaseDate: z.string(),
                financials: z.object({
                  basePrice: z.number(),
                  tax: z.number(),
                  shippingCost: z.number(),
                  originalCost: z.number(),
                  currencyCode: z.string(),
                  usefulLifeMonths: z.number(),
                  salvageValue: z.number(),
                  currentBookValue: z.number(),
                  accumulatedDepreciation: z.number(),
                }),
              })
            ),
            pagination: z.object({
              limit: z.number(),
              offset: z.number(),
              total: z.number(),
              returned: z.number(),
            }),
          }),
        },
      },
    },
    401: { description: 'Unauthorized / Invalid API Key', content: { 'application/json': { schema: ErrorResponseSchema } } },
    403: { description: 'Forbidden: Insufficient scopes', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

// --- Group: Mobile App Pairing Flow ---

registry.registerPath({
  method: 'post',
  path: '/auth/generate-qr',
  summary: 'Generate Device Pairing Token',
  description: 'Initiates mobile device pairing. Generates a link token stored temporarily in Redis. Authenticated via the web session cookie.',
  security: [{ CookieAuth: [] }],
  tags: ['Mobile Device Pairing Flow'],
  responses: {
    200: {
      description: 'Pairing token generated successfully',
      content: {
        'application/json': {
          schema: z.object({
            token: z.string(),
            expires_in: z.number(),
          }),
        },
      },
    },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: 'get',
  path: '/auth/check-qr-status',
  summary: 'Check Device Pairing Status',
  description: 'Polls the status of the pairing QR token. Publicly accessible (no authentication required).',
  tags: ['Mobile Device Pairing Flow'],
  parameters: [
    {
      name: 'token',
      in: 'query',
      required: true,
      schema: { type: 'string' },
      description: 'The generated pairing token string',
    },
  ],
  responses: {
    200: {
      description: 'Status of pairing returned',
      content: {
        'application/json': {
          schema: z.object({
            claimed: z.boolean(),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/auth/mobile-exchange',
  summary: 'Exchange Pairing Token for JWT',
  description: 'Exchanges a linking token for a long-lived mobile access JWT token. Publicly accessible (no authentication required).',
  tags: ['Mobile Device Pairing Flow'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            token: z.string().optional(),
            linkToken: z.string().optional(),
            deviceName: z.string(),
            deviceOs: z.string().nullable().optional(),
            deviceModel: z.string().nullable().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Link exchange completed successfully, returning JWT',
      content: {
        'application/json': {
          schema: z.object({
            accessToken: z.string(),
          }),
        },
      },
    },
    400: { description: 'Missing token', content: { 'application/json': { schema: ErrorResponseSchema } } },
    401: { description: 'QR Code expired or invalid', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: 'post',
  path: '/auth/unlink-device',
  summary: 'Revoke Device Link (Unpair)',
  description: 'Revokes a linked mobile device by ID. Authenticated via the web session cookie (device owner or GlobalAdmin required).',
  security: [{ CookieAuth: [] }],
  tags: ['Mobile Device Pairing Flow'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            deviceId: z.number().openapi({ description: 'The database ID of the linked device' }),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Device unlinked successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
    },
    400: { description: 'Missing deviceId', content: { 'application/json': { schema: ErrorResponseSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponseSchema } } },
    403: { description: 'Forbidden', content: { 'application/json': { schema: ErrorResponseSchema } } },
    404: { description: 'Device not found', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

// ==========================================
// 4. OpenAPI Specification Exporter
// ==========================================

export function getOpenApiSpec() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: 'EITAMS API Documentation',
      version: '1.0.0',
      description: 'REST API documentation for the Enterprise IT Asset Management System (EITAMS).',
    },
    servers: [
      {
        url: '/api',
        description: 'EITAMS API Root Base URL',
      },
    ],
  });
}
