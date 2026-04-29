"use client"

import * as React from "react"
import {
  type ColumnDef,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type OnChangeFn,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react"

import { TableEmptyState, type TableEmptyStateAction } from "@/components/shared/table-empty-state"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
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

const INTERACTIVE_SELECTOR =
  "button,a,input,textarea,select,[role='checkbox'],[data-row-panel-ignore='true']"

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
  defaultSorting?: SortingState
  enableRowScroll?: boolean
  enableRowSelection?: boolean
  selectionActions?: DataTableSelectionAction<TData>[]
  selectionLabel?: (selectedCount: number) => string
  emptyState?: {
    title?: string
    description?: string
    action?: TableEmptyStateAction
  }
  onRowClick?: (row: TData, rowIndex: number) => void
  isRowActive?: (row: TData, rowIndex: number) => boolean
  activeRowCondition?: (row: TData) => boolean
  selectionResetSignal?: number | string
  className?: string
  manualPagination?: boolean
  pageCount?: number
  paginationState?: PaginationState
  onPaginationChange?: OnChangeFn<PaginationState>
  footerText?: React.ReactNode
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pageSizeOptions = [16, 24, 32, 48],
  initialPageSize = 16,
  defaultSorting = [],
  enableRowScroll = true,
  enableRowSelection = true,
  selectionActions = [],
  selectionLabel,
  emptyState,
  onRowClick,
  activeRowCondition,
  isRowActive,
  selectionResetSignal,
  className,
  manualPagination,
  pageCount,
  paginationState,
  onPaginationChange,
  footerText,
}: DataTableProps<TData, TValue>) {
  const isCompactIdColumn = React.useCallback((columnId: string) => columnId === "id", [])

  const getDisplayText = React.useCallback((value: unknown) => {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return String(value)
    }

    return null
  }, [])

  const syncOverflowTitle = React.useCallback((element: HTMLElement) => {
    const fullText = element.dataset.fulltext

    if (!fullText) {
      element.removeAttribute("title")
      return
    }

    if (element.scrollWidth > element.clientWidth) {
      element.title = fullText
      return
    }

    element.removeAttribute("title")
  }, [])

  const handleOverflowTooltip = React.useCallback(
    (event: React.MouseEvent<HTMLElement> | React.FocusEvent<HTMLElement>) => {
      syncOverflowTitle(event.currentTarget)
    },
    [syncOverflowTitle]
  )

  const sortedPageSizes = React.useMemo(() => {
    const normalized = Array.from(new Set([...pageSizeOptions, initialPageSize])).filter(
      (value) => value > 0
    )
    normalized.sort((a, b) => a - b)

    return normalized
  }, [initialPageSize, pageSizeOptions])

  const [sorting, setSorting] = React.useState<SortingState>(defaultSorting)
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [internalPagination, setInternalPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: initialPageSize,
  })

  const pagination = paginationState ?? internalPagination
  const setPagination = onPaginationChange ?? setInternalPagination

  React.useEffect(() => {
    setRowSelection({})
  }, [selectionResetSignal])

  const selectionColumn = React.useMemo<ColumnDef<TData, unknown>>(
    () => ({
      id: "select",
      size: 52,
      enableSorting: false,
      enableHiding: false,
      header: ({ table }) => (
        <div
          className="flex items-center justify-center"
          data-row-panel-ignore="true"
          onClick={(event) => event.stopPropagation()}
        >
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
        <div
          className="flex items-center justify-center"
          data-row-panel-ignore="true"
          onClick={(event) => event.stopPropagation()}
        >
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
    () =>
      enableRowSelection
        ? [selectionColumn, ...(columns as ColumnDef<TData, unknown>[])]
        : (columns as ColumnDef<TData, unknown>[]),
    [columns, enableRowSelection, selectionColumn]
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
    manualPagination,
    pageCount,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    enableRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const isRowClickable = typeof onRowClick === "function"

  const handleRowClick = React.useCallback(
    (event: React.MouseEvent<HTMLTableRowElement>, rowData: TData, rowIndex: number) => {
      if (!onRowClick) {
        return
      }

      const clickedElement = event.target as HTMLElement
      if (clickedElement.closest(INTERACTIVE_SELECTOR)) {
        return
      }

      onRowClick(rowData, rowIndex)
    },
    [onRowClick]
  )

  const totalRows = table.getCoreRowModel().rows.length
  const selectedRows = table.getSelectedRowModel().rows.length
  const selectedRowData = table.getSelectedRowModel().rows.map((row) => row.original)
  const actionHeaderLabel = selectionLabel
    ? selectionLabel(selectedRows)
    : `${selectedRows} row(s) selected`
  const computedPageCount = Math.max(table.getPageCount(), 1)
  const currentPage = Math.min(table.getState().pagination.pageIndex + 1, computedPageCount)

  const rowsBody = (
    <Table className="table-fixed">
      <TableBody>
        {table.getRowModel().rows.length > 0 ? (
          table.getRowModel().rows.map((row) => {
            const isActive =
              (activeRowCondition ? activeRowCondition(row.original) : false) ||
              (isRowActive ? isRowActive(row.original, row.index) : false);

            return (
              <TableRow
                key={row.id}
                data-state={(row.getIsSelected() || isActive) ? "selected" : undefined}
                onClick={(event) => handleRowClick(event, row.original, row.index)}
                className={cn(
                  "h-13.25 border-border",
                  isRowClickable && "cursor-pointer hover:bg-muted/50",
                  isActive && "bg-slate-50"
                )}
              >
              {row.getVisibleCells().map((cell) => {
                const cellValue = cell.getValue()
                const cellTitle = getDisplayText(cellValue)
                const compactIdColumn = isCompactIdColumn(cell.column.id)

                return (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      "h-13.25 overflow-hidden px-4 text-foreground",
                      "font-normal",
                      cell.column.id === "select" && "w-13 px-0",
                      compactIdColumn && "w-28"
                    )}
                    style={{
                      width: cell.column.getSize(),
                      maxWidth: cell.column.getSize(),
                    }}
                  >
                    <div
                      className={cn(
                        (cell.column.columnDef.meta as { noTruncate?: boolean } | undefined)
                          ?.noTruncate
                          ? "min-w-0"
                          : "truncate"
                      )}
                      data-fulltext={cellTitle ?? undefined}
                      onMouseEnter={handleOverflowTooltip}
                      onFocus={handleOverflowTooltip}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  </TableCell>
                )
              })}
            </TableRow>
          )
        })
        ) : (
          <TableRow className="border-border">
            <TableCell
              colSpan={table.getAllLeafColumns().length}
              className="py-8"
            >
              <TableEmptyState
                title={emptyState?.title}
                description={emptyState?.description}
                action={emptyState?.action}
              />
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card font-sans",
        className
      )}
    >
      <Table className="table-fixed">
        <TableHeader className="bg-muted shadow-[0_1px_0] shadow-border [&_tr]:border-b-0">
          {selectedRows > 0 ? (
            <TableRow className="h-13.25 border-border bg-secondary hover:bg-secondary">
              <TableHead
                colSpan={table.getAllLeafColumns().length}
                className="h-13.25 bg-secondary px-6 py-0 font-medium text-secondary-foreground [&:has([role=checkbox])]:pr-6"
              >
                <div className="flex h-13.25 w-full items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3" data-row-panel-ignore="true">
                    <Checkbox
                      aria-label="Select all rows"
                      checked={
                        table.getIsAllRowsSelected() ||
                        (table.getIsSomeRowsSelected() ? "indeterminate" : false)
                      }
                      onCheckedChange={(value) => table.toggleAllRowsSelected(Boolean(value))}
                      className="border-secondary-foreground/60 data-[state=checked]:border-secondary-foreground data-[state=checked]:bg-secondary-foreground data-[state=checked]:text-secondary data-[state=indeterminate]:border-secondary-foreground data-[state=indeterminate]:bg-secondary-foreground data-[state=indeterminate]:text-secondary"
                    />
                    <p className="truncate text-sm font-medium text-secondary-foreground">
                      {actionHeaderLabel}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5" data-row-panel-ignore="true">
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
                            "h-9 rounded-md px-4 text-sm font-medium shadow-[0px_1px_2px_rgba(0,0,0,0.10)]",
                            action.tone === "destructive"
                              ? "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              : "border-border bg-muted text-foreground hover:bg-muted/80"
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
              <TableRow key={headerGroup.id} className="h-13.25 border-border">
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
                        "h-13.25 bg-muted px-4 text-foreground",
                        "font-medium",
                        header.column.id === "select" && "w-13 px-0",
                        isCompactIdColumn(header.column.id) && "w-28"
                      )}
                      style={{
                        width: header.column.getSize(),
                        maxWidth: header.column.getSize(),
                      }}
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex min-w-0 max-w-full items-center gap-2 text-left"
                        >
                          <span
                            className="truncate"
                            data-fulltext={getDisplayText(header.column.columnDef.header) ?? undefined}
                            onMouseEnter={handleOverflowTooltip}
                            onFocus={handleOverflowTooltip}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </span>
                          <SortIcon aria-hidden="true" className="size-3.5 text-muted-foreground" />
                        </button>
                      ) : (
                        <span
                          className="block truncate"
                          data-fulltext={getDisplayText(header.column.columnDef.header) ?? undefined}
                          onMouseEnter={handleOverflowTooltip}
                          onFocus={handleOverflowTooltip}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </span>
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))
          )}
        </TableHeader>
      </Table>

      {enableRowScroll ? (
        <ScrollArea className="flex-1 min-h-0">{rowsBody}</ScrollArea>
      ) : (
        <div className="flex-1 min-h-0">{rowsBody}</div>
      )}

      <div className="grid grid-cols-1 items-center gap-3 border-t border-border px-4 py-3 text-sm sm:grid-cols-3">
        <div className="text-muted-foreground">
          {footerText !== undefined ? (
            footerText
          ) : enableRowSelection ? (
            `${selectedRows} of ${totalRows} row(s) selected`
          ) : (
            `Showing ${totalRows} row(s)`
          )}
        </div>

        <div className="flex items-center justify-start gap-2 sm:justify-center">
          <label htmlFor="rows-per-page" className="text-muted-foreground">
            Rows per page
          </label>
          <select
            id="rows-per-page"
            value={table.getState().pagination.pageSize}
            onChange={(event) => table.setPageSize(Number(event.target.value))}
            className="h-8 rounded-md border border-border bg-card px-2 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {sortedPageSizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-start gap-2 sm:justify-end">
          <p className="mr-1 text-muted-foreground">
            Page {currentPage} of {computedPageCount}
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
            onClick={() => table.setPageIndex(computedPageCount - 1)}
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
