export {}

declare global {
  interface Window {
    ai: {
      ask: (prompt: string) => Promise<string>
    }
  }
}
