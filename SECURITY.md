# Security Policy

Konfirm handles real fund custody paths — if you find a security issue, please report it privately rather than opening a public issue.

## Reporting

Use GitHub's private vulnerability reporting (Security tab → Report a vulnerability) on the relevant repo, or email the maintainers directly if you have their contact.

## Scope

- Key handling (facilitator, deployer, fee-account) — see konfirm-backend/docs/KEYS.md
- Authorization in the Soroban contracts (compliance, payment, treasury, channel)
- Authentication and session handling (merchant and admin)
- Payment verdict / reconciliation correctness

## Out of scope

- Theoretical attacks with no practical impact
- Issues already publicly known or previously reported

## Response

We aim to acknowledge reports within 5 business days. This is a small, actively-developed project — response times may vary.
