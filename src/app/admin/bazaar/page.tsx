"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch, apiPatch } from "@/lib/api";

type ListingStatus = "pending" | "approved" | "rejected";

interface Listing {
  id: string;
  kind: "facilitator" | "resource";
  name: string | null;
  url: string;
  description: string;
  network: string;
  scheme: string;
  contact_email: string | null;
  status: ListingStatus;
  created_at: string;
  reviewed_at: string | null;
}

const STATUS_OPTIONS: ListingStatus[] = ["pending", "approved", "rejected"];

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString() : "—";
}

export default function AdminBazaarPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [filter, setFilter] = useState<"" | ListingStatus>("pending");
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  // Monotonically increasing id for each load() call. Used to discard a
  // response that resolves after a newer request has already been issued,
  // so a slow in-flight request can never clobber the result of a faster,
  // more recent one.
  const requestIdRef = useRef(0);

  async function load(status: string) {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    const result = await apiFetch<Listing[]>(status ? `/admin/bazaar-listings?status=${status}` : "/admin/bazaar-listings");
    if (requestId !== requestIdRef.current) {
      // A newer load() has been issued since this one started; drop this
      // stale response instead of overwriting fresher data.
      return;
    }
    if (result.ok) setListings(result.data);
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      await load(filter);
    })();
  }, [filter]);

  async function handleReview(listing: Listing, status: "approved" | "rejected") {
    setPendingId(listing.id);
    try {
      await apiPatch(`/admin/bazaar-listings/${listing.id}/status`, { status });
      await load(filter);
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div>
      <h1>Bazaar</h1>
      <p className="sub">
        Third-party x402 facilitator and resource-server listings submitted via <code>POST /bazaar/listings</code>. A
        listing only appears in the public discovery manifest (<code>/.well-known/x402-bazaar.json</code>) once
        approved here — nothing is listed automatically.
      </p>

      <div className="filter-pills">
        <button type="button" className={`filter-pill ${filter === "" ? "active" : ""}`} onClick={() => setFilter("")}>
          All
        </button>
        {STATUS_OPTIONS.map((s) => (
          <button key={s} type="button" className={`filter-pill ${filter === s ? "active" : ""}`} onClick={() => setFilter(s)}>
            {s}
          </button>
        ))}
      </div>

      <div className="admin-section">
        {loading ? (
          <div className="empty">Loading…</div>
        ) : listings.length === 0 ? (
          <div className="empty">No listings match this filter.</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Kind</th>
                  <th>Name / URL</th>
                  <th>Description</th>
                  <th>Network</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {listings.map((l) => (
                  <tr key={l.id}>
                    <td>{l.kind}</td>
                    <td>
                      {l.name && <div style={{ color: "var(--text-hi)" }}>{l.name}</div>}
                      <div className="mono">{l.url}</div>
                    </td>
                    <td>{l.description}</td>
                    <td className="mono">
                      {l.network} / {l.scheme}
                    </td>
                    <td>{l.contact_email || "—"}</td>
                    <td>
                      <span className={`status-pill ${l.status}`}>{l.status}</span>
                    </td>
                    <td>{formatDate(l.created_at)}</td>
                    <td>
                      {l.status === "pending" && (
                        <>
                          <button type="button" disabled={pendingId === l.id} onClick={() => handleReview(l, "approved")}>
                            Approve
                          </button>{" "}
                          <button type="button" disabled={pendingId === l.id} onClick={() => handleReview(l, "rejected")}>
                            Reject
                          </button>
                        </>
                      )}
                    </td>
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
