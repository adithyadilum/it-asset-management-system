'use client';

import { useState, useTransition, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  Laptop,
  Search,
  Users,
  Check,
  Pencil,
  Layers3,
} from 'lucide-react';
import {
  getCostSettings,
  updatePersonCostSettings,
  updateEquipmentCostSettings,
  updateSoftwareCostSettings,
} from '@/actions/cost-settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatMoneyByCurrency } from '@/lib/currency';
import { addMonths, localDate, reportDate } from '@/lib/reporting-time';
import { tiqriToast } from '@/components/shared/sonner';

type Settings = Awaited<ReturnType<typeof getCostSettings>>;
type Person = Settings['people'][number];
type Equipment = Settings['equipment'][number];
type Software = Settings['software'][number];
type Selection =
  | { kind: 'people'; row: Person }
  | { kind: 'equipment'; row: Equipment }
  | { kind: 'software'; row: Software };
function SettingsSelect({
  id,
  name,
  defaultValue,
  value,
  onValueChange,
  placeholder,
  children,
}: {
  id: string;
  name?: string;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  children: ReactNode;
}) {
  return (
    <Select
      name={name}
      defaultValue={defaultValue}
      value={value}
      onValueChange={onValueChange}
    >
      <SelectTrigger id={id} className="h-10 w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  );
}
const value = (form: FormData, key: string) => String(form.get(key) ?? '');

function SettingsRows<T extends { id: string }>({
  rows,
  columns,
  onEdit,
}: {
  rows: T[];
  columns: { title: string; render: (row: T) => ReactNode }[];
  onEdit: (row: T) => void;
}) {
  const [page, setPage] = useState(0),
    size = 12,
    current = Math.min(page, Math.max(0, Math.ceil(rows.length / size) - 1));
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
            <tr>
              {columns.map((c) => (
                <th key={c.title} className="px-5 py-3.5 font-medium">
                  {c.title}
                </th>
              ))}
              <th className="w-24 px-5 py-3.5">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.slice(current * size, (current + 1) * size).map((row) => (
              <tr key={row.id} className="transition-colors hover:bg-muted/30">
                {columns.map((c) => (
                  <td key={c.title} className="px-5 py-4">
                    {c.render(row)}
                  </td>
                ))}
                <td className="px-5 py-4 text-right">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(row)}>
                    <Pencil className="mr-1.5 size-3.5" />
                    Edit
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="px-5 py-16 text-center text-muted-foreground">
            No matches. Try another name or asset.
          </div>
        )}
      </div>
      <div className="flex items-center justify-between border-t px-5 py-3 text-xs text-muted-foreground">
        <span>
          {rows.length ? current * size + 1 : 0}–
          {Math.min((current + 1) * size, rows.length)} of {rows.length}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={(current + 1) * size >= rows.length}
            onClick={() => setPage(current + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
function SaveForm({
  children,
  onSave,
  onSaved,
}: {
  children: ReactNode;
  onSave: (
    form: FormData
  ) => Promise<{ success: true } | { success: false; error: string }>;
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition(),
    [error, setError] = useState('');
  const router = useRouter();
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setError('');
        startTransition(async () => {
          try {
            const result = await onSave(form);
            if (!result.success) {
              setError(result.error);
              return;
            }
            tiqriToast.success('Cost settings updated.');
            router.refresh();
            onSaved();
          } catch {
            setError('Could not save changes. Please try again.');
          }
        });
      }}
    >
      <fieldset disabled={pending} className="space-y-5 pt-3">
        {children}
        {error && (
          <p
            role="alert"
            className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        <div className="flex items-center justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" onClick={onSaved}>
            Cancel
          </Button>
          <Button type="submit">
            <Check className="mr-2 size-4" />
            {pending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
function Field({
  label,
  id,
  children,
  hint,
}: {
  label: string;
  id: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
function PersonForm({
  row,
  data,
  onSaved,
}: {
  row: Person;
  data: Settings;
  onSaved: () => void;
}) {
  return (
    <SaveForm
      onSaved={onSaved}
      onSave={(form) =>
        updatePersonCostSettings({
          userId: row.id,
          departmentId: Number(value(form, 'department')),
          locationId:
            value(form, 'location') === 'none'
              ? null
              : Number(value(form, 'location')),
          from: value(form, 'from'),
        })
      }
    >
      <Field label="Department" id="person-department">
        <SettingsSelect
          id="person-department"
          name="department"
          defaultValue={row.departmentId ? String(row.departmentId) : undefined}
          placeholder="Choose a department"
        >
          {data.departments.map((d) => (
            <SelectItem value={String(d.id)} key={d.id}>
              {d.name}
            </SelectItem>
          ))}
        </SettingsSelect>
      </Field>
      <Field
        label="Workplace"
        id="person-location"
        hint="Shared equipment and workplace costs are split equally among the people based here."
      >
        <SettingsSelect
          id="person-location"
          name="location"
          defaultValue={row.locationId ? String(row.locationId) : 'none'}
        >
          <SelectItem value="none">No shared workplace</SelectItem>
          {data.locations.map((l) => (
            <SelectItem value={String(l.id)} key={l.id}>
              {l.name}
            </SelectItem>
          ))}
        </SettingsSelect>
      </Field>
      <Field
        label="Effective from"
        id="person-from"
        hint="Previous team and workplace assignments are kept automatically."
      >
        <Input
          id="person-from"
          name="from"
          type="date"
          defaultValue={data.today}
          max={data.today}
          required
        />
      </Field>
    </SaveForm>
  );
}
function EquipmentForm({
  row,
  data,
  onSaved,
}: {
  row: Equipment;
  data: Settings;
  onSaved: () => void;
}) {
  return (
    <SaveForm
      onSaved={onSaved}
      onSave={(form) =>
        updateEquipmentCostSettings({
          assetId: row.id,
          allocation: value(form, 'allocation'),
          shared: form.has('shared'),
          from: value(form, 'from'),
        })
      }
    >
      <Field label="Allocate costs to" id="equipment-allocation">
        <SettingsSelect
          id="equipment-allocation"
          name="allocation"
          defaultValue={row.allocation || undefined}
          placeholder="Choose a team or workplace"
        >
          <SelectGroup>
            <SelectLabel>Workplaces</SelectLabel>
            {data.locations.map((l) => (
              <SelectItem key={l.id} value={`location:${l.id}`}>
                {l.name}
              </SelectItem>
            ))}
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>Departments</SelectLabel>
            {data.departments.map((d) => (
              <SelectItem key={d.id} value={`department:${d.id}`}>
                {d.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SettingsSelect>
      </Field>
      <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-muted/20 p-4">
        <input
          name="shared"
          type="checkbox"
          className="mt-0.5 size-4 accent-primary"
          defaultChecked={row.shared}
        />
        <span>
          <span className="block text-sm font-medium">Shared equipment</span>
          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
            Split costs across this team. Personal assignments always follow the
            person using the equipment.
          </span>
        </span>
      </label>
      <Field
        label="Effective from"
        id="equipment-from"
        hint="Earlier allocations are retained. There's no need to close them first."
      >
        <Input
          id="equipment-from"
          name="from"
          type="date"
          defaultValue={data.today}
          max={data.today}
          required
        />
      </Field>
    </SaveForm>
  );
}
function SoftwareForm({
  row,
  data,
  onSaved,
}: {
  row: Software;
  data: Settings;
  onSaved: () => void;
}) {
  const [cycle, setCycle] = useState<'monthly' | 'annual' | 'perpetual'>(() =>
    row.licenseType === 'Perpetual'
      ? 'perpetual'
      : row.term &&
          reportDate(row.term.to) - reportDate(row.term.from) > 180 * 86400000
        ? 'annual'
        : 'monthly'
  );
  const [currency, setCurrency] = useState(row.term?.currency ?? 'LKR'),
    [from, setFrom] = useState(row.term?.from ?? data.today),
    [life, setLife] = useState(row.term?.lifeMonths ?? 36);
  const until = Number.isFinite(reportDate(from))
    ? localDate(
        addMonths(
          reportDate(from),
          cycle === 'annual' ? 12 : cycle === 'monthly' ? 1 : life
        ) - 86400000
      )
    : '';
  return (
    <SaveForm
      onSaved={onSaved}
      onSave={(form) =>
        updateSoftwareCostSettings({
          licenseId: row.id,
          termId: row.term?.id,
          amount: value(form, 'amount'),
          currency: currency as 'LKR' | 'USD' | 'NOK',
          seats: Number(value(form, 'seats')),
          cycle,
          from,
          lifeMonths: cycle === 'perpetual' ? life : undefined,
          exchangeRate: value(form, 'rate') || undefined,
        })
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <Field label="Billing" id="software-cycle">
          <SettingsSelect
            id="software-cycle"
            value={cycle}
            onValueChange={(next) => setCycle(next as typeof cycle)}
          >
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="annual">Yearly</SelectItem>
            <SelectItem value="perpetual">One-time purchase</SelectItem>
          </SettingsSelect>
        </Field>
        <Field
          label="Purchased seats"
          id="software-seats"
          hint={`${row.assigned} seats currently assigned`}
        >
          <Input
            id="software-seats"
            name="seats"
            type="number"
            min={Math.max(1, row.assigned)}
            max={100000}
            defaultValue={row.term?.seats ?? row.seats}
            required
          />
        </Field>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-4">
        <Field
          label={
            cycle === 'annual'
              ? 'Total yearly price'
              : cycle === 'monthly'
                ? 'Total monthly price'
                : 'Purchase price'
          }
          id="software-price"
          hint="Price for all purchased seats, not the price per person."
        >
          <Input
            id="software-price"
            name="amount"
            type="number"
            min="0"
            step="0.01"
            defaultValue={row.term?.amount}
            placeholder="0.00"
            required
          />
        </Field>
        <Field label="Currency" id="software-currency">
          <SettingsSelect
            id="software-currency"
            value={currency}
            onValueChange={setCurrency}
          >
            {['LKR', 'USD', 'NOK'].map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SettingsSelect>
        </Field>
      </div>
      {cycle === 'perpetual' && (
        <Field label="Spread cost over" id="software-life">
          <SettingsSelect
            id="software-life"
            value={String(life)}
            onValueChange={(next) => setLife(Number(next))}
          >
            {[12, 24, 36, 48, 60, 84].map((months) => (
              <SelectItem key={months} value={String(months)}>
                {months / 12} {months === 12 ? 'year' : 'years'}
              </SelectItem>
            ))}
          </SettingsSelect>
        </Field>
      )}
      <Field
        label="Paid coverage starts"
        id="software-from"
        hint={
          until
            ? `Covers costs through ${new Date(`${until}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}.`
            : undefined
        }
      >
        <Input
          id="software-from"
          type="date"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
          required
        />
      </Field>
      {currency !== 'LKR' && (
        <details className="rounded-lg border p-3">
          <summary className="cursor-pointer text-sm text-muted-foreground">
            More options
          </summary>
          <div className="pt-4">
            <Field
              label="Exchange rate to LKR"
              id="software-rate"
              hint="Leave blank to capture the available exchange rate automatically."
            >
              <Input
                id="software-rate"
                name="rate"
                type="number"
                min="0.000001"
                step="0.000001"
                defaultValue={
                  currency === row.term?.currency ? row.term.exchangeRate : ''
                }
              />
            </Field>
          </div>
        </details>
      )}
    </SaveForm>
  );
}

export function FinancialCostConfiguration({ data }: { data: Settings }) {
  const [tab, setTab] = useState('people'),
    [search, setSearch] = useState(''),
    [selected, setSelected] = useState<Selection | null>(null);
  const match = (...parts: (string | null)[]) =>
    parts.join(' ').toLocaleLowerCase().includes(search.toLocaleLowerCase());
  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <div>
        <Link
          href="/financials/per-head"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to cost analysis
        </Link>
        <div className="mt-5 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Cost settings
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Manage teams, shared equipment and software prices in one place.
            </p>
          </div>
          <div className="hidden items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs text-muted-foreground sm:flex">
            <Building2 className="size-3.5" />
            Teams and workplaces connect automatically
          </div>
        </div>
      </div>
      <Tabs
        value={tab}
        onValueChange={(next) => {
          setTab(next);
          setSearch('');
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
          <TabsList variant="line">
            <TabsTrigger value="people">
              <Users className="size-4" />
              People
              <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-xs">
                {data.people.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="equipment">
              <Laptop className="size-4" />
              Equipment
              <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-xs">
                {data.equipment.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="software">
              <Layers3 className="size-4" />
              Software
              <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-xs">
                {data.software.length}
              </span>
            </TabsTrigger>
          </TabsList>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input
              aria-label="Search cost settings"
              className="h-10 pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={
                tab === 'people'
                  ? 'Find a person or team…'
                  : tab === 'equipment'
                    ? 'Find equipment…'
                    : 'Find a software product…'
              }
            />
          </div>
        </div>
      </Tabs>
      {tab === 'people' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            A person&apos;s department and workplace determine their share of
            common costs.
          </p>
          <SettingsRows
            key={`people:${search}`}
            rows={data.people.filter((p) =>
              match(p.name, p.email, p.department, p.location)
            )}
            onEdit={(row) => setSelected({ kind: 'people', row })}
            columns={[
              {
                title: 'Person',
                render: (p) => (
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {p.email}
                    </p>
                  </div>
                ),
              },
              { title: 'Department', render: (p) => p.department },
              {
                title: 'Workplace',
                render: (p) => (
                  <span className="text-muted-foreground">{p.location}</span>
                ),
              },
            ]}
          />
        </div>
      )}
      {tab === 'equipment' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Choose a team or workplace. Personal equipment follows its assigned
            user automatically.
          </p>
          <SettingsRows
            key={`equipment:${search}`}
            rows={data.equipment.filter((a) =>
              match(a.name, a.tag, a.category, a.allocationName)
            )}
            onEdit={(row) => setSelected({ kind: 'equipment', row })}
            columns={[
              {
                title: 'Equipment',
                render: (a) => (
                  <div>
                    <p className="font-medium">{a.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {a.tag} · {a.category}
                    </p>
                  </div>
                ),
              },
              { title: 'Cost allocation', render: (a) => a.allocationName },
              {
                title: 'Usage',
                render: (a) => (
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs">
                    {a.shared ? 'Shared equipment' : 'Assigned user'}
                  </span>
                ),
              },
              {
                title: 'Asset status',
                render: (a) => (
                  <span className="text-muted-foreground">{a.status}</span>
                ),
              },
            ]}
          />
        </div>
      )}
      {tab === 'software' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Set the price once. Seat costs and unused capacity are calculated
            automatically.
          </p>
          <SettingsRows
            key={`software:${search}`}
            rows={data.software.filter((s) => match(s.name, s.tag))}
            onEdit={(row) => setSelected({ kind: 'software', row })}
            columns={[
              {
                title: 'Product',
                render: (s) => (
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {s.licenseType === 'Perpetual'
                        ? 'One-time licence'
                        : 'Subscription'}
                    </p>
                  </div>
                ),
              },
              {
                title: 'Seats',
                render: (s) => (
                  <div className="min-w-24">
                    <p>
                      {s.assigned}{' '}
                      <span className="text-muted-foreground">
                        of {s.seats} assigned
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {Math.max(0, s.seats - s.assigned)} unused seats
                    </p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${Math.min(100, (s.assigned / s.seats) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ),
              },
              {
                title: 'Paid price',
                render: (s) =>
                  s.term?.amount
                    ? formatMoneyByCurrency(s.term.amount, s.term.currency)
                    : '—',
              },
              {
                title: 'Coverage ends',
                render: (s) =>
                  s.term
                    ? new Date(
                        reportDate(s.term.to) - 86400000
                      ).toLocaleDateString('en-GB', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        timeZone: 'Asia/Colombo',
                      })
                    : '—',
              },
            ]}
          />
        </div>
      )}
      <Dialog
        open={selected != null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected?.row.name}</DialogTitle>
            <DialogDescription>
              {selected?.kind === 'people'
                ? 'Update department and workplace.'
                : selected?.kind === 'equipment'
                  ? 'Choose how this equipment contributes to team costs.'
                  : 'Keep licence pricing and seat capacity up to date.'}
            </DialogDescription>
          </DialogHeader>
          {selected?.kind === 'people' && (
            <PersonForm
              key={selected.row.id}
              row={selected.row}
              data={data}
              onSaved={() => setSelected(null)}
            />
          )}{' '}
          {selected?.kind === 'equipment' && (
            <EquipmentForm
              key={selected.row.id}
              row={selected.row}
              data={data}
              onSaved={() => setSelected(null)}
            />
          )}{' '}
          {selected?.kind === 'software' && (
            <SoftwareForm
              key={selected.row.id}
              row={selected.row}
              data={data}
              onSaved={() => setSelected(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
