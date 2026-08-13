import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",

    // Biblioteca de documentos: o tailwind.config.ts de docs/ e o insumo
    // original do Doc 08, em sintaxe da v3. Registro historico, nao codigo.
    "docs/**",

    // Gerados pelo Supabase CLI ao subir a pilha local.
    "supabase/.temp/**",
    "lib/supabase/types.ts",
  ]),
]);

export default eslintConfig;
