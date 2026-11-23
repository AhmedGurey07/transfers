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

## 2. Deploy the Edge Functions

The browser cannot safely create or edit Auth users directly. The `manage-users` Edge Function performs those operations using Supabase's server-side service role key, and checks the caller's role on every request. It can create a **Driver** account linked to a saved driver. A linked driver can mark an assigned transfer as taken and submit a delivery confirmation with the recipient's name, phone number, and an optional delivery note. The transfer remains **In progress** until an owner/admin approves the confirmation; rejection returns it to **In progress** so the driver can correct the details and resubmit.

From the project folder, use the Supabase CLI:

```text
supabase login
supabase link --project-ref qkjljlgfiaggkpddzyoc
supabase functions deploy manage-users
supabase functions deploy manage-backups
supabase functions deploy manage-workflows
supabase functions deploy manage-driver-deliveries
```

Supabase provides `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions. Do not copy the service-role key into `supabase-config.js`, GitHub, or the browser.

All four Edge Functions check workspace roles server-side and use the service-role key only in Supabase. `manage-backups` accepts restore requests from workspace owners/admins and merges records without replacing existing orders, drivers, returns, or matching products. `manage-workflows` lists assignable workspace users for signed-in staff and handles admin-only order, stock, and delivery approval decisions. `manage-driver-deliveries` lets a linked driver update only their assigned transfer's delivery progress.

### Multi-location database isolation

The database defines nine stable locations: Warehouse 200, Warehouse 150, Main Branch Store, JJR Store, IDC Store, NH Store, Dum Store, Borama Store, and ELEC Store. Staff and Driver accounts have exactly one `location_id`; owner/admin accounts have no location and can access all locations. The saved driver directory is shared by every location, but each Driver account remains assigned to one location and can only access that location's orders. Existing staff/driver rows and orders from the legacy single-location workspace belong to Warehouse 200. An order's Branch is its destination and does not determine which location owns it. New orders are saved under the currently selected location.

For a new database, run the complete `supabase-schema.sql`. For an existing project, run `supabase/migrations/20261123_multi_location_isolation.sql`, then `supabase/migrations/20261123_warehouse_200_existing_orders.sql` once, followed by `supabase/migrations/20261123_shared_drivers.sql` and `supabase/migrations/20261123_owner_driver_management.sql` in the SQL Editor. The Warehouse 200 migration assigns all orders that exist at the time it runs to Warehouse 200; do not run it again after creating orders for other locations. The shared-drivers migration consolidates saved drivers by phone number. The owner-driver migration restricts editing and deleting shared driver records to the owner. Deploy the updated `manage-users`, `manage-driver-deliveries`, and `manage-backups` Edge Functions after the migrations are applied.

`manage-users` exposes `locations: [{ id, name }]` and uses camelCase `locationId` in payloads and responses. Stable frontend IDs are `warehouse-200`, `warehouse-150`, `main-branch-store`, `jjr-store`, `idc-store`, `nh-store`, `dum-store`, `borama-store`, and `elec-store`. Staff/Driver account create, invite, and update payloads require `locationId`; owner/admin payloads do not.

Each location has a separate catalog record. Owners/admins select the active location in the top bar; staff and drivers are fixed to the location assigned to their account. Saved drivers are shared across branches, so any branch can select a driver when creating an order. From **Product catalog**, choose a location first, then upload that location's workbook. The upload button identifies the selected location, and uploading replaces only that location's catalog; orders and stock changes stay scoped to the same location. The browser parser expects a `SalesData` worksheet (or the first worksheet) with recognizable `PRODUCT`/`DESCRIPTION` and `QUANTITY` headers; it also reads `Q/ITEM`, `TAKEN`, `R/QUANTITY`, `UOM/N`, `UOM`, and `STS` when present. Other workbook layouts need a representative file so their column mapping can be added; do not upload a workbook until its columns are supported.

Only the workspace owner can create, edit, or assign Driver accounts. Each Driver account must be linked to a saved driver's phone number and assigned to a branch. After sign-in, a Driver can open only **Drivers → SHAAFICI Drivers**, and the database limits results to orders assigned to that linked phone number in the account's assigned branch. The driver dashboard includes charts for assigned transfers by branch and by date, filtered by the selected time period. Drivers can only update their assigned transfer's delivery progress through the `manage-driver-deliveries` Edge Function; only owners/admins can approve or reject delivery confirmations from **All orders → Approval requests**. Delivery confirmations waiting at least four hours are highlighted for owners/admins with their elapsed wait time. Orders can be marked as priority when created or edited; those orders appear first and are highlighted in the driver's delivery queue. Drivers cannot otherwise create or edit orders, read other drivers, or access the catalog, returns, or user list. The driver and admin/owner views show each assigned transfer's delivery state.

The schema also creates the public `profile-photos` Storage bucket. Signed-in users, including Drivers, can upload or replace photos only inside their own user-ID folder. Profile photos are publicly readable; do not upload private images. Drivers can open their profile from the top-right avatar to update their username, password, and profile photo.

If profile-photo uploads report **Bucket not found**, open **SQL Editor** for the same Supabase project configured in `supabase-config.js` and run the complete `supabase-schema.sql` again. Its storage-bucket statement creates the bucket if it is missing and safely updates its image and size limits if it already exists. The script also configures the per-user read, upload, and update policies required for profile photos.

## 3. Configure and publish the website

1. Edit `supabase-config.js` and set `url` and `anonKey` to the values from the Supabase project.
2. Upload/commit the changed website files to the root of the `transfers` GitHub repository. GitHub Pages will deploy the update automatically.
3. Open `https://ahmedgurey07.github.io/transfers/` and sign in with an invited account.
4. To use the shared online workspace locally, open `http://127.0.0.1:8765/` or open `index.html` directly as a `file://` page, then sign in. With Supabase configured, both use the shared online orders and drivers.

