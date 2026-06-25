import { requirePageAuth } from '@/lib/auth/page-guard'
import { getApiKeys, getWebhookSubscriptions } from '@/lib/data/integrations-repo'
import { ModuleNavigationTabs } from '@/components/shared/module-navigation-tabs'
import { ApiKeysTab } from '@/components/features/integrations/api-keys-tab'
import { WebhooksTab } from '@/components/features/integrations/webhooks-tab'
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography'
import { Button } from '@/components/ui/button'
import { BookOpen } from 'lucide-react'

export default async function IntegrationsPage() {
  await requirePageAuth((role) => role === 'GlobalAdmin')

  const apiKeys = await getApiKeys()
  const webhookSubscriptions = await getWebhookSubscriptions()

  const tabs = [
    { id: 'api-keys', label: 'API Keys', content: <ApiKeysTab keys={apiKeys} /> },
    { id: 'webhooks', label: 'Webhooks', content: <WebhooksTab subscriptions={webhookSubscriptions} /> },
  ]

  const header = (
    <div className="flex items-center justify-between">
      <h1 className={`${TYPOGRAPHY_CLASSNAMES.text2xlSemiBold} text-foreground`}>Integrations & API</h1>
      <Button asChild variant="outline" size="sm" className="gap-2">
        <a href="/api-docs/index.html" target="_blank" rel="noopener noreferrer">
          <BookOpen className="h-4 w-4" />
          View API Documentation
        </a>
      </Button>
    </div>
  )

  return (
    <div className="flex flex-1 flex-col p-4 md:p-6 min-h-0">
      <ModuleNavigationTabs tabs={tabs} defaultTab="api-keys" header={header} containerClassName="flex-1 flex flex-col min-h-0" />
    </div>
  )
}
