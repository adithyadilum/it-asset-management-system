import { getAuthenticatedUser } from '@/actions/auth'
import { getApiKeys } from '@/lib/data/integrations-repo'
import { ModuleNavigationTabs } from '@/components/shared/module-navigation-tabs'
import { ApiKeysTab } from '@/components/features/integrations/api-keys-tab'

export default async function IntegrationsPage() {
  const user = await getAuthenticatedUser()

  if (!user || user.role !== 'GlobalAdmin') {
    return <div className="p-6 text-sm text-slate-600">You do not have permission to view this page.</div>
  }

  const apiKeys = await getApiKeys()

  const tabs = [
    { id: 'api-keys', label: 'API Keys', content: <ApiKeysTab keys={apiKeys} /> },
    { id: 'webhooks', label: 'Webhooks', content: <div className="p-6">Webhooks coming soon.</div> },
  ]

  return (
    <div className="p-6">
      <ModuleNavigationTabs tabs={tabs} defaultTab="api-keys" />
    </div>
  )
}
