import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { promptLibrary } from "./server/promptLibrary.ts";
import {
  buildSnapshot,
  findSteamPath,
  readAchievements,
  resolveArt,
  type ArtKind,
  type LibrarySnapshot,
} from "./server/steamData.ts";

const ART_KINDS = new Set<ArtKind>(["capsule", "hero", "heroBlur", "logo", "header", "icon"]);
const MIME: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".ico": "image/x-icon" };

/** Local, read-only API over the Steam installation. Only served by the dev/preview server on localhost. */
function steamDataApi(): Plugin {
  const steamPath = findSteamPath();
  let cache: LibrarySnapshot | null = null;
  const snapshot = (fresh: boolean) => {
    if (!cache || fresh || Date.now() - cache.generatedAt > 15_000) cache = buildSnapshot(steamPath);
    return cache;
  };

  const handler = (req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse, next: () => void) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const json = (body: unknown, status = 200) => {
      res.statusCode = status;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify(body));
    };

    if (url.pathname === "/api/library") return json(snapshot(url.searchParams.has("refresh")));
    if (url.pathname === "/api/prompt-library") {
      void promptLibrary(req, res).catch(() => json({ error: "Não foi possível consultar o acervo. Tente novamente." }, 500));
      return;
    }

    let m = url.pathname.match(/^\/api\/art\/(\d+)\/([a-zA-Z]+)$/);
    if (m) {
      const kind = m[2] as ArtKind;
      const file = steamPath && ART_KINDS.has(kind) ? resolveArt(steamPath, Number(m[1]), kind) : null;
      if (!file) return json({ error: "not found" }, 404);
      res.setHeader("Content-Type", MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream");
      res.setHeader("Cache-Control", "max-age=3600");
      return fs.createReadStream(file).pipe(res);
    }

    m = url.pathname.match(/^\/api\/app\/(\d+)\/achievements$/);
    if (m) return json((steamPath && readAchievements(steamPath, Number(m[1]))) || { total: 0, achieved: 0, list: [] });

    if (url.pathname === "/api/avatar") {
      const user = snapshot(false).user;
      const file = steamPath && user?.steamId64 ? path.join(steamPath, "config", "avatarcache", `${user.steamId64}.png`) : null;
      if (!file || !fs.existsSync(file)) return json({ error: "not found" }, 404);
      res.setHeader("Content-Type", "image/png");
      return fs.createReadStream(file).pipe(res);
    }

    next();
  };

  return {
    name: "steam-data-api",
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

/** LAB client routes (src/App.tsx). Everything else under "/" belongs to the public site. */
const LAB_ROUTE = /^\/(?:library|store|community|profile|settings|app)(?:\/|$)/;
/** Same fallback as production: extensionless pages that are not files go to the LAB, which redirects to /library/home. */
const isUnknownPage = (page: string) => !path.extname(page) && !page.endsWith("/") && !page.startsWith("/@") && !page.startsWith("/api/");

/**
 * The public site (copied from LP) is served as-is from public/: "/" is public/index.html and
 * the LAB client is app.html. Mirrors the rewrites in vercel.json for the dev/preview servers.
 */
function siteRoutes(): Plugin {
  const handler = (req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse, next: () => void) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    const url = new URL(req.url ?? "/", "http://localhost");
    const page = url.pathname;

    if (/^\/prompts\/?$/.test(page)) {
      res.statusCode = 308;
      res.setHeader("Location", "/tools/prompt-library/index.html");
      return res.end();
    }
    if (page === "/") req.url = `/index.html${url.search}`;
    else if (/^\/aula-head(?:\/aula-01)?\/?$/.test(page)) req.url = `/aula-head/index.html${url.search}`;
    else if (LAB_ROUTE.test(page) || (isUnknownPage(page) && req.headers.accept?.includes("text/html"))) req.url = `/app.html${url.search}`;
    next();
  };

  return {
    name: "site-routes",
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

export default defineConfig({
  plugins: [react(), steamDataApi(), siteRoutes()],
  appType: "mpa",
  build: { rollupOptions: { input: { app: path.resolve(import.meta.dirname, "app.html") } } },
  server: { host: "127.0.0.1", port: 5180 },
  preview: { host: "127.0.0.1", port: 5180 },
});
