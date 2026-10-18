"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Severity = "critical" | "warning" | "info";

interface Notification {
  id: string;
  type: string;
  severity: Severity;
  message: string;
  created_at: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

const PAGE_SIZE = 50;

export default function AdminNotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    (async () => {
      const result = await apiFetch<Notification[]>(`/admin/notifications?limit=${PAGE_SIZE}&offset=0`);
      if (result.ok) {
        setItems(result.data);
        setOffset(result.data.length);
        setHasMore(result.data.length === PAGE_SIZE);
      }
      setLoading(false);
    })();
  }, []);

  async function loadMore() {
    setLoadingMore(true);
    const result = await apiFetch<Notification[]>(`/admin/notifications?limit=${PAGE_SIZE}&offset=${offset}`);
    if (result.ok) {
      setItems((prev) => [...prev, ...result.data]);
      setOffset((prev) => prev + result.data.length);
      setHasMore(result.data.length === PAGE_SIZE);
    }
    setLoadingMore(false);
  }

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
            <div className="stat-value">{items.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Critical</div>
            <div className="stat-value stat-bad">{critical}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Warning</div>
            <div className="stat-value">{warning}</div>
          </div>
        </div>
      </div>

      <div className="admin-section">
        {loading ? (
          <div className="empty">Loading…</div>
        ) : items.length === 0 ? (
          <div className="empty">Nothing to flag right now.</div>
        ) : (
          <>
            <ul className="activity-feed">
              {items.map((n) => (
                <li key={`${n.type}-${n.id}`}>
                  <span className="when">{formatDate(n.created_at)}</span>
                  <span className={`status-pill ${n.severity === "critical" ? "failed" : n.severity === "warning" ? "held" : "active"}`}>
                    {n.severity}
                  </span>{" "}
                  {n.message}
                </li>
              ))}
            </ul>
            <div className="pagination">
              <span className="sub">
                Showing {items.length}
                {hasMore ? "+" : ""} notification{items.length === 1 ? "" : "s"}
                {hasMore ? " — there may be more" : ""}
              </span>
              {hasMore && (
                <button type="button" className="btn-secondary" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? "Loading…" : "Load more"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
