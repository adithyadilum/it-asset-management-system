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
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

type DataTableSelectionActionTone = "secondary" | "destructive" | "primary"

const INTERACTIVE_SELECTOR =
  "button,a,input,textarea,select,[role='checkbox'],[data-row-panel-ignore='true']"

const DEFAULT_PAGE_SIZE_OPTIONS = [16, 24, 32, 48]
const DEFAULT_INITIAL_PAGE_SIZE = 16

export type DataTableSelectionAction<TData> = {
  id: string
  label: string
  onClick?: (selectedRows: TData[]) => void
  tone?: DataTableSelectionActionTone
  disabled?: boolean | ((selectedRows: TData[]) => boolean)
  hidden?: boolean | ((selectedRows: TData[]) => boolean)
}

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
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

  // 1. ADDED THESE TWO OPTIONAL PROPS
  rowSelection?: RowSelectionState
  onRowSelectionChange?: OnChangeFn<RowSelectionState>
  pageSizeOptions?: number[]
  initialPageSize?: number

  // Prevent selection header replacement
  disableSelectionHeader?: boolean
  hideFooter?: boolean
}

export function DataTable<TData, TValue>({
  columns,
  data,
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

  // 2. DESTRUCTURED THEM HERE
  rowSelection: externalRowSelection,
  onRowSelectionChange: externalOnRowSelectionChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  initialPageSize = DEFAULT_INITIAL_PAGE_SIZE,
  disableSelectionHeader = false,
  hideFooter = false,
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
    const normalized = Array.from(
      new Set([...pageSizeOptions, initialPageSize])
    ).filter((value) => value > 0)
    normalized.sort((a, b) => a - b)

    return normalized
  }, [pageSizeOptions, initialPageSize])

  const [sorting, setSorting] = React.useState<SortingState>(defaultSorting)

  // 3. UPDATED THIS TO USE EXTERNAL STATE IF PROVIDED (matches pagination logic)
  const [internalRowSelection, setInternalRowSelection] = React.useState<RowSelectionState>({})
  const rowSelection = externalRowSelection ?? internalRowSelection
  const setRowSelection = externalOnRowSelectionChange ?? setInternalRowSelection

  const [internalPagination, setInternalPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: initialPageSize,
  })

  const pagination = paginationState ?? internalPagination
  const setPagination = onPaginationChange ?? setInternalPagination

  React.useEffect(() => {
    setRowSelection({})
  }, [selectionResetSignal, setRowSelection])

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

  const tableContent = (
    <Table
      className={cn("table-fixed min-w-full", table.getRowModel().rows.length === 0 && "h-full")}
      containerClassName={cn("!overflow-visible", table.getRowModel().rows.length === 0 && "h-full")}
    >
      <colgroup>
        {table.getAllLeafColumns().map((column) => {
          const isSelect = column.id === "select"
          const isId = isCompactIdColumn(column.id)

          let width = column.getSize()
          if (isSelect) width = 52
          else if (isId) width = 112

          return (
            <col
              key={column.id}
              style={{
                width: width,
                minWidth: width,
              }}
            />
          )
        })}
      </colgroup>
      <TableHeader className="sticky top-0 z-10 bg-muted shadow-[0_1px_0] shadow-border [&_tr]:border-b-0">
        {(selectedRows > 0 && !disableSelectionHeader) ? (
          <TableRow className="h-13.25 border-border bg-primary hover:bg-primary transition-all duration-200 ease-in-out">
            <TableHead
              colSpan={table.getAllLeafColumns().length}
              className="h-13.25 bg-primary px-6 py-0 font-medium text-primary-foreground [&:has([role=checkbox])]:pr-6 transition-all duration-200 ease-in-out"
            >
              <div className="flex h-13.25 w-full items-center justify-between pr-6">
                <div className="flex min-w-0 items-center">
                  <div className="flex w-13 items-center justify-center" data-row-panel-ignore="true">
                    <Checkbox
                      aria-label="Select all rows"
                      checked={
                        table.getIsAllRowsSelected() ||
                        (table.getIsSomeRowsSelected() ? "indeterminate" : false)
                      }
                      onCheckedChange={(value) => table.toggleAllRowsSelected(Boolean(value))}
                      className="border-primary-foreground/70 data-[state=checked]:border-primary-foreground data-[state=checked]:bg-primary-foreground data-[state=checked]:text-primary data-[state=indeterminate]:border-primary-foreground data-[state=indeterminate]:bg-primary-foreground data-[state=indeterminate]:text-primary"
                    />
                  </div>
                  <p className="truncate text-sm font-medium text-primary-foreground ml-3">
                    {actionHeaderLabel}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5" data-row-panel-ignore="true">
                  {selectionActions.map((action) => {
                    const isDisabled =
                      typeof action.disabled === "function"
                        ? action.disabled(selectedRowData)
                        : Boolean(action.disabled)

                    const isHidden =
                      typeof action.hidden === "function"
                        ? action.hidden(selectedRowData)
                        : Boolean(action.hidden)

                    if (isHidden) return null

                    return (
                      <Button
                        key={action.id}
                        type="button"
                        size="sm"
                        variant={
                          action.tone === "destructive"
                            ? "destructive"
                            : action.tone === "primary"
                              ? "default"
                              : "outline"
                        }
                        disabled={isDisabled}
                        onClick={() => action.onClick?.(selectedRowData)}
                        className={cn(
                          "h-9 rounded-md px-4 text-sm font-medium shadow-[0px_1px_2px_rgba(0,0,0,0.10)]",
                          action.tone === "destructive"
                            ? "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            : action.tone === "primary"
                              ? "border-primary-foreground/20 bg-primary-foreground text-primary hover:bg-primary-foreground/90"
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
            <TableRow key={headerGroup.id} className="h-13.25 border-border transition-all duration-200 ease-in-out">
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
                        className="inline-flex min-w-0 max-w-full items-center gap-2 text-left bg-transparent p-0 border-none appearance-none"
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

      <TableBody className={cn(table.getRowModel().rows.length === 0 && "h-full")}>
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
                  isActive && "bg-muted"
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
          <TableRow className="h-full border-border hover:bg-transparent">
            <TableCell
              colSpan={table.getAllLeafColumns().length}
              className="h-full p-0"
            >
              <div className="flex h-full items-center justify-center py-12">
                <TableEmptyState
                  title={emptyState?.title}
                  description={emptyState?.description}
                  action={emptyState?.action}
                />
              </div>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )

  return (
    <div
      className={cn(
        "flex flex-1 min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card font-sans",
        className
      )}
    >
      {enableRowScroll ? (
        <ScrollArea className="flex-1 min-h-0">
          {tableContent}
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto">
          {tableContent}
        </div>
      )}

      {!hideFooter && (
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border px-4 py-3 text-sm">
          <div className="flex-1 whitespace-nowrap text-muted-foreground">
            {footerText !== undefined ? (
              footerText
            ) : enableRowSelection ? (
              `${selectedRows} of ${totalRows} row(s) selected`
            ) : (
              `Showing ${totalRows} row(s)`
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2">
              <label htmlFor="rows-per-page" className="whitespace-nowrap text-muted-foreground">
                Rows per page
              </label>
              <Select
                value={String(table.getState().pagination.pageSize)}
                onValueChange={(value) => table.setPageSize(Number(value))}
              >
                <SelectTrigger id="rows-per-page" className="h-8 w-fit min-w-[70px]">
                  <SelectValue placeholder={table.getState().pagination.pageSize} />
                </SelectTrigger>
                <SelectContent>
                  {sortedPageSizes.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <p className="whitespace-nowrap text-muted-foreground">
                Page {currentPage} of {computedPageCount}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
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
                  className="h-8 w-8 p-0"
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
                  className="h-8 w-8 p-0"
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
                  className="h-8 w-8 p-0"
                  onClick={() => table.setPageIndex(computedPageCount - 1)}
                  disabled={!table.getCanNextPage()}
                  aria-label="Go to last page"
                >
                  {">>"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}