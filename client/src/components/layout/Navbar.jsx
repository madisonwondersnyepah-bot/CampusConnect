import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import Button from '../ui/Button';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <header className="topbar">
      <span>{user.name}</span>
      <span className="badge">{user.role}</span>
      <Button variant="secondary" size="sm" onClick={handleLogout}>Log out</Button>
    </header>
  );
}