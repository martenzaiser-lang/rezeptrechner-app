// Aenderungsprotokoll: schreibt der Server automatisch bei Mutationen.
// Ersetzt das localStorage-Log der alten App ('oetzmann_log_v1').

import { pool } from '../db.js';

export async function addLog(userEmail, action, { recipeId, recipeName, details } = {}) {
  try {
    await pool.query(
      `INSERT INTO change_log (user_email, action, recipe_id, recipe_name, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [userEmail, action, recipeId || null, recipeName || null, details ? JSON.stringify(details) : null]
    );
  } catch (err) {
    // Protokoll darf nie eine fachliche Operation scheitern lassen.
    console.error('[changelog] Eintrag fehlgeschlagen:', err.message);
  }
}
