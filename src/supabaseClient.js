import { createClient } from "@supabase/supabase-js";

/*
  A anon key é feita para ser pública — ela só abre o que as políticas de
  Row Level Security no banco permitirem. Quem protege os dados é o RLS
  (ver supabase/schema.sql), não o sigilo desta chave.
*/
const SUPABASE_URL = "https://afgrjnluirltapkbbghv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmZ3Jqbmx1aXJsdGFwa2JiZ2h2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2MzkzNDAsImV4cCI6MjA5OTIxNTM0MH0.ZuvM9g1DnzbiGBHv6IX1suAM5sVYtH1KrQKBBImDc78";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
