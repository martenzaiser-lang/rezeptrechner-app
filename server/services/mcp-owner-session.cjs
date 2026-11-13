// Serverfest gebundene Delegation für Martens privaten MCP. Die Zielidentität
// kommt niemals aus dem Request. Vor diesem Handler muss die normale App-
// Authentifizierung erfolgreich gewesen sein. Standardmäßig deaktiviert.
function createMcpOwnerSession({ principal, loadUser, signToken, audit = async () => {}, env = process.env }) {
  return async (req, res) => {
    const normalize = value => String(value || '').trim().toLowerCase();
    const serviceEmail = normalize(env.MCP_SERVICE_EMAIL);
    const ownerEmail = normalize(env.MCP_DELEGATED_OWNER_EMAIL);
    const actor = principal(req);
    if (!serviceEmail || !ownerEmail || serviceEmail === ownerEmail
        || actor?.role !== 'admin' || normalize(actor?.email) !== serviceEmail) {
      return res.status(403).json({ error: 'Keine freigegebene MCP-Delegation.' });
    }
    try {
      // Auch bei JWTs ohne Datenbankprüfung ein gelöschtes/herabgestuftes
      // Dienstkonto sperren. Beide Konten müssen weiterhin existieren.
      const service = await loadUser(serviceEmail);
      const owner = await loadUser(ownerEmail);
      if (!service || service.role !== 'admin' || service.is_active === false
          || !owner || owner.role !== 'admin' || owner.is_active === false
          || normalize(service.email) !== serviceEmail || normalize(owner.email) !== ownerEmail) {
        return res.status(403).json({ error: 'MCP-Dienst oder Inhaberkonto ist nicht freigegeben.' });
      }
      await audit({ service, owner });
      const token = await signToken(owner, service);
      return res.json({ token, user: { id: owner.id, email: owner.email, role: owner.role }, delegated: true });
    } catch {
      return res.status(503).json({ error: 'MCP-Delegation derzeit nicht verfügbar.' });
    }
  };
}
module.exports = { createMcpOwnerSession };
