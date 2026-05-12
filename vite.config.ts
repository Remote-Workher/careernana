import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules") && !id.includes("/src/")) return;
          // App-route splitting: keep admin & recruiter code completely
          // out of the talent bundle so visitors never download them.
          if (id.includes("/src/pages/admin/") || id.includes("/src/components/admin/")) {
            return "admin";
          }
          if (id.includes("/src/pages/recruiter/") || id.includes("/src/components/recruiter/")) {
            return "recruiter";
          }
          // Vendor splitting
          if (id.includes("node_modules/recharts") || id.includes("node_modules/d3-")) return "charts-vendor";
          if (id.includes("node_modules/react-router-dom") || id.includes("node_modules/react-dom") || id.match(/node_modules\/react\//)) return "react-vendor";
          if (id.includes("node_modules/@radix-ui")) return "ui-vendor";
          if (id.includes("node_modules/@supabase")) return "supabase-vendor";
          if (id.includes("node_modules/@tanstack/react-query")) return "query-vendor";
          if (id.includes("node_modules/lucide-react")) return "icons-vendor";
        },
      },
    },
  },
}));
