import { NavLink } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/courses', label: 'Courses' },
  { to: '/timetable', label: 'Timetable' },
  { to: '/assignments', label: 'Assignments' },
  { to: '/announcements', label: 'Announcements' },
  { to: '/events', label: 'Events' },
  { to: '/groups', label: 'Study groups' },
  { to: '/notes', label: 'My notes' },
];

const adminLinks = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/courses', label: 'Manage courses' },
];

function Item({ to, label, end }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
      {label}
    </NavLink>
  );
}

export default function Sidebar() {
  const { user } = useAuth();
  return (
    <aside className="sidebar">
      <div className="brand">🎓 CampusConnect</div>
      {links.map((l) => <Item key={l.to} {...l} />)}
      {user.role === 'ADMIN' && (
        <>
          <div className="nav-section">Admin</div>
          {adminLinks.map((l) => <Item key={l.to} {...l} />)}
        </>
      )}
    </aside>
  );
}