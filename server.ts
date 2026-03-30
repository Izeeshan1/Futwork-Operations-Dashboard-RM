import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // In-memory data store for the dashboard
  let metricsData = [
    {
      id: "1",
      date: "2026-03-25",
      leadsInflow: 1200,
      activeCallers: 15,
      minutesSpoken: 4500,
      timePerCaller: 300,
      uniqueLeadsDialed: 800,
      connectedLeads: 450,
      speakerDeliveryConfirmed: 380,
      processCompleted: 40,
      cancelSpeakerDelivery: 30,
      winningOutcome: 350,
      connectivityPercent: 56.25,
      speakerAlreadyDelivered: 10
    },
    {
      id: "2",
      date: "2026-03-26",
      leadsInflow: 1350,
      activeCallers: 18,
      minutesSpoken: 5200,
      timePerCaller: 288,
      uniqueLeadsDialed: 950,
      connectedLeads: 520,
      speakerDeliveryConfirmed: 440,
      processCompleted: 45,
      cancelSpeakerDelivery: 35,
      winningOutcome: 410,
      connectivityPercent: 54.73,
      speakerAlreadyDelivered: 12
    },
    {
      id: "3",
      date: "2026-03-27",
      leadsInflow: 1100,
      activeCallers: 14,
      minutesSpoken: 4100,
      timePerCaller: 292,
      uniqueLeadsDialed: 750,
      connectedLeads: 410,
      speakerDeliveryConfirmed: 350,
      processCompleted: 35,
      cancelSpeakerDelivery: 25,
      winningOutcome: 320,
      connectivityPercent: 54.66,
      speakerAlreadyDelivered: 8
    }
  ];

  // API Routes
  app.get("/api/metrics", (req, res) => {
    res.json(metricsData);
  });

  app.post("/api/metrics", (req, res) => {
    const newMetric = {
      id: Date.now().toString(),
      ...req.body
    };
    metricsData.push(newMetric);
    res.status(201).json(newMetric);
  });

  app.post("/api/metrics/bulk", (req, res) => {
    const newEntries = req.body.map((entry: any) => ({
      id: (Date.now() + Math.random()).toString(),
      ...entry
    }));
    metricsData = [...metricsData, ...newEntries];
    res.status(201).json(newEntries);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
