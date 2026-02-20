import { ipcMain } from "electron"
import { captureScreenBase64 } from "./screenshot"

const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = []

const OPENAI_URL = "https://api.openai.com/v1/chat/completions"
const MODEL = "gpt-4o-mini"

function getApiKey(): string | undefined {
  return process.env.OPENAI_API_KEY
}

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }

type ApiMessage = Record<string, unknown>

interface ToolCall {
  id: string
  type: "function"
  function: { name: string; arguments: string }
}

interface OpenAIChoice {
  message?: {
    content?: string | null
    tool_calls?: ToolCall[]
  }
}

interface OpenAIResponse {
  choices?: OpenAIChoice[]
  error?: { message?: string }
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "capture_screen",
      description:
        "Captures a screenshot of the user's screen. Call this whenever the user asks about " +
        "anything visible on their screen, open windows, chats, messages, or anything visual.",
      parameters: { type: "object", properties: {}, required: [] as string[] },
    },
  },
]

const SYSTEM_PROMPT =
  "You are a personal desktop AI assistant. Be concise and practical. " +
  "If the user's question requires seeing their screen, call the capture_screen tool. " +
  "When you receive a screenshot, read visible text carefully and use it to answer. " +
  "If some text is too small or unclear, say so and give what you can read."

export function openaiHandler(): void {
  ipcMain.handle("ask-ai", async (_, userInput: string) => {
    try {
      const apiKey = getApiKey()
      if (!apiKey) return "❌ Set OPENAI_API_KEY in your environment to use OpenAI."

      messages.push({ role: "user", content: userInput })

      const apiMessages: ApiMessage[] = [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ]

      // First pass — let the model decide if it needs a screenshot
      const firstRes = await callOpenAI(apiKey, apiMessages, TOOLS)
      if (typeof firstRes === "string") {
        messages.pop()
        return firstRes
      }

      const firstChoice = firstRes.choices?.[0]
      const toolCalls = firstChoice?.message?.tool_calls
      const wantsScreen = toolCalls?.some((tc) => tc.function.name === "capture_screen")

      if (wantsScreen && toolCalls) {
        const screenshotBase64 = await captureScreenBase64()

        // Echo back the assistant message WITH tool_calls intact
        const assistantMsg: ApiMessage = {
          role: "assistant",
          content: firstChoice?.message?.content ?? null,
          tool_calls: toolCalls,
        }

        // Tool result must be plain text
        const toolResultMsg: ApiMessage = {
          role: "tool",
          tool_call_id: toolCalls[0].id,
          content: "Screenshot captured successfully.",
        }

        // Image goes in a user message so vision can process it
        const imageUserMsg: ApiMessage = {
          role: "user",
          content: [
            { type: "text", text: "Here is my screen:" },
            { type: "image_url", image_url: { url: `data:image/png;base64,${screenshotBase64}` } },
          ] as ContentPart[],
        }

        const secondRes = await callOpenAI(apiKey, [
          ...apiMessages,
          assistantMsg,
          toolResultMsg,
          imageUserMsg,
        ])

        if (typeof secondRes === "string") {
          messages.pop()
          return secondRes
        }

        const content = secondRes.choices?.[0]?.message?.content?.trim()
        if (!content) {
          messages.pop()
          return "❌ No response from OpenAI."
        }

        messages.push({ role: "assistant", content })
        return content
      }

      // No tool call — use first response directly
      const content = firstChoice?.message?.content?.trim()
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

async function callOpenAI(
  apiKey: string,
  messages: ApiMessage[],
  tools?: typeof TOOLS
): Promise<OpenAIResponse | string> {
  const body: Record<string, unknown> = { model: MODEL, messages }
  if (tools) body.tools = tools

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  const data = (await res.json()) as OpenAIResponse
  if (!res.ok) {
    return `❌ OpenAI error: ${data.error?.message ?? res.statusText}`
  }

  return data
}