# Scalability & Reliability

## Load Testing
- Use Artillery: `npx artillery quick --count 10 -n 50 http://localhost:4000/api/v1/portfolio`

## High Availability
- Deploy multi-region, use cloud failover.

## Backups & Disaster Recovery
- Automate DB backups, store offsite.
- Document recovery procedures.
