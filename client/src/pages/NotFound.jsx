import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <>
      <h1>Page not found</h1>
      <p className="muted">That page doesn't exist.</p>
      <Link to="/">Back to the dashboard</Link>
    </>
  );
}