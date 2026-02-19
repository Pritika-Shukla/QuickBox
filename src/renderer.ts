/* eslint-disable @typescript-eslint/triple-slash-reference -- preload API types */
/// <reference path="./preload.d.ts" />

const input = document.getElementById("input") as HTMLInputElement
const responseBox = document.getElementById("response") as HTMLDivElement

input.focus()

input.addEventListener("keydown", async (e) => {
  if (e.key === "Enter" && input.value.trim()) {
    const question = input.value
    input.value = ""
    responseBox.innerText = "Thinking..."

    const answer = await window.ai.ask(question)
    responseBox.innerText = answer
  }

  if (e.key === "Escape") {
    window.close()
  }
})
