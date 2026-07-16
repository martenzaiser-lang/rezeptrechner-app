import { useState } from 'react';
import { Sun, Moon } from 'lucide-react';

// Sun/Mond-Toggle fuer Light/Dark-Theme.
// Liest und schreibt direkt das data-theme-Attribut auf <html>;
// in main.jsx wird das Attribut bereits vor dem React-Mount aus
// localStorage gesetzt, deshalb kein zentraler Provider noetig.

export default function ThemeToggle() {
  const [dark, setDark] = useState(
    () => document.documentElement.getAttribute('data-theme') === 'dark'
  );

  function toggle() {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.setAttribute('data-theme', 'dark');
      try { localStorage.setItem('theme', 'dark'); } catch {}
    } else {
      document.documentElement.removeAttribute('data-theme');
      try { localStorage.setItem('theme', 'light'); } catch {}
    }
  }

  return (
    <button
      type="button"
      className="header-theme-toggle"
      onClick={toggle}
      title={dark ? 'Zum Hellmodus wechseln' : 'Zum Dunkelmodus wechseln'}
      aria-label={dark ? 'Zum Hellmodus wechseln' : 'Zum Dunkelmodus wechseln'}
    >
      {dark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
