// Displays one application and delegates star, edit, and removal actions to the workspace.
import type { Application } from '../../lib/applications/types';
import { companyInitial, formatDate } from '../../lib/applications/formatting';
import StarButton from './StarButton';
import StatusBadge from './StatusBadge';
export interface RowActions {
  onEdit: (item: Application) => void;
  onRemove: (item: Application) => void;
  onStar: (item: Application) => void;
}
export default function ApplicationRow({
  item,
  onEdit,
  onRemove,
  onStar,
}: RowActions & { item: Application }) {
  const safeUrl = /^https?:\/\//i.test(item.url) ? item.url : '';
  return (
    <tr>
      <td className="star-cell">
        <StarButton
          company={item.company}
          starred={item.starred === true}
          onToggle={() => onStar(item)}
        />
      </td>
      <td>
        <div className="company-cell">
          <span className="company-mark">{companyInitial(item.company)}</span>
          {item.company}
        </div>
      </td>
      <td>
        {safeUrl ? (
          <a className="role-link" href={safeUrl} target="_blank" rel="noopener noreferrer">
            {item.role} ↗
          </a>
        ) : (
          <span className="role-link">{item.role}</span>
        )}
      </td>
      <td className="date">{formatDate(item.datePosted)}</td>
      <td className="date">{formatDate(item.dateApplied)}</td>
      <td>
        <StatusBadge status={item.status} />
      </td>
      <td>
        <div className="row-actions">
          <button
            type="button"
            className="icon-button edit"
            aria-label={`Edit ${item.company} application`}
            onClick={() => onEdit(item)}
          >
            ✎
          </button>
          <button
            type="button"
            className="icon-button delete"
            aria-label={`Delete ${item.company} application`}
            onClick={() => onRemove(item)}
          >
            ×
          </button>
        </div>
      </td>
    </tr>
  );
}
