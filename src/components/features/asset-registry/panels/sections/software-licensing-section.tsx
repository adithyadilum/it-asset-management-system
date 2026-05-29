import * as React from 'react';
import { CalendarDays } from 'lucide-react';
import { type RegisterAssetActionState } from '@/lib/validations/asset-registration';
import { type PillarFormConfig } from '../pillar-form-config';
import {
  InlineFieldRow,
  SearchableFieldRow,
  getError,
  type RegistrationOption,
} from '../form-field-primitives';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

type SoftwareLicensingSectionProps = {
  config: PillarFormConfig;
  state: RegisterAssetActionState;

  licenseType: string;
  setLicenseType: (v: string) => void;
  LICENSE_TYPE_OPTIONS: RegistrationOption[];

  totalSeats: string;
  setTotalSeats: (v: string) => void;

  licenseStartDate: string;
  setLicenseStartDate: (v: string) => void;
  licenseStartDateLabel: string;
  licenseStartDateValue?: Date;

  licenseExpiryDate: string;
  setLicenseExpiryDate: (v: string) => void;
  licenseExpiryDateLabel: string;
  licenseExpiryDateValue?: Date;

  formatDateForInput: (date: Date) => string;
};

export function SoftwareLicensingSection({
  config,
  state,
  licenseType,
  setLicenseType,
  LICENSE_TYPE_OPTIONS,
  totalSeats,
  setTotalSeats,
  licenseStartDate,
  setLicenseStartDate,
  licenseStartDateLabel,
  licenseStartDateValue,
  licenseExpiryDate,
  setLicenseExpiryDate,
  licenseExpiryDateLabel,
  licenseExpiryDateValue,
  formatDateForInput,
}: SoftwareLicensingSectionProps) {
  if (!config.showSoftwareLicensingSection) {
    return null;
  }

  return (
    <>
      <hr className="my-5 border-border" />

      <section className="rounded-lg border border-border bg-muted/30 p-4">
        <h3 className={`mb-3 ${TYPOGRAPHY_CLASSNAMES.textLgSemiBold} text-foreground`}>
          Software Licensing
        </h3>

        <div className="grid gap-3 sm:grid-cols-2 sm:gap-3">
          <SearchableFieldRow
            label="License Type :"
            name="licenseType"
            value={licenseType}
            onChange={setLicenseType}
            options={LICENSE_TYPE_OPTIONS}
            placeholder="Select License Type.."
            emptyMessage="No license types found."
            error={getError(state, 'licenseType')}
          />

          <InlineFieldRow
            label="Total Seats :"
            htmlFor="totalSeats"
            error={getError(state, 'totalSeats')}
          >
            <Input
              id="totalSeats"
              name="totalSeats"
              type="number"
              min="1"
              value={totalSeats}
              onChange={(event) => setTotalSeats(event.target.value)}
              placeholder="e.g. 10"
              aria-invalid={Boolean(getError(state, 'totalSeats'))}
            />
          </InlineFieldRow>

          <InlineFieldRow
            label="Start Date :"
            error={getError(state, 'licenseStartDate')}
            alignTop
          >
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      'h-9 w-full justify-between rounded-lg px-3 text-left font-normal',
                      !licenseStartDate ? 'text-muted-foreground' : 'text-foreground'
                    )}
                    aria-invalid={Boolean(getError(state, 'licenseStartDate'))}
                  >
                    <span>{licenseStartDateLabel}</span>
                    <CalendarDays className="size-4 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={licenseStartDateValue}
                    onSelect={(date) =>
                      setLicenseStartDate(date ? formatDateForInput(date) : '')
                    }
                    autoFocus
                  />
                </PopoverContent>
              </Popover>
              <input type="hidden" id="licenseStartDate" name="licenseStartDate" value={licenseStartDate} />
            </>
          </InlineFieldRow>

          <InlineFieldRow
            label="Expiry Date :"
            error={getError(state, 'licenseExpiryDate')}
            alignTop
          >
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      'h-9 w-full justify-between rounded-lg px-3 text-left font-normal',
                      !licenseExpiryDate ? 'text-muted-foreground' : 'text-foreground'
                    )}
                    aria-invalid={Boolean(getError(state, 'licenseExpiryDate'))}
                  >
                    <span>{licenseExpiryDateLabel}</span>
                    <CalendarDays className="size-4 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={licenseExpiryDateValue}
                    onSelect={(date) =>
                      setLicenseExpiryDate(date ? formatDateForInput(date) : '')
                    }
                    autoFocus
                  />
                </PopoverContent>
              </Popover>
              <input type="hidden" id="licenseExpiryDate" name="licenseExpiryDate" value={licenseExpiryDate} />
            </>
          </InlineFieldRow>
        </div>
      </section>
    </>
  );
}
