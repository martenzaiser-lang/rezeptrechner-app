import { NavLink } from 'react-router-dom';
import { auth } from '../services/api.js';
import { NAV_ITEMS } from './nav-items.jsx';

export default function BottomNav() {
  const isAdmin = auth.getRole() === 'admin';
  const items = NAV_ITEMS.filter((it) => !it.adminOnly || isAdmin);
  // Mit nur einem Eintrag (Baecker-Rollen) braucht es keine Bottom-Nav.
  if (items.length < 2) return null;
  return (
    <nav className="bottom-nav">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <NavLink
            key={it.to}
            to={it.to}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <span className="nav-icon"><Icon size={22} /></span>
            <span>{it.short || it.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
