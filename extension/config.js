// Shared config injected at build-time via simple string replacement is overkill
// for this MVP — the extension uses the same Supabase project as the web app.
// These values are PUBLIC (anon key + project URL).
self.RW_CONFIG = {
  SUPABASE_URL: "https://yirqwegvefbfkqngyuew.supabase.co",
  SUPABASE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpcnF3ZWd2ZWZiZmtxbmd5dWV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMDEwNTYsImV4cCI6MjA4Nzg3NzA1Nn0.QYKseokril_q8ejML_Mvj1IKa0xFmlEYgehohC9RwQs",
  APP_URL: "https://remoteworkher.app",
  CONNECT_PATH: "/extension/connect",
};
