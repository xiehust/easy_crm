import { getConfig } from './config.js';
import { createApp } from './app.js';
import { runMigrationsIfEnabled } from './migrations.js';

const config = getConfig();
const app = createApp(config);

await runMigrationsIfEnabled();

app.listen(config.port, () => {
  console.log(`CRM API listening on port ${config.port}`);
});
