/* eslint-disable @typescript-eslint/triple-slash-reference -- preload API types */
/// <reference path="./preload.d.ts" />

const input = document.getElementById("input") as HTMLInputElement
const responseBox = document.getElementById("response") as HTMLDivElement
const liveBox = document.getElementById("live") as HTMLDivElement
const micBtn = document.getElementById("mic") as HTMLButtonElement
const sendBtn = document.getElementById("send") as HTMLButtonElement

input.focus()

async function sendMessage() {
  if (!input.value.trim()) return
  const question = input.value
  input.value = ""
  responseBox.innerText = "Thinking..."
  const answer = await window.ai.ask(question)
  responseBox.innerText = answer
}

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage()
  if (e.key === "Escape") window.close()
})

sendBtn.addEventListener("click", sendMessage)

let recorder: MediaRecorder | null = null
let chunks: Blob[] = []
let stream: MediaStream | null = null

async function startRecording() {
  stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  recorder = new MediaRecorder(stream, { mimeType: "audio/webm" })
  chunks = []

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }

  recorder.onstop = async () => {
    stream?.getTracks().forEach((t) => t.stop())
    stream = null
    if (chunks.length === 0) {
      liveBox.innerText = ""
      micBtn.classList.remove("recording")
      return
    }
    liveBox.innerText = "Finalizing…"
    try {
      const blob = new Blob(chunks, { type: "audio/webm" })
      const buffer = await blob.arrayBuffer()
      const full = await window.ai.transcribe(new Uint8Array(buffer))
      input.value = full.trim()
    } catch (err) {
      console.warn("Final transcribe failed:", err)
      liveBox.innerText = "Transcription failed."
    }
    liveBox.innerText = ""
    micBtn.classList.remove("recording")
  }

  recorder.start()
  liveBox.innerText = "Listening…"
  micBtn.classList.add("recording")
}

function stopRecording() {
  if (recorder?.state === "recording") recorder.stop()
}

micBtn.addEventListener("click", () => {
  if (recorder?.state === "recording") {
    stopRecording()
  } else {
    startRecording()
  }
})