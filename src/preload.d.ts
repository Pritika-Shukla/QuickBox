export {}

declare global {
  interface Window {
    ai: {
      ask: (prompt: string) => Promise<string>
      transcribe: (audio: Uint8Array) => Promise<string>
    }
  }
}
