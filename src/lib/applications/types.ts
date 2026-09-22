// Defines application records and the single source of truth for status presentation and sorting.
export const STATUSES = [
  'Applied',
  'OA',
  'Interviewing',
  'Offer',
  'Rejected',
  'Withdrawn',
] as const;
export type ApplicationStatus = (typeof STATUSES)[number];
export const STATUS_META: Record<ApplicationStatus, { rank: number; className: string }> = {
  Applied: { rank: 3, className: 'applied' },
  OA: { rank: 2, className: 'interviewing' },
  Interviewing: { rank: 1, className: 'interviewing' },
  Offer: { rank: 0, className: 'offer' },
  Rejected: { rank: 4, className: 'rejected' },
  Withdrawn: { rank: 5, className: 'withdrawn' },
};
export interface Application {
  id: string;
  company: string;
  role: string;
  url: string;
  datePosted: string;
  dateApplied: string;
  status: ApplicationStatus;
  createdAt: number;
  starred?: boolean;
  companySource?: string;
  companyConfidence?: string;
}
export type ApplicationInput = Omit<Application, 'createdAt'>;
export type ApplicationDraft = Partial<Application>;
export type SortMode =
  'applied' | 'posted' | 'company' | 'companyReverse' | 'status' | 'statusReverse';
export interface ParsedJob {
  url: string;
  company: string;
  role: string;
  datePosted: string;
  companySource?: string;
  companyConfidence?: string;
}
export function isStatus(value: unknown): value is ApplicationStatus {
  return typeof value === 'string' && STATUSES.some((status) => status === value);
}
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function isParsedJob(value: unknown): value is ParsedJob {
  return (
    isRecord(value) &&
    ['url', 'company', 'role', 'datePosted'].every((key) => typeof value[key] === 'string')
  );
}
