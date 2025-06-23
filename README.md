# Chat2.0

[Edit in StackBlitz next generation editor ⚡️](https://stackblitz.com/~/github.com/Tayler01/Chat2.0)

## Environment variables

Create a `.env` file in the project root and set the Supabase credentials used by `src/lib/supabase.ts`:

```bash
VITE_SUPABASE_URL=<your Supabase project URL>
VITE_SUPABASE_ANON_KEY=<your Supabase anon key>
VITE_PRESENCE_INTERVAL_MS=30000 # optional presence ping interval in ms
```

## Database migrations

This repository stores migrations under `supabase/migrations/`. Apply them to your local Supabase instance with the Supabase CLI:

```bash
supabase db push       # apply new migrations
# or
supabase db reset      # recreate the database with all migrations
```

The latest migrations add a `last_active` column and `update_user_last_active` function for presence tracking. Run `supabase db push` after pulling updates.
