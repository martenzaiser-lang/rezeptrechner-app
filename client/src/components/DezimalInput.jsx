// Dezimal-Eingabefeld (de-DE): zeigt Komma an, akzeptiert Komma UND Punkt.
//
// WICHTIG — gegen den "Komma verschwindet beim Tippen"-Bug: Während der
// Eingabe hält die Komponente den ROHEN Text lokal; erst beim Verlassen
// wird wieder der formatierte Wert aus der Prop angezeigt. Ein controlled
// input direkt am geparsten Zahlwert würde "2," bei jedem Tastendruck zu
// "2" zurückformatieren — das Komma ließe sich nie eintippen (aus "2,5"
// wurde so "25").
//
// value: Zahl (oder null/'' für leer) · onValue(zahl): bei jeder Eingabe
// leerBeiNull: 0 als leeres Feld anzeigen (z.B. Blechmaße)

import { useState } from 'react';
import { parseLocaleFloat } from '../lib/format.js';

export default function DezimalInput({ value, onValue, leerBeiNull = false, ...rest }) {
  const [text, setText] = useState(null); // null = Anzeige aus der Prop
  const idle = value == null || value === '' || (leerBeiNull && !value)
    ? ''
    : String(value).replace('.', ',');
  return (
    <input
      type="text"
      inputMode="decimal"
      value={text !== null ? text : idle}
      onFocus={(e) => { setText(idle); e.target.select(); }}
      onChange={(e) => {
        const t = e.target.value;
        // nur Ziffern mit optional EINEM Komma/Punkt (und optional Minus,
        // z.B. Mehltemperatur im Winter) — auch unvollständig wie "2,"
        if (!/^-?\d*[.,]?\d*$/.test(t)) return;
        setText(t);
        onValue(parseLocaleFloat(t));
      }}
      onBlur={() => setText(null)}
      {...rest}
    />
  );
}
