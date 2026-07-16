// Server-Start. Die App selbst liegt in app.js (testbar via supertest).

import { app } from './app.js';
import { config } from './config.js';

app.listen(config.PORT, () => {
  console.log(`[server] Rezeptrechner-API läuft auf Port ${config.PORT} (${config.NODE_ENV})`);
});
