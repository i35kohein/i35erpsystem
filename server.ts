import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { randomBytes } from "crypto";

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


  // Simple email/password auth — credentials from .env
  // POST /api/auth/login { email, password } -> { user } | 401
  const SESSION_TOKENS = new Set<string>();
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body || {};
    const authEmail = (process.env.AUTH_EMAIL || "").trim().toLowerCase();
    const authPass = process.env.AUTH_PASSWORD || "";
    if (!authEmail || !authPass) {
      res.status(503).json({ success: false, error: "Auth not configured on server" });
      return;
    }
    if (String(email || "").trim().toLowerCase() === authEmail && password === authPass) {
      const token = randomBytes(24).toString("hex");
      SESSION_TOKENS.add(token);
      res.json({ success: true, token, user: { email: authEmail, name: "Ko Hein" } });
    } else {
      res.status(401).json({ success: false, error: "Invalid email or password" });
    }
  });
  app.post("/api/auth/logout", (req, res) => {
    const token = (req.headers["x-session-token"] as string) || "";
    SESSION_TOKENS.delete(token);
    res.json({ success: true });
  });
  app.post("/api/auth/verify", (req, res) => {
    const token = (req.headers["x-session-token"] as string) || "";
    if (SESSION_TOKENS.has(token)) { res.json({ success: true }); }
    else { res.status(401).json({ success: false }); }
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
Use only the supplied live ERP context. If data is unavailable, say so rather than inventing it. ALWAYS reply in Myanmar (Burmese) language, regardless of the language the user writes in — keep technical terms (device models, part names, ticket numbers, prices) in English where natural. Be concise, operational, and direct: lead with the conclusion, then give prioritized next actions. Identify records by ticket, part, device, customer, or technician where possible. Use short bullets only when they improve scanability. Do not claim to have completed changes, contacted a customer, or performed an action.

LIVE ERP CONTEXT:
${JSON.stringify(context)}`;

      let answer = "";
      try {
        answer = await callAiProvider({ provider, apiKey: resolvedApiKey, model, baseUrl, systemPrompt: instruction, messages });
      } catch (err: any) {
        throw new Error(err.message || "AI provider request failed.");
      }

      res.json({ success: true, answer });
    } catch (err: any) {
      console.error("ERP AI chat error:", err);
      res.status(500).json({ success: false, error: err.message || "AI assistant request failed." });
    }
  });

  // --- Shared AI provider call (used by /api/ai/chat and the Telegram bot) ---
  async function callAiProvider(opts: {
    provider: string;
    apiKey: string;
    model?: string;
    baseUrl?: string;
    systemPrompt: string;
    messages: { role: string; content: string }[];
  }): Promise<string> {
    const { provider, apiKey, model, baseUrl, systemPrompt, messages } = opts;
    if (provider === "anthropic") {
      const response = await fetch(`${baseUrl || "https://api.anthropic.com"}/v1/messages`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: model || "claude-3-5-haiku-latest",
          max_tokens: 900,
          system: systemPrompt,
          messages,
        }),
      });
      const data: any = await readProviderJson(response, "Anthropic");
      if (!response.ok) throw new Error(data?.error?.message || "Anthropic request failed.");
      return data.content?.map((item: any) => item.text || "").join("\n") || "";
    }
    if (provider === "gemini") {
      const selectedModel = model || "gemini-2.0-flash";
      const response = await fetch(
        `${baseUrl || "https://generativelanguage.googleapis.com/v1beta"}/models/${selectedModel}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: messages.map((message: any) => ({
              role: message.role === "assistant" ? "model" : "user",
              parts: [{ text: message.content }],
            })),
          }),
        }
      );
      const data: any = await readProviderJson(response, "Gemini");
      if (!response.ok) throw new Error(data?.error?.message || "Gemini request failed.");
      return data.candidates?.[0]?.content?.parts?.map((part: any) => part.text || "").join("\n") || "";
    }
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
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || defaultModel,
        temperature: 0.2,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
      }),
    });
    const data: any = await readProviderJson(response, provider === "deepseek" ? "DeepSeek" : "AI provider");
    if (!response.ok) throw new Error(data?.error?.message || "AI provider request failed.");
    return data.choices?.[0]?.message?.content || "";
  }

  // --- Telegram bot: chat with the ERP copilot from anywhere ---
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
  const TELEGRAM_ALLOWED_CHAT_IDS = new Set(
    (process.env.TELEGRAM_ALLOWED_CHAT_IDS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
  if (TELEGRAM_BOT_TOKEN) {
    const historyFile = path.join(process.cwd(), "ai-chat-history.json");
    const tgHistory: Record<string, { role: string; content: string }[]> = (() => {
      try {
        return JSON.parse(fs.readFileSync(historyFile, "utf8"));
      } catch {
        return {};
      }
    })();
    const saveTgHistory = () => {
      try {
        fs.writeFileSync(historyFile, JSON.stringify(tgHistory));
      } catch (err) {
        console.error("Telegram history save failed:", err);
      }
    };
    const tgCall = async (method: string, body: Record<string, unknown>) => {
      const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      return res.json();
    };
    const TELEGRAM_SYSTEM_PROMPT =
      "You are the i35 Apple Service shop copilot (ERP AI assistant). ALWAYS reply in Myanmar (Burmese) language, regardless of the language the user writes in — keep technical terms in English where natural. Be concise, operational, and direct: lead with the conclusion, then give prioritized next actions. If you lack ERP live data, say so rather than inventing it. Do not claim to have completed actions.";
    const telegramAiAnswer = async (chatId: string, text: string): Promise<string> => {
      const provider = process.env.DEEPSEEK_API_KEY ? "deepseek" : process.env.GEMINI_API_KEY ? "gemini" : "";
      if (!provider) {
        return "AI ကို configure မလုပ်ရသေးပါ — server မှာ GEMINI_API_KEY သို့မဟုတ် DEEPSEEK_API_KEY ထည့်ပေးပါ။";
      }
      const key = provider === "deepseek" ? process.env.DEEPSEEK_API_KEY! : process.env.GEMINI_API_KEY!;
      const history = tgHistory[chatId] || [];
      const messages = [...history.slice(-20), { role: "user", content: text }];
      try {
        return await callAiProvider({ provider, apiKey: key, systemPrompt: TELEGRAM_SYSTEM_PROMPT, messages });
      } catch (err: any) {
        console.error("Telegram AI error:", err);
        return "AI ခေါ်တဲ့အခါ အမှားဖြစ်သွားပါတယ် — နောက်တစ်ခါ ပြန်စမ်းကြည့်ပါ။";
      }
    };
    let tgOffset = 0;
    const pollTelegram = async () => {
      try {
        const updates: any = await tgCall("getUpdates", {
          offset: tgOffset,
          timeout: 25,
          allowed_updates: ["message"],
        });
        for (const update of updates?.result || []) {
          tgOffset = Math.max(tgOffset, update.update_id + 1);
          const msg = update.message;
          if (!msg || !msg.text) continue;
          const chatId = String(msg.chat.id);
          if (TELEGRAM_ALLOWED_CHAT_IDS.size && !TELEGRAM_ALLOWED_CHAT_IDS.has(chatId)) continue;
          const text = String(msg.text).trim();
          if (text === "/start" || text === "/help") {
            await tgCall("sendMessage", {
              chat_id: chatId,
              text: "🤖 i35 ERP Copilot\n\nမင်္ဂလာပါ! ဒီ bot ကနေ ERP ရဲ့ AI assistant ကို စကားပြောလို့ရပါတယ်။\n\nCommands:\n/start — စတင်မည်\n/clear — စကားပြောမှတ်တမ်း ရှင်းမည်\n/help — အကူအညီ\n\nဘာမေးမယ်ဆို ရိုက်ထည့်လိုက်ပါ — မြန်မာလိုပဲ ဖြေပေးပါမယ်။",
            });
            continue;
          }
          if (text === "/clear") {
            tgHistory[chatId] = [];
            saveTgHistory();
            await tgCall("sendMessage", { chat_id: chatId, text: "စကားပြောမှတ်တမ်း ရှင်းပြီးပါပြီ ✅" });
            continue;
          }
          await tgCall("sendChatAction", { chat_id: chatId, action: "typing" });
          const answer = await telegramAiAnswer(chatId, text);
          tgHistory[chatId] = [...(tgHistory[chatId] || []), { role: "user", content: text }, { role: "assistant", content: answer }].slice(-30);
          saveTgHistory();
          await tgCall("sendMessage", { chat_id: chatId, text: answer });
        }
      } catch (err) {
        console.error("Telegram poll error:", err);
      }
      setTimeout(pollTelegram, 1000);
    };
    pollTelegram();
    console.log("Telegram bot started (long-polling).");
  } else {
    console.log("Telegram bot disabled — set TELEGRAM_BOT_TOKEN to enable.");
  }

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
