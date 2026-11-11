const SUPABASE_URL = "https://rwlbtnvkojwyxdekqpna.supabase.co/";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_sJ0lR5SnID5JghwDp3Ap1w_F2Pmjrk2";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);