import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  getPrimaryIdColumn,
  type ReportPreviewRow,
} from '@/types/standard-reports';
import { StatusBadge } from '@/components/shared/status-badge';

function toCellText(value: unknown) {
  if (
    value === null ||
    value === undefined ||
    (typeof value === 'string' && value.trim().length === 0)
  ) {
    return '-';
  }
  return String(value);
}

export function useReportColumns(source: string, selectedFields: string[]) {
  return useMemo<ColumnDef<ReportPreviewRow>[]>(() => {
    // If we have specific fields from a template, use them
    if (selectedFields && selectedFields.length > 0) {
      const primaryIdField = getPrimaryIdColumn(source);
      const primaryIdFields = [
        'Record ID',
        'Business Key',
        'Asset ID',
        'Asset Tag',
        'Record Code',
        'Assignment ID',
        'Return ID',
        'Ticket ID',
        'Disposal ID',
        'Purchase ID',
        'License ID',
        'Log ID',
      ];
      const normalizedFields = Array.from(
        new Set(
          selectedFields.map((f) =>
            primaryIdFields.includes(f) ? primaryIdField : f
          )
        )
      );

      // Ensure primary ID is the first column if it exists in the selection
      if (normalizedFields.includes(primaryIdField)) {
        normalizedFields.splice(normalizedFields.indexOf(primaryIdField), 1);
        normalizedFields.unshift(primaryIdField);
      }

      return normalizedFields.map((field) => ({
        id: field,
        accessorFn: (row: ReportPreviewRow) => row[field],
        header: field,
        cell: ({ row }) => {
          const value = row.original[field];
          if (field === 'Status') {
            return (
              <StatusBadge
                value={typeof value === 'string' ? value : undefined}
                showIcon
              />
            );
          }
          return toCellText(value);
        },
      }));
    }

    // Default columns for Asset Registry
    if (source === 'Asset Registry' || source === 'Assets' || !source) {
      return [
        {
          id: 'Asset Tag',
          accessorFn: (row) => row['Asset Tag'],
          header: 'Asset Tag',
        },
        {
          id: 'Asset Name',
          accessorFn: (row) => row['Asset Name'],
          header: 'Asset Name',
          cell: ({ row }) => toCellText(row.original['Asset Name']),
        },
        {
          id: 'Category',
          accessorFn: (row) => row['Category'],
          header: 'Category',
        },
        {
          id: 'Assigned To',
          accessorFn: (row) => row['Assigned To'],
          header: 'Assigned to',
          cell: ({ row }) => toCellText(row.original['Assigned To']),
        },
        {
          id: 'Status',
          accessorFn: (row) => row['Status'],
          header: 'Status',
          cell: ({ row }) => (
            <StatusBadge value={row.original['Status'] as string} showIcon />
          ),
        },
      ];
    }

    // Default columns for Master Data
    if (source === 'Master Data') {
      return [
        {
          id: 'Record Code',
          accessorFn: (row) => row['Record Code'],
          header: 'Record Code',
        },
        {
          id: 'Type',
          accessorFn: (row) => row['Type'],
          header: 'Type',
        },
        {
          id: 'Name',
          accessorFn: (row) => row['Name'],
          header: 'Name',
        },
        {
          id: 'Description',
          accessorFn: (row) => row['Description'],
          header: 'Description',
        },
        {
          id: 'Status',
          accessorFn: (row) => row['Status'],
          header: 'Status',
          cell: ({ row }) => (
            <StatusBadge value={row.original['Status'] as string} showIcon />
          ),
        },
      ];
    }

    // Default columns for Active Assignments
    if (source === 'Active Assignments') {
      return [
        {
          id: 'Assignment ID',
          accessorFn: (row) => row['Assignment ID'],
          header: 'Assignment ID',
        },
        {
          id: 'Asset Tag',
          accessorFn: (row) => row['Asset Tag'],
          header: 'Asset Tag',
        },
        {
          id: 'Assigned To',
          accessorFn: (row) => row['Assigned To'],
          header: 'Assigned To',
        },
        {
          id: 'State',
          accessorFn: (row) => row['State'],
          header: 'State',
        },
        {
          id: 'Assigned Date',
          accessorFn: (row) => row['Assigned Date'],
          header: 'Assigned Date',
        },
      ];
    }

    // Default columns for Return History
    if (source === 'Return History') {
      return [
        {
          id: 'Return ID',
          accessorFn: (row) => row['Return ID'],
          header: 'Return ID',
        },
        {
          id: 'Asset Tag',
          accessorFn: (row) => row['Asset Tag'],
          header: 'Asset Tag',
        },
        {
          id: 'Returned Date',
          accessorFn: (row) => row['Returned Date'],
          header: 'Returned Date',
        },
        {
          id: 'Duration (Days)',
          accessorFn: (row) => row['Duration (Days)'],
          header: 'Duration (Days)',
        },
        {
          id: 'Return Condition',
          accessorFn: (row) => row['Return Condition'],
          header: 'Return Condition',
        },
      ];
    }

    // Default columns for Maintenance Records
    if (source === 'Maintenance Records') {
      return [
        {
          id: 'Ticket ID',
          accessorFn: (row) => row['Ticket ID'],
          header: 'Ticket ID',
        },
        {
          id: 'Asset Tag',
          accessorFn: (row) => row['Asset Tag'],
          header: 'Asset Tag',
        },
        {
          id: 'Ticket Type',
          accessorFn: (row) => row['Ticket Type'],
          header: 'Ticket Type',
        },
        {
          id: 'Status',
          accessorFn: (row) => row['Status'],
          header: 'Status',
        },
        {
          id: 'Actual Cost',
          accessorFn: (row) => row['Actual Cost'],
          header: 'Actual Cost',
        },
      ];
    }

    // Default columns for Disposal Records
    if (source === 'Disposal Records') {
      return [
        {
          id: 'Disposal ID',
          accessorFn: (row) => row['Disposal ID'],
          header: 'Disposal ID',
        },
        {
          id: 'Asset Tag',
          accessorFn: (row) => row['Asset Tag'],
          header: 'Asset Tag',
        },
        {
          id: 'Status',
          accessorFn: (row) => row['Status'],
          header: 'Status',
        },
        {
          id: 'Reason',
          accessorFn: (row) => row['Reason'],
          header: 'Reason',
        },
        {
          id: 'Requested At',
          accessorFn: (row) => row['Requested At'],
          header: 'Requested At',
        },
      ];
    }

    // Default columns for Purchase Records
    if (source === 'Purchase Records') {
      return [
        {
          id: 'Purchase ID',
          accessorFn: (row) => row['Purchase ID'],
          header: 'Purchase ID',
        },
        {
          id: 'Asset Tag',
          accessorFn: (row) => row['Asset Tag'],
          header: 'Asset Tag',
        },
        {
          id: 'Vendor',
          accessorFn: (row) => row['Vendor'],
          header: 'Vendor',
        },
        {
          id: 'Total Cost',
          accessorFn: (row) => row['Total Cost'],
          header: 'Total Cost',
        },
        {
          id: 'Purchase Date',
          accessorFn: (row) => row['Purchase Date'],
          header: 'Purchase Date',
        },
      ];
    }

    // Default columns for Depreciation Ledger
    if (source === 'Depreciation Ledger') {
      return [
        {
          id: 'Asset Tag',
          accessorFn: (row) => row['Asset Tag'],
          header: 'Asset Tag',
        },
        {
          id: 'Asset Name',
          accessorFn: (row) => row['Asset Name'],
          header: 'Asset Name',
        },
        {
          id: 'Purchase Cost',
          accessorFn: (row) => row['Purchase Cost'],
          header: 'Purchase Cost',
        },
        {
          id: 'Current Book Value',
          accessorFn: (row) => row['Current Book Value'],
          header: 'Current Book Value',
        },
        {
          id: 'Depreciation %',
          accessorFn: (row) => row['Depreciation %'],
          header: 'Depreciation %',
        },
      ];
    }

    // Default columns for TCO Overview
    if (source === 'TCO Overview') {
      return [
        {
          id: 'Asset Tag',
          accessorFn: (row) => row['Asset Tag'],
          header: 'Asset Tag',
        },
        {
          id: 'Asset Name',
          accessorFn: (row) => row['Asset Name'],
          header: 'Asset Name',
        },
        {
          id: 'Purchase Cost',
          accessorFn: (row) => row['Purchase Cost'],
          header: 'Purchase Cost',
        },
        {
          id: 'Total Maintenance Cost',
          accessorFn: (row) => row['Total Maintenance Cost'],
          header: 'Total Maintenance Cost',
        },
        {
          id: 'TCO',
          accessorFn: (row) => row['TCO'],
          header: 'TCO',
        },
      ];
    }

    // Default columns for Software Licenses
    if (source === 'Software Licenses') {
      return [
        {
          id: 'License ID',
          accessorFn: (row) => row['License ID'],
          header: 'License ID',
        },
        {
          id: 'Software Name',
          accessorFn: (row) => row['Software Name'],
          header: 'Software Name',
        },
        {
          id: 'License Type',
          accessorFn: (row) => row['License Type'],
          header: 'License Type',
        },
        {
          id: 'Used Seats',
          accessorFn: (row) => row['Used Seats'],
          header: 'Used Seats',
        },
        {
          id: 'Expiry Date',
          accessorFn: (row) => row['Expiry Date'],
          header: 'Expiry Date',
        },
      ];
    }

    // Default columns for Audit Logs
    if (source === 'Audit Logs') {
      return [
        {
          id: 'Log ID',
          accessorFn: (row) => row['Log ID'],
          header: 'Log ID',
        },
        {
          id: 'Timestamp',
          accessorFn: (row) => row['Timestamp'],
          header: 'Timestamp',
        },
        {
          id: 'User',
          accessorFn: (row) => row['User'],
          header: 'User',
        },
        {
          id: 'Action',
          accessorFn: (row) => row['Action'],
          header: 'Action',
        },
        {
          id: 'Entity Type',
          accessorFn: (row) => row['Entity Type'],
          header: 'Entity Type',
        },
      ];
    }

    return [];
  }, [selectedFields, source]);
}
