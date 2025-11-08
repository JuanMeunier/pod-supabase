import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

function createSupabaseClient(): SupabaseClient {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
    }

    return createClient(supabaseUrl, supabaseKey);
}

// Crear un objeto proxy que inicializa el cliente solo cuando se accede
const supabaseProxy = new Proxy({} as SupabaseClient, {
    get(target, prop) {
        if (!supabaseInstance) {
            supabaseInstance = createSupabaseClient();
        }
        const value = supabaseInstance[prop as keyof SupabaseClient];
        // Si es una función, asegurarse de que el contexto (this) sea correcto
        if (typeof value === 'function') {
            return value.bind(supabaseInstance);
        }
        return value;
    }
});

export const supabase = supabaseProxy;