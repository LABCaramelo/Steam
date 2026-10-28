import type { IncomingMessage } from "node:http";
import { requireToolAccess } from "./toolAccess.ts";
import { createTramaHandler } from "./trama/gateway.mjs";

// The TypeScript boundary is emitted with toolAccess.js by the production Node builder.
// The reusable .mjs engine has no imports of TypeScript-only paths.
export const tramaHandler = createTramaHandler({
  authorize: (request: IncomingMessage) => requireToolAccess(request, "automation"),
});
