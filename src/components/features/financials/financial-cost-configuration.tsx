'use client';

import { useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  correctAssetCostBasis,
  correctRecordedExchangeRate,
  createFinancialGroup,
  saveAssetCostPolicy,
  saveFinancialMembership,
  saveSoftwareFinancialTerm,
  type getFinancialConfiguration,
} from '@/actions/financial-configuration';
import { localDate } from '@/lib/reporting-time';

type Configuration = Awaited<ReturnType<typeof getFinancialConfiguration>>;
const text = (form: FormData, key: string) =>
  String(form.get(key) ?? '').trim();
const optional = (form: FormData, key: string) => text(form, key) || undefined;
const number = (form: FormData, key: string) => Number(text(form, key));
const selectClass =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm';

function Field({
  label,
  name,
  type = 'text',
  value,
  required = true,
}: {
  label: string;
  name: string;
  type?: string;
  value?: string | number;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <Input
        name={name}
        type={type}
        defaultValue={value}
        required={required}
        step={type === 'number' ? 'any' : undefined}
      />
    </label>
  );
}
function Form({
  title,
  description,
  children,
  onSave,
}: {
  title: string;
  description: string;
  children: ReactNode;
  onSave: (form: FormData) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition(),
    [message, setMessage] = useState(''),
    [error, setError] = useState('');
  const router = useRouter();
  return (
    <section className="rounded-xl border bg-card p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="my-2 text-sm text-muted-foreground">{description}</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const values = new FormData(event.currentTarget);
          setError('');
          setMessage('');
          startTransition(async () => {
            try {
              await onSave(values);
              setMessage('Saved. Reports will use the corrected inputs.');
              router.refresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Could not save.');
            }
          });
        }}
      >
        <fieldset disabled={pending} className="grid gap-3 md:grid-cols-3">
          {children}
          <div className="flex items-end">
            <Button type="submit">{pending ? 'Saving…' : 'Save'}</Button>
          </div>
        </fieldset>
        {error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="mt-3 text-sm text-emerald-700">
            {message}
          </p>
        )}
      </form>
    </section>
  );
}
function History<T extends { id: number }>({
  rows,
  onEdit,
  render,
}: {
  rows: T[];
  onEdit: (row: T) => void;
  render: (row: T) => ReactNode;
}) {
  const [page, setPage] = useState(0),
    size = 12;
  return (
    <div className="rounded-xl border bg-card p-4">
      <ul className="divide-y">
        {rows.slice(page * size, (page + 1) * size).map((row) => (
          <li
            key={row.id}
            className="flex items-center justify-between gap-3 py-2 text-sm"
          >
            <div>{render(row)}</div>
            <Button variant="outline" size="sm" onClick={() => onEdit(row)}>
              Edit #{row.id}
            </Button>
          </li>
        ))}
      </ul>
      {rows.length === 0 && (
        <p className="text-sm text-muted-foreground">No records yet.</p>
      )}
      <div className="mt-3 flex items-center justify-end gap-3 text-sm">
        <span>{rows.length} records</span>
        <Button
          variant="outline"
          size="sm"
          disabled={page === 0}
          onClick={() => setPage(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={(page + 1) * size >= rows.length}
          onClick={() => setPage(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

function Group({
  value,
  groups,
}: {
  value?: number;
  groups: Configuration['groups'];
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      Cost group
      <select
        name="groupId"
        required
        defaultValue={value ?? ''}
        className={selectClass}
      >
        <option value="" disabled>
          Select group
        </option>
        {groups.map((g) => (
          <option value={g.id} key={g.id}>
            {`${g.departmentId ? 'Department' : 'Location'}: ${g.name}`}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FinancialCostConfiguration({ data }: { data: Configuration }) {
  const [member, setMember] = useState<
      Configuration['memberships'][number] | null
    >(null),
    [policy, setPolicy] = useState<Configuration['policies'][number] | null>(
      null
    ),
    [term, setTerm] = useState<Configuration['terms'][number] | null>(null);
  const [today] = useState(() => localDate(Date.now()));
  const name = (id: number) => {
    const group = data.groups.find((g) => g.id === id);
    return group
      ? `${group.departmentId ? 'Department' : 'Location'}: ${group.name}`
      : `Group ${id}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          className="text-sm text-primary hover:underline"
          href="/financials/per-head"
        >
          ← Per-head Cost Analysis
        </Link>
        <h1 className="mt-3 text-2xl font-semibold">
          Cost allocation configuration
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Maintain dated cost inputs and membership. Corrections recalculate
          past reports and are recorded in the audit log. Dates use
          Asia/Colombo; end dates below are not included.
        </p>
      </div>
      <Form
        title="Cost groups"
        description="Create a group for a department or location added after rollout. People share equipment and repair overhead equally within the selected group."
        onSave={async (form) => {
          const [kind, targetId] = text(form, 'target').split(':');
          await createFinancialGroup({
            kind: kind as 'department' | 'location',
            targetId: Number(targetId),
          });
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          Department or location
          <select
            className={selectClass}
            name="target"
            required
            defaultValue=""
          >
            <option value="" disabled>
              Select target
            </option>
            {data.departments.map((d) => (
              <option key={`d${d.id}`} value={`department:${d.id}`}>
                Department: {d.name}
              </option>
            ))}
            {data.locations.map((l) => (
              <option key={`l${l.id}`} value={`location:${l.id}`}>
                Location: {l.name}
              </option>
            ))}
          </select>
        </label>
      </Form>
      <Form
        key={`member:${member?.id ?? 'new'}:${member?.validTo}`}
        title={member ? `Edit membership #${member.id}` : 'Add membership'}
        description="Add the people who belong to each location or department. Earlier shared-cost history cannot be inferred from today's membership."
        onSave={async (form) => {
          await saveFinancialMembership({
            id: member?.id,
            email: text(form, 'email'),
            groupId: number(form, 'groupId'),
            validFrom: text(form, 'validFrom'),
            validTo: optional(form, 'validTo'),
            reason: text(form, 'reason'),
          });
          setMember(null);
        }}
      >
        <Field
          label="Person email"
          name="email"
          type="email"
          value={member?.email}
        />
        <Group groups={data.groups} value={member?.groupId} />
        <Field
          label="Start date"
          name="validFrom"
          type="date"
          value={member?.validFrom ?? today}
        />
        <Field
          label="End date (optional)"
          name="validTo"
          type="date"
          value={member?.validTo}
          required={false}
        />
        <Field label="Reason for change" name="reason" value={member?.reason} />
        {member && (
          <Button
            variant="outline"
            type="button"
            onClick={() => setMember(null)}
          >
            Cancel edit
          </Button>
        )}
      </Form>
      <History
        rows={data.memberships}
        onEdit={setMember}
        render={(m) => (
          <>
            <strong>{m.email}</strong> · {name(m.groupId)}
            <br />
            {m.validFrom} to {m.validTo || 'ongoing'} · {m.reason}
          </>
        )}
      />
      <Form
        key={`policy:${policy?.id ?? 'new'}:${policy?.validTo}`}
        title={
          policy ? `Edit asset policy #${policy.id}` : 'Add asset cost policy'
        }
        description="Select one department or location for shared equipment and repair overhead. Direct accepted custody takes precedence over shared equipment allocation. End the previous policy before adding a new one."
        onSave={async (form) => {
          await saveAssetCostPolicy({
            id: policy?.id,
            assetTag: text(form, 'assetTag'),
            groupId: number(form, 'groupId'),
            shared: text(form, 'shared') === 'yes',
            validFrom: text(form, 'validFrom'),
            validTo: optional(form, 'validTo'),
          });
          setPolicy(null);
        }}
      >
        <Field label="Asset tag" name="assetTag" value={policy?.assetTag} />
        <Group groups={data.groups} value={policy?.groupId} />
        <label className="flex flex-col gap-1 text-sm">
          Equipment without a direct custodian
          <select
            className={selectClass}
            name="shared"
            defaultValue={policy?.shared ? 'yes' : 'no'}
          >
            <option value="no">Keep as unallocated overhead</option>
            <option value="yes">Share among group members</option>
          </select>
        </label>
        <Field
          label="Start date"
          name="validFrom"
          type="date"
          value={policy?.validFrom ?? today}
        />
        <Field
          label="End date (optional)"
          name="validTo"
          type="date"
          value={policy?.validTo}
          required={false}
        />
        {policy && (
          <Button
            variant="outline"
            type="button"
            onClick={() => setPolicy(null)}
          >
            Cancel edit
          </Button>
        )}
      </Form>
      <History
        rows={data.policies}
        onEdit={setPolicy}
        render={(p) => (
          <>
            <strong>{p.assetTag}</strong> · {name(p.groupId)} ·{' '}
            {p.shared ? 'Shared equipment' : 'Direct / overhead'}
            <br />
            {p.validFrom} to {p.validTo || 'ongoing'}
          </>
        )}
      />
      <Form
        key={`term:${term?.id ?? 'new'}:${term?.validTo}`}
        title={
          term
            ? `Edit software term #${term.id}`
            : 'Add software financial term'
        }
        description="Record the full licence price and paid coverage, including purchased seats. Use consecutive terms for price or capacity amendments. Perpetual coverage ends after the configured allocation life."
        onSave={async (form) => {
          await saveSoftwareFinancialTerm({
            id: term?.id,
            assetTag: text(form, 'assetTag'),
            amount: text(form, 'amount'),
            currency: text(form, 'currency') as 'LKR' | 'USD' | 'NOK',
            exchangeRate: optional(form, 'exchangeRate'),
            seats: number(form, 'seats'),
            allocationLifeMonths: optional(form, 'life')
              ? number(form, 'life')
              : undefined,
            sourcePurchaseId: term?.sourcePurchaseId ?? undefined,
            validFrom: text(form, 'validFrom'),
            validTo: text(form, 'validTo'),
          });
          setTerm(null);
        }}
      >
        <Field
          label="Software asset tag"
          name="assetTag"
          value={term?.assetTag}
        />
        <Field
          label="Total paid amount"
          name="amount"
          type="number"
          value={term?.amount ?? undefined}
        />
        <label className="flex flex-col gap-1 text-sm">
          Currency
          <select
            name="currency"
            className={selectClass}
            defaultValue={term?.currency ?? 'LKR'}
          >
            {['LKR', 'USD', 'NOK'].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <Field
          label="Recorded rate to LKR (1 for LKR)"
          name="exchangeRate"
          type="number"
          value={term?.exchangeRate ?? '1'}
        />
        <Field
          label="Purchased seats"
          name="seats"
          type="number"
          value={term?.seats ?? 1}
        />
        <Field
          label="Allocation life in months (perpetual only)"
          name="life"
          type="number"
          value={term?.allocationLifeMonths ?? undefined}
          required={false}
        />
        <Field
          label="Coverage starts"
          name="validFrom"
          type="date"
          value={term?.validFrom ?? today}
        />
        <Field
          label="Coverage ends"
          name="validTo"
          type="date"
          value={term?.validTo}
        />
        {term && (
          <Button variant="outline" type="button" onClick={() => setTerm(null)}>
            Cancel edit
          </Button>
        )}
      </Form>
      <History
        rows={data.terms}
        onEdit={setTerm}
        render={(t) => (
          <>
            <strong>{t.assetTag}</strong> · {t.amount ?? 'Unpriced'}{' '}
            {t.currency} · {t.seats} seats
            <br />
            {t.validFrom} to {t.validTo}
            {t.allocationLifeMonths
              ? ` · ${t.allocationLifeMonths} month allocation life`
              : ''}
          </>
        )}
      />
      <Form
        title="Correct asset cost basis"
        description="Update acquisition inputs and the depreciation residual. Existing purchase salvage estimates remain historical information, and finalized disposal values are preserved. Foreign-currency rates must be verified against the original transaction."
        onSave={async (form) =>
          correctAssetCostBasis({
            assetTag: text(form, 'assetTag'),
            purchaseDate: text(form, 'purchaseDate'),
            amount: text(form, 'amount'),
            currency: text(form, 'currency') as 'LKR' | 'USD' | 'NOK',
            exchangeRate: text(form, 'exchangeRate'),
            residual: text(form, 'residual'),
            lifeMonths: number(form, 'lifeMonths'),
          })
        }
      >
        <Field label="Asset tag" name="assetTag" />
        <Field label="Purchase date" name="purchaseDate" type="date" />
        <Field label="Total acquisition cost" name="amount" type="number" />
        <label className="flex flex-col gap-1 text-sm">
          Currency
          <select name="currency" className={selectClass}>
            {['LKR', 'USD', 'NOK'].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <Field
          label="Recorded rate to LKR"
          name="exchangeRate"
          type="number"
          value="1"
        />
        <Field
          label="Residual value (purchase currency)"
          name="residual"
          type="number"
          value="0"
        />
        <Field
          label="Useful life in months"
          name="lifeMonths"
          type="number"
          value={60}
        />
      </Form>
      <Form
        title="Verify historical exchange rate"
        description="Correct the original transaction rate for a purchase or completed repair. Report exceptions identify repair records by their source ID."
        onSave={async (form) =>
          correctRecordedExchangeRate({
            source: text(form, 'source') as 'purchase' | 'repair',
            id: number(form, 'id'),
            exchangeRate: text(form, 'exchangeRate'),
          })
        }
      >
        <label className="flex flex-col gap-1 text-sm">
          Source
          <select name="source" className={selectClass}>
            <option value="repair">Repair</option>
            <option value="purchase">Purchase</option>
          </select>
        </label>
        <Field label="Source record ID" name="id" type="number" />
        <Field label="Verified rate to LKR" name="exchangeRate" type="number" />
      </Form>
    </div>
  );
}
