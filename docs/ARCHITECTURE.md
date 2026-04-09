# Architecture summary

One **unified web application** ingests time entries (Clockify **API** and/or **CSV export**), joins **attendance** and **company calendar** (holidays, hackathons), runs a **deterministic rules engine** plus **anomaly detectors**, and serves a **Book-style** month grid with drill-down and optional **xlsx** export.

- **Time source**: Clockify remains authoritative for logging until a later phase; optional future **native** entry and **Clockify cutover**.
- **Data**: Single normalized schema for entries; **idempotent** sync/import.
- **AI**: Optional for explanations or fuzzy text; not the primary compliance gate.

See diagrams and full narrative in the Cursor plan file referenced from [README.md](README.md).
