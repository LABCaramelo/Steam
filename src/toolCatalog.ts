import type { ArtKind, LibraryApp, LibrarySnapshot } from "./types";

export const PROMPT_LIBRARY_APP_ID = 1;

const artRoot = "/tools/prompt-library/art";

export const PROMPT_LIBRARY_APP: LibraryApp = {
  appid: PROMPT_LIBRARY_APP_ID,
  name: "Biblioteca de prompts",
  type: "tool",
  installed: true,
  sizeOnDisk: 0,
  lastPlayed: 0,
  playtimeMinutes: 0,
  developer: "Um Cara Caramelo",
  publisher: "Um Cara Caramelo",
  art: { capsule: true, hero: true, heroBlur: true, logo: false, header: true, icon: true },
  tool: {
    launchPath: `/library/app/${PROMPT_LIBRARY_APP_ID}/open`,
    publicPage: "/tools/prompt-library/index.html",
    description: "Encontre, organize e copie prompts para criar com inteligência artificial.",
    assets: {
      capsule: `${artRoot}/capsule.svg`,
      hero: `${artRoot}/hero.svg`,
      heroBlur: `${artRoot}/hero.svg`,
      header: `${artRoot}/header.svg`,
      icon: `${artRoot}/icon.svg`,
    },
  },
};

export const TOOL_CATALOG: readonly LibraryApp[] = [PROMPT_LIBRARY_APP];

export function getRegisteredTool(appid: number): LibraryApp | undefined {
  return TOOL_CATALOG.find((app) => app.appid === appid);
}

export function toolArtUrl(appid: number, kind: ArtKind): string | undefined {
  const assets = getRegisteredTool(appid)?.tool?.assets;
  return assets?.[kind] ?? assets?.header;
}

/** Add built-in tools to the current source without restoring any other apps or changing Steam files. */
export function registerTools(snapshot: LibrarySnapshot): LibrarySnapshot {
  const registeredIds = new Set(TOOL_CATALOG.map((app) => app.appid));
  return {
    ...snapshot,
    apps: [...TOOL_CATALOG, ...snapshot.apps.filter((app) => !registeredIds.has(app.appid))],
  };
}
