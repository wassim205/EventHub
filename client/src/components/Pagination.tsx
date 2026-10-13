import type { PaginationMeta } from "../api/types";
import { Button } from "./ui";

type PaginationProps = {
  meta: PaginationMeta;
  onChange: (page: number) => void;
};

export function Pagination({ meta, onChange }: PaginationProps) {
  if (meta.totalPages <= 1) {
    return null;
  }

  const pages = Array.from({ length: meta.totalPages }, (_, index) => index + 1);

  return (
    <nav className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
      <p className="text-xs text-slate-500">
        Page {meta.page} sur {meta.totalPages} — {meta.total} résultat{meta.total > 1 ? "s" : ""}
      </p>
      <div className="flex gap-1.5">
        <Button size="sm" disabled={meta.page <= 1} onClick={() => onChange(meta.page - 1)}>
          Précédent
        </Button>
        {pages.map((page) => (
          <Button
            key={page}
            size="sm"
            variant={page === meta.page ? "primary" : "secondary"}
            onClick={() => onChange(page)}
          >
            {page}
          </Button>
        ))}
        <Button size="sm" disabled={meta.page >= meta.totalPages} onClick={() => onChange(meta.page + 1)}>
          Suivant
        </Button>
      </div>
    </nav>
  );
}