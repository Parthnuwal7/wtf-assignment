import { NextRequest } from "next/server";

const PAGEFIND_ORIGIN = "https://looksmaxxing.guide/pagefind/";

const ALLOWED_EXTENSIONS = new Set([
  "js",
  "json",
  "pagefind",
  "pf_meta",
  "pf_index",
  "pf_fragment",
  "pf_filter",
]);

function contentTypeFor(path: string, upstream: string | null): string {
  if (upstream) return upstream;
  if (path.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (path.endsWith(".json")) return "application/json; charset=utf-8";
  return "application/octet-stream";
}

export async function GET(
  request: NextRequest,
  context: RouteContext<"/pagefind-proxy/[...path]">,
) {
  const { path } = await context.params;
  const assetPath = path.join("/");
  const extension = assetPath.split(".").pop();

  if (!extension || !ALLOWED_EXTENSIONS.has(extension)) {
    return new Response("Unsupported Pagefind asset", { status: 400 });
  }

  const remoteUrl = new URL(assetPath, PAGEFIND_ORIGIN);
  const upstream = await fetch(remoteUrl, {
    headers: { "User-Agent": request.headers.get("user-agent") ?? "Pagefind retrieval test" },
    cache: "no-store",
  });

  if (!upstream.ok || !upstream.body) {
    return new Response("Pagefind asset unavailable", { status: upstream.status || 502 });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": contentTypeFor(assetPath, upstream.headers.get("content-type")),
      "Cache-Control": "public, max-age=300",
    },
  });
}
