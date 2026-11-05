import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const app = express();
app.use(express.json({ limit: "1mb" }));

process.on("uncaughtException", (error) => console.error("[startup] Uncaught exception:", error));
process.on("unhandledRejection", (reason) => console.error("[startup] Unhandled rejection:", reason));

app.get("/", (_req, res) => {
  res.status(200).json({
    name: "All-School Simulation – A Busink Simulation",
    status: "ok",
    message: "MCP-service is actief."
  });
});

app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));

function createMcpServer() {
  const server = new McpServer({
    name: "all-school-simulation",
    version: "0.1.0"
  });

  server.tool(
    "structure_simulation_design",
    "Zet de informatie van een docent om in een overzichtelijk simulatieontwerp en benoem ontbrekende onderdelen. Genereer nog geen Lovable-prompt.",
    {
      subject: z.string().min(1).describe("Schoolvak of vakken"),
      level: z.string().optional().describe("Onderwijsniveau en leerjaar"),
      topic: z.string().optional().describe("Onderwerp van de simulatie"),
      priorKnowledge: z.string().optional().describe("Voorkennis van leerlingen"),
      learningGoals: z.array(z.string()).optional().describe("Leerdoelen"),
      teachingApproach: z.string().optional().describe("Didactische aanpak"),
      concept: z.string().optional().describe("Gekozen simulatieconcept"),
      interactions: z.array(z.string()).optional().describe("Interactieve functies"),
      visualStyle: z.string().optional().describe("Vormgeving en gebruikerservaring"),
      additionalRequirements: z.string().optional().describe("Aanvullende wensen en eisen")
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false
    },
    async (input) => {
      const fields = [
        ["Onderwijsniveau en leerjaar", input.level],
        ["Onderwerp", input.topic],
        ["Voorkennis", input.priorKnowledge],
        ["Leerdoelen", input.learningGoals?.join("; ")],
        ["Didactische aanpak", input.teachingApproach],
        ["Simulatieconcept", input.concept],
        ["Interactieve functies", input.interactions?.join("; ")],
        ["Vormgeving", input.visualStyle],
        ["Aanvullende eisen", input.additionalRequirements]
      ];
      const missing = fields.filter(([, value]) => !value || !String(value).trim()).map(([label]) => label);
      const summary = [
        "# Simulatieontwerp – All-School Simulation",
        "",
        `**Schoolvak:** ${input.subject}`,
        ...fields.map(([label, value]) => `**${label}:** ${value || "Nog niet vastgesteld"}`)
      ].join("\n");
      return {
        content: [{ type: "text", text: JSON.stringify({ summary, missingFields: missing, readyForApproval: missing.length === 0, nextStep: missing.length ? "Vul de ontbrekende onderdelen samen met de docent aan; stel bij voorkeur één vraag per beurt." : "Presenteer de volledige samenvatting en vraag expliciet akkoord." }, null, 2) }]
      };
    }
  );

  server.tool(
    "check_design_readiness",
    "Controleert of de essentiële onderdelen van een simulatieontwerp zijn ingevuld. Dit geeft geen toestemming om al een prompt te genereren.",
    {
      design: z.object({
        subject: z.string().optional(),
        level: z.string().optional(),
        topic: z.string().optional(),
        priorKnowledge: z.string().optional(),
        learningGoals: z.array(z.string()).optional(),
        teachingApproach: z.string().optional(),
        concept: z.string().optional(),
        interactions: z.array(z.string()).optional(),
        visualStyle: z.string().optional(),
        summaryApproved: z.boolean().optional()
      })
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false
    },
    async ({ design }) => {
      const required = {
        subject: "Schoolvak",
        level: "Onderwijsniveau en leerjaar",
        topic: "Onderwerp",
        priorKnowledge: "Voorkennis",
        learningGoals: "Leerdoelen",
        teachingApproach: "Didactische aanpak",
        concept: "Simulatieconcept",
        interactions: "Interactieve functies",
        visualStyle: "Vormgeving"
      };
      const missing = Object.entries(required)
        .filter(([key]) => {
          const value = design[key];
          return Array.isArray(value) ? value.length === 0 : !value || !String(value).trim();
        })
        .map(([, label]) => label);
      const approved = design.summaryApproved === true;
      return {
        content: [{ type: "text", text: JSON.stringify({
          ready: missing.length === 0,
          missingFields: missing,
          explicitApprovalReceived: approved,
          canGeneratePrompt: missing.length === 0 && approved,
          instruction: missing.length ? "Werk de ontbrekende onderdelen eerst uit." : approved ? "Het ontwerp is compleet en expliciet goedgekeurd." : "Vraag de docent expliciet of het volledige ontwerp klopt voordat je de definitieve prompt maakt."
        }, null, 2) }]
      };
    }
  );

  server.tool(
    "generate_lovable_prompt",
    "Genereert een zelfstandige Lovable-prompt voor een educatieve simulatie. Alleen uitvoeren wanneer de docent het complete ontwerp expliciet heeft goedgekeurd.",
    {
      design: z.object({
        subject: z.string().min(1),
        level: z.string().min(1),
        topic: z.string().min(1),
        priorKnowledge: z.string(),
        learningGoals: z.array(z.string()).min(1),
        misconceptions: z.string().optional(),
        teachingApproach: z.string().min(1),
        concept: z.string().min(1),
        interactions: z.array(z.string()).min(1),
        studentExperience: z.string().optional(),
        teacherFeatures: z.string().optional(),
        visualStyle: z.string().min(1),
        technicalRequirements: z.string().optional(),
        additionalRequirements: z.string().optional()
      }),
      explicitApproval: z.boolean().describe("Moet true zijn: expliciet akkoord van de docent op de volledige ontwerpsamenvatting.")
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false
    },
    async ({ design, explicitApproval }) => {
      if (!explicitApproval) {
        return {
          isError: true,
          content: [{ type: "text", text: "Prompt niet gegenereerd. Presenteer eerst de volledige ontwerpsamenvatting en vraag expliciet akkoord aan de docent." }]
        };
      }
      const prompt = `Bouw een complete, professionele en responsieve educatieve simulatie.

## Applicatie en doelgroep
Schoolvak: ${design.subject}
Niveau en leerjaar: ${design.level}
Onderwerp: ${design.topic}

## Didactisch ontwerp
Voorkennis: ${design.priorKnowledge}
Leerdoelen:
${design.learningGoals.map(x => "- " + x).join("\n")}
Misconcepties om rekening mee te houden: ${design.misconceptions || "Nog niet gespecificeerd"}
Didactische aanpak: ${design.teachingApproach}
Simulatieconcept: ${design.concept}

## Functionaliteiten en gebruikerservaring
Interactieve functies:
${design.interactions.map(x => "- " + x).join("\n")}
Leerlingervaring: ${design.studentExperience || "Ontwerp een duidelijke, intuïtieve leerlingervaring passend bij het niveau."}
Docentfunctionaliteiten: ${design.teacherFeatures || "Geen aanvullende docentfuncties opgegeven."}

## Vormgeving
${design.visualStyle}

## Technische eisen
${design.technicalRequirements || "Kies een passende, onderhoudbare architectuur. Maak de applicatie responsief en toegankelijk."}

## Aanvullende eisen
${design.additionalRequirements || "Geen aanvullende eisen opgegeven."}

## Kwaliteitscontrole
Controleer alle interacties, vakinhoudelijke consistentie, begrijpelijkheid voor de doelgroep, foutafhandeling en werking op laptop, tablet en digibord. Verzin geen onbevestigde vakinhoudelijke feiten. Maak alle beschreven onderdelen daadwerkelijk functioneel en lever een korte testchecklist.`;
      return { content: [{ type: "text", text: prompt }] };
    }
  );

  return server;
}

app.post("/mcp", async (req, res) => {
  const mcpServer = createMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined
  });
  try {
    await mcpServer.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("[mcp] Request failed:", error);
    if (!res.headersSent) res.status(500).json({ error: "Internal server error" });
  }
});

app.all("/mcp", (req, res) => {
  res.status(405).set("Allow", "POST").send("Method not allowed");
});

const port = Number(process.env.PORT || 3000);
const httpServer = app.listen(port, "0.0.0.0", () => {
  console.log("[startup] All-School Simulation MCP server listening on 0.0.0.0:" + port);
});
httpServer.on("error", (error) => {
  console.error("[startup] HTTP server error:", error);
  process.exitCode = 1;
});
