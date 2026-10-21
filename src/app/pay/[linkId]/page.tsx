"use client";

import { use, useEffect, useRef, useState } from "react";
import qrcode from "qrcode-generator";
import { API_BASE } from "@/lib/api";
import { formatAmount } from "@/lib/format";

const HORIZON_URL = "https://horizon-testnet.stellar.org";

interface LinkData {
  merchant_name: string;
  description: string | null;
  amount_usdc: string;
  fee_usdc: string | null;
  currency: string;
  stellar_base_address: string;
}

interface ConfirmedPayment {
  tx_hash: string;
  muxed_id: string;
}

const STAGE = {
  CONNECT: "Connecting your wallet…",
  PREP: "Preparing your payment…",
  SIGN: "Approve the payment in your wallet…",
  SEND: "Sending your payment…",
  CONFIRM: "Konfirming…",
};

// Every status line here is written for the person paying, not for whoever's
// debugging this later — no "session," "reconciler," or "screening" ever
// reaches this screen. Technical detail still goes to the console.
function friendlyMessage(err: unknown): string {
  const msg = String((err as Error)?.message || err || "");
  const knownSafe = [
    "link is not active",
    "link has expired",
    "link not found",
    "this address is not permitted to pay",
    "pay-what-you-want links need an amount",
  ];
  if (knownSafe.some((s) => msg.toLowerCase().includes(s))) {
    return "This payment link isn't available right now. Please contact the merchant.";
  }
  if (msg.toLowerCase().includes("declined") || msg.toLowerCase().includes("rejected")) {
    return "You'll need to approve the payment in your wallet to continue.";
  }
  if (msg.toLowerCase().includes("freighter") || msg.toLowerCase().includes("wallet")) {
    return "We couldn't connect to your wallet. Make sure Freighter is installed and unlocked, then try again.";
  }
  return "Something didn't go through on our end. Please try again.";
}

