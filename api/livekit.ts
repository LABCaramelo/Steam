import type { IncomingMessage, ServerResponse } from 'node:http';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { requireToolAccess, ToolAccessError } from '../server/toolAccess.ts';

/**
 * Função serverless da Vercel (e middleware do `npm run dev`, ver vite.config.ts).
 *   GET  /api/livekit?action=rooms  → quem está em cada canal de voz
 *   POST /api/livekit?action=token  → token para entrar num canal de voz
 *
 * O mesmo handler e a mesma autorização são usados pela Vercel e pelo servidor local.
 */

/** Prefixo das salas deste app, para não misturar com outros projetos na mesma conta LiveKit. */
const ROOM_PREFIX = 'discord-clone_';
const CHANNEL_ID = /^[a-z0-9-]{1,64}$/;
const COLOR = /^#[0-9a-f]{6}$/i;

type Req = IncomingMessage & { body?: unknown };

function config() {
  const { LIVEKIT_URL: url, LIVEKIT_API_KEY: apiKey, LIVEKIT_API_SECRET: apiSecret } = process.env;
  return url && apiKey && apiSecret ? { url, apiKey, apiSecret } : null;
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

async function readJson(req: Req): Promise<Record<string, unknown>> {
  // A Vercel já entrega o corpo pronto em req.body; no Vite lemos o stream.
  if (req.body && typeof req.body === 'object') return req.body as Record<string, unknown>;
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

export default async function handler(req: Req, res: ServerResponse) {
  const action = new URL(req.url ?? '/', 'http://localhost').searchParams.get('action');

  try {
    const access = await requireToolAccess(req, 'comunidade');
    const cfg = config();
    if (!cfg) return send(res, 503, { error: 'not_configured' });
    if (action === 'rooms' && req.method === 'GET') {
      const svc = new RoomServiceClient(cfg.url.replace(/^ws/, 'http'), cfg.apiKey, cfg.apiSecret);
      const rooms = (await svc.listRooms()).filter((r) => r.name.startsWith(ROOM_PREFIX) && r.numParticipants > 0);
      const entries = await Promise.all(
        rooms.map(async (r) => {
          const people = await svc.listParticipants(r.name);
          return [
            r.name.slice(ROOM_PREFIX.length),
            people.map((p) => ({
              identity: p.identity,
              name: p.name || p.identity,
              color: COLOR.test(p.attributes?.color ?? '') ? p.attributes.color : undefined,
            })),
          ] as const;
        }),
      );
      return send(res, 200, { occupancy: Object.fromEntries(entries) });
    }

    if (action === 'token' && req.method === 'POST') {
      const body = await readJson(req);
      const channelId = String(body.channelId ?? '');
      const identity = access.user.id;
      const meta = access.user.user_metadata ?? {};
      const display = [meta.nickname, meta.name, access.user.email?.split('@')[0]].find((value) => typeof value === 'string' && value.trim());
      const name = typeof display === 'string' ? display.trim().slice(0, 32) : 'Membro do LAB';
      const color = String(body.color ?? '');
      if (!CHANNEL_ID.test(channelId)) {
        return send(res, 400, { error: 'invalid_request' });
      }
      // A cor do perfil vai como atributo da pessoa na sala, para todos verem a mesma.
      const attributes = COLOR.test(color) ? { color } : undefined;
      const token = new AccessToken(cfg.apiKey, cfg.apiSecret, { identity, name, attributes, ttl: '15m' });
      token.addGrant({
        room: ROOM_PREFIX + channelId,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      });
      return send(res, 200, { token: await token.toJwt(), url: cfg.url, identity });
    }

    return send(res, 404, { error: 'not_found' });
  } catch (err) {
    if (err instanceof ToolAccessError) return send(res, err.status, { error: err.message, code: err.code });
    console.error('[api/livekit]', err);
    return send(res, 502, { error: 'livekit_error' });
  }
}
