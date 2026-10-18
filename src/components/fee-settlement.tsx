"use client";

import { useCallback, useEffect, useState } from "react";
import freighterApi from "@stellar/freighter-api";
import { API_BASE } from "@/lib/api";

// Merchant-side fee settlement (docs/design/qr-fee-collection.md, Option B).
// Shows what the merchant owes, then clears it in one transaction they sign in
// Freighter. The transaction moves money from the merchant's own account to the
// fee account, and Konfirm only submits what the merchant signed.

interface OwedTotal {
  asset_code: string;
  asset_issuer: string | null;
  amount: string;
  payments: number;
}

const RESULT_TEXT: Record<string, string> = {
  op_underfunded: "Your balance is too low to cover the owed fees. Add funds, then try again.",
  tx_insufficient_balance: "Your balance is too low to cover the owed fees. Add funds, then try again.",
  tx_bad_auth: "The signature didn't match this account. Check the account selected in Freighter.",
};

function describeFailure(body: { message?: unknown; result_codes?: unknown }): string {
  const codes = body.result_codes as { operations?: string[]; transaction?: string } | null;
  const first = codes?.operations?.find((c) => RESULT_TEXT[c]) ?? codes?.transaction;
  if (first && RESULT_TEXT[first]) return RESULT_TEXT[first];
  return typeof body.message === "string" ? body.message : "The settlement couldn't be completed. Please try again.";
}

export default function FeeSettlement({ address }: { address: string }) {
  const [totals, setTotals] = useState<OwedTotal[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ text: string; error: boolean } | null>(null);

  // Always-fresh reads: this is a balance check (fees owed), so a
  // cached/stale response could understate or overstate what's actually
  // owed right now.
  const load = useCallback(async () => {
    const res = await fetch(`${API_BASE}/fees/owed`, { cache: "no-store" });
    if (res.ok) {
      const body: { totals: OwedTotal[] } = await res.json();
      setTotals(body.totals);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/fees/owed`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { totals: OwedTotal[] } | null) => {
        if (!cancelled && body) setTotals(body.totals);
      })
      .catch((err) => console.error("[konfirm fees] could not load owed fees", err));
    return () => {
      cancelled = true;
    };
  }, []);

  async function settle() {
    setBusy(true);
    setStatus(null);
    try {
      const created = await fetch(`${API_BASE}/fees/settlements`, { method: "POST" });
      const body = await created.json().catch(() => ({}));
      if (!created.ok) throw Object.assign(new Error(describeFailure(body)), { handled: true });

      setStatus({ text: "Approve the fee payment in your wallet…", error: false });
      const signed = await freighterApi.signTransaction(body.unsigned_xdr, {
        networkPassphrase: body.network_passphrase,
        address,
      });
      if (signed.error) throw Object.assign(new Error("The wallet didn't sign the fee payment."), { handled: true });

      setStatus({ text: "Sending the fee payment…", error: false });
      const submitted = await fetch(`${API_BASE}/fees/settlements/${body.settlement_id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signed_xdr: signed.signedTxXdr }),
      });
      const result = await submitted.json().catch(() => ({}));
      if (!submitted.ok) throw Object.assign(new Error(describeFailure(result)), { handled: true });

      setStatus({ text: "Fees settled. Thank you.", error: false });
      await load();
    } catch (err) {
      console.error("[konfirm fees] settlement failed", err);
      setStatus({
        text: err instanceof Error && (err as Error & { handled?: boolean }).handled
          ? err.message
          : "Something went wrong settling fees. Please try again.",
        error: true,
      });
    } finally {
      setBusy(false);
    }
  }

  if (!totals || totals.length === 0) return null;

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="merchant-label">Platform fees owed</div>
      <div className="sub" style={{ marginBottom: 8 }}>
        {totals.map((t) => (
          <div key={`${t.asset_code}:${t.asset_issuer ?? ""}`}>
            {t.amount} {t.asset_code} <small>across {t.payments} payment{t.payments === 1 ? "" : "s"}</small>
          </div>
        ))}
      </div>
      <button type="button" className="primary" disabled={busy} onClick={settle}>
        Settle fees
      </button>
      {status && <div className={`status${status.error ? " error" : ""}`}>{status.text}</div>}
    </div>
  );
}
