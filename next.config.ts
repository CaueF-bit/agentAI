import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite carrega WASM e arquivos de dados; precisa rodar fora do bundle do servidor.
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  // O esquema é lido do disco na inicialização do banco: precisa ir junto no deploy.
  outputFileTracingIncludes: { "/**": ["./src/db/schema.sql"] },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