The Supabase URL and anon/publishable key are browser-visible identifiers, not privileged secrets. Row-level security protects the role table so users can only read their own role. The Users page is available to owners and admins. Create a user there by entering a username, email, initial password, and role. The account is created in Supabase Authentication and its workspace role is saved in `workspace_user_roles`; share the initial password with the user securely. Admins can create and manage staff; only the owner can grant or remove admin access. Users can open their profile from the top-right avatar to change their username, password, or photo. Password changes are self-service.

The website caches its app files and sign-in library after the first visit, and loads the Excel library only when an Excel feature is used. Repeat visits need less bandwidth; signing in and loading or saving shared workspace data still require an internet connection.

## Read-only offline access

For reliable app-shell caching across offline page loads, use the hosted HTTPS site or a localhost web server; `file://` pages do not register the service worker, and browser storage support for them varies. First visit the site online, sign in, and let the workspace finish loading so the app shell and your permitted data for the current location are cached on that browser profile. Owners/admins also need the online user list to load successfully for it to be included. Offline snapshots are isolated by user and location; older shared snapshots are intentionally not reused after this update.

If the connection drops during an active session, the app switches to read-only mode. To open the cached workspace after a reload, choose **Open cached workspace (read-only)** on the sign-in screen. Filters, navigation, and viewing remain available; creating, editing, approving, importing, and other data changes require reconnecting and reloading. The offline copy reflects the last successful online refresh and can be stale. Changes made elsewhere, access revocations, and account changes cannot be detected until the device reconnects.

The cached copy is stored locally in the browser and is not encrypted. Anyone with access to that browser profile can view it offline. Use only a trusted device and choose **Sign out** to clear the local copy. Offline access is limited to the data allowed for that account when it last refreshed; it is not shared or synchronized between devices.

## Existing browser data

The first admin sign-in while **Warehouse 200** is selected imports legacy browser orders and drivers that are not already online. Legacy orders without an explicit location are assigned to Warehouse 200; the Branch field is treated as the destination. Existing online records win if an order ID already exists. Driver accounts do not import legacy browser data. Keep the old browser data until you verify the migrated orders on the online site.

The local source-file sync is provided by `Start Order Desk.cmd`; it reads the warehouse workbook and calculator files for the running local web server.

Returned tiles are saved in the separate `returned_tile_records` Supabase table without changing catalog stock. Each return records the signed-in user who saved it. For an existing project, run `supabase-returned-tiles.sql` in Supabase SQL Editor to enable the returns table and its access policies; the complete `supabase-schema.sql` also creates it for a new project. After publishing the latest website files, sign in from the online site and use **Returned tiles → Import Excel history**. The browser reads the `SalesData` worksheet and saves records directly to Supabase, so Excel history can be imported online without `Start Order Desk.cmd`. Re-importing the same workbook skips records already imported.

## Order, stock, reports, and backup features

