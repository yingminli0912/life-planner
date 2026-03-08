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
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${TABLE}`,
      {
        method: "POST",
        headers: { ...headers, "Prefer": "resolution=merge-duplicates" },
        body: JSON.stringify({ key, value }),
      }
    );
    if (!res.ok) throw new Error(await res.text());
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
