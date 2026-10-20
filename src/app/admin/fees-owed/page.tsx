"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface OwedRow {
  merchant_id: string;
  merchant_name: string;
  merchant_email: string;
  asset_code: string;
  total_fee_owed_raw: string;
  oldest_owed_at: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { timeZone: "UTC" }) + " UTC";
}

export default function AdminFeesOwedPage() {
  const [rows, setRows] = useState<OwedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      const data = await apiFetch<OwedRow[]>("/admin/fees/owed");
      if (data) {
        setRows(data);
      } else {
        setError(true);
      }
      setLoading(false);
    })();
  }, []);

  const totalMerchants = new Set(rows.map((r) => r.merchant_id)).size;

  return (
    <div>
      <h1>Fees Owed</h1>
      <p className="hint">
        Merchants with outstanding platform fees that have not yet been settled — grouped by merchant and asset.
        Use the suspend action on the Merchants page for merchants in long-term arrears.
      </p>

      {loading ? (
        <div className="empty">Loading…</div>
      ) : error ? (
        <div className="empty">Could not load fees owed — try again.</div>
      ) : rows.length === 0 ? (
        <div className="empty">No outstanding fees — all merchants are current.</div>
      ) : (
        <>
          <div className="admin-section">
            <div className="stat-grid">
              <div className="stat-card">
                <div className="stat-label">Merchants in arrears</div>
                <div className="stat-value">{totalMerchants}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Outstanding line items</div>
                <div className="stat-value">{rows.length}</div>
              </div>
            </div>
          </div>

          <div className="admin-section">
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Merchant</th>
                    <th>Asset</th>
                    <th>Fee owed</th>
                    <th>Oldest unpaid (UTC)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i}>
                      <td>
                        <div style={{ color: "var(--text-hi)" }}>{row.merchant_name}</div>
                        <div className="mono">{row.merchant_email}</div>
                      </td>
                      <td className="mono">{row.asset_code}</td>
                      <td className="mono">{row.total_fee_owed_raw}</td>
                      <td>{formatDate(row.oldest_owed_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
