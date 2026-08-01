import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: "10mb" }));

  async function readProviderJson(response: Response, providerName: string) {
    const body = await response.text();
    if (!body.trim()) {
      throw new Error(`${providerName} returned an empty response (HTTP ${response.status}).`);
    }
    try {
      return JSON.parse(body);
    } catch {
      throw new Error(`${providerName} returned an invalid response (HTTP ${response.status}).`);
    }
  }

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

  // ERP-aware AI chat supporting mainstream and OpenAI-compatible custom APIs.
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { provider, apiKey, model, baseUrl, systemPrompt, messages, context } = req.body;
      // DeepSeek is configured once on the server, never exposed to the browser
      // or committed with the application source.
      const resolvedApiKey = apiKey || (provider === "deepseek" ? process.env.DEEPSEEK_API_KEY : undefined);
      if (!resolvedApiKey) return res.status(400).json({ success: false, error: "AI API key is not configured on the server." });

      const instruction = `${systemPrompt || "You are a professional repair-shop operations copilot."}
Use only the supplied live ERP context. If data is unavailable, say so rather than inventing it. Reply in the same language as the user's question (Burmese when the user writes Burmese). Be concise, operational, and direct: lead with the conclusion, then give prioritized next actions. Identify records by ticket, part, device, customer, or technician where possible. Use short bullets only when they improve scanability. Do not claim to have completed changes, contacted a customer, or performed an action.

LIVE ERP CONTEXT:
${JSON.stringify(context)}`;

      let answer = "";

      if (provider === "anthropic") {
        const response = await fetch(`${baseUrl || "https://api.anthropic.com"}/v1/messages`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": resolvedApiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: model || "claude-3-5-haiku-latest",
            max_tokens: 900,
            system: instruction,
            messages,
          }),
        });
        const data: any = await readProviderJson(response, "Anthropic");
        if (!response.ok) throw new Error(data?.error?.message || "Anthropic request failed.");
        answer = data.content?.map((item: any) => item.text || "").join("\n") || "";
      } else if (provider === "gemini") {
        const selectedModel = model || "gemini-2.0-flash";
        const response = await fetch(
          `${baseUrl || "https://generativelanguage.googleapis.com/v1beta"}/models/${selectedModel}:generateContent?key=${encodeURIComponent(resolvedApiKey)}`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: instruction }] },
              contents: messages.map((message: any) => ({
                role: message.role === "assistant" ? "model" : "user",
                parts: [{ text: message.content }],
              })),
            }),
          }
        );
        const data: any = await readProviderJson(response, "Gemini");
        if (!response.ok) throw new Error(data?.error?.message || "Gemini request failed.");
        answer = data.candidates?.[0]?.content?.parts?.map((part: any) => part.text || "").join("\n") || "";
      } else {
        const providerBase =
          baseUrl ||
          (provider === "groq"
            ? "https://api.groq.com/openai/v1"
            : provider === "deepseek"
              ? "https://api.deepseek.com"
            : provider === "openrouter"
              ? "https://openrouter.ai/api/v1"
              : "https://api.openai.com/v1");
        const defaultModel =
          provider === "groq"
            ? "llama-3.1-8b-instant"
            : provider === "deepseek"
              ? "deepseek-chat"
            : provider === "openrouter"
              ? "openai/gpt-4o-mini"
              : "gpt-4o-mini";
        const response = await fetch(`${providerBase.replace(/\/$/, "")}/chat/completions`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${resolvedApiKey}`,
          },
          body: JSON.stringify({
            model: model || defaultModel,
            temperature: 0.2,
            messages: [{ role: "system", content: instruction }, ...messages],
          }),
        });
        const data: any = await readProviderJson(response, provider === "deepseek" ? "DeepSeek" : "AI provider");
        if (!response.ok) throw new Error(data?.error?.message || "AI provider request failed.");
        answer = data.choices?.[0]?.message?.content || "";
      }

      res.json({ success: true, answer });
    } catch (err: any) {
      console.error("ERP AI chat error:", err);
      res.status(500).json({ success: false, error: err.message || "AI assistant request failed." });
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
