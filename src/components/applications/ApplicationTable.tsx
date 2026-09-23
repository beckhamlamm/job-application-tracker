// Renders accessible application columns and empty results with stable row identity.
import type { Application } from '../../lib/applications/types';
import ApplicationRow, { type RowActions } from './ApplicationRow';
export default function ApplicationTable({
  items,
  ...actions
}: RowActions & { items: Application[] }) {
  return (
    <div className="table-card">
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th className="star-heading">
                <span className="sr-only">Star</span>
              </th>
              <th>Company</th>
              <th>Role</th>
              <th>Posted</th>
              <th>Applied</th>
              <th>Status</th>
              <th>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody id="applicationRows">
            {items.map((item) => (
              <ApplicationRow key={item.id} item={item} {...actions} />
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">↗</div>
            <h3>No applications to display</h3>
            <p>Add an application or adjust your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
