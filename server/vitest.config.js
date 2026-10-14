import { defineConfig } from 'vitest/config';

export default defineConfig({ test: {
  // PGlite kompiliert einen großen PostgreSQL-WASM-Kern. Parallele optimierende
  // Compiler erschöpfen auf Büro-PCs den zugesicherten Windows-Speicher.
  // Für Tests genügt der sparsame Baseline-Compiler; Produktionscode unverändert.
  execArgv: ['--wasm-num-compilation-tasks=1', '--liftoff-only'],
} });
