import { ipcMain } from "electron"

// Short-term conversation memory (OpenAI messages format)
const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = []

const OPENAI_URL = "https://api.openai.com/v1/chat/completions"
const MODEL = "gpt-4o-mini"

function getApiKey(): string | undefined {
  return process.env.OPENAI_API_KEY
}

export function openaiHandler(): void {
  ipcMain.handle("ask-ai", async (_, userInput: string) => {
    try {
      const apiKey = getApiKey()
      if (!apiKey) {
        return "❌ Set OPENAI_API_KEY in your environment to use OpenAI."
      }

      messages.push({ role: "user", content: userInput })

      const body = {
        model: MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are my personal desktop AI assistant. Be concise, practical, and helpful.",
          },
          ...messages,
        ],
      }

      const res = await fetch(OPENAI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      })

      const data = (await res.json()) as {
        error?: { message?: string }
        choices?: Array<{ message?: { content?: string } }>
      }

      if (!res.ok) {
        const errMsg = data.error?.message ?? res.statusText
        messages.pop()
        return `❌ OpenAI error: ${errMsg}`
      }

      const content = data.choices?.[0]?.message?.content?.trim()
      if (!content) {
        messages.pop()
        return "❌ No response from OpenAI."
      }

      messages.push({ role: "assistant", content })
      return content
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (messages[messages.length - 1]?.role === "user") messages.pop()
      return `❌ Failed to reach OpenAI. ${msg}`
    }
  })
}
