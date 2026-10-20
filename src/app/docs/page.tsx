"use client";

import Link from "next/link";

export default function DocsPage() {
  return (
    <div style={{ maxWidth: 720, margin: "48px auto", padding: "0 24px", lineHeight: 1.65 }}>
      <div style={{ marginBottom: 32 }}>
        <Link href="/activity" style={{ fontSize: 13 }}>
          ← Activity
        </Link>
      </div>

      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Developer Docs</h1>
      <p className="hint" style={{ marginBottom: 40 }}>
        Everything you need to integrate Konfirm into your own stack — the data model, how payment links work, and what
        to expect on-chain.
      </p>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>How payments work</h2>
        <p>
          Every Konfirm payment flows over the Stellar network in USDC (or another supported asset). When a payer
          completes a checkout, the transaction is submitted to Stellar and immediately confirmed on-chain — Konfirm
          never holds funds in custody. You see the payment in your activity feed the moment the ledger closes,
          typically within 5 seconds.
        </p>
        <p style={{ marginTop: 12 }}>
          Payments are immutable once confirmed. If you need to return funds, initiate a separate payout from your
          Stellar wallet — there is no server-side refund API at this time.
        </p>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>Payment links</h2>
        <p>
          A <strong>payment link</strong> is a URL of the form{" "}
          <code className="mono" style={{ fontSize: 13 }}>
            /pay/&lt;link-id&gt;
          </code>{" "}
          that displays a checkout page pre-loaded with your amount and description. Links can be:
        </p>
        <ul style={{ marginTop: 10, paddingLeft: 20 }}>
          <li>
            <strong>Fixed-amount</strong> — the payer sees a fixed USDC total and cannot change it.
          </li>
          <li>
            <strong>Open-amount</strong> — the payer enters any amount; held for admin review before settlement.
          </li>
          <li>
            <strong>Single-use or reusable</strong> — a single-use link deactivates after the first successful payment.
          </li>
        </ul>
        <p style={{ marginTop: 12 }}>
          Create and manage links from the{" "}
          <Link href="/links">My links</Link> page, or programmatically once the merchant API-key feature ships (see
          below).
        </p>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>Data model</h2>
        <p>The core objects you will encounter in API responses:</p>
        <div
          className="admin-table-wrap"
          style={{ marginTop: 16 }}
        >
          <table className="admin-table">
            <thead>
              <tr>
                <th>Object</th>
                <th>Key fields</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="mono">Payment</td>
                <td>
                  <code className="mono">id</code>, <code className="mono">net_usdc</code>,{" "}
                  <code className="mono">asset_code</code>, <code className="mono">payer_address</code>,{" "}
                  <code className="mono">status</code> (<code className="mono">paid</code> |{" "}
                  <code className="mono">held</code> | <code className="mono">refunded</code> |{" "}
                  <code className="mono">disputed</code>), <code className="mono">created_at</code>
                </td>
              </tr>
              <tr>
                <td className="mono">PaymentLink</td>
                <td>
                  <code className="mono">id</code>, <code className="mono">description</code>,{" "}
                  <code className="mono">amount_usdc</code> (null = open-amount),{" "}
                  <code className="mono">active</code>, <code className="mono">single_use</code>
                </td>
              </tr>
              <tr>
                <td className="mono">Merchant</td>
                <td>
                  <code className="mono">name</code>, <code className="mono">email</code>,{" "}
                  <code className="mono">stellar_base_address</code>, <code className="mono">status</code>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>Fees</h2>
        <p>
          Konfirm deducts a small platform fee from each settled payment. The fee is denominated in the same asset as
          the payment and accrues as <code className="mono">fee_owed_raw</code> on each payment record. Settlement
          happens periodically; you can see outstanding and settled fees on your activity page via the fee-settlement
          widget.
        </p>
        <p style={{ marginTop: 12 }}>
          Merchants who referred other merchants to Konfirm may be eligible for a promotional fee rate — check your{" "}
          <Link href="/referrals">Referrals</Link> page for details.
        </p>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>Programmatic access (coming soon)</h2>
        <p>
          A merchant API-key feature is in development and will allow you to create payment links, query payments, and
          receive webhook events from your own backend — without going through the browser UI. This page will be updated
          with endpoint references and code examples once it ships.
        </p>
        <p style={{ marginTop: 12 }}>
          In the meantime, if you have integration questions reach out to support. Network calls from the browser
          console (all requests go to the same REST API) can serve as a guide to what is available today.
        </p>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>On-chain details</h2>
        <p>
          Konfirm uses the Stellar network. Payments are settled in USDC issued by Circle on Stellar (asset code{" "}
          <code className="mono">USDC</code>, issuer{" "}
          <code className="mono">GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN</code>). Your merchant
          receiving address (<code className="mono">stellar_base_address</code>) must have a trustline to this asset
          before payments can settle.
        </p>
      </section>
    </div>
  );
}
