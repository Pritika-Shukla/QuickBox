import { desktopCapturer } from "electron"


export async function captureScreenBase64(): Promise<string | null> {
  try {
    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width: 2560, height: 1440 },
    })
    const primary = sources[0]
    if (!primary?.thumbnail) return null
    const img = primary.thumbnail
    if (img.isEmpty?.()) return null
    const png = img.toPNG()
    return png.toString("base64")
  } catch {
    return null
  }
}
