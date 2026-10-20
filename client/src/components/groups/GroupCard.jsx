import { Link } from 'react-router-dom';
import Button from '../ui/Button';

export default function GroupCard({ group: g, onJoin }) {
  return (
    <div className="card">
      <div className="row between">
        <h3><Link to={`/groups/${g.id}`}>{g.name}</Link></h3>
        <span className="row">
          {g.isPrivate && <span className="badge">Private</span>}
          {g.myRole && <span className="badge badge-success">{g.myRole === 'OWNER' ? 'Owner' : 'Member'}</span>}
        </span>
      </div>
      {g.description && <p>{g.description}</p>}
      <p className="muted small">
        {g.course ? `${g.course.code} · ` : ''}{g.memberCount} member{g.memberCount === 1 ? '' : 's'} · owner {g.owner.name}
      </p>
      {!g.myRole && !g.isPrivate && <Button size="sm" onClick={() => onJoin(g)}>Join group</Button>}
    </div>
  );
}