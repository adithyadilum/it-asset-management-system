'use client';

import { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { KeyRound, Trash2 } from 'lucide-react';
import { DataTable } from '@/components/shared/data-table';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';

import type { ApiKeyDisplay } from '@/types/integrations';
import { RevokeKeyDialog } from './revoke-key-dialog';

interface ApiKeyTableProps {
  keys: ApiKeyDisplay[];
  onChanged?: () => void;
}

export function ApiKeyTable({ keys, onChanged }: ApiKeyTableProps) {
  const [revokingKey, setRevokingKey] = useState<string | null>(null);
  const [revokingKeyName, setRevokingKeyName] = useState<string | null>(null);
  const [dialogMode, setDialogMode] = useState<'revoke' | 'delete'>('revoke');
  const [dialogOpen, setDialogOpen] = useState(false);

  const columns = useMemo<ColumnDef<ApiKeyDisplay, unknown>[]>(
    () => [
      { accessorKey: 'name', header: 'Name' },
      {
        id: 'token',
        header: 'Token',
        cell: (ctx) => (
          <span
            className={`font-mono text-muted-foreground ${TYPOGRAPHY_CLASSNAMES.textSmRegular}`}
          >
            {ctx.row.original.keyPrefix}****************
            {ctx.row.original.keySuffix}
          </span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Created Date',
        cell: ({ row }) =>
          row.original.createdAt.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          }),
      },
      {
        accessorKey: 'lastUsedAt',
        header: 'Last Accessed',
        cell: ({ row }) => {
          const date = row.original.lastUsedAt;
          if (!date)
            return (
              <span
                className={`text-muted-foreground ${TYPOGRAPHY_CLASSNAMES.textSmRegular}`}
              >
                Never
              </span>
            );
          const diffMs = Date.now() - date.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          if (diffMins < 60)
            return (
              <span
                className={TYPOGRAPHY_CLASSNAMES.textSmRegular}
              >{`${diffMins} min${diffMins !== 1 ? 's' : ''} ago`}</span>
            );
          const diffHours = Math.floor(diffMins / 60);
          if (diffHours < 24)
            return (
              <span
                className={TYPOGRAPHY_CLASSNAMES.textSmRegular}
              >{`${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`}</span>
            );
          return (
            <span className={TYPOGRAPHY_CLASSNAMES.textSmRegular}>
              {date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}
            </span>
          );
        },
      },
      {
        id: 'status',
        header: 'Status',
        cell: (ctx) => {
          if (ctx.row.original.isRevoked) {
            return <StatusBadge value="defective" label="Revoked" />;
          }
          if (ctx.row.original.isExpired) {
            return <StatusBadge value="expired" />;
          }
          return <StatusBadge value="active" />;
        },
      },
      {
        id: 'actions',
        header: '',
        size: 56,
        cell: (ctx) => (
          <div className="flex items-center justify-center">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                setRevokingKey(ctx.row.original.id);
                setRevokingKeyName(ctx.row.original.name);
                setDialogMode(ctx.row.original.isRevoked ? 'delete' : 'revoke');
                setDialogOpen(true);
              }}
              aria-label={
                ctx.row.original.isRevoked ? 'Delete key' : 'Revoke key'
              }
            >
              {ctx.row.original.isRevoked ? (
                <Trash2 className="h-4 w-4" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <>
      <DataTable columns={columns} data={keys} enableRowSelection={false} />

      <RevokeKeyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        keyId={revokingKey}
        keyName={revokingKeyName}
        mode={dialogMode}
        onChanged={onChanged}
      />
    </>
  );
}
