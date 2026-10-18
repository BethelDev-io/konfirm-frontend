"use client";

import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";

interface Summary {
  payment_count: number;
  total_fee_usdc: string;
}

interface DailyRow {
  day: string;
  payment_count: string;
  fee_usdc: string;
}

function formatUsdc(amount: string): string {
  return `$${Number(amount).toFixed(2)}`;
}

function formatDay(iso: string): string {
  return `${new Date(iso).toLocaleDateString(undefined, { timeZone: "UTC" })} UTC`;
}

export default function AdminFeeRevenuePage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [summaryRes, dailyRes] = await Promise.all([
        fetch(`${API_BASE}/admin/fee-revenue/summary`, { credentials: "include" }),
        fetch(`${API_BASE}/admin/fee-revenue/daily`, { credentials: "include" }),
      ]);
      if (summaryRes.ok) setSummary(await summaryRes.json());
      if (dailyRes.ok) setDaily(await dailyRes.json());
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <h1>Fee Revenue</h1>
      <p className="hint">
        Realized fee revenue only counts payments that actually settled (status = paid) — a refunded or disputed
        payment&apos;s fee was never really earned, so it&apos;s excluded here.
      </p>

      {loading ? (
        <div className="empty">Loading…</div>
      ) : (
        <>
          <div className="admin-section">
            <div className="stat-grid">
              <div className="stat-card">
                <div className="stat-label">Total fee revenue</div>
                <div className="stat-value">{summary ? formatUsdc(summary.total_fee_usdc) : "—"}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Paid transactions</div>
                <div className="stat-value">{summary?.payment_count ?? "—"}</div>
              </div>
            </div>
          </div>

          <div className="admin-section">
            {daily.length === 0 ? (
              <div className="empty">No settled payments in the last 30 days.</div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Day (UTC)</th>
                      <th>Payments</th>
                      <th>Fee revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {daily.map((row) => (
                      <tr key={row.day}>
                        <td>{formatDay(row.day)}</td>
                        <td className="mono">{row.payment_count}</td>
                        <td className="mono">{formatUsdc(row.fee_usdc)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}