import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  onRowClick,
  page,
  pageSize,
  onPageChange,
}: {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
}) {
  const isPaginated = page !== undefined && pageSize !== undefined && onPageChange !== undefined;

  const paginatedRows = useMemo(() => {
    if (!isPaginated) return rows;
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize, isPaginated]);

  const totalPages = isPaginated ? Math.max(1, Math.ceil(rows.length / pageSize)) : 1;
  const safePage = isPaginated ? Math.min(page, totalPages) : 1;
  const startItem = isPaginated ? (safePage - 1) * pageSize + 1 : 1;
  const endItem = isPaginated ? Math.min(safePage * pageSize, rows.length) : rows.length;

  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="bg-secondary/60">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="whitespace-nowrap px-4 py-3 font-bold text-foreground/80">
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((row) => (
              <tr
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-t border-border transition-colors hover:bg-secondary/40 ${onRowClick ? "cursor-pointer" : ""}`}
              >
                {columns.map((c) => (
                  <td key={c.key} className="whitespace-nowrap px-4 py-3 text-foreground/90">
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
            {paginatedRows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">
                  لا توجد نتائج
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isPaginated && rows.length > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row">
          <span className="text-sm text-muted-foreground">
            عرض {startItem}–{endItem} من {rows.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(safePage - 1)}
              disabled={safePage <= 1}
            >
              السابق
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                variant={p === safePage ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(p)}
                className="min-w-[2rem]"
              >
                {p}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(safePage + 1)}
              disabled={safePage >= totalPages}
            >
              التالي
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
