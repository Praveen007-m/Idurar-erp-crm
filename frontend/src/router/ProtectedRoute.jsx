import { Navigate, Outlet } from 'react-router-dom';

const normalizeToken = (rawToken) => {
  if (typeof rawToken !== 'string') return null;
  let token = rawToken.trim();
  if (token.toLowerCase().startsWith('bearer ')) {
    token = token.slice(7).trim();
  }
  return token || null;
};

const isValidJwt = (token) => {
  return typeof token === 'string' && token.split('.').length === 3 && token.split('.').every((part) => part.length > 0);
};

/**
 * ProtectedRoute component for token-based access control only.
 * It checks localStorage for a token and does not perform API calls.
 */
export default function ProtectedRoute({ children }) {
  const rawToken = localStorage.getItem('token');
  const token = normalizeToken(rawToken);
  console.log('CHECK TOKEN:', token);

  if (!token || !isValidJwt(token)) {
    if (rawToken && !isValidJwt(token)) {
      localStorage.removeItem('token');
      console.warn('Removed malformed token from localStorage.');
    }
    return <Navigate to="/login" replace />;
  }

  return children ?? <Outlet />;
}

