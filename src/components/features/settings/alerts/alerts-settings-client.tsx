'use client';

import React, { useEffect, useState } from 'react';
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  ShieldCheck, 
  Activity, 
  Loader2,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getIntegrationStatus,
  saveIntegrationSettings,
  testIntegrationConnection,
} from '@/actions/notifications';
import { tiqriToast } from '@/components/shared/sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import { StatusBadge } from '@/components/shared/status-badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface NotificationRule {
  id: number;
  ruleKey: string;
  displayName: string;
  category: 'HARDWARE_LIFECYCLE' | 'OPERATIONAL' | 'SECURITY' | 'FINANCIAL';
  isEnabled: boolean;
  thresholdDays: number | null;
  channelInApp: boolean;
  channelEmail: boolean;
  channelTeams: boolean;
  updatedAt: string;
}

const UI_CATEGORIES = [
  {
    id: 'hardware-lifecycle',
    title: 'Hardware Lifecycle',
    description: 'Configure reminders for hardware warranty expiration and software licensing renewal warning thresholds.',
    icon: Calendar,
    ruleKeys: ['WARRANTY_EXPIRY_WARNING', 'SOFTWARE_LICENSE_RENEWAL'],
  },
  {
    id: 'operational-workflows',
    title: 'Operational Workflows',
    description: 'Manage alerts for everyday operations including asset returns, maintenance tickets, and disposal approvals.',
    icon: Activity,
    ruleKeys: [
      'RETURN_OVERDUE',
      'MAINTENANCE_COMPLETED',
      'ASSIGNMENT_PENDING',
      'DISPOSAL_REQUEST',
    ],
  },
  {
    id: 'security-audits',
    title: 'Security & Audits',
    description: 'Set alerts for security incidents, role elevations, and critical asset events.',
    icon: ShieldCheck,
    ruleKeys: [
      'ROLE_CHANGE',
      'DISPOSAL_APPROVED',
      'DISPOSAL_REJECTED',
      'ASSET_DEFECTIVE_REPORTED',
    ],
  },
];

const CUSTOM_DISPLAY_NAMES: Record<string, string> = {
  WARRANTY_EXPIRY_WARNING: 'Warranty Expiration Warning',
  SOFTWARE_LICENSE_RENEWAL: 'Software License Renewal Warning',
  ASSIGNMENT_PENDING: 'Pending Asset Assignment',
  RETURN_OVERDUE: 'Repair Ticket Past Due (Expected Return Date Missed)',
  MAINTENANCE_COMPLETED: 'Maintenance Ticket Completed',
  ASSET_DEFECTIVE_REPORTED: 'Asset Defect Reported',
  DISPOSAL_REQUEST: 'New Disposal Request Pending Approval',
  DISPOSAL_APPROVED: 'Disposal Request Approved',
  DISPOSAL_REJECTED: 'Disposal Request Rejected',
  ROLE_CHANGE: 'User Role Elevated to Global Admin',
};

