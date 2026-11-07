import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const allowedOrigins = new Set([
  "https://ahmedgurey07.github.io",
  "http://127.0.0.1:8765",
  "http://localhost:8765"
]);

function jsonResponse(body: unknown, status: number, origin: string | null) {
  const headers = new Headers({ "Content-Type": "application/json; charset=utf-8" });
  if (origin && allowedOrigins.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }
  return new Response(JSON.stringify(body), { status, headers });
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") {
    if (origin && !allowedOrigins.has(origin)) return new Response("Origin not allowed.", { status: 403 });
    const headers = new Headers({
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
      "Access-Control-Max-Age": "86400"
    });
    if (origin) {
      headers.set("Access-Control-Allow-Origin", origin);
      headers.set("Vary", "Origin");
    }
    return new Response(null, { status: 204, headers });
  }
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405, origin);
  if (origin && !allowedOrigins.has(origin)) return jsonResponse({ error: "Origin not allowed." }, 403, origin);

  try {
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return jsonResponse({ error: "Sign in is required." }, 401, origin);

    const callerClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } }
    });
    const { data: userResult, error: userError } = await callerClient.auth.getUser(token);
    if (userError || !userResult.user) return jsonResponse({ error: "Your session is invalid or expired." }, 401, origin);

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: roleRecord, error: roleError } = await adminClient
      .from("workspace_user_roles")
      .select("role")
      .eq("user_id", userResult.user.id)
      .maybeSingle();
    if (roleError) throw roleError;
    const callerRole = roleRecord?.role;
    if (callerRole !== "owner" && callerRole !== "admin") {
      return jsonResponse({ error: "Only workspace admins can manage users." }, 403, origin);
    }
    const isOwner = callerRole === "owner";
    const body = await request.json();
    const action = body?.action;

    if (action === "list") {
      const users = [];
      for (let page = 1; page <= 50; page += 1) {
        const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 100 });
        if (error) throw error;
        users.push(...data.users);
        if (data.users.length < 100) break;
      }
      if (users.length >= 5000) throw new Error("Too many users to list in one request.");
      const { data: roles, error: rolesError } = await adminClient
        .from("workspace_user_roles")
        .select("user_id,role");
      if (rolesError) throw rolesError;
      const rolesById = new Map(roles.map((entry) => [entry.user_id, entry.role]));
      return jsonResponse({
        users: users.map((user) => ({
          id: user.id,
          name: typeof user.user_metadata?.display_name === "string" ? user.user_metadata.display_name : "",
          email: user.email || "",
          role: rolesById.get(user.id) || "staff",
          active: !user.banned_until || new Date(user.banned_until) <= new Date(),
          lastSignInAt: user.last_sign_in_at
        }))
      }, 200, origin);
    }

    if (action === "invite") {
      const email = String(body.email || "").trim().toLowerCase();
      const name = String(body.name || "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name || name.length > 120) {
        return jsonResponse({ error: "Enter a valid email address and a name up to 120 characters." }, 400, origin);
      }
      if (body.role !== "staff" && body.role !== "admin") {
        return jsonResponse({ error: "Choose a valid workspace role." }, 400, origin);
      }
      if (body.role === "admin" && !isOwner) {
        return jsonResponse({ error: "Only the owner can grant admin access." }, 403, origin);
      }
      const role = body.role;
      const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
        redirectTo: "https://ahmedgurey07.github.io/transfers/",
        data: { display_name: name }
      });
      if (error) throw error;
      if (!data.user) throw new Error("Supabase did not return the invited user.");
      const { error: saveRoleError } = await adminClient
        .from("workspace_user_roles")
        .upsert({ user_id: data.user.id, role }, { onConflict: "user_id" });
      if (saveRoleError) {
        const { error: cleanupError } = await adminClient.auth.admin.deleteUser(data.user.id);
        if (cleanupError) console.error("Could not remove invited user after role assignment failed:", cleanupError);
        throw saveRoleError;
      }
      return jsonResponse({ ok: true }, 200, origin);
    }

    if (action === "update" || action === "set-active") {
      const userId = String(body.userId || "");
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
        return jsonResponse({ error: "A valid user ID is required." }, 400, origin);
      }
      const { data: targetRoleRecord, error: targetRoleError } = await adminClient
        .from("workspace_user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();
      if (targetRoleError) throw targetRoleError;
      const targetRole = targetRoleRecord?.role || "staff";
      if (targetRole !== "staff" && !isOwner) {
        return jsonResponse({ error: "Admins can only manage staff accounts. Ask the owner to change this user." }, 403, origin);
      }

      const { data: targetResult, error: targetError } = await adminClient.auth.admin.getUserById(userId);
      if (targetError) throw targetError;
      if (!targetResult.user) return jsonResponse({ error: "User not found." }, 404, origin);
      if (targetRole === "owner" && body.active === false) {
        return jsonResponse({ error: "The workspace owner cannot be deactivated." }, 400, origin);
      }

      if (action === "set-active") {
        if (typeof body.active !== "boolean") {
          return jsonResponse({ error: "An active status is required." }, 400, origin);
        }
        const { error } = await adminClient.auth.admin.updateUserById(userId, {
          ban_duration: body.active ? "none" : "876000h"
        });
        if (error) throw error;
        return jsonResponse({ ok: true }, 200, origin);
      }

      const name = String(body.name || "").trim();
      const email = String(body.email || "").trim().toLowerCase();
      const requestedRole = String(body.role || targetRole);
      if (!name || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return jsonResponse({ error: "Enter a valid email address and a name up to 120 characters." }, 400, origin);
      }
      if (!["owner", "admin", "staff"].includes(requestedRole)) {
        return jsonResponse({ error: "Choose a valid workspace role." }, 400, origin);
      }
      if (requestedRole === "owner" && targetRole !== "owner") {
        return jsonResponse({ error: "The workspace owner cannot be assigned from the Users page." }, 400, origin);
      }
      if (targetRole === "owner" && requestedRole !== "owner") {
        return jsonResponse({ error: "The owner role cannot be changed here." }, 400, origin);
      }
      if (requestedRole !== targetRole && !isOwner) {
        return jsonResponse({ error: "Only the owner can grant or remove admin access." }, 403, origin);
      }

      const metadata = { ...targetResult.user.user_metadata, display_name: name };
      const update: { user_metadata: Record<string, unknown>; email?: string } = { user_metadata: metadata };
      if (email !== (targetResult.user.email || "").toLowerCase()) update.email = email;
      const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, update);
      if (updateError) throw updateError;
      if (requestedRole !== targetRole) {
        const { error: saveRoleError } = await adminClient
          .from("workspace_user_roles")
          .upsert({ user_id: userId, role: requestedRole }, { onConflict: "user_id" });
        if (saveRoleError) throw saveRoleError;
      }
      return jsonResponse({
        ok: true,
        emailChangePending: email !== (targetResult.user.email || "").toLowerCase()
      }, 200, origin);
    }

    return jsonResponse({ error: "Unknown user-management action." }, 400, origin);
  } catch (error) {
    console.error("User management request failed:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Could not complete user management request." }, 500, origin);
  }
});
