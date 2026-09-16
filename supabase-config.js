// Supabase browser configuration.
// Add only the Project URL and anon public key here.
// Never put the service_role key in this file or in browser code.
const SUPABASE_CONFIG = {
  url: "https://fhpglpwvbjsmiqyrvwvr.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZocGdscHd2YmpzbWlxeXJ2d3ZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3Nzg1NzEsImV4cCI6MjEwNDM1NDU3MX0.bIXdkjh7vyziHWfpj4wvymnNGmEoActsknc2SATAfUM"
};
window.daymarkSupabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
