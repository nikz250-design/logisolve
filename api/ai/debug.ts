import type { VercelRequest, VercelResponse } from "@vercel/node";
import https from "https";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const apiKey = (process.env.ANTHROPIC_API_KEY ?? "").trim();

  const payload = JSON.stringify({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 64,
    messages: [{ role: "user", content: "say hi" }],
  });

  const result = await new Promise<{
    status: number;
    headers: Record<string, string | string[] | undefined>;
    rawBody: string;
  }>((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.anthropic.com",
        path: "/v1/messages",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
      },
      (r) => {
        let body = "";
        r.on("data", (c) => { body += c; });
        r.on("end", () =>
          resolve({ status: r.statusCode ?? 0, headers: r.headers as Record<string, string | string[] | undefined>, rawBody: body })
        );
      }
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });

  let parsedBody: unknown;
  try { parsedBody = JSON.parse(result.rawBody); } catch { parsedBody = result.rawBody; }

  return res.status(200).json({
    anthropic_status: result.status,
    anthropic_headers: result.headers,
    anthropic_body: parsedBody,
    sent_payload: JSON.parse(payload),
    key_length: apiKey.length,
    key_prefix: apiKey.slice(0, 16),
    key_suffix: apiKey.slice(-4),
  });
}
