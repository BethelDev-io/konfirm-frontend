"use client";

import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";
import { formatUtc } from "@/lib/format";

interface WalletRow {
  address: string;
  roles: string[];
}

function shortAddress(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

const ROLE_LABELS: Record<string, string> = {
  payer: "Payer",
  merchant: "Merchant",
  blocked: "Blocked",
};

export default function AdminWalletsPage() {
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch(`${API_BASE}/admin/wallets`, { credentials: "include" });
      if (res.ok) setWallets(await res.json());
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <h1>Wallets</h1>
      <p className="hint">
        Every Stellar address seen across payments, merchant accounts, and the compliance blocklist, in one directory
        — an address showing both &quot;Payer&quot; and &quot;Blocked&quot; is worth a second look.
      </p>

      {loading ? (
        <div className="empty">Loading…</div>
      ) : wallets.length === 0 ? (
        <div className="empty">No addresses seen yet.</div>
      ) : (
        <div className="admin-section">
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Address</th>
                  <th>Roles</th>
                </tr>
              </thead>
              <tbody>
                {wallets.map((w) => (
                  <tr key={w.address}>
                    <td className="mono">{shortAddress(w.address)}</td>
                    <td>
                      {w.roles.map((role) => (
                        <span key={role} className={`status-pill ${role === "blocked" ? "disputed" : "paid"}`} style={{ marginRight: 6 }}>
                          {ROLE_LABELS[role] ?? role}
                        </span>
                      ))}
                    </td>
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
