import { createClient } from "@supabase/supabase-js";

/*
  A anon key é feita para ser pública — ela só abre o que as políticas de
  Row Level Security no banco permitirem. Quem protege os dados é o RLS
  (ver supabase/schema.sql), não o sigilo desta chave.
*/
const SUPABASE_URL = "https://fuekhrppuizbgtslsoog.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_4yNuuiqqdiKG0I5hO-DrWg_0-wiW9AK";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
