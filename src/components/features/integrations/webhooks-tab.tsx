import type { WebhookSubscriptionDisplay } from '@/types/integrations';

import { WebhooksTabClient } from './webhooks-tab-client';

interface WebhooksTabProps {
  subscriptions: WebhookSubscriptionDisplay[];
}

export function WebhooksTab({ subscriptions }: WebhooksTabProps) {
  return <WebhooksTabClient subscriptions={subscriptions} />;
}