The Overview and All orders pages use **Pending**, **In progress**, **Delivered**, and **Cancelled** statuses. Existing **Open** orders are shown as Pending and existing **Completed** orders as Delivered. Status pills cycle through all four statuses as usual. The driver's **Not delivered** queue is based on delivery-confirmation approval, not the order status: manually marking an order Delivered does not remove it. It remains there, including while a request awaits review, until the driver submits delivery details and an owner/admin approves the request. The driver can still submit a request for an assigned transfer whose order status was manually set to Delivered.

Overview count cards are clickable: order cards open the matching order list (including overdue orders), while **Total items**, **Low stock**, **Ended products**, and **Critical condition** open the matching catalog products.

Product Catalog separates stock conditions. **Low stock** includes non-ended products with a numeric **UOM/N** value from 1 through 20, inclusive. **Ended products** have an **R/QUANTITY** value of 0 or an **STS** value of **END**; they are excluded from Low stock. **Critical condition** includes products with a negative **R/QUANTITY** value. The low-stock range is fixed at 1–20; it is not user-configurable.

Workspace owners and admins can delete a product from the catalog. The confirmation explains that existing orders and item history are kept.

**Notifications** are derived from saved order history: order creation, edits, and orders moved to In progress (shown as ready for delivery). Realtime order refresh updates the notification list; unread counts are remembered per user and browser. These are in-app notifications, not email or browser push.

**Reports** filter orders, transfers, and returned tiles by date range, product, and branch. Use **Export CSV** to download the currently filtered rows. The User activity log includes order history and return creation/edit records, with the recorded username. Item History shows the date and time for each record, and direct catalog quantity additions, reductions, or edits include the before/after quantity and the signed-in user.

**Order filters** let users filter by branch, driver, product, status, and a date range. **Overdue** uses calendar days: Pending orders are flagged after 2 days and In progress orders after 1 day.

When a PDF product code matches one catalog item, the imported order uses the exact product name saved in the catalog, even if the PDF description differs. If the code matches multiple catalog variants, the imported order shows a required **Select catalog item** dropdown. If a numeric slash-suffix code has no exact catalog match, variants with the same base code are offered instead. Choose the exact variant so saving the order subtracts its quantity from that product's **TAKEN** value. Products may share a code while having different descriptions, even when their **Q/ITEM** values match. If descriptions are identical, their **Q/ITEM** values must differ so the order form can select the correct stock entry.

PDF imports check the Transfer ID against saved orders, ignoring differences in letter case and surrounding spaces. A previously saved PDF can still be imported for review, but saving another order with that Transfer ID is blocked.

**Stock reservations** shows the quantity reserved for Pending/In progress orders and the available catalog quantity. Staff stock adjustments are submitted as requests and do not change stock until an admin approves them. Workspace owners/admins review requests in **All orders**. Approved orders/adjustments update the catalog.

**Scheduled report summaries** can be set to daily or weekly in Reports. The summary is generated in-app while the website is open, or the next time someone opens it after the selected interval; it is not an email or a server-side background job.

For an existing Supabase project, rerun the complete `supabase-schema.sql` after publishing these workflow changes, then deploy the new `manage-workflows` function. Until those backend changes are deployed, approval decisions will not work online.

Workspace owners and admins can export a version-2 JSON backup or restore one from Overview. Each backup covers the currently selected location's orders, returned tiles, and catalog data/settings, and includes the shared driver directory; select each location separately for a full multi-location backup. Backups never include Supabase accounts or passwords. Restore adds records that are missing online; matching existing orders, drivers, returns, and products are preserved. Saved catalog settings are restored for the backup location. Keep downloaded backups in a secure location. Version-1 backups containing orders and drivers remain supported.

## Find Order Desk easily on a Windows PC

### Local version

1. Double-click `Install Order Desk.cmd` in the project folder.
2. Open **SHAAFICI Order Desk** from the Desktop or Windows Start menu.

These shortcuts open the online website in an app-style window without browser tabs or an address bar, and use the SHAAFICI logo. Microsoft Edge supplies the Windows web-app runtime; it does not open a normal browser window. The installer also attempts to pin the Start menu shortcut to the taskbar. If Windows does not allow automatic pinning, right-click **SHAAFICI Order Desk** in the Start menu and choose **Pin to taskbar**. To remove the shortcuts, delete **SHAAFICI Order Desk.lnk** from the Desktop and Start menu.

### Online version

After opening the published site in Microsoft Edge or Google Chrome, use the browser menu and choose **Install SHAAFICI Order Desk** (or **Apps → Install this site as an app**). This creates an app entry in Windows without requiring the project folder.
