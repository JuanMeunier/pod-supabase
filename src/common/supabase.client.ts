import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

/**
 * Crea una instancia del cliente Supabase con credenciales públicas (anon key).
 * Se usa para autenticación y lectura pública de datos.
 */
function createSupabaseClient(): SupabaseClient {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Faltan variables de entorno: SUPABASE_URL o SUPABASE_ANON_KEY');
    }

    return createClient(supabaseUrl, supabaseKey);
}

/**
 * Proxy para inicializar el cliente solo cuando se accede por primera vez.
 * Evita crear múltiples instancias innecesarias.
 */
const supabaseProxy = new Proxy({} as SupabaseClient, {
    get(target, prop) {
        if (!supabaseInstance) {
            supabaseInstance = createSupabaseClient();
        }
        const value = supabaseInstance[prop as keyof SupabaseClient];
        // Asegura que el contexto (this) sea correcto en métodos
        if (typeof value === 'function') {
            return value.bind(supabaseInstance);
        }
        return value;
    }
});

export const supabase = supabaseProxy;