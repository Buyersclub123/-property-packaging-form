// Resolve hook so extensionless relative imports in src/*.ts work under `node --experimental-strip-types`.
// Usage: node --experimental-strip-types --import ./tests/register-ts.mjs --test tests/**/*.test.mts
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register(new URL('./ts-resolver.mjs', import.meta.url), pathToFileURL('./'));
