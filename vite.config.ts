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
          // Vendor splitting — keep this MINIMAL. Splitting React-dependent
          // libraries (Radix, lucide-react, react-router, etc.) into separate
          // chunks causes "Cannot read properties of undefined (reading 'forwardRef')"
          // in production because chunk load order is not guaranteed and those
          // libs evaluate before react-vendor. Let Vite/Rollup handle them.
          if (id.includes("node_modules/recharts") || id.includes("node_modules/d3-")) return "charts-vendor";
          if (id.includes("node_modules/@supabase")) return "supabase-vendor";
        },
      },
    },
  },
}));
