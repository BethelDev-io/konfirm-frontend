"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatUtcTimestamp } from "@/lib/format";

type Severity = "critical" | "warning" | "info";

interface Notification {
  id: string;
  type: string;
  severity: Severity;
  message: string;
  created_at: string;
}

export default function AdminNotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      const result = await apiFetch<Notification[]>("/admin/notifications");
      if (result.ok && result.data) {
        setItems(result.data);
      } else {
        setError(true);
      }
      setLoading(false);
    })();
  }, []);

  const critical = items.filter((n) => n.severity === "critical").length;
  const warning = items.filter((n) => n.severity === "warning").length;

  return (
    <div>
      <h1>Notifications</h1>
      <p className="sub">
        Consequential events derived live from existing data — failed or held x402 settlements, disputed payments, stuck
        withdrawals, and compliance blocks. There is no separate event log; each row is a real record that already exists for
        its own reason. Sentry error tracking is not yet configured for this deployment, so this feed is the current
        substitute for admin-visible alerting.
      </p>

      <div className="admin-section">
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">Total</div>
            <div className="stat-value">{error ? "—" : items.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Critical</div>
            <div className="stat-value stat-bad">{error ? "—" : critical}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Warning</div>
            <div className="stat-value">{error ? "—" : warning}</div>
          </div>
        </div>
      </div>

      <div className="admin-section">
        {loading ? (
          <div className="empty">Loading…</div>
        ) : error ? (
          <div className="empty">Could not load notifications — try again.</div>
        ) : items.length === 0 ? (
          <div className="empty">Nothing to flag right now.</div>
        ) : (
          <ul className="activity-feed">
            {items.map((n) => (
              <li key={`${n.type}-${n.id}`}>
                <span className="when">{formatUtcTimestamp(n.created_at)}</span>
                <span className={`status-pill ${n.severity === "critical" ? "failed" : n.severity === "warning" ? "held" : "active"}`}>
                  {n.severity}
                </span>{" "}
                {n.message}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}