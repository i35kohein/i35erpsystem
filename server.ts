import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // Helper function to get Gemini instance safely
  function getGeminiClient() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured in environment secrets.");
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }

  // --- API Routes ---

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "Apple Repair ERP API", timestamp: new Date().toISOString() });
  });

  // AI Repair Diagnostics & Panic Log Analyzer
  app.post("/api/gemini/diagnose", async (req, res) => {
    try {
      const { deviceModel, symptoms, panicLog, errorCodes } = req.body;
      const ai = getGeminiClient();

      const prompt = `You are an expert Apple Certified Mac & iOS Repair Master Technician specializing in hardware diagnostics, micro-soldering, and board repair.
Analyze the following repair diagnostic request:
- Device Model: ${deviceModel || "Apple Device"}
- Reported Symptoms / Notes: ${symptoms || "None provided"}
- Panic Log / Error Code: ${panicLog || errorCodes || "None provided"}

Provide a structured, highly actionable diagnostic breakdown formatted as clear JSON with the following keys:
1. "suspectedIssues": array of strings listing likely hardware/chip/component failures (e.g., "Tristar USB IC U2 failure", "I2C0 Bus Pull-Up Resistor R4010 open circuit", "Battery Data Line BSI short").
2. "diodeTestPoints": array of strings detailing specific multimeter diode mode test points or rails to measure (e.g., "PP_VCC_MAIN: Expect ~0.380V - 0.420V in Diode mode", "I2C_SCL_AP line to ground").
3. "recommendedAction": concise step-by-step repair strategy for the technician.
4. "requiredPartsOrTools": array of tools or parts needed (e.g., "MIG/TIG Soldering Station", "HYDRA IC", "0201 Jumper Wire", "Hot Air Rework Station").
5. "estimatedDifficulty": "Level 1 Modular" | "Level 2 Advanced Component" | "Level 3 Micro-Soldering".
6. "clientExplanation": clear, professional 2-sentence explanation suitable for the customer.

Return ONLY valid JSON.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const textResult = response.text || "{}";
      const parsed = JSON.parse(textResult);
      res.json({ success: true, diagnosis: parsed });
    } catch (err: any) {
      console.error("Gemini diagnose error:", err);
      res.status(500).json({ success: false, error: err.message || "Failed to generate AI diagnostic analysis" });
    }
  });

  // AI IMEI / Serial Specs Auto-Lookup


  // AI Draft Customer Notification
  app.post("/api/gemini/draft-message", async (req, res) => {
    try {
      const { customerName, deviceName, status, totalCost, notes, channel } = req.body;
      const ai = getGeminiClient();

      const prompt = `Draft a polite, highly professional ${channel || "SMS"} message for an Apple Repair Shop to send to customer "${customerName}".
Details:
- Device: ${deviceName}
- Status: ${status}
- Total Quote/Cost: ${totalCost ? `$${totalCost}` : "N/A"}
- Repair Notes: ${notes || "No special notes"}

Keep SMS under 160 characters if channel is SMS, or concise paragraph if Email. Include call to action (e.g. reply to approve, or drop by for pickup).
Return JSON with key "message".`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json({ success: true, message: parsed.message });
    } catch (err: any) {
      console.error("Gemini draft message error:", err);
      res.status(500).json({ success: false, error: err.message || "Failed to draft notification" });
    }
  });

  // --- Vite Middleware or Static Production Serving ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Apple Repair ERP server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
