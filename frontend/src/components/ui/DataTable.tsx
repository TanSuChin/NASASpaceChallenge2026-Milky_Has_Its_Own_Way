import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { EmptyState } from './StatePlaceholders';

export interface DataColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'right';
  sortValue?: (row: T) => string | number;
  render: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: DataColumn<T>[];
  rows: T[];
  rowKey: (row: T, idx: number) => string;
  emptyTitle?: string;
  emptyDescription?: string;
  initialSortKey?: string;
}

/** Clean tabular data view supporting accessible column sorting and quiet dividers. */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyTitle = 'No records matching filters',
  emptyDescription = 'Adjust filter criteria or add new mission records.',
  initialSortKey,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(initialSortKey || null);
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return rows;
    const getVal = col.sortValue;
    return [...rows].sort((a, b) => {
      const av = getVal(a);
      const bv = getVal(b);
      if (av === bv) return 0;
      const res = av > bv ? 1 : -1;
      return sortAsc ? res : -res;
    });
  }, [rows, columns, sortKey, sortAsc]);

  const toggleSort = (key: string, sortable: boolean) => {
    if (!sortable) return;
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="tc-panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--tc-border)] bg-[var(--tc-elevated)]/60">
              {columns.map((col) => {
                const isSortable = Boolean(col.sortValue);
                const active = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    className={`px-4 py-3 text-xs font-medium text-[var(--tc-text-muted)] whitespace-nowrap ${
                      col.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {isSortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key, true)}
                        className="inline-flex items-center gap-1 hover:text-[var(--tc-text)] transition-colors"
                      >
                        <span>{col.header}</span>
                        {active &&
                          (sortAsc ? (
                            <ArrowUp className="w-3 h-3" aria-hidden="true" />
                          ) : (
                            <ArrowDown className="w-3 h-3" aria-hidden="true" />
                          ))}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--tc-border)]">
            {sortedRows.map((row, idx) => (
              <tr
                key={rowKey(row, idx)}
                className="hover:bg-[var(--tc-elevated)]/40 transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3.5 text-sm text-[var(--tc-text-secondary)] ${
                      col.align === 'right' ? 'text-right tabular-data' : ''
                    }`}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
