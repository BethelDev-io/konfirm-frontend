import type { NextConfig } from "next";

// Backend-for-frontend: the browser only ever talks to this Next.js origin.
// Everything under /api/backend/* is transparently proxied to the real
// NestJS API, server-to-server, with the full request (including the
// session cookie) forwarded and the full response (including any
// Set-Cookie) relayed back untouched. This keeps auth same-origin from the
// browser's point of view — no CORS, no SameSite=None, no HTTPS-in-dev
// requirement — which is the whole reason this pattern was chosen over
// direct cross-origin calls from the client to NestJS.
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4001";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: `${BACKEND_URL}/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/admin/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow",
          },
        ],
      },
      {
        source: "/pay/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow",
          },
        ],
      },
    ];
  },
};

export default nextConfig;