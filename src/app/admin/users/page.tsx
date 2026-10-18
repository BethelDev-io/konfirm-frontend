"use client";

import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";
import { formatAmount } from "@/lib/format";

interface UserRow {
  payer_address: string;
  payment_count: string;
  total_volume_usdc: string;
  first_seen_at: string;
  last_seen_at: string;
  refunded_count: string;
  disputed_count: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

function shortAddress(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch(`${API_BASE}/admin/users`, { credentials: "include" });
      if (res.ok) setUsers(await res.json());
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <h1>Users</h1>
      <p className="hint">
        There&apos;s no separate user-account system — this is every unique address that has ever paid through the
        platform, derived from payment history, not a signed-up account.
      </p>

      {loading ? (
        <div className="empty">Loading…</div>
      ) : users.length === 0 ? (
        <div className="empty">No payer activity yet.</div>
      ) : (
        <div className="admin-section">
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Address</th>
                  <th>Payments</th>
                  <th>Total volume</th>
                  <th>Refunded / disputed</th>
                  <th>First seen</th>
                  <th>Last seen</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.payer_address}>
                    <td className="mono">{shortAddress(u.payer_address)}</td>
                    <td className="mono">{u.payment_count}</td>
                    <td className="mono">{formatAmount(u.total_volume_usdc, "USDC")}</td>
                    <td className="mono">
                      {u.refunded_count} / {u.disputed_count}
                    </td>
                    <td>{formatDate(u.first_seen_at)}</td>
                    <td>{formatDate(u.last_seen_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
