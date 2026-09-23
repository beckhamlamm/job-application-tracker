// Presents a status using the shared status definitions, including OA's interviewing color.
import { STATUS_META, type ApplicationStatus } from '../../lib/applications/types';
export default function StatusBadge({ status }: { status: ApplicationStatus }) {
  return <span className={`status ${STATUS_META[status].className}`}>{status}</span>;
}
