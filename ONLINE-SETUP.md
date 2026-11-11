# Put Order Desk online

The GitHub Pages site is static, so it needs a hosted database. This setup uses Supabase for sign-in, shared orders, and drivers; GitHub Pages continues to host the website.

## 1. Create and secure the Supabase backend

1. Create a Supabase project at [supabase.com](https://supabase.com/).
2. In **Authentication → Users**, create the owner account first. The current schema seeds `engahmedgurey@gmail.com` as the workspace owner; change that email in the final `insert into public.workspace_user_roles` statement if the owner uses another address.
3. In **SQL Editor**, run the complete `supabase-schema.sql`. If the project was already initialized, run it again to ensure the workspace roles table, owner role, `profile-photos` storage bucket, and realtime catalog updates are present.
4. In **Authentication → Providers → Email**, keep email/password sign-in enabled.
5. Disable public sign-ups in **Authentication → Settings**. Workspace admins create accounts from the website's **Users** page; public self-registration remains disabled.
6. In **Authentication → URL Configuration**, set the Site URL to `https://ahmedgurey07.github.io/transfers/` and add it to the redirect URL allow list.
7. In **Project Settings → API**, copy the Project URL and the `anon`/publishable key. Never put a `service_role` or secret key in website files.

## 2. Deploy the user-management function

The browser cannot safely create or edit Auth users directly. The `supabase/functions/manage-users/index.ts` Edge Function performs those operations using Supabase's server-side service role key, and checks the caller's role on every request.

From the project folder, use the Supabase CLI:

```text
supabase login
supabase link --project-ref qkjljlgfiaggkpddzyoc
supabase functions deploy manage-users
supabase functions deploy manage-backups
supabase functions deploy manage-workflows
```

Supabase provides `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions. Do not copy the service-role key into `supabase-config.js`, GitHub, or the browser.

All three Edge Functions check workspace roles server-side and use the service-role key only in Supabase. `manage-backups` accepts restore requests from workspace owners/admins and merges records without replacing existing orders, drivers, returns, or matching products. `manage-workflows` lists assignable workspace users for signed-in staff and handles admin-only order/stock approval decisions. The schema also prevents staff from changing approval decisions directly.

The schema also creates the public `profile-photos` Storage bucket. Signed-in users can upload or replace photos only inside their own user-ID folder. Profile photos are publicly readable; do not upload private images.

If profile-photo uploads report **Bucket not found**, open **SQL Editor** for the same Supabase project configured in `supabase-config.js` and run the complete `supabase-schema.sql` again. Its storage-bucket statement creates the bucket if it is missing and safely updates its image and size limits if it already exists. The script also configures the per-user read, upload, and update policies required for profile photos.

## 3. Configure and publish the website

1. Edit `supabase-config.js` and set `url` and `anonKey` to the values from the Supabase project.
2. Upload/commit the changed website files to the root of the `transfers` GitHub repository. GitHub Pages will deploy the update automatically.
3. Open `https://ahmedgurey07.github.io/transfers/` and sign in with an invited account.
4. To use the shared online workspace locally, open `http://127.0.0.1:8765/` or open `index.html` directly as a `file://` page, then sign in. With Supabase configured, both use the shared online orders and drivers.

The Supabase URL and anon/publishable key are browser-visible identifiers, not privileged secrets. Row-level security protects the role table so users can only read their own role. The Users page is available to owners and admins. Create a user there by entering a username, email, initial password, and role. The account is created in Supabase Authentication and its workspace role is saved in `workspace_user_roles`; share the initial password with the user securely. Admins can create and manage staff; only the owner can grant or remove admin access. Users can open their profile from the top-right avatar to change their username, password, or photo. Password changes are self-service.

## Existing browser data

The first sign-in on each browser imports its saved orders that are not already online; existing online records win if an order ID already exists. Saved drivers are added if their names are not already present. Keep the old browser data until you verify the migrated orders on the online site.

The local source-file sync is provided by `Start Order Desk.cmd`; it reads the warehouse workbook and calculator files for the running local web server.

Returned tiles are saved in the separate `returned_tile_records` Supabase table without changing catalog stock. Each return records the signed-in user who saved it. For an existing project, run `supabase-returned-tiles.sql` in Supabase SQL Editor to enable the returns table and its access policies; the complete `supabase-schema.sql` also creates it for a new project. After publishing the latest website files, sign in from the online site and use **Returned tiles → Import Excel history**. The browser reads the `SalesData` worksheet and saves records directly to Supabase, so Excel history can be imported online without `Start Order Desk.cmd`. Re-importing the same workbook skips records already imported.

## Order, stock, reports, and backup features

The Overview and All orders pages use **Pending**, **In progress**, **Delivered**, and **Cancelled** statuses. Existing **Open** orders are shown as Pending and existing **Completed** orders as Delivered. Click a status pill in either order table to cycle through the four statuses.

Product Catalog highlights products whose numeric **R/QUANTITY** is at or below the shared low-stock threshold. The default is 10; enter another non-negative value and select **Save threshold** to store it with the shared catalog.

**Notifications** are derived from saved order history: order creation, edits, and orders moved to In progress (shown as ready for delivery). Realtime order refresh updates the notification list; unread counts are remembered per user and browser. These are in-app notifications, not email or browser push.

**Reports** filter orders, transfers, and returned tiles by date range, product, and branch. Use **Export CSV** to download the currently filtered rows. The User activity log includes order history and return creation/edit records, with the recorded username. Item History shows the date and time for each record, and direct catalog quantity additions, reductions, or edits include the before/after quantity and the signed-in user.

**Order filters** let users filter by branch, driver, product, status, and a date range. **Overdue** uses calendar days: Pending orders are flagged after 2 days and In progress orders after 1 day.

**Stock reservations** shows the quantity reserved for Pending/In progress orders and the available catalog quantity. Set a product's optional **Reorder-to target** in the catalog to see a suggested quantity. **Approval requests** can be submitted while creating an order; staff stock adjustments are submitted as requests and do not change stock until an admin approves them. Workspace owners/admins review requests in **All orders**. Approved orders/adjustments update the catalog.

**Scheduled report summaries** can be set to daily or weekly in Reports. The summary is generated in-app while the website is open, or the next time someone opens it after the selected interval; it is not an email or a server-side background job.

For an existing Supabase project, rerun the complete `supabase-schema.sql` after publishing these workflow changes, then deploy the new `manage-workflows` function. Until those backend changes are deployed, approval decisions will not work online.

Workspace owners and admins can export a version-2 JSON backup or restore one from Overview. Backups include orders, drivers, returned tiles, and catalog data/settings, but never Supabase accounts or passwords. Restore adds records that are missing online; matching existing orders, drivers, returns, and products are preserved. Saved shared catalog settings are restored. Keep downloaded backups in a secure location. Version-1 backups containing orders and drivers remain supported.

## Find Order Desk easily on a Windows PC

### Local version

1. Double-click `Install Order Desk.cmd` in the project folder.
2. Open **SHAAFICI Order Desk** from the Desktop or Windows Start menu.

These shortcuts open the online website in an app-style window without browser tabs or an address bar, and use the SHAAFICI logo. Microsoft Edge supplies the Windows web-app runtime; it does not open a normal browser window. The installer also attempts to pin the Start menu shortcut to the taskbar. If Windows does not allow automatic pinning, right-click **SHAAFICI Order Desk** in the Start menu and choose **Pin to taskbar**. To remove the shortcuts, delete **SHAAFICI Order Desk.lnk** from the Desktop and Start menu.

### Online version

After opening the published site in Microsoft Edge or Google Chrome, use the browser menu and choose **Install SHAAFICI Order Desk** (or **Apps → Install this site as an app**). This creates an app entry in Windows without requiring the project folder.
