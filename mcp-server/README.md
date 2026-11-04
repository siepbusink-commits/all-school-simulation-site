# All-School Simulation – MCP-server

Dit is een eerste technische server voor **All-School Simulation – A Busink Simulation**.

## Lokaal starten
Vereist Node.js 20 of hoger.

```bash
npm install
npm start
```

De statuspagina is beschikbaar op `/` en `/health`. De MCP-endpoint is `/mcp`.

## Deploy op Render
- Service type: Web Service
- Runtime: Node
- Root Directory: `mcp-server` (omdat deze map in de bestaande website-repository staat)
- Build Command: `npm install`
- Start Command: `npm start`
- Instance type: Free voor de eerste test

Render moet de service beschikbaar maken via de ingestelde `PORT`; de server bindt aan `0.0.0.0`.

## Beschikbare MCP-tools
- `structure_simulation_design`
- `check_design_readiness`
- `generate_lovable_prompt`

De definitieve Lovable-prompt wordt alleen gegenereerd als `explicitApproval=true`.

## Belangrijk
Dit is de eerste serverlaag, nog geen volledige ChatGPT Apps SDK-app met interactieve UI. Voor publicatie of gebruik als ChatGPT-app zijn aanvullende Apps SDK-integratie, testen en beoordeling nodig.
