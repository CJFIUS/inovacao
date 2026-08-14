import { createClient } from "@supabase/supabase-js";

/*
  Mesmo projeto Supabase já usado pelo Hub CJ Inova — reaproveita a
  infraestrutura (Auth, Postgres/pgvector) mesmo sendo uma ferramenta
  separada do app principal. A anon key é pública por natureza: quem
  protege os dados é o RLS (ver supabase/migration_assistente_protocolo.sql).
*/
const SUPABASE_URL = "https://fuekhrppuizbgtslsoog.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_4yNuuiqqdiKG0I5hO-DrWg_0-wiW9AK";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
