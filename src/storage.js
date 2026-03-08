// Supabase storage shim — same API as window.storage used in Claude artifacts
const SUPABASE_URL = "https://mbnmnxikhxzmkrmmjnuc.supabase.co";
const SUPABASE_KEY = "sb_publishable_ls9TjNxVzSZ9e5CiBPquEA_MXnwwCTT";
const TABLE = "planner_data";

const headers = {
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

export const storage = {
  async get(key) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${TABLE}?key=eq.${encodeURIComponent(key)}&select=value`,
      { headers }
    );
    if (!res.ok) throw new Error(await res.text());
    const rows = await res.json();
    if (!rows.length) return null;
    return { key, value: rows[0].value };
  },

  async set(key, value) {
    // Try PATCH (update existing row) first
    const patchRes = await fetch(
      `${SUPABASE_URL}/rest/v1/${TABLE}?key=eq.${encodeURIComponent(key)}`,
      {
        method: "PATCH",
        headers: { ...headers, "Prefer": "return=representation" },
        body: JSON.stringify({ value, updated_at: new Date().toISOString() }),
      }
    );
    if (!patchRes.ok) throw new Error(await patchRes.text());
    const updated = await patchRes.json();

    if (updated.length === 0) {
      // No existing row — INSERT
      const postRes = await fetch(
        `${SUPABASE_URL}/rest/v1/${TABLE}`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ key, value }),
        }
      );
      if (!postRes.ok) throw new Error(await postRes.text());
    }
    return { key, value };
  },

  async delete(key) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${TABLE}?key=eq.${encodeURIComponent(key)}`,
      { method: "DELETE", headers }
    );
    if (!res.ok) throw new Error(await res.text());
    return { key, deleted: true };
  },

  async list(prefix = "") {
    const filter = prefix
      ? `?key=like.${encodeURIComponent(prefix + "%")}&select=key`
      : `?select=key`;
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${TABLE}${filter}`,
      { headers }
    );
    if (!res.ok) throw new Error(await res.text());
    const rows = await res.json();
    return { keys: rows.map(r => r.key) };
  },
};
