import { ipcMain, app } from "electron";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { spawn } from "child_process";
import pathToFfmpeg from "ffmpeg-static";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function webmToWav(webmPath: string, wavPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = pathToFfmpeg;
    if (!ffmpeg) {
      reject(new Error("ffmpeg-static not found"));
      return;
    }
    const proc = spawn(ffmpeg, [
      "-y",
      "-i", webmPath,
      "-acodec", "pcm_s16le",
      "-ar", "16000",
      "-ac", "1",
      wavPath,
    ], { stdio: "ignore" });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
  });
}

async function transcribeBuffer(audio: Buffer): Promise<string> {
  const id = randomUUID();
  const tempDir = app.getPath("temp");
  const webmPath = path.join(tempDir, `whisper-${id}.webm`);
  const wavPath = path.join(tempDir, `whisper-${id}.wav`);
  fs.writeFileSync(webmPath, audio);
  try {
    try {
      await webmToWav(webmPath, wavPath);
    } catch {
      // Use WebM if ffmpeg fails or is missing
    }
    const filePath = fs.existsSync(wavPath) ? wavPath : webmPath;
    const result = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "gpt-4o-transcribe",
      language: "en",
    });
    return result.text ?? "";
  } finally {
    for (const p of [webmPath, wavPath]) {
      try {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      } catch {
        // ignore
      }
    }
  }
}

ipcMain.handle("whisper-transcribe", async (_, audio: Uint8Array) => {
  return transcribeBuffer(Buffer.from(audio));
});