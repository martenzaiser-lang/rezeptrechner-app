import { CookingPot, Settings2 } from 'lucide-react';

// Zentrale Nav-Definition fuer TopNav (Desktop) und BottomNav (Mobil).
// adminOnly-Eintraege sehen nur Admins; Teigmacher/Kuchenmacher sehen
// nur den Backen-Screen.
export const NAV_ITEMS = [
  { to: '/backen', label: 'Backen', icon: CookingPot },
  { to: '/verwaltung', label: 'Verwaltung', icon: Settings2, adminOnly: true },
];
