# Put Order Desk online

The GitHub Pages site is static, so it needs a hosted database. This setup uses Supabase for sign-in, shared orders, and drivers; GitHub Pages continues to host the website.

## 1. Create and secure the Supabase backend

1. Create a Supabase project at [supabase.com](https://supabase.com/).
2. In **Authentication → Users**, create the owner account first. The current schema seeds `engahmedgurey@gmail.com` as the workspace owner; change that email in the final `insert into public.workspace_user_roles` statement if the owner uses another address.
3. In **SQL Editor**, run the complete `supabase-schema.sql`. If the project was already initialized, run it again to ensure the workspace roles table, owner role, and `profile-photos` storage bucket are present.
4. In **Authentication → Providers → Email**, keep email/password sign-in enabled.
5. Disable public sign-ups in **Authentication → Settings**. Account creation is invite-only; invited users finish signup from the invitation email link.
6. In **Authentication → URL Configuration**, set the Site URL to `https://ahmedgurey07.github.io/transfers/` and add it to the redirect URL allow list.
7. In **Project Settings → API**, copy the Project URL and the `anon`/publishable key. Never put a `service_role` or secret key in website files.

## 2. Deploy the user-management function

The browser cannot safely create or edit Auth users directly. The `supabase/functions/manage-users/index.ts` Edge Function performs those operations using Supabase's server-side service role key, and checks the caller's role on every request.

From the project folder, use the Supabase CLI:

```text
supabase login
supabase link --project-ref qkjljlgfiaggkpddzyoc
supabase functions deploy manage-users
```

Supabase provides `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions. Do not copy the service-role key into `supabase-config.js`, GitHub, or the browser.

The schema also creates the public `profile-photos` Storage bucket. Signed-in users can upload or replace photos only inside their own user-ID folder. Profile photos are publicly readable; do not upload private images.

If profile-photo uploads report **Bucket not found**, open **SQL Editor** for the same Supabase project configured in `supabase-config.js` and run the complete `supabase-schema.sql` again. Its storage-bucket statement creates the bucket if it is missing and safely updates its image and size limits if it already exists. The script also configures the per-user read, upload, and update policies required for profile photos.

## 3. Configure and publish the website

1. Edit `supabase-config.js` and set `url` and `anonKey` to the values from the Supabase project.
2. Upload/commit the changed website files to the root of the `transfers` GitHub repository. GitHub Pages will deploy the update automatically.
3. Open `https://ahmedgurey07.github.io/transfers/` and sign in with an invited account.
4. To use the shared online workspace locally, open `http://127.0.0.1:8765/` or open `index.html` directly as a `file://` page, then sign in. With Supabase configured, both use the shared online orders and drivers.

The Supabase URL and anon/publishable key are browser-visible identifiers, not privileged secrets. Row-level security protects the role table so users can only read their own role. The Users page is available to owners and admins. Admins can invite and manage staff; only the owner can grant or remove admin access. Users can open their profile from the top-right avatar to change their username, password, or photo. Password changes are self-service.

## Existing browser data

The first sign-in on each browser imports its saved orders that are not already online; existing online records win if an order ID already exists. Saved drivers are added if their names are not already present. Keep the old browser data until you verify the migrated orders on the online site.

The local source-file sync is provided by `Start Order Desk.cmd`; it reads the warehouse workbook and calculator files for the running local web server.

Returned tiles are saved in the separate `returned_tile_records` Supabase table without changing catalog stock. Each return records the signed-in user who saved it. For an existing project, run `supabase-returned-tiles.sql` in Supabase SQL Editor to enable the returns table and its access policies; the complete `supabase-schema.sql` also creates it for a new project. To import the existing returned-tiles Excel workbook, open the app with `Start Order Desk.cmd`, sign in, and use **Returned tiles → Import Excel history**. The importer reads the `SalesData` worksheet; re-importing the same workbook skips records already imported.

## Find Order Desk easily on a Windows PC

### Local version

1. Double-click `Install Order Desk.cmd` in the project folder.
2. Open **SHAAFICI Order Desk** from the Desktop or Windows Start menu.

These shortcuts open the online website in an app-style window without browser tabs or an address bar, and use the SHAAFICI logo. Microsoft Edge supplies the Windows web-app runtime; it does not open a normal browser window. The installer also attempts to pin the Start menu shortcut to the taskbar. If Windows does not allow automatic pinning, right-click **SHAAFICI Order Desk** in the Start menu and choose **Pin to taskbar**. To remove the shortcuts, delete **SHAAFICI Order Desk.lnk** from the Desktop and Start menu.

### Online version

After opening the published site in Microsoft Edge or Google Chrome, use the browser menu and choose **Install SHAAFICI Order Desk** (or **Apps → Install this site as an app**). This creates an app entry in Windows without requiring the project folder.
