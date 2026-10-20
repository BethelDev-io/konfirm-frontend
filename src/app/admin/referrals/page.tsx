"use client";
import LoadingSpinner from "@/components/LoadingSpinner";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface ReferralRow {
  id: string;
  code: string;
  created_at: string;
  referrer_name: string;
  referrer_email: string;
  referred_name: string;
  referred_email: string;
  activated: boolean;
}

export default function AdminReferralsPage() {
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      const data = await apiFetch<ReferralRow[]>("/admin/referrals");
      if (data) {
        setReferrals(data);
        setError(false);
      } else {
        setError(true);
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <h1>Referrals</h1>
      <p className="hint">
        &quot;Active&quot; means the referred merchant has processed at least one real paid payment — computed live
        against payment history, not a status a job has to keep up to date.
      </p>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="empty">Could not load referrals — try again.</div>
      ) : referrals.length === 0 ? (
        <div className="empty">No referrals yet.</div>
      ) : (
        <div className="admin-section">
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Referrer</th>
                  <th>Referred</th>
                  <th>Code</th>
                  <th>Status</th>
                  <th>Since</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ color: "var(--text-hi)" }}>{r.referrer_name}</div>
                      <div className="mono">{r.referrer_email}</div>
                    </td>
                    <td>
                      <div style={{ color: "var(--text-hi)" }}>{r.referred_name}</div>
                      <div className="mono">{r.referred_email}</div>
                    </td>
                    <td className="mono">{r.code}</td>
                    <td>
                      <span className={`status-pill ${r.activated ? "paid" : "pending"}`}>
                        {r.activated ? "Active" : "Signed up"}
                      </span>
                    </td>
                    <td>{formatUtcTimestamp(r.created_at)}</td>
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
