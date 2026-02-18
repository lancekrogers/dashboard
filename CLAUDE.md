# dashboard

Observer dashboard — festival progress, agent activity, HCS message feed,
DeFi P&L, 0G inference metrics. Read-only, consumes daemon events via hub WebSocket.

## Build

```bash
just install  # Install dependencies
just dev      # Development server
just build    # Production build
```

## Structure

- `src/app/` — Next.js app router pages
- `src/components/` — React components organized by data source
- `src/lib/` — Client libraries (daemon gRPC, hedera mirror node)

## Development

- Dashboard is read-only — it observes, never acts
- All data comes from daemon events via hub WebSocket or direct gRPC
- Components are organized by data source (festival, HCS, agent, DeFi, inference)
