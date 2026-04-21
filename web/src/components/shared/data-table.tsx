"use client"

import * as React from "react"
import {
  type ColumnDef,
  type PaginationState,
  type RowSelectionState,
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
  selectionActions?: DataTableSelectionAction<TData>[]
  selectionLabel?: (selectedCount: number) => string
  onRowClick?: (row: TData, rowIndex: number) => void
  className?: string
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pageSizeOptions = [16, 24, 32, 48],
  initialPageSize = 16,
  selectionActions = [],
  selectionLabel,
  onRowClick,
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
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
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
  const pageCount = Math.max(table.getPageCount(), 1)
  const currentPage = Math.min(table.getState().pagination.pageIndex + 1, pageCount)

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-border bg-card font-sans",
        className
      )}
    >
      <Table>
        <TableHeader className="bg-muted [&_tr]:border-b [&_tr]:border-border">
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
                        header.column.id === "select" && "w-13 px-0"
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
                          <SortIcon aria-hidden="true" className="size-3.5 text-muted-foreground" />
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
                onClick={(event) => handleRowClick(event, row.original, row.index)}
                className={cn(
                  "h-13.25 border-border",
                  isRowClickable && "cursor-pointer hover:bg-muted/50"
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      "h-13.25 px-4 text-foreground",
                      "font-normal",
                      cell.column.id === "select" && "w-13 px-0"
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow className="h-13.25 border-border">
              <TableCell
                colSpan={table.getAllLeafColumns().length}
                className="h-13.25 text-center font-normal text-muted-foreground"
              >
                No results found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="grid grid-cols-1 items-center gap-3 border-t border-border px-4 py-3 text-sm sm:grid-cols-3">
        <p className="text-muted-foreground">
          {selectedRows} of {totalRows} row(s) selected
        </p>

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
