// Defines non-mutating sort strategies for application dates, companies, and statuses.
import { STATUSES, STATUS_META, type Application, type SortMode } from './types';
export const STATUS_ORDER = [...STATUSES].sort((a, b) => STATUS_META[a].rank - STATUS_META[b].rank);

function newestAddedFirst(a: Application, b: Application) {
  return (b.createdAt || 0) - (a.createdAt || 0);
}

function newestDateFirst(field: 'dateApplied' | 'datePosted') {
  return (a: Application, b: Application) => {
    if (!a[field] && !b[field]) {
      return newestAddedFirst(a, b);
    }
    if (!a[field]) {
      return 1;
    }
    if (!b[field]) {
      return -1;
    }
    return b[field].localeCompare(a[field]) || newestAddedFirst(a, b);
  };
}

const statusRank = (item: Application) => STATUS_META[item.status].rank;
const comparators: Record<SortMode, (a: Application, b: Application) => number> = {
  applied: newestDateFirst('dateApplied'),
  posted: newestDateFirst('datePosted'),
  company: (a, b) =>
    a.company.localeCompare(b.company, undefined, { sensitivity: 'base' }) ||
    newestAddedFirst(a, b),
  companyReverse: (a, b) =>
    b.company.localeCompare(a.company, undefined, { sensitivity: 'base' }) ||
    newestAddedFirst(a, b),
  status: (a, b) => statusRank(a) - statusRank(b) || newestAddedFirst(a, b),
  statusReverse: (a, b) => statusRank(b) - statusRank(a) || newestAddedFirst(a, b),
};

export function sortApplications(items: Application[], mode: SortMode = 'applied') {
  const compareWithinGroup = comparators[mode] || comparators.applied;
  return [...items].sort(
    (a, b) => Number(b.starred === true) - Number(a.starred === true) || compareWithinGroup(a, b),
  );
}
