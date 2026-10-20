import Button from '../ui/Button';
import { formatDate, formatTime } from '../../utils/formatDate';

export default function EventCalendar({ events, canDelete, onDelete }) {
  if (events.length === 0) return <p className="muted">No events to show.</p>;

  const byDay = events.reduce((acc, e) => {
    const key = formatDate(e.startsAt);
    (acc[key] ||= []).push(e);
    return acc;
  }, {});

  return (
    <>
      {Object.entries(byDay).map(([day, items]) => (
        <div key={day} style={{ marginBottom: '1rem' }}>
          <h3>{day}</h3>
          {items.map((e) => (
            <div key={e.id} className="list-item">
              <div>
                <strong>{e.title}</strong>
                <div className="muted small">
                  {formatTime(e.startsAt)}{e.endsAt ? `–${formatTime(e.endsAt)}` : ''}
                  {e.location ? ` · ${e.location}` : ''} · by {e.createdBy.name}
                </div>
                {e.description && <p className="post-body small">{e.description}</p>}
              </div>
              {canDelete(e) && <Button variant="ghost" size="sm" onClick={() => onDelete(e)}>Delete</Button>}
            </div>
          ))}
        </div>
      ))}
    </>
  );
}