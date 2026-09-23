import type { Pagination as PaginationInfo } from '../api/types';

export function Pagination({ pagination, onPageChange }: { pagination: PaginationInfo; onPageChange: (page: number) => void }) {
  const { page, totalPages, total } = pagination;
  if (total === 0) return null;

  return (
    <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3 text-sm text-slate-400">
      <span>
        Page {page} of {totalPages} &middot; {total} total
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="rounded-md border border-slate-700 px-3 py-1 disabled:opacity-40 hover:bg-slate-800"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="rounded-md border border-slate-700 px-3 py-1 disabled:opacity-40 hover:bg-slate-800"
        >
          Next
        </button>
      </div>
    </div>
  );
}
