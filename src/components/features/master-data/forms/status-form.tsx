'use client';

import { useState, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';
import type { MasterDataCustomStatusRow } from '../master-data-management-client';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import { ActiveStatusToggle } from '../active-status-toggle';
import {
  type BaseMasterDataFormProps,
  FormTextField,
  RecordIdPreview,
  READ_ONLY_INPUT_CLASSNAME,
} from './shared';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AVAILABLE_STATUS_ICONS,
  STATUS_COLORS,
  STATUS_THEMES,
  type StatusTheme,
} from '@/lib/constants';

interface StatusFormProps extends BaseMasterDataFormProps {
  initialData?: MasterDataCustomStatusRow;
}

export function StatusForm({
  initialData,
  isDetailMode,
  fieldError,
  onDirtyStateChange,
}: StatusFormProps) {
  const isEdit = !!initialData;
  const [name, setName] = useState(initialData?.name || '');
  const [iconName, setIconName] = useState(
    initialData?.iconName || 'CircleDot'
  );
  const [colorTheme, setColorTheme] = useState<StatusTheme>(
    (initialData?.colorTheme as StatusTheme) || 'gray'
  );
  const [allowedActions, setAllowedActions] = useState<string[]>(
    initialData?.allowedActions || ['edit']
  );
  const [isActive, setIsActive] = useState(
    initialData ? initialData.isActive : true
  );

  useEffect(() => {
    if (!initialData) return;
    const dirty =
      name !== initialData.name ||
      iconName !== initialData.iconName ||
      colorTheme !== initialData.colorTheme ||
      isActive !== initialData.isActive ||
      JSON.stringify([...allowedActions].sort()) !==
        JSON.stringify([...(initialData.allowedActions || [])].sort());
    onDirtyStateChange?.(dirty);
  }, [
    name,
    iconName,
    colorTheme,
    isActive,
    allowedActions,
    initialData,
    onDirtyStateChange,
  ]);

  const CurrentIcon = (LucideIcons[iconName as keyof typeof LucideIcons] ||
    LucideIcons.CircleDot) as LucideIcons.LucideIcon;

  return (
    <>
      <input type="hidden" name="isActive" value={String(isActive)} />
      <input type="hidden" name="iconName" value={iconName} />
      <input type="hidden" name="colorTheme" value={colorTheme} />
      <input
        type="hidden"
        name="allowedActions"
        value={JSON.stringify(allowedActions)}
      />

      {isEdit && initialData && (
        <RecordIdPreview
          entity="statuses"
          record={initialData as unknown as Record<string, unknown>}
          numericRecordId={initialData.id}
        />
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormTextField
          fieldKey="name"
          label="Status Name"
          value={name}
          onChange={setName}
          isDetailMode={isDetailMode}
          fieldError={fieldError}
          options={{ required: true, placeholder: 'e.g., In Transit' }}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label
            className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}
          >
            Icon
          </label>
          {isDetailMode ? (
            <div
              className={`flex items-center gap-2 ${READ_ONLY_INPUT_CLASSNAME} rounded-md px-3`}
            >
              <CurrentIcon className="h-4 w-4" />
              <span>{iconName}</span>
            </div>
          ) : (
            <Select value={iconName} onValueChange={setIconName}>
              <SelectTrigger className="h-10">
                <div className="flex items-center gap-2">
                  <CurrentIcon className="h-4 w-4" />
                  <SelectValue placeholder="Select an icon" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_STATUS_ICONS.map((icon) => {
                  const Icon = LucideIcons[
                    icon as keyof typeof LucideIcons
                  ] as LucideIcons.LucideIcon;
                  return (
                    <SelectItem key={icon} value={icon}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{icon}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}
          {fieldError('iconName') && (
            <p
              className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}
            >
              {fieldError('iconName')}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label
            className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}
          >
            Color Theme
          </label>
          {isDetailMode ? (
            <div
              className={`flex items-center gap-2 ${READ_ONLY_INPUT_CLASSNAME} rounded-md px-3`}
            >
              <div
                className={`h-4 w-4 rounded-full border ${STATUS_THEMES[colorTheme]}`}
              />
              <span>
                {STATUS_COLORS.find((c) => c.value === colorTheme)?.label ||
                  colorTheme}
              </span>
            </div>
          ) : (
            <Select
              value={colorTheme}
              onValueChange={(val) => setColorTheme(val as StatusTheme)}
            >
              <SelectTrigger className="h-10">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-4 w-4 rounded-full border ${STATUS_THEMES[colorTheme]}`}
                  />
                  <SelectValue placeholder="Select a theme" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {STATUS_COLORS.map((theme) => (
                  <SelectItem key={theme.value} value={theme.value}>
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-4 w-4 rounded-full border ${STATUS_THEMES[theme.value]}`}
                      />
                      <span>{theme.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {fieldError('colorTheme') && (
            <p
              className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}
            >
              {fieldError('colorTheme')}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label
          className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}
        >
          Allowed Actions{' '}
          <span className="text-muted-foreground font-normal">
            (Edit is required)
          </span>
        </label>
        <div className="grid grid-cols-2 gap-3 rounded-md border p-4 bg-muted/20">
          {[
            { id: 'edit', label: 'Edit Asset' },
            { id: 'send-for-repair', label: 'Send for Repair' },
            { id: 'request-disposal', label: 'Request Disposal' },
            { id: 'assign', label: 'Assign / Transfer' },
            { id: 'request-return', label: 'Request Return' },
          ].map((action) => (
            <div key={action.id} className="flex items-center space-x-2">
              <Checkbox
                id={`action-${action.id}`}
                checked={allowedActions.includes(action.id)}
                onCheckedChange={(checked) => {
                  if (isDetailMode) return;
                  if (checked) {
                    setAllowedActions((prev) => [...prev, action.id]);
                  } else {
                    setAllowedActions((prev) =>
                      prev.filter((a) => a !== action.id)
                    );
                  }
                }}
                disabled={action.id === 'edit' || isDetailMode}
              />
              <label
                htmlFor={`action-${action.id}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {action.label}
              </label>
            </div>
          ))}
        </div>
        {fieldError('allowedActions') && (
          <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
            {fieldError('allowedActions')}
          </p>
        )}
      </div>

      {!isDetailMode && (
        <ActiveStatusToggle isActive={isActive} onChange={setIsActive} />
      )}
      {isDetailMode && (
        <div className="flex items-center space-x-2 pt-4 border-t">
          <span
            className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}
          >
            Status:
          </span>
          <span
            className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} ${isActive ? 'text-green-600' : 'text-muted-foreground'}`}
          >
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      )}
    </>
  );
}
