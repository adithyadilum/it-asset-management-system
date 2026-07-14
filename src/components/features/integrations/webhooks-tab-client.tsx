'use client';

import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import type { WebhookSubscriptionDisplay } from '@/types/integrations';

import { CreateWebhookDialog } from './create-webhook-dialog';
import { WebhookTable } from '@/components/features/integrations/webhook-table';

interface WebhooksTabClientProps {
  subscriptions: WebhookSubscriptionDisplay[];
}

export function WebhooksTabClient({ subscriptions }: WebhooksTabClientProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleChanged = () => {
    router.refresh();
  };

  const filteredSubscriptions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return subscriptions;
    }

    return subscriptions.filter((subscription) => {
      const searchableEvents = subscription.events.join(' ').toLowerCase();

      return (
        subscription.name.toLowerCase().includes(query) ||
        subscription.url.toLowerCase().includes(query) ||
        searchableEvents.includes(query) ||
        subscription.createdByName.toLowerCase().includes(query)
      );
    });
  }, [searchQuery, subscriptions]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-3">
        <div className="relative w-full max-w-none sm:max-w-[320px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search Webhooks ..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className={`h-9 rounded-lg border-border bg-background pl-9 placeholder:text-muted-foreground ${TYPOGRAPHY_CLASSNAMES.textSmRegular}`}
          />
        </div>

        <Button
          onClick={() => setCreateOpen(true)}
          size="sm"
          className={`flex w-full sm:w-auto items-center justify-center sm:justify-start gap-2 bg-primary text-primary-foreground hover:bg-primary/90 ${TYPOGRAPHY_CLASSNAMES.textSmMedium}`}
        >
          <Plus className="h-4 w-4" />
          Add Webhook
        </Button>
      </div>

      {filteredSubscriptions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted px-6 py-12 text-center">
          <h4
            className={`${TYPOGRAPHY_CLASSNAMES.textLgSemiBold} text-foreground`}
          >
            No webhooks yet
          </h4>
          <p
            className={`mt-2 text-muted-foreground ${TYPOGRAPHY_CLASSNAMES.textSmRegular}`}
          >
            Create a webhook subscription to send EITAMS events to your external
            systems.
          </p>
        </div>
      ) : (
        <WebhookTable
          subscriptions={filteredSubscriptions}
          onChanged={handleChanged}
        />
      )}

      <CreateWebhookDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleChanged}
      />
    </div>
  );
}
