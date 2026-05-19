(function () {
  'use strict';

  const SESSION_KEY = 'how_supabase_runtime_key';
  const LOCAL_KEY = 'how_supabase_runtime_key_persisted';

  function get() {
    return sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(LOCAL_KEY) || '';
  }

  function set(value, persist) {
    const key = (value || '').trim();
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(LOCAL_KEY);
    if (!key) return;
    if (persist) localStorage.setItem(LOCAL_KEY, key);
    else sessionStorage.setItem(SESSION_KEY, key);
  }

  function clear() {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(LOCAL_KEY);
  }

  window.HowSupabaseKey = { get, set, clear };
})();

