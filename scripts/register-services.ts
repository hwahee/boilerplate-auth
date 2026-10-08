/**
 * `bun run services:register [file]` — registers the services that sign in
 * through this member server with the identity provider (default file:
 * services/local.json). Safe to re-run: existing services are updated.
 */
import { loadServerConfig } from '../src/server/config';
import { createHydraServiceRegistry } from '../src/server/identity/hydra';
import { serviceListValidator, toRegistration } from '../src/server/identity/services';

const file = process.argv[2] ?? new URL('../services/local.json', import.meta.url).pathname;
const services = serviceListValidator.parse(await Bun.file(file).json());

const registry = createHydraServiceRegistry(loadServerConfig());
if (!registry) {
  console.error('HYDRA_ADMIN_URL is required (copy .env.example to .env first).');
  process.exit(1);
}

const DEADLINE_MS = 60_000;
const started = Date.now();
while (!(await registry.ready())) {
  if (Date.now() - started > DEADLINE_MS) {
    console.error('Timed out waiting for Hydra.');
    process.exit(1);
  }
  await Bun.sleep(500);
}

for (const service of services) {
  const result = await registry.register(toRegistration(service));
  console.log(`${result} ${service.id} (${service.origin})`);
}
