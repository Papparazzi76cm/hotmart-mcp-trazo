import {createClient} from '@supabase/supabase-js';
const url=import.meta.env.VITE_SUPABASE_URL;
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if(!url||!key)throw new Error('Missing public Supabase configuration');
if(new URL(url).origin!=='https://rlrolpkjhkatasbfcjxa.supabase.co')throw new Error('Incorrect Supabase project');
export const supabase=createClient(url,key,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}});
