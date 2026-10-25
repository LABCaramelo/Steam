import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { labAccess } from "./server/labAccess.ts";
import { promptLibrary } from "./server/promptLibrary.ts";
import { livekitHandler } from "./server/livekit.ts";
import uploadHandler from "./api/upload.ts";
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
    if (url.pathname === "/api/lab-access") {
      void labAccess(req, res).catch(() => json({ error: "Não foi possível conferir seu acesso agora." }, 500));
      return;
    }
    if (url.pathname === "/api/livekit") {
      void livekitHandler(req, res).catch(() => json({ error: "livekit_error" }, 502));
      return;
    }
    if (url.pathname === "/api/upload") {
      void uploadHandler(req, res).catch((err) => json({ error: err instanceof Error ? err.message : "upload_error" }, 500));
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
const LAB_ROUTE = /^\/(?:library|store|profile|settings|app)(?:\/|$)/;
/** Tool pages built from tools/<slug>/index.html (src/tools/<slug>). */
const TOOL_PAGES = ["prompt-library", "kanban", "prancheta", "automation", "academy", "claquete", "comunidade", "admin", "gravador", "montagem"].filter((slug) =>
  fs.existsSync(path.resolve(import.meta.dirname, "src", "tools", slug, "main.tsx")),
);
const TOOL_ROUTE = new RegExp(`^/tools/(${TOOL_PAGES.join("|")})/?$`);
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
    else if (TOOL_ROUTE.test(page)) req.url = `/tools/${page.match(TOOL_ROUTE)![1]}/index.html${url.search}`;
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

/**
 * Cloudflare tells browsers to keep public/ JS and CSS for 4 hours, so a deploy reached
 * returning visitors hours late. After the build, every local .js/.css URL in the copied
 * public pages, and every relative import inside those scripts, gets ?v=<content hash>:
 * an edited file gets a new URL at once and an untouched one stays cached. The pages
 * themselves are served with max-age=0, so they always point at the current files.
 */
function stampPublicAssets(): Plugin {
  let outDir = "";
  let publicDir = "";
  return {
    name: "stamp-public-assets",
    apply: "build",
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
      publicDir = config.publicDir;
    },
    closeBundle() {
      if (!publicDir || !fs.existsSync(publicDir)) return;
      const versions = new Map<string, string>();
      // Remote URLs and files whose name already carries a build hash are left alone.
      const localFile = (from: string, url: string) => {
        if (!/\.(?:m?js|css)$/.test(url) || /^(?:[a-z]+:)?\/\//i.test(url) || /-[\w-]{8}\.(?:m?js|css)$/.test(url)) return null;
        const file = url.startsWith("/") ? path.join(outDir, url) : path.resolve(path.dirname(from), url);
        return file.startsWith(outDir) && fs.existsSync(file) ? file : null;
      };
      const stamp = (from: string, url: string) => {
        const file = localFile(from, url);
        return file ? `${url}?v=${version(file)}` : url;
      };
      // A script's own imports are stamped first, so a changed module also renames its importer.
      function version(file: string): string {
        const known = versions.get(file);
        if (known !== undefined) return known;
        versions.set(file, "");
        const source = fs.readFileSync(file, "utf8");
        const stamped = file.endsWith(".css") ? source : source.replace(
          /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(["'])(\.{1,2}\/[^"'?]+)\2/g,
          (_match, lead, quote, url) => `${lead}${quote}${stamp(file, url)}${quote}`,
        );
        if (stamped !== source) fs.writeFileSync(file, stamped);
        const hash = crypto.createHash("sha1").update(stamped).digest("hex").slice(0, 10);
        versions.set(file, hash);
        return hash;
      }
      const pages = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
        const full = path.join(dir, entry.name);
        return entry.isDirectory() ? pages(full) : entry.name.endsWith(".html") ? [full] : [];
      });
      for (const page of pages(publicDir)) {
        const built = path.join(outDir, path.relative(publicDir, page));
        if (!fs.existsSync(built)) continue;
        const html = fs.readFileSync(built, "utf8");
        const stamped = html.replace(
          /(\s(?:href|src)=)(["'])([^"'?#]+)\2/g,
          (_match, lead, quote, url) => `${lead}${quote}${stamp(built, url)}${quote}`,
        );
        if (stamped !== html) fs.writeFileSync(built, stamped);
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  // Server-only secrets in .env (UAZAPI_*, SUPABASE_SERVICE_ROLE_KEY) reach /api/lab-access locally,
  // as Vercel's environment variables do in production. They never enter the bundle (no VITE_ prefix).
  for (const [name, value] of Object.entries(loadEnv(mode, import.meta.dirname, ""))) process.env[name] ??= value;
  return {
    plugins: [react(), steamDataApi(), siteRoutes(), stampPublicAssets()],
    appType: "mpa",
    build: {
      rollupOptions: {
        input: {
          app: path.resolve(import.meta.dirname, "app.html"),
          "aula-head": path.resolve(import.meta.dirname, "aula-head/index.html"),
          // LAB tools: each one is its own page, embedded by the LAB and usable in a tab of its own.
          ...Object.fromEntries(TOOL_PAGES.map((slug) => [`tool-${slug}`, path.resolve(import.meta.dirname, "tools", slug, "index.html")])),
        },
      },
    },
    server: { host: "127.0.0.1", port: 5180 },
    preview: { host: "127.0.0.1", port: 5180 },
  };
});
