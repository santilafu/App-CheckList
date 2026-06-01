import { defineConfig } from "vitest/config";

// Configuración de los tests (separada de vite.config.js para no cargar los
// plugins de la app —React, Tailwind, PWA— al ejecutar los tests).
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.js"],
  },
});
