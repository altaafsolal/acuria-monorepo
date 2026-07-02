interface PaginationProps {
  page: number;
  size: number;
  total: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, size, total, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / size));

  if (total <= size) return null;

  return (
    <div className="pagination">
      <button
        type="button"
        className="btn-secondary btn-secondary--sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Précédent
      </button>
      <span className="pagination__info">
        Page
        {' '}
        {page}
        {' '}
        /
        {' '}
        {totalPages}
      </span>
      <button
        type="button"
        className="btn-secondary btn-secondary--sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Suivant
      </button>
    </div>
  );
}
