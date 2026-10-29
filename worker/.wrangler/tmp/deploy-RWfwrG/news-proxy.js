// news-proxy.js
var UPSTREAM = "https://news-mediator.tradingview.com/news-flow/v2/news";
var ALLOWED_ORIGINS = ["https://kfirsh-source.github.io", "http://localhost:5173"];
var news_proxy_default = {
  async fetch(request) {
    const origin = request.headers.get("Origin") ?? "";
    const allowed = ALLOWED_ORIGINS.includes(origin);
    const cors = {
      "Access-Control-Allow-Origin": allowed ? origin : ALLOWED_ORIGINS[0],
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      Vary: "Origin"
    };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (!allowed) return new Response("Forbidden", { status: 403, headers: cors });
    const url = new URL(request.url);
    const upstream = await fetch(`${UPSTREAM}${url.search}`, { cf: { cacheTtl: 300, cacheEverything: true } });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "public, max-age=300" }
    });
  }
};
export {
  news_proxy_default as default
};
//# sourceMappingURL=news-proxy.js.map
