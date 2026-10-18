"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface PayLink {
  id: string;
  merchant_name: string;
  amount_usdc: string | null;
  currency: string;
  description: string | null;
  reusable: boolean;
  max_uses: number | null;
  expires_at: string | null;
  active: boolean;
  created_at: string;
  use_count: number;
  net_usdc: string;
}

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString() : "—";
}

function formatAmount(link: PayLink): string {
  if (link.amount_usdc === null) return "Any amount";
  return `${Number(link.amount_usdc).toFixed(2)} ${link.currency}`;
}

export default function AdminPayLinksPage() {
  const [links, setLinks] = useState<PayLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      const result = await apiFetch<PayLink[]>("/admin/links");
      if (result.ok && result.data) {
        setLinks(result.data);
      } else {
        setError(true);
      }
      setLoading(false);
    })();
  }, []);

  const activeCount = links.filter((l) => l.active).length;
  const reusableCount = links.filter((l) => l.reusable).length;
  const totalCollected = links.reduce((sum, l) => sum + Number(l.net_usdc), 0);

  return (
    <div>
      <h1>Pay Links</h1>
      <p className="sub">
        Shareable checkout links created by merchants (the same links served at <code>/pay/[linkId]</code>). A link with no fixed
        amount is pay-what-you-want; a reusable link can be paid more than once, up to its max uses if one is set.
      </p>

      <div className="admin-section">
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">Total links</div>
            <div className="stat-value">{links.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Active</div>
            <div className="stat-value stat-good">{activeCount}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Reusable</div>
            <div className="stat-value">{reusableCount}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Collected via links</div>
            <div className="stat-value">${totalCollected.toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div className="admin-section">
        {loading ? (
          <div className="empty">Loading…</div>
        ) : error ? (
          <div className="empty">Could not load pay links — try again.</div>
        ) : links.length === 0 ? (
          <div className="empty">No pay links have been created yet.</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Merchant</th>
                  <th>Amount</th>
                  <th>Description</th>
                  <th>Uses</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {links.map((l) => (
                  <tr key={l.id}>
                    <td style={{ color: "var(--text-hi)" }}>{l.merchant_name}</td>
                    <td className="mono">{formatAmount(l)}</td>
                    <td>{l.description || "—"}</td>
                    <td className="mono">
                      {l.use_count}
                      {l.max_uses ? ` / ${l.max_uses}` : l.reusable ? "" : " / 1"}
                    </td>
                    <td>
                      <span className={`status-pill ${l.active ? "active" : "suspended"}`}>{l.active ? "active" : "inactive"}</span>
                    </td>
                    <td>{formatDate(l.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
