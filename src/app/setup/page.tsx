export default function SetupPage() {
  return (
    <main className="mx-auto max-w-xl space-y-4 p-6">
      <h1 className="text-xl font-semibold">Connect Supabase</h1>
      <ol className="list-decimal space-y-2 pl-5 text-sm">
        <li>Create a Supabase project (or add the Supabase integration on Vercel).</li>
        <li>Run <code>supabase/migrations/0001_init.sql</code> in the SQL editor.</li>
        <li>
          Put <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> (or{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>) in <code>.env.local</code>, then restart the dev server.
        </li>
      </ol>
    </main>
  );
}
