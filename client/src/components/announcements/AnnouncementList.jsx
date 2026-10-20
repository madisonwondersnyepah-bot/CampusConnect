import Button from '../ui/Button';
import { formatDateTime } from '../../utils/formatDate';

export default function AnnouncementList({ items, canManage, canPin, onDelete, onTogglePin }) {
  if (items.length === 0) return <p className="muted">No announcements yet.</p>;

  return (
    <>
      {items.map((a) => (
        <article key={a.id} className={`post${a.pinned ? ' pinned' : ''}`}>
          <div className="post-head">
            <h3>{a.pinned && '📌 '}{a.title}</h3>
            <span className="badge">{a.course ? a.course.code : 'Campus-wide'}</span>
          </div>
          <p className="post-body">{a.body}</p>
          <div className="muted small">
            {a.author.name} ({a.author.role.toLowerCase()}) · {formatDateTime(a.createdAt)}
          </div>
          {canManage(a) && (
            <div className="row" style={{ marginTop: '0.5rem' }}>
              {canPin && (
                <Button variant="secondary" size="sm" onClick={() => onTogglePin(a)}>
                  {a.pinned ? 'Unpin' : 'Pin'}
                </Button>
              )}
              <Button variant="danger" size="sm" onClick={() => onDelete(a)}>Delete</Button>
            </div>
          )}
        </article>
      ))}
    </>
  );
}