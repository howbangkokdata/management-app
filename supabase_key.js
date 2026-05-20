(function () {
  'use strict';

  // Supabase anon key — public by design (safe to commit)
  // Security layer: Firebase Auth restricts access to @howbangkok.com accounts
  const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyZ2Rud2h4d3lrZHdyd2tvanliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMDU1MjMsImV4cCI6MjA5NDU4MTUyM30.PFUrLQF0_0DLV_rnjeesV6LfKIq_0HFvBnbNqyM1gso';

  window.HowSupabaseKey = {
    get: () => ANON_KEY,
    set: () => {},
    clear: () => {},
  };
})();
