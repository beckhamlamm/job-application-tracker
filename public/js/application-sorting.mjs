export const STATUS_ORDER = ['Offer', 'Interviewing', 'Applied', 'Rejected', 'Withdrawn'];

function newestAddedFirst(a, b) {
  return (b.createdAt || 0) - (a.createdAt || 0);
}

function newestDateFirst(field) {
  return (a, b) => {
    if (!a[field] && !b[field]) return newestAddedFirst(a, b);
    if (!a[field]) return 1;
    if (!b[field]) return -1;
    return b[field].localeCompare(a[field]) || newestAddedFirst(a, b);
  };
}

const statusRank = (item) => STATUS_ORDER.indexOf(item.status);
const comparators = {
  applied: newestDateFirst('dateApplied'),
  posted: newestDateFirst('datePosted'),
  company: (a, b) => a.company.localeCompare(b.company, undefined, { sensitivity: 'base' }) || newestAddedFirst(a, b),
  companyReverse: (a, b) => b.company.localeCompare(a.company, undefined, { sensitivity: 'base' }) || newestAddedFirst(a, b),
  status: (a, b) => statusRank(a) - statusRank(b) || newestAddedFirst(a, b),
  statusReverse: (a, b) => statusRank(b) - statusRank(a) || newestAddedFirst(a, b),
};

export function sortApplications(items, mode = 'applied') {
  return [...items].sort(comparators[mode] || comparators.applied);
}
