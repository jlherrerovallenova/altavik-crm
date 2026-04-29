
import { createClient } from '@supabase/supabase-js';

try {
    const supabase = createClient('https://example.supabase.co', undefined);
    console.log('Client created');
} catch (e) {
    console.log('Error:', e.message);
}
