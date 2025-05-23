"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  getFilteredRowModel,
  ColumnFiltersState,
  RowSelectionState,
  OnChangeFn,
  getPaginationRowModel,
  PaginationState,
} from "@tanstack/react-table";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    defaultSort?: boolean;
    defaultSortDesc?: boolean;
  }
}

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState, useMemo } from "react";
import { EnhancedDataTableToolbar } from "@/components/ui-extensions/enhanced-data-table/data-table-toolbar";
import { ColumnFilter } from "@/components/ui-extensions/enhanced-data-table/column-filter";
import { getRowSelectionColumn } from "@/components/ui-extensions/enhanced-data-table/row-selection-column";
import { DataTablePagination } from "@/components/ui-extensions/enhanced-data-table/data-table-pagination";

interface SearchBarProps {
  placeholder: string;
}

interface RowSelectionProps<TData> {
  rowSelection: RowSelectionState;
  onRowSelectionChange: OnChangeFn<RowSelectionState>;
  getRowId: (row: TData) => string;
}

interface PaginationOptions {
  initialPageIndex?: number;
  initialPageSize?: number;
}

interface EnhancedDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  defaultSorting?: { id: string; desc: boolean }[];
  searchBarProps?: SearchBarProps;
  rowSelectionProps?: RowSelectionProps<TData>;
  paginationOptions?: PaginationOptions;
}

export function EnhancedDataTable<TData, TValue>({
  columns,
  data,
  defaultSorting = [],
  searchBarProps,
  rowSelectionProps,
  paginationOptions,
}: EnhancedDataTableProps<TData, TValue>) {
  const generatedDefaultSorting = useMemo(() => {
    if (defaultSorting.length > 0) return defaultSorting;
    const sortableColumn = columns.find((col) => col.meta?.defaultSort);
    if (sortableColumn && sortableColumn.id) {
      return [
        {
          id: sortableColumn.id,
          desc: sortableColumn.meta?.defaultSortDesc ?? false,
        },
      ];
    }
    return [];
  }, [columns, defaultSorting]);

  const [sorting, setSorting] = useState<SortingState>(generatedDefaultSorting);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: paginationOptions?.initialPageIndex ?? 0,
    pageSize: paginationOptions?.initialPageSize ?? 10,
  });

  const hasFilterableColumns = useMemo(() => {
    return columns.some((column) => column.enableGlobalFilter === true);
  }, [columns]);

  const allColumns = useMemo(() => {
    if (!rowSelectionProps) return columns;

    return [getRowSelectionColumn<TData>(), ...columns] as ColumnDef<
      TData,
      TValue
    >[];
  }, [columns, rowSelectionProps]);

  const tableState = useMemo(() => {
    const baseState = {
      sorting,
      globalFilter,
      columnFilters,
      pagination,
    };

    if (!rowSelectionProps) return baseState;

    return {
      ...baseState,
      rowSelection: rowSelectionProps.rowSelection,
    };
  }, [sorting, globalFilter, columnFilters, rowSelectionProps, pagination]);

  const table = useReactTable({
    data,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: paginationOptions
      ? getPaginationRowModel()
      : undefined,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    globalFilterFn: "includesString",
    state: tableState,
    enableRowSelection: rowSelectionProps !== undefined,
    onRowSelectionChange: rowSelectionProps?.onRowSelectionChange,
    getRowId: rowSelectionProps?.getRowId,
  });

  const filterComponents = useMemo(() => {
    /** Get all columns that have column filtering enabled */
    const filterableColumns = table
      .getAllColumns()
      .filter((column) => column.columnDef.enableColumnFilter === true);

    if (filterableColumns.length === 0) return null;

    return (
      <div className="flex gap-2">
        {filterableColumns.map((column) => {
          if (column.columnDef.filterFn === "arrIncludes") {
            const uniqueValues = new Set<string>();
            /** Get all unique values from the column */
            data.forEach((row) => {
              const value = column.accessorFn?.(row, 0) as string[] | undefined;
              if (Array.isArray(value)) {
                value.forEach((v) => {
                  /** If the value is not empty, add it to the set */
                  if (v && v !== "") uniqueValues.add(v);
                });
              }
            });

            const options = Array.from(uniqueValues);
            /** If there are no options, don't render the column filter component */
            if (options.length === 0) return null;
            /** Render the column filter component */
            return (
              <ColumnFilter key={column.id} column={column} options={options} />
            );
          }
          return null;
        })}
      </div>
    );
  }, [data, table]);

  return (
    <div>
      {searchBarProps && (
        <EnhancedDataTableToolbar
          table={table}
          placeholder={searchBarProps.placeholder}
          showSearchInput={hasFilterableColumns}
          filterComponent={filterComponents}
        />
      )}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50 rounded-t-lg">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="px-4 py-2">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-4 py-2">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {paginationOptions && (
          <div className="border-t border-gray-200 bg-gray-50 ">
            <DataTablePagination table={table} />
          </div>
        )}
      </div>
    </div>
  );
}