export function AlertsSettingsClient() {
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const [integrations, setIntegrations] = useState<{ resendConfigured: boolean; teamsConfigured: boolean } | null>(null);
  const [resendKey, setResendKey] = useState('');
  const [teamsUrl, setTeamsUrl] = useState('');
  const [savingIntegrations, setSavingIntegrations] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testingTeams, setTestingTeams] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function checkIntegrations() {
      try {
        const res = await getIntegrationStatus();
        if (res.success && res.data) {
          setIsAdmin(true);
          setIntegrations(res.data);
          if (res.data.resendConfigured) setResendKey('••••••••');
          if (res.data.teamsConfigured) setTeamsUrl('••••••••');
        }
      } catch {
        console.warn('User does not have access to integration settings.');
      }
    }
    checkIntegrations();
  }, []);

  const handleTestEmail = async () => {
    if (!resendKey) {
      tiqriToast.error('Please input or configure a Resend API key first');
      return;
    }
    setTestingEmail(true);
    try {
      const res = await testIntegrationConnection('email', { resendApiKey: resendKey });
      if (res.success) {
        tiqriToast.success('Test connection email sent successfully! Please check your inbox.');
      } else {
        tiqriToast.error(res.error || 'Resend connection test failed');
      }
    } catch {
      tiqriToast.error('Failed to contact diagnostic servers');
    } finally {
      setTestingEmail(false);
    }
  };

  const handleTestTeams = async () => {
    if (!teamsUrl) {
      tiqriToast.error('Please input or configure an MS Teams Webhook URL first');
      return;
    }
    setTestingTeams(true);
    try {
      const res = await testIntegrationConnection('teams', { teamsWebhookUrl: teamsUrl });
      if (res.success) {
        tiqriToast.success('Teams test card posted successfully! Please check your Teams channel.');
      } else {
        tiqriToast.error(res.error || 'Teams webhook connection test failed');
      }
    } catch {
      tiqriToast.error('Failed to contact webhook diagnostic servers');
    } finally {
      setTestingTeams(false);
    }
  };

  const handleSaveIntegrations = async () => {
    setSavingIntegrations(true);
    try {
      const payload: Partial<{ resendApiKey: string; teamsWebhookUrl: string }> = {};
      if (resendKey && resendKey !== '••••••••') payload.resendApiKey = resendKey;
      if (teamsUrl && teamsUrl !== '••••••••') payload.teamsWebhookUrl = teamsUrl;

      if (Object.keys(payload).length === 0) {
        tiqriToast.info('No changes to save.');
        setSavingIntegrations(false);
        return;
      }

      const res = await saveIntegrationSettings(payload);
      if (res.success) {
        tiqriToast.success('External integrations saved successfully!');
        setIntegrations((prev) => {
          if (!prev) return prev;
          return {
            resendConfigured: payload.resendApiKey ? true : prev.resendConfigured,
            teamsConfigured: payload.teamsWebhookUrl ? true : prev.teamsConfigured,
          };
        });
        if (payload.resendApiKey) setResendKey('••••••••');
        if (payload.teamsWebhookUrl) setTeamsUrl('••••••••');
      } else {
        tiqriToast.error(res.error || 'Failed to save integrations settings');
      }
    } catch {
      tiqriToast.error('Connection failed. Integrations not saved.');
    } finally {
      setSavingIntegrations(false);
    }
  };

  useEffect(() => {
    async function fetchRules() {
      try {
        const response = await fetch('/api/v1/settings/notification-rules');
        const json = await response.json();
        if (json.success) {
          setRules(json.data);
        } else {
          tiqriToast.error('Failed to load alert configurations');
        }
      } catch (error) {
        console.error('Error fetching notification rules:', error);
        tiqriToast.error('Failed to connect to notification settings API');
      } finally {
        setLoading(false);
      }
    }

    fetchRules();
  }, []);

  const handleUpdateRule = async (
    ruleId: number,
    updatedFields: Partial<Omit<NotificationRule, 'id' | 'ruleKey' | 'displayName' | 'category' | 'updatedAt'>>
  ) => {
    const previousRules = [...rules];

    // Optimistically update local UI state
    setRules((prevRules) =>
      prevRules.map((rule) =>
        rule.id === ruleId ? { ...rule, ...updatedFields } as NotificationRule : rule
      )
    );

    setUpdatingId(ruleId);

    try {
      const targetRule = rules.find((r) => r.id === ruleId);
      if (!targetRule) return;

      const payload = {
        isEnabled: updatedFields.isEnabled !== undefined ? updatedFields.isEnabled : targetRule.isEnabled,
        thresholdDays: updatedFields.thresholdDays !== undefined ? updatedFields.thresholdDays : targetRule.thresholdDays,
        channelInApp: updatedFields.channelInApp !== undefined ? updatedFields.channelInApp : targetRule.channelInApp,
        channelEmail: updatedFields.channelEmail !== undefined ? updatedFields.channelEmail : targetRule.channelEmail,
        channelTeams: updatedFields.channelTeams !== undefined ? updatedFields.channelTeams : targetRule.channelTeams,
      };

      const response = await fetch(`/api/v1/settings/notification-rules/${ruleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await response.json();

      if (json.success) {
        tiqriToast.success(`Alert rule updated successfully`);
      } else {
        setRules(previousRules);
        tiqriToast.error(json.error || 'Failed to save alert rule');
      }
    } catch (error) {
      console.error('Error updating notification rule:', error);
      setRules(previousRules);
      tiqriToast.error('Connection failed. Settings not saved.');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Header Summary Skeleton */}
          <Skeleton className="h-8 w-64 rounded-md" />

          {/* Pulsing Category Skeletons */}
          {[1, 2, 3].map((catId) => (
            <section key={catId} className="space-y-4">
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="flex items-center gap-1.5">
                  <Skeleton className="h-5 w-40 rounded-md" />
                  <Skeleton className="h-4.5 w-4.5 rounded-full" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5">
                {[1, 2].map((cardId) => (
                  <div
                    key={cardId}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-6 rounded-xl border border-slate-200 bg-white p-6"
                  >
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start gap-3">
                        <Skeleton className="h-7 w-7 rounded-md shrink-0" />
                        <div className="space-y-3 flex-1">
                          <Skeleton className="h-5 w-72 rounded-md" />
                          <Skeleton className="h-3.5 w-24 rounded-md" />
                        </div>
                      </div>
                      {/* Placeholder for threshold select if applicable */}
                      {catId === 1 && (
                        <div className="flex items-center gap-2 pl-10">
                          <Skeleton className="h-8 w-24 rounded-lg" />
                          <Skeleton className="h-4 w-20 rounded-md" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center gap-6 self-start md:self-center shrink-0">
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-16 rounded-md" />
                        <div className="flex items-center gap-5">
                          <Skeleton className="h-4 w-12 rounded-md" />
                          <Skeleton className="h-4 w-12 rounded-md" />
                          <Skeleton className="h-4 w-16 rounded-md" />
                        </div>
                      </div>
                      <div className="hidden sm:block h-10 w-px bg-slate-100" />
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-12 rounded-md" />
                        <Skeleton className="h-7 w-24 rounded-lg" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Summary */}
        <h1 className={`${TYPOGRAPHY_CLASSNAMES.text2xlSemiBold} text-slate-900`}>Alerts & Notifications</h1>

        {/* Categories rendering */}
        {UI_CATEGORIES.map((category) => {
          const categoryRules = rules.filter((rule) =>
            category.ruleKeys.includes(rule.ruleKey)
          );

          if (categoryRules.length === 0) return null;

          const CategoryIcon = category.icon;

          return (
            <section key={category.id} className="space-y-4">
              {/* Category Header */}
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#040d5a]/10 text-[#040d5a]">
                  <CategoryIcon className="h-4.5 w-4.5" />
                </div>
                <div className="flex items-center gap-1.5">
                  <h2 className={`${TYPOGRAPHY_CLASSNAMES.textLgSemiBold} text-[#040d5a]`}>
                    {category.title}
                  </h2>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button 
                          type="button" 
                          aria-label={`About ${category.title}`}
                          className="flex h-5 w-5 items-center justify-center text-slate-400 hover:text-[#040d5a] rounded-full transition-colors cursor-pointer"
                        >
                          <Info className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent 
                        side="right" 
                        className="max-w-xs border border-slate-700 bg-slate-900 text-white p-3 rounded-lg shadow-md"
                      >
                        <p className={`${TYPOGRAPHY_CLASSNAMES.textXsRegular} leading-normal`}>{category.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 gap-5">
                {categoryRules.map((rule) => {
                  const hasThreshold = rule.thresholdDays !== null;
                  const isRuleUpdating = updatingId === rule.id;
                  const displayName = CUSTOM_DISPLAY_NAMES[rule.ruleKey] || rule.displayName;

                  return (
                    <div
                      key={rule.id}
                      className={cn(
                        "relative flex flex-col md:flex-row md:items-center justify-between gap-6 rounded-xl border bg-white p-6 transition-all duration-200",
                        rule.isEnabled 
                          ? "border-slate-200 hover:border-slate-300"
                          : "border-slate-200 bg-slate-50/40 opacity-70"
                      )}
                    >
                      {/* Left Block: Icon, Title & Optional Threshold Selector */}
                      <div className="flex-1 space-y-4">
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border",
                            rule.isEnabled
                              ? "bg-slate-50 border-slate-200 text-[#040d5a]"
                              : "bg-slate-100 border-slate-150 text-slate-400"
                          )}>
                            {rule.isEnabled ? (
                              <CheckCircle className="h-4 w-4 text-[#040d5a]" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-slate-400" />
                            )}
                          </div>
                          <div className="space-y-3">
                            <h3 className={`${TYPOGRAPHY_CLASSNAMES.textSmSemiBold} text-slate-900 block`}>
                              {displayName}
                            </h3>
                            <div className="flex items-center gap-2">
                              <StatusBadge 
                                value={rule.isEnabled ? 'active' : 'inactive'} 
                                label={rule.isEnabled ? 'Active' : 'Disabled'} 
                                showIcon={true} 
                              />
                              {isRuleUpdating && (
                                <span className="flex items-center gap-1 text-[10px] text-slate-400">
                                  <Loader2 className="h-2.5 w-2.5 animate-spin" /> Saving...
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Optional Threshold Selector Row */}
                        {hasThreshold && (
                          <div className="flex items-center gap-2 pl-10">
                            <Select
                              disabled={!rule.isEnabled || isRuleUpdating}
                              value={String(rule.thresholdDays ?? 30)}
                              onValueChange={(val) =>
                                handleUpdateRule(rule.id, {
                                  thresholdDays: parseInt(val, 10),
                                })
                              }
                            >
                              <SelectTrigger className={cn("h-8 min-w-[100px] border-slate-200 bg-white hover:border-slate-300", TYPOGRAPHY_CLASSNAMES.textSmMedium)}>
                                <SelectValue placeholder="Select period" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="7">7 days</SelectItem>
                                <SelectItem value="15">15 days</SelectItem>
                                <SelectItem value="30">30 days</SelectItem>
                                <SelectItem value="60">60 days</SelectItem>
                                <SelectItem value="90">90 days</SelectItem>
                              </SelectContent>
                            </Select>
                            <span className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-slate-500`}>
                              Before Expiry
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Right Block: Toggle Switch & Channels */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-6 self-start md:self-center shrink-0">
                        {/* Channels Checklist */}
                        <div className="space-y-2.5">
                          <span className={`${TYPOGRAPHY_CLASSNAMES.textXsMedium} uppercase tracking-wider text-slate-400`}>
                            Channels
                          </span>
                          <div className="flex items-center gap-5">
                            {/* In App */}
                            <label className="flex items-center gap-2 cursor-pointer group">
                              <Checkbox
                                disabled={!rule.isEnabled || isRuleUpdating}
                                checked={rule.channelInApp}
                                onCheckedChange={(checked) =>
                                  handleUpdateRule(rule.id, {
                                    channelInApp: !!checked,
                                  })
                                }
                              />
                              <div className="flex items-center gap-1 text-slate-600 group-hover:text-slate-900 transition-colors">
                                <Bell className="h-3.5 w-3.5" />
                                <span className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular}`}>In-App</span>
                              </div>
                            </label>

                            {/* Email */}
                            <label className="flex items-center gap-2 cursor-pointer group">
                              <Checkbox
                                disabled={!rule.isEnabled || isRuleUpdating}
                                checked={rule.channelEmail}
                                onCheckedChange={(checked) =>
                                  handleUpdateRule(rule.id, {
                                    channelEmail: !!checked,
                                  })
                                }
                              />
                              <div className="flex items-center gap-1 text-slate-600 group-hover:text-slate-900 transition-colors">
                                <Mail className="h-3.5 w-3.5" />
                                <span className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular}`}>Email</span>
                              </div>
                            </label>

                            {/* Teams */}
                            <label className="flex items-center gap-2 cursor-pointer group">
                              <Checkbox
                                disabled={!rule.isEnabled || isRuleUpdating}
                                checked={rule.channelTeams}
                                onCheckedChange={(checked) =>
                                  handleUpdateRule(rule.id, {
                                    channelTeams: !!checked,
                                  })
                                }
                              />
                              <div className="flex items-center gap-1 text-slate-600 group-hover:text-slate-900 transition-colors">
                                <MessageSquare className="h-3.5 w-3.5" />
                                <span className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular}`}>MS Teams</span>
                              </div>
                            </label>
                          </div>
                        </div>

                        {/* Divider for screens */}
                        <div className="hidden sm:block h-10 w-px bg-slate-100" />

                        {/* Master Segmented Toggle Pill (On / Off) */}
                        <div className="space-y-2">
                          <span className={`block ${TYPOGRAPHY_CLASSNAMES.textXsMedium} uppercase tracking-wider text-slate-400`}>
                            Status
                          </span>
                          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50/80 p-0.5 shadow-inner">
                            <button
                              type="button"
                              disabled={isRuleUpdating}
                              onClick={() => handleUpdateRule(rule.id, { isEnabled: true })}
                              className={cn(
                                "rounded-md px-3.5 py-1 transition-all duration-200",
                                TYPOGRAPHY_CLASSNAMES.textXsMedium,
                                rule.isEnabled
                                  ? "bg-white text-[#040d5a] shadow-xs"
                                  : "text-slate-400 hover:text-slate-600"
                              )}
                            >
                              On
                            </button>
                            <button
                              type="button"
                              disabled={isRuleUpdating}
                              onClick={() => handleUpdateRule(rule.id, { isEnabled: false })}
                              className={cn(
                                "rounded-md px-3.5 py-1 transition-all duration-200",
                                TYPOGRAPHY_CLASSNAMES.textXsMedium,
                                !rule.isEnabled
                                  ? "bg-white text-slate-900 shadow-xs"
                                  : "text-slate-400 hover:text-slate-600"
                              )}
                            >
                              Off
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* Integrations Configuration Section */}
        {isAdmin && integrations && (
          <section className="space-y-6 mt-8 border-t border-slate-200 pt-8">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#040d5a]/10 text-[#040d5a]">
                <Info className="h-4.5 w-4.5" />
              </div>
              <h2 className={`${TYPOGRAPHY_CLASSNAMES.textLgSemiBold} text-[#040d5a]`}>
                External Service Integrations
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Resend Card */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-[#040d5a]" />
                  <h3 className={`${TYPOGRAPHY_CLASSNAMES.textSmSemiBold} text-slate-900`}>
                    Resend Email Integration
                  </h3>
                </div>
                <p className={`${TYPOGRAPHY_CLASSNAMES.textXsRegular} text-slate-500 leading-normal`}>
                  Configure your Resend API Key to send automated alerts directly to users&apos; registered corporate email boxes.
                </p>
                <div className="space-y-1.5">
                  <label htmlFor="resend-key-input" className={`${TYPOGRAPHY_CLASSNAMES.textXsMedium} text-slate-400 uppercase tracking-wider`}>
                    Resend API Key
                  </label>
                  <input
                    id="resend-key-input"
                    type="password"
                    placeholder={integrations.resendConfigured ? '••••••••' : 're_...'}
                    value={resendKey === '••••••••' ? '••••••••' : resendKey}
                    onChange={(e) => setResendKey(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-hidden focus:ring-1 focus:ring-[#040d5a] focus:border-[#040d5a]"
                  />
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    disabled={testingEmail || savingIntegrations}
                    onClick={handleTestEmail}
                    className="flex items-center justify-center gap-1.5 h-8 px-4 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 transition-all cursor-pointer"
                  >
                    {testingEmail ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                    Test Connection
                  </button>
                </div>
              </div>

              {/* Teams Card */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-[#040d5a]" />
                  <h3 className={`${TYPOGRAPHY_CLASSNAMES.textSmSemiBold} text-slate-900`}>
                    MS Teams Webhook
                  </h3>
                </div>
                <p className={`${TYPOGRAPHY_CLASSNAMES.textXsRegular} text-slate-500 leading-normal`}>
                  Configure the Incoming Webhook URL to deliver high-priority alerts directly to designated MS Teams channels.
                </p>
                <div className="space-y-1.5">
                  <label htmlFor="teams-url-input" className={`${TYPOGRAPHY_CLASSNAMES.textXsMedium} text-slate-400 uppercase tracking-wider`}>
                    Webhook URL
                  </label>
                  <input
                    id="teams-url-input"
                    type="text"
                    placeholder={integrations.teamsConfigured ? '••••••••' : 'https://outlook.office.com/webhook/...'}
                    value={teamsUrl === '••••••••' ? '••••••••' : teamsUrl}
                    onChange={(e) => setTeamsUrl(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-hidden focus:ring-1 focus:ring-[#040d5a] focus:border-[#040d5a]"
                  />
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    disabled={testingTeams || savingIntegrations}
                    onClick={handleTestTeams}
                    className="flex items-center justify-center gap-1.5 h-8 px-4 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 transition-all cursor-pointer"
                  >
                    {testingTeams ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                    Test Webhook
                  </button>
                </div>
              </div>
            </div>

            {/* Master Action: Save Integrations Settings */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={savingIntegrations}
                onClick={handleSaveIntegrations}
                className="flex items-center justify-center gap-2 h-10 px-6 rounded-lg bg-[#040d5a] hover:bg-[#03093e] text-white text-sm font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
              >
                {savingIntegrations ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save Integration Settings
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
