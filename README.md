# Chat2.0

[Edit in StackBlitz next generation editor ⚡️](https://stackblitz.com/~/github.com/Tayler01/Chat2.0)

## Environment variables

Create a `.env` file in the project root and set the Supabase credentials used by `src/lib/supabase.ts`:

```bash
VITE_SUPABASE_URL=<your Supabase project URL>
VITE_SUPABASE_ANON_KEY=<your Supabase anon key>
```

## Database migrations

This repository stores migrations under `supabase/migrations/`. Apply them to your local Supabase instance with the Supabase CLI:

```bash
supabase db push       # apply new migrations
# or
supabase db reset      # recreate the database with all migrations
```

If the migrations are not applied, RPC functions such as `upsert_message_read` will respond with a `404` error when called.

## Message retention

The Supabase migrations include a trigger named `prune_old_messages` that runs after each insert into the `messages` table. When more than 100 rows exist, it removes the oldest entries so only the newest 100 remain. Remember to run `supabase db push` to apply this behavior.
