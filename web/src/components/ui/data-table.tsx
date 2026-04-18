"use client"

import * as React from "react"
import {
  type ColumnDef,
  type PaginationState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

type DataTableSelectionActionTone = "secondary" | "destructive"

export type DataTableSelectionAction<TData> = {
  id: string
  label: string
  onClick?: (selectedRows: TData[]) => void
  tone?: DataTableSelectionActionTone
  disabled?: boolean | ((selectedRows: TData[]) => boolean)
}

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  pageSizeOptions?: number[]
  initialPageSize?: number
  selectionActions?: DataTableSelectionAction<TData>[]
  selectionLabel?: (selectedCount: number) => string
  className?: string
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pageSizeOptions = [16, 24, 32, 48],
  initialPageSize = 16,
  selectionActions = [],
  selectionLabel,
  className,
}: DataTableProps<TData, TValue>) {
  const sortedPageSizes = React.useMemo(() => {
    const normalized = Array.from(new Set([...pageSizeOptions, initialPageSize])).filter(
      (value) => value > 0
    )
    normalized.sort((a, b) => a - b)

    return normalized
  }, [initialPageSize, pageSizeOptions])

  const [sorting, setSorting] = React.useState<SortingState>([])
  const [rowSelection, setRowSelection] = React.useState({})
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: initialPageSize,
  })

  const selectionColumn = React.useMemo<ColumnDef<TData, unknown>>(
    () => ({
      id: "select",
      size: 52,
      enableSorting: false,
      enableHiding: false,
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            aria-label="Select all rows"
            checked={
              table.getIsAllRowsSelected() ||
              (table.getIsSomeRowsSelected() ? "indeterminate" : false)
            }
            onCheckedChange={(value) => table.toggleAllRowsSelected(Boolean(value))}
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            aria-label="Select row"
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
          />
        </div>
      ),
    }),
    []
  )

  const tableColumns = React.useMemo(
    () => [selectionColumn, ...(columns as ColumnDef<TData, unknown>[])],
    [columns, selectionColumn]
  )

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns: tableColumns,
    state: {
      sorting,
      rowSelection,
      pagination,
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const totalRows = table.getCoreRowModel().rows.length
  const selectedRows = table.getSelectedRowModel().rows.length
  const selectedRowData = table.getSelectedRowModel().rows.map((row) => row.original)
  const actionHeaderLabel = selectionLabel
    ? selectionLabel(selectedRows)
    : `${selectedRows} row(s) selected`
  const pageCount = Math.max(table.getPageCount(), 1)
  const currentPage = Math.min(table.getState().pagination.pageIndex + 1, pageCount)

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[8px] border border-[#E2E8F0] bg-white font-sans",
        className
      )}
    >
      <Table>
        <TableHeader className="bg-[#F8FAFC] [&_tr]:border-b [&_tr]:border-[#E2E8F0]">
          {selectedRows > 0 ? (
            <TableRow className="h-[53px] border-[#E2E8F0] bg-[#64748B] hover:bg-[#64748B]">
              <TableHead
                colSpan={table.getAllLeafColumns().length}
                className="h-[53px] bg-[#64748B] px-6 py-0 font-medium text-[rgba(255,255,255,0.95)] [&:has([role=checkbox])]:pr-6"
              >
                <div className="flex h-[53px] w-full items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <Checkbox
                      aria-label="Select all rows"
                      checked={
                        table.getIsAllRowsSelected() ||
                        (table.getIsSomeRowsSelected() ? "indeterminate" : false)
                      }
                      onCheckedChange={(value) => table.toggleAllRowsSelected(Boolean(value))}
                      className="border-white/60 data-checked:border-white data-checked:bg-white data-checked:text-[#64748B]"
                    />
                    <p className="truncate text-sm font-medium text-[rgba(255,255,255,0.95)]">
                      {actionHeaderLabel}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {selectionActions.map((action) => {
                      const isDisabled =
                        typeof action.disabled === "function"
                          ? action.disabled(selectedRowData)
                          : Boolean(action.disabled)

                      return (
                        <Button
                          key={action.id}
                          type="button"
                          size="sm"
                          variant={action.tone === "destructive" ? "destructive" : "outline"}
                          disabled={isDisabled}
                          onClick={() => action.onClick?.(selectedRowData)}
                          className={cn(
                            "h-9 rounded-[8px] px-4 text-sm font-medium shadow-[0px_1px_2px_rgba(0,0,0,0.10)]",
                            action.tone === "destructive"
                              ? "border-transparent bg-[#EF4444] text-[rgba(255,255,255,0.95)] hover:bg-[#dc2626]"
                              : "border-[#E2E8F0] bg-[#F1F5F9] text-[#0F172A] hover:bg-[#e8eef5]"
                          )}
                        >
                          {action.label}
                        </Button>
                      )
                    })}
                  </div>
                </div>
              </TableHead>
            </TableRow>
          ) : (
            table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="h-[53px] border-[#E2E8F0]">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const sortState = header.column.getIsSorted()
                  const SortIcon =
                    sortState === "asc"
                      ? ChevronUp
                      : sortState === "desc"
                        ? ChevronDown
                        : ChevronsUpDown

                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        "h-[53px] bg-[#F8FAFC] px-4 text-[#0F172A]",
                        "font-medium",
                        header.column.id === "select" && "w-[52px] px-0"
                      )}
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-2 text-left"
                        >
                          <span>
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </span>
                          <SortIcon aria-hidden="true" className="size-3.5 text-[#64748B]" />
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))
          )}
        </TableHeader>

        <TableBody>
          {table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className="h-[53px] border-[#E2E8F0]"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      "h-[53px] px-4 text-[#0F172A]",
                      "font-normal",
                      cell.column.id === "select" && "w-[52px] px-0"
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow className="h-[53px] border-[#E2E8F0]">
              <TableCell
                colSpan={table.getAllLeafColumns().length}
                className="h-[53px] text-center font-normal text-[#64748B]"
              >
                No results found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="grid grid-cols-1 items-center gap-3 border-t border-[#E2E8F0] px-4 py-3 text-sm sm:grid-cols-3">
        <p className="text-[#64748B]">
          {selectedRows} of {totalRows} row(s) selected
        </p>

        <div className="flex items-center justify-start gap-2 sm:justify-center">
          <label htmlFor="rows-per-page" className="text-[#64748B]">
            Rows per page
          </label>
          <select
            id="rows-per-page"
            value={table.getState().pagination.pageSize}
            onChange={(event) => table.setPageSize(Number(event.target.value))}
            className="h-8 rounded-md border border-[#E2E8F0] bg-white px-2 text-[#0F172A] outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {sortedPageSizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-start gap-2 sm:justify-end">
          <p className="mr-1 text-[#64748B]">
            Page {currentPage} of {pageCount}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 min-w-8 px-2"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            aria-label="Go to first page"
          >
            {"<<"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 min-w-8 px-2"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Go to previous page"
          >
            {"<"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 min-w-8 px-2"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Go to next page"
          >
            {">"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 min-w-8 px-2"
            onClick={() => table.setPageIndex(pageCount - 1)}
            disabled={!table.getCanNextPage()}
            aria-label="Go to last page"
          >
            {">>"}
          </Button>
        </div>
      </div>
    </div>
  )
}
