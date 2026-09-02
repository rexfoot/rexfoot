import { readFile } from "node:fs/promises";
import path from "node:path";

export const alt = "RexFoot";
export const size = { width: 1200, height: 630 };
export const contentType = "image/jpeg";

export default async function OpengraphImage() {
    const filePath = path.join(process.cwd(), "public", "opengraph-image.jpg");
    const data = await readFile(filePath);
    return new Response(new Uint8Array(data), {
          headers: { "Content-Type": "image/jpeg" },
    });
}
