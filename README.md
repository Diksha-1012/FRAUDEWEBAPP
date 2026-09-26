# TRACE — AI-Powered Fraud Incident Evidence Organizer

> "From scattered evidence to one traceable incident."

After an online scam, evidence is scattered across chats, screenshots, payment alerts, bank
records, emails, URLs, phone numbers, and call logs — often in different formats across many
files, making it hard to reconstruct what happened. TRACE combines, checks, interprets,
organizes, traces, and reports all of it into one chronological, privacy-conscious incident
record. This tool only organizes and flags evidence; it never judges guilt or declares fraud.

Hackathon prototype — premium dark investigation workspace. No backend, no build step.

## Run it

Two options:

**Option A — open directly**

Open `index.html` in any modern browser (double-click works; `file://` is supported).

**Option B — local server (recommended for demo)**

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

> The page pulls Tailwind CSS and Google Fonts from CDNs, so the demo machine needs
> internet access. All application data is local mock data — nothing leaves the browser.

## Demo flow (2 minutes)

1. Landing → **START INVESTIGATION**
2. Auth: enter any 10-digit phone number → **demo OTP `123456`** (clearly labeled prototype)
3. Open case **TRC-2026-091** (or create your own)
4. **Import Evidence** → add files / paste text / **RUN PIPELINE** (staged animation with real counts)
5. **Schema Mapping** → Accept/Edit/Ignore the auto-detected field mappings
6. **Overview** → metrics are computed live from the evidence; click any metric for source traceability
7. **Timeline** → click the ₹5,000 transaction event to expand it and highlight related evidence
8. **Evidence Graph** → click nodes to highlight neighborhoods
9. **Flags** → the ₹5,000 vs ₹7,000 potential inconsistency (requires investigator review)
10. **Missing Data / Duplicates / Privacy / Assumptions / Ask Trace / Report**
11. **Report** → **EXPORT PDF** (print stylesheet) and **EXPORT CSV** (redacted download)

## Project layout

```
index.html      # shell: fonts, Tailwind CDN, #app / #drawer-root / #toast-root, boot guard
styles.css      # full design system (tokens, components, animations, print stylesheet, responsive)
js/data.js      # window.TRACE_DATA — 50 synthetic evidence records + contradictions,
                #   duplicates, missing fields, schema mappings, assumptions, unresolved issues
js/app.js       # the whole SPA: hash router, state, redaction engine, 17 views,
                #   evidence drawer, global search, ASK TRACE assistant, CSV/PDF export
```

## Notes

- **All data is fictional and synthetic** (`.example` domains, invented providers). No real PII,
  no real brands.
- **TRACE never judges**: it flags "potential inconsistency" / "requires investigator review" /
  "unverified" — a human makes the final call.
- Privacy toggles (phones, emails, transaction IDs, UPI, accounts, URLs) are ON by default;
  free-text descriptions, labels, notes, and source strings are pattern-masked too.
- `API` in `js/app.js` is an async seam wrapping local state, ready to be pointed at a real
  backend later.
