import { NavLink } from 'react-router-dom';
import { auth } from '../services/api.js';
import { NAV_ITEMS } from './nav-items.jsx';

// Horizontale Nav im Header. Per CSS nur ab Desktop sichtbar
// (theme.css: .top-nav unter 1024px display:none).
export default function TopNav() {
  const isAdmin = auth.getRole() === 'admin';
  const items = NAV_ITEMS.filter((it) => !it.adminOnly || isAdmin);
  if (items.length < 2) return null;
  return (
    <nav className="top-nav">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <NavLink
            key={it.to}
            to={it.to}
            className={({ isActive }) => 'top-nav-link' + (isActive ? ' active' : '')}
          >
            <Icon size={16} />
            <span>{it.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
