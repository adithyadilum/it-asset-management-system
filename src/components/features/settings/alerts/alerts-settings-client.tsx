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
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { tiqriToast } from '@/components/shared/sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
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
      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-10 bg-slate-50/50">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Header Summary Skeleton */}
          <div className="flex flex-col gap-1.5 border-b border-slate-100 pb-5">
            <Skeleton className="h-8 w-64 rounded-md" />
            <Skeleton className="h-4 w-96 mt-2 rounded-md" />
          </div>

          {/* Pulsing Category Skeletons */}
          {[1, 2, 3].map((catId) => (
            <section key={catId} className="space-y-4">
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40 rounded-md" />
                  <Skeleton className="h-3 w-60 rounded-md" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5">
                {[1, 2].map((cardId) => (
                  <div
                    key={cardId}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-6 rounded-xl border border-slate-150 bg-white p-6 shadow-xs"
                  >
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start gap-3">
                        <Skeleton className="h-7 w-7 rounded-md shrink-0" />
                        <div className="space-y-2 flex-1">
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
    <div className="flex-1 overflow-y-auto px-6 py-8 space-y-10 bg-slate-50/50">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Summary */}
        <div className="flex flex-col gap-1.5 border-b border-slate-100 pb-5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Alerts & Notifications</h1>
          <p className="text-sm text-slate-500">
            Define system-wide threshold metrics and channel routing rules for automated alerts.
          </p>
        </div>

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
                <div>
                  <h2 className="text-lg font-semibold text-[#040d5a]">
                    {category.title}
                  </h2>
                  <p className="text-xs text-slate-500">{category.description}</p>
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
                        "relative flex flex-col md:flex-row md:items-center justify-between gap-6 rounded-xl border bg-white p-6 shadow-xs transition-all duration-200",
                        rule.isEnabled 
                          ? "border-slate-200 hover:border-slate-300 shadow-sm"
                          : "border-slate-100 bg-slate-50/40 opacity-70"
                      )}
                    >
                      {/* Left Block: Icon, Title & Optional Threshold Selector */}
                      <div className="flex-1 space-y-4">
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "mt-0.5 flex h-7 w-7 items-center justify-center rounded-md border",
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
                          <div className="space-y-1">
                            <span className="font-text-sm-semi-bold text-sm font-semibold leading-5 text-slate-900">
                              {displayName}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className={cn(
                                "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.25 rounded",
                                rule.isEnabled 
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                                  : "bg-slate-100 text-slate-500 border border-slate-200"
                              )}>
                                {rule.isEnabled ? 'Active' : 'Disabled'}
                              </span>
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
                              value={String(rule.thresholdDays)}
                              onValueChange={(val) =>
                                handleUpdateRule(rule.id, {
                                  thresholdDays: parseInt(val, 10),
                                })
                              }
                            >
                              <SelectTrigger className="h-8 min-w-[100px] border-slate-200 bg-white hover:border-slate-300 font-medium">
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
                            <span className="text-xs font-medium text-slate-500">
                              Before Expiry
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Right Block: Toggle Switch & Channels */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-6 self-start md:self-center shrink-0">
                        {/* Channels Checklist */}
                        <div className="space-y-2.5">
                          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
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
                                <span className="text-xs font-medium">In-App</span>
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
                                <span className="text-xs font-medium">Email</span>
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
                                <span className="text-xs font-medium">MS Teams</span>
                              </div>
                            </label>
                          </div>
                        </div>

                        {/* Divider for screens */}
                        <div className="hidden sm:block h-10 w-px bg-slate-100" />

                        {/* Master Segmented Toggle Pill (On / Off) */}
                        <div className="space-y-2">
                          <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                            Status
                          </span>
                          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50/80 p-0.5 shadow-inner">
                            <button
                              type="button"
                              disabled={isRuleUpdating}
                              onClick={() => handleUpdateRule(rule.id, { isEnabled: true })}
                              className={cn(
                                "rounded-md px-3.5 py-1 text-xs font-semibold transition-all duration-200",
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
                                "rounded-md px-3.5 py-1 text-xs font-semibold transition-all duration-200",
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
      </div>
    </div>
  );
}