function randomMuxedId(): string {
  const buf = new Uint32Array(2);
  crypto.getRandomValues(buf);
  // Keep it within the positive int64 range Soroban/Stellar expect.
  const high = BigInt(buf[0] & 0x7fffffff);
  const low = BigInt(buf[1]);
  return ((high << 32n) | low).toString();
}

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default function CheckoutPage({ params }: { params: Promise<{ linkId: string }> }) {
  const { linkId } = use(params);

  const [loadingText, setLoadingText] = useState("Loading…");
  const [linkData, setLinkData] = useState<LinkData | null>(null);
  const [showQr, setShowQr] = useState(true);
  const [qrSvg, setQrSvg] = useState("");
  const [qrUri, setQrUri] = useState("#");
  const [status, setStatus] = useState("");
  const [statusIsError, setStatusIsError] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [confirmed, setConfirmed] = useState<ConfirmedPayment | null>(null);
  const [linkInactive, setLinkInactive] = useState(false);

  const alreadyConfirmed = useRef(false);
  const sharedMuxedId = useRef<string | null>(null);
  const broadcastRef = useRef<BroadcastChannel | null>(null);
  // True only while a payment is being signed/submitted/confirmed, so the
  // beforeunload prompt never fires during passive polling or idle states.
  const operationInFlight = useRef(false);
  useBeforeUnload(operationInFlight);
  const connectInFlight = useRef(false);

  function setStatusMsg(msg: string, isError = false) {
    setStatus(msg);
    setStatusIsError(isError);
  }

  function showSuccess(payment: ConfirmedPayment) {
    if (alreadyConfirmed.current) return; // either path can win; only act on the first
    alreadyConfirmed.current = true;
    setConfirmed(payment);
    broadcastRef.current?.postMessage({ type: "confirmed" });
  }

  // Asks only about this payer's own session, so a checkout page never
  // sees anyone else's payments. A 404 (session not yet visible) just means
  // keep waiting.
  async function pollForConfirmation(
    pollLinkId: string,
    muxedId: string,
    attempts: number,
    intervalMs: number,
  ): Promise<ConfirmedPayment | null> {
    for (let i = 0; i < attempts; i++) {
      if (alreadyConfirmed.current || cancelledRef.current) return null;
      const res = await fetch(`${API_BASE}/links/${pollLinkId}/sessions/${muxedId}`);
      if (cancelledRef.current) return null;
      if (res.ok) {
        const body: { confirmed: boolean; payment: { tx_hash: string } | null } = await res.json();
        if (cancelledRef.current) return null;
        if (body.confirmed && body.payment) return { tx_hash: body.payment.tx_hash, muxed_id: muxedId };
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    return null;
  }

  // The one server round trip reserves the payer-chosen muxed_id against
  // this link. A collision is astronomically unlikely with a real random
  // 64-bit value, but the correct response was always "pick a new one and
  // retry" — this is that retry, actually wired up client-side.
  async function reserveSessionWithRetry(maxAttempts = 3): Promise<string> {
    let lastError: Error | undefined;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const candidateId = randomMuxedId();
      const res = await fetch(`${API_BASE}/links/${linkId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ muxed_id: candidateId }),
      });
      if (res.ok) return candidateId;
      const body = await res.json().catch(() => ({}));
      lastError = new Error(body.message || "session reservation failed");
      if (res.status !== 409) throw lastError; // only retry on a genuine collision
    }
    throw lastError;
  }

  // Renders the SEP-7 `web+stellar:pay` request as a scannable QR code and
  // makes the same URI directly tappable — on a phone that already has a
  // Stellar wallet installed, tapping opens it without needing a camera at
  // all. Falls back to hiding this option if it can't be built, since
  // Freighter still works on its own.
  async function setupQrPayment(muxedId: string) {
    try {
      const res = await fetch(`${API_BASE}/payments/pay-uri?linkId=${linkId}&muxed_id=${muxedId}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "could not build a payment request");
      const qr = qrcode(0, "M");
      qr.addData(body.uri);
      qr.make();
      if (cancelledRef.current) return;
      setQrSvg(qr.createSvgTag(5, 8));
      setQrUri(body.uri);
    } catch (err) {
      reportError(err, { tags: { flow: "checkout", stage: "qr-setup", linkId } });
      setShowQr(false);
    }
  }

  async function handleConnect() {
    if (connectInFlight.current) return;
    connectInFlight.current = true;
    setConnecting(true);
    operationInFlight.current = true;
    broadcastRef.current?.postMessage({ type: "paying" });
    try {
      setStatusMsg(STAGE.CONNECT);
      const { default: freighterApi } = await import("@stellar/freighter-api");
      const access = await freighterApi.requestAccess();
      if (access.error) throw new Error(access.error);
      const payerAddress = access.address;

      setStatusMsg(STAGE.PREP);
      // Reserved once for the whole checkout (see init below) so the QR
      // code and this button race toward the same session — whichever the
      // payer actually completes is the one that lands.
      const muxedId = sharedMuxedId.current!;

      const prepRes = await fetch(`${API_BASE}/payments/prepare-tx?linkId=${linkId}&muxed_id=${muxedId}&payer=${payerAddress}`);
      const prep = await prepRes.json();
      if (!prepRes.ok) throw new Error(prep.message || "could not prepare transaction");

      setStatusMsg(STAGE.SIGN);
      const signed = await freighterApi.signTransaction(prep.xdr, {
        networkPassphrase: prep.network_passphrase,
        address: payerAddress,
      });
      if (signed.error) throw new Error(signed.error);

      setStatusMsg(STAGE.SEND);
      // Raw Horizon REST call rather than the SDK's Server class — kept
      // this way even after moving off the CDN import, since it's fewer
      // moving parts to be wrong about.
      const submitRes = await fetch(`${HORIZON_URL}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `tx=${encodeURIComponent(signed.signedTxXdr)}`,
      });
      const submitResult = await submitRes.json();
      if (!submitRes.ok) {
        const codes = submitResult.extras?.result_codes;
        throw new Error(codes ? JSON.stringify(codes) : submitResult.title || "submission failed");
      }

      setStatusMsg(STAGE.CONFIRM);
      // Short, bounded wait — Horizon's submit call above only returns once
      // the transaction is already in a ledger, so this is just waiting on
      // our own reconciler to notice, typically a few seconds. The QR
      // path's own ambient watcher (started on page load) has no such
      // deadline, since there's no way to know when someone might finish
      // scanning.
      const payment = await pollForConfirmation(linkId, muxedId, 20, 1500);
      if (payment) {
        showSuccess(payment);
      } else {
        setStatusMsg("Your payment was sent. It may take a moment to show up here.");
      }
    } catch (err) {
      console.error("[konfirm checkout] connect flow failed", err);
      setStatusMsg(friendlyMessage(err), true);
    } finally {
      operationInFlight.current = false;
      connectInFlight.current = false;
      setConnecting(false);
    }
  }

  function handleConnectSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (connecting) return;
    void handleConnect();
  }

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const res = await fetch(`${API_BASE}/links/${linkId}`);
        const body = await res.json();
        if (!res.ok) throw new Error(body.message || "link not found");
        if (cancelled) return;
        setLinkData(body);

        const muxedId = await reserveSessionWithRetry();
        if (cancelled) return;
        sharedMuxedId.current = muxedId;

        await setupQrPayment(muxedId);
        if (cancelled) return;

        // Ambient watcher for the QR path — no deadline, since the payer
        // may scan at any time.
        void (async () => {
          const payment = await pollForConfirmation(linkId, muxedId, 120, 3000);
          if (payment) showSuccess(payment);
        })();
      } catch (err) {
        console.error("[konfirm checkout] init failed", err);
        if (!cancelled) setLoadingText(friendlyMessage(err));
      }
    }
    void init();
    return () => {
      cancelledRef.current = true;
      channel?.close();
      broadcastRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkId]);

  if (!linkData) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6">
        <p className="text-sm text-gray-500">{loadingText}</p>
      </main>
    );
  }

  if (confirmed) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6">
        <h1 className="text-2xl font-semibold">Payment confirmed</h1>
        <p className="text-sm text-gray-500">
          Thanks — your payment to {linkData.merchant_name} went through.
        </p>
        <p className="break-all text-xs text-gray-400">tx: {confirmed.tx_hash}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-gray-500">Pay {linkData.merchant_name}</p>
        <h1 className="text-2xl font-semibold">
          {linkData.amount_usdc} {linkData.currency}
        </h1>
        {linkData.description && <p className="text-sm text-gray-500">{linkData.description}</p>}
      </header>

      {showQr && qrSvg && (
        <section className="flex flex-col items-center gap-2">
          <div className="rounded-lg bg-white p-2" dangerouslySetInnerHTML={{ __html: qrSvg }} />
          <a href={qrUri} className="text-xs text-blue-600 underline">
            Open in your wallet
          </a>
        </section>
      )}

      <form onSubmit={handleConnectSubmit} className="flex flex-col gap-3">
        <button
          type="submit"
          disabled={connecting}
          className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {connecting ? "Connecting…" : "Connect wallet & pay"}
        </button>
      </form>

      {status && (
        <p className={`text-sm ${statusIsError ? "text-red-600" : "text-gray-500"}`}>{status}</p>
      )}
    </main>
  );
}
