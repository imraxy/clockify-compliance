# Product context

## Problem

Managers manually reconcile **Clockify** hours with **attendance** and mark each employee/day in **Book** (Approved, Not Filled, Half Filled, Leave, Hackathon, W/O, Holiday, etc.). Irregularities (overlaps, long days, duplicates, weekend work) are manual.

## Target experience

- **Web dashboard**: month grid per employee, filters, drill-down to daily entries, reviewer actions and audit trail.
- **Automation**: rules engine applies thresholds (≥8h Approved, &lt;6h Half Filled, none Not Filled—**6–8h TBD**), attendance overrides, holiday/hackathon config.
- **Alerts**: optional email/Slack digests for managers.

## Phased Clockify relationship

0. Bootstrap: import/API → compliance in our tool.  
1. Steady: sync + dashboard.  
2. Optional native logging when feature parity reached.  
3. Cutover off Clockify + historical export retained.

## Phase 2

Jira estimates vs actual Clockify (or internal) time; variance reports; optional ticket ID tagging.
