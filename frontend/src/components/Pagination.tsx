import type { Pagination as PaginationInfo } from '../api/types';

export function Pagination({ pagination, onPageChange }: { pagination: PaginationInfo; onPageChange: (page: number) => void }) {
  const { page, totalPages, total } = pagination;
  if (total === 0) return null;

  return (
    <div className="flex flex-col gap-2 border-t border-slate-800 px-4 py-3 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
      <span>
        Page {page} of {totalPages} &middot; {total} total
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="flex-1 rounded-md border border-slate-700 px-3 py-1.5 disabled:opacity-40 hover:bg-slate-800 sm:flex-none sm:py-1"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="flex-1 rounded-md border border-slate-700 px-3 py-1.5 disabled:opacity-40 hover:bg-slate-800 sm:flex-none sm:py-1"
        >
          Next
        </button>
      </div>
    </div>
  );
}
