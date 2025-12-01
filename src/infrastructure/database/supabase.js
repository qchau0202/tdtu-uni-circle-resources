const { createClient } = require('@supabase/supabase-js');
const config = require('../../config');

let supabase = null;

const getSupabaseClient = () => {
  if (!supabase) {
    if (!config.supabase.url || !config.supabase.anonKey) {
      throw new Error('Supabase URL and Anon Key are required');
    }

    supabase = createClient(
      config.supabase.url,
      config.supabase.anonKey,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false
        }
      }
    );
  }

  return supabase;
};

const getSupabaseAdmin = () => {
  if (!config.supabase.url || !config.supabase.serviceRoleKey) {
    throw new Error('Supabase URL and Service Role Key are required');
  }

  return createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
};

module.exports = {
  getSupabaseClient,
  getSupabaseAdmin
};
