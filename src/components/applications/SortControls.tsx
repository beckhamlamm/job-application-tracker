// Owns presentation of the existing sort choices and search field.
import { useRef } from 'react';
import type { SortMode } from '../../lib/applications/types';
const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'applied', label: 'Date applied' },
  { value: 'posted', label: 'Date posted' },
  { value: 'company', label: 'Company A–Z' },
  { value: 'companyReverse', label: 'Company Z–A' },
  { value: 'status', label: 'Status: offer first' },
  { value: 'statusReverse', label: 'Status: withdrawn first' },
];
export default function SortControls({
  sort,
  search,
  onSort,
  onSearch,
}: {
  sort: SortMode;
  search: string;
  onSort: (mode: SortMode) => void;
  onSearch: (value: string) => void;
}) {
  const searchInput = useRef<HTMLInputElement>(null);
  return (
    <div className="table-tools">
      <label className="sort-control">
        <span>Sort by</span>
        <select
          aria-label="Sort applications"
          value={sort}
          onChange={(event) => onSort(event.target.value as SortMode)}
        >
          {SORT_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <div className="search">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
        <input
          ref={searchInput}
          aria-label="Search applications"
          placeholder="Search applications"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
        />
        {search.length > 0 && (
          <button
            type="button"
            className="search-clear"
            aria-label="Clear search"
            title="Clear search"
            onClick={() => {
              onSearch('');
              searchInput.current?.focus();
            }}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
