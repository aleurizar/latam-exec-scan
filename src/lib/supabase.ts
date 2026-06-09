import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xdqitqghmfggakjjefkt.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkcWl0cWdobWZnZ2FramplZmt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNzgyMjEsImV4cCI6MjA5MjY1NDIyMX0.5EAn4Grrecjn7GZKk2Z9goMx7ph2DFJ_BFei5qXGF90'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)