import { DurableObject } from "cloudflare:workers";

export type RoomStatus = "lobby" | "active_round" | "round_ended" | "expired";
export type ConnectionRole = "stage" | "controller";

export type RoomSettings = {
  gridSize: 4;
  durationSeconds: 30 | 60 | 90 | 120 | 180;
  hintsEnabled: boolean;
  tutorialEnabled: boolean;
};

export type PlayerSnapshot = {
  profileId: string;
  displayName: string;
  connected: boolean;
  host: boolean;
  connectionId: string | null;
  joinedAt: string;
  lastSeenAt: string;
};

export type RoundSnapshot = {
  id: string;
  state: "active" | "ended";
  startedAt: string;
  endsAt: string;
  endedAt: string | null;
};

export type RoomSnapshot = {
  version: number;
  joinCode: string;
  status: RoomStatus;
  createdAt: string;
  expiresAt: string;
  hostProfileId: string | null;
  settings: RoomSettings;
  round: RoundSnapshot | null;
  players: PlayerSnapshot[];
  stageConnections: number;
  controllerConnections: number;
};

export type ClientMessage =
  | { type: "snapshot_request" }
  | { type: "profile_update"; displayName: string }
  | { type: "settings_update"; settings: Partial<RoomSettings> }
  | { type: "round_start" }
  | { type: "round_end" }
  | { type: "ping"; nonce?: string };

export type ServerEvent =
  | { type: "room_snapshot"; snapshot: RoomSnapshot }
  | { type: "player_joined"; player: PlayerSnapshot; snapshot: RoomSnapshot }
  | { type: "player_updated"; player: PlayerSnapshot; snapshot: RoomSnapshot }
  | { type: "host_changed"; hostProfileId: string | null; snapshot: RoomSnapshot }
  | { type: "settings_updated"; settings: RoomSettings; snapshot: RoomSnapshot }
  | { type: "round_started"; round: RoundSnapshot; snapshot: RoomSnapshot }
  | { type: "round_ended"; round: RoundSnapshot | null; snapshot: RoomSnapshot }
  | { type: "controller_replaced"; profileId: string; reason: string }
  | { type: "room_expired"; snapshot: RoomSnapshot }
  | { type: "pong"; nonce?: string }
  | { type: "error"; code: string; message: string };

type ConnectionAttachment = {
  connectionId: string;
  role: ConnectionRole;
  profileId?: string;
};

type StateKey =
  | "joinCode"
  | "version"
  | "status"
  | "createdAt"
  | "expiresAt"
  | "hostProfileId"
  | "settings"
  | "round";

type PlayerRow = {
  profile_id: string;
  display_name: string;
  connection_id: string | null;
  connected: number;
  joined_at: string;
  last_seen_at: string;
};

const ROOM_TTL_MS = 30 * 60 * 1000;
const DEFAULT_SETTINGS: RoomSettings = {
  gridSize: 4,
  durationSeconds: 180,
  hintsEnabled: true,
  tutorialEnabled: true,
};

export class RoomObject extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.ensureSchema();
    });
  }

  async initialize(joinCode: string, now = Date.now()): Promise<RoomSnapshot> {
    const existing = await this.getSnapshot();
    if (existing) return existing;

    const createdAt = new Date(now).toISOString();
    const expiresAt = new Date(now + ROOM_TTL_MS).toISOString();

    this.writeState("joinCode", normalizeJoinCode(joinCode));
    this.writeState("version", 1);
    this.writeState("status", "lobby");
    this.writeState("createdAt", createdAt);
    this.writeState("expiresAt", expiresAt);
    this.writeState("hostProfileId", null);
    this.writeState("settings", DEFAULT_SETTINGS);
    this.writeState("round", null);
    await this.ctx.storage.setAlarm(now + ROOM_TTL_MS);

    return this.getRequiredSnapshot();
  }

  async getSnapshot(): Promise<RoomSnapshot | null> {
    const joinCode = this.readState<string>("joinCode");
    if (!joinCode) return null;

    const version = this.readState<number>("version") ?? 1;
    const status = this.readState<RoomStatus>("status") ?? "lobby";
    const createdAt = this.readState<string>("createdAt") ?? new Date(0).toISOString();
    const expiresAt = this.readState<string>("expiresAt") ?? new Date(0).toISOString();
    const hostProfileId = this.readState<string | null>("hostProfileId") ?? null;
    const settings = this.readState<RoomSettings>("settings") ?? DEFAULT_SETTINGS;
    const round = this.readState<RoundSnapshot | null>("round") ?? null;
    const players = this.readPlayers(hostProfileId);
    const connections = this.getActiveConnections();

    return {
      version,
      joinCode,
      status,
      createdAt,
      expiresAt,
      hostProfileId,
      settings,
      round,
      players,
      stageConnections: connections.filter((connection) => connection.attachment.role === "stage").length,
      controllerConnections: connections.filter((connection) => connection.attachment.role === "controller").length,
    };
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") === "websocket") {
      return this.connectWebSocket(request);
    }

    const snapshot = await this.getSnapshot();
    if (!snapshot) {
      return Response.json({ error: "Room not found." }, { status: 404 });
    }

    return Response.json({ room: snapshot });
  }

  private async connectWebSocket(request: Request): Promise<Response> {
    const snapshot = await this.getSnapshot();
    if (!snapshot) {
      return Response.json({ error: "Room not found." }, { status: 404 });
    }

    if (snapshot.status === "expired") {
      return Response.json({ error: "Room expired." }, { status: 410 });
    }

    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected Upgrade: websocket", { status: 426 });
    }

    const url = new URL(request.url);
    const role = parseRole(url.searchParams.get("role"));
    if (!role) {
      return Response.json({ error: "Missing or invalid connection role." }, { status: 400 });
    }

    const profileId = normalizeProfileId(url.searchParams.get("profileId") ?? "");
    if (role === "controller" && !profileId) {
      return Response.json({ error: "Controller connections require a profileId." }, { status: 400 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    const connectionId = crypto.randomUUID();
    const attachment: ConnectionAttachment =
      role === "controller" ? { connectionId, role, profileId } : { connectionId, role };
    const tags = role === "controller" ? [role, connectionId, profileId] : [role, connectionId];

    server.serializeAttachment(attachment);
    this.ctx.acceptWebSocket(server, tags);

    if (role === "controller") {
      const displayName =
        normalizeDisplayName(url.searchParams.get("displayName") ?? "") || defaultDisplayName(profileId);
      const player = await this.upsertConnectedPlayer(profileId, displayName, connectionId);
      await this.ensureHost();
      this.closeSupersededControllerSockets(profileId, connectionId);
      const nextSnapshot = await this.getRequiredSnapshot();
      this.send(server, { type: "room_snapshot", snapshot: nextSnapshot });
      this.broadcast({ type: "player_joined", player, snapshot: nextSnapshot }, server);
    } else {
      this.send(server, { type: "room_snapshot", snapshot: await this.getRequiredSnapshot() });
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  async alarm(): Promise<void> {
    const snapshot = await this.getSnapshot();
    if (!snapshot || snapshot.status === "expired") return;

    this.writeState("status", "expired");
    this.ctx.storage.sql.exec("UPDATE players SET connected = 0, connection_id = NULL");
    this.bumpVersion();
    const expiredSnapshot = await this.getRequiredSnapshot();
    this.broadcast({ type: "room_expired", snapshot: expiredSnapshot });
  }

  async webSocketMessage(ws: WebSocket, rawMessage: ArrayBuffer | string): Promise<void> {
    const attachment = this.getAttachment(ws);
    if (!attachment) {
      this.send(ws, { type: "error", code: "missing_attachment", message: "Missing connection metadata." });
      return;
    }

    const snapshot = await this.getSnapshot();
    if (!snapshot || snapshot.status === "expired") {
      this.send(ws, { type: "error", code: "room_unavailable", message: "Room is unavailable." });
      return;
    }

    const message = parseClientMessage(rawMessage);
    if (!message) {
      this.send(ws, { type: "error", code: "invalid_message", message: "Message was not recognized." });
      return;
    }

    if (message.type === "ping") {
      this.send(ws, { type: "pong", nonce: message.nonce });
      return;
    }

    if (message.type === "snapshot_request") {
      this.send(ws, { type: "room_snapshot", snapshot: await this.getRequiredSnapshot() });
      return;
    }

    if (message.type === "profile_update") {
      await this.handleProfileUpdate(ws, attachment, message.displayName);
      return;
    }

    if (message.type === "settings_update") {
      await this.handleSettingsUpdate(ws, attachment, message.settings);
      return;
    }

    if (message.type === "round_start") {
      await this.handleRoundStart(ws, attachment);
      return;
    }

    if (message.type === "round_end") {
      await this.handleRoundEnd(ws, attachment);
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const attachment = this.getAttachment(ws);
    if (!attachment || attachment.role !== "controller" || !attachment.profileId) return;

    const player = this.readPlayer(attachment.profileId);
    if (!player || player.connection_id !== attachment.connectionId) return;

    const wasHost = this.readState<string | null>("hostProfileId") === attachment.profileId;
    this.ctx.storage.sql.exec(
      `
        UPDATE players
        SET connected = 0, connection_id = NULL, last_seen_at = ?
        WHERE profile_id = ?
      `,
      new Date().toISOString(),
      attachment.profileId,
    );
    this.bumpVersion();

    const hostChanged = wasHost ? await this.ensureHost() : false;
    const snapshot = await this.getRequiredSnapshot();
    if (hostChanged) {
      this.broadcast({ type: "host_changed", hostProfileId: snapshot.hostProfileId, snapshot });
    } else {
      this.broadcast({ type: "room_snapshot", snapshot });
    }
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    ws.close(1011, "Room WebSocket error");
  }

  private async handleProfileUpdate(
    ws: WebSocket,
    attachment: ConnectionAttachment,
    displayName: string,
  ): Promise<void> {
    if (attachment.role !== "controller" || !attachment.profileId) {
      this.send(ws, {
        type: "error",
        code: "controller_required",
        message: "Only controller connections can update profiles.",
      });
      return;
    }

    const normalizedDisplayName = normalizeDisplayName(displayName);
    if (!normalizedDisplayName) {
      this.send(ws, { type: "error", code: "invalid_profile", message: "Display name is required." });
      return;
    }

    const now = new Date().toISOString();
    this.ctx.storage.sql.exec(
      `
        UPDATE players
        SET display_name = ?, last_seen_at = ?
        WHERE profile_id = ?
      `,
      normalizedDisplayName,
      now,
      attachment.profileId,
    );
    this.bumpVersion();

    const snapshot = await this.getRequiredSnapshot();
    const player = snapshot.players.find((candidate) => candidate.profileId === attachment.profileId);
    if (!player) return;

    this.broadcast({ type: "player_updated", player, snapshot });
  }

  private async handleSettingsUpdate(
    ws: WebSocket,
    attachment: ConnectionAttachment,
    patch: Partial<RoomSettings>,
  ): Promise<void> {
    if (!this.isHostConnection(attachment)) {
      this.send(ws, {
        type: "error",
        code: "host_required",
        message: "Only the host can update room settings.",
      });
      return;
    }

    const settings = this.readState<RoomSettings>("settings") ?? DEFAULT_SETTINGS;
    const nextSettings = sanitizeSettingsPatch(settings, patch);

    this.writeState("settings", nextSettings);
    this.bumpVersion();

    const snapshot = await this.getRequiredSnapshot();
    this.broadcast({ type: "settings_updated", settings: nextSettings, snapshot });
  }

  private async handleRoundStart(ws: WebSocket, attachment: ConnectionAttachment): Promise<void> {
    if (!this.isHostConnection(attachment)) {
      this.send(ws, {
        type: "error",
        code: "host_required",
        message: "Only the host can start a round.",
      });
      return;
    }

    const settings = this.readState<RoomSettings>("settings") ?? DEFAULT_SETTINGS;
    const startedAtMs = Date.now();
    const round: RoundSnapshot = {
      id: crypto.randomUUID(),
      state: "active",
      startedAt: new Date(startedAtMs).toISOString(),
      endsAt: new Date(startedAtMs + settings.durationSeconds * 1000).toISOString(),
      endedAt: null,
    };

    this.writeState("status", "active_round");
    this.writeState("round", round);
    this.bumpVersion();

    const snapshot = await this.getRequiredSnapshot();
    this.broadcast({ type: "round_started", round, snapshot });
  }

  private async handleRoundEnd(ws: WebSocket, attachment: ConnectionAttachment): Promise<void> {
    if (!this.isHostConnection(attachment)) {
      this.send(ws, {
        type: "error",
        code: "host_required",
        message: "Only the host can end a round.",
      });
      return;
    }

    const currentRound = this.readState<RoundSnapshot | null>("round");
    const endedRound: RoundSnapshot | null = currentRound
      ? {
          ...currentRound,
          state: "ended",
          endedAt: new Date().toISOString(),
        }
      : null;

    this.writeState("status", "round_ended");
    this.writeState("round", endedRound);
    this.bumpVersion();

    const snapshot = await this.getRequiredSnapshot();
    this.broadcast({ type: "round_ended", round: endedRound, snapshot });
  }

  private async upsertConnectedPlayer(
    profileId: string,
    displayName: string,
    connectionId: string,
  ): Promise<PlayerSnapshot> {
    const now = new Date().toISOString();
    const existing = this.readPlayer(profileId);
    if (existing) {
      this.ctx.storage.sql.exec(
        `
          UPDATE players
          SET display_name = ?, connection_id = ?, connected = 1, last_seen_at = ?
          WHERE profile_id = ?
        `,
        displayName,
        connectionId,
        now,
        profileId,
      );
    } else {
      this.ctx.storage.sql.exec(
        `
          INSERT INTO players (
            profile_id,
            display_name,
            connection_id,
            connected,
            joined_at,
            last_seen_at
          ) VALUES (?, ?, ?, 1, ?, ?)
        `,
        profileId,
        displayName,
        connectionId,
        now,
        now,
      );
    }

    this.bumpVersion();
    const hostProfileId = this.readState<string | null>("hostProfileId");
    const player = this.readPlayer(profileId);
    if (!player) throw new Error("Expected connected player to be persisted.");

    return mapPlayerRow(player, hostProfileId ?? null);
  }

  private async ensureHost(): Promise<boolean> {
    const currentHost = this.readState<string | null>("hostProfileId");
    if (currentHost && this.isConnectedProfile(currentHost)) return false;

    const [nextHost] = this.ctx.storage.sql
      .exec<PlayerRow>(
        `
          SELECT *
          FROM players
          WHERE connected = 1
          ORDER BY joined_at ASC, profile_id ASC
          LIMIT 1
        `,
      )
      .toArray();
    const nextHostProfileId = nextHost?.profile_id ?? null;

    if (currentHost === nextHostProfileId) return false;

    this.writeState("hostProfileId", nextHostProfileId);
    this.bumpVersion();
    return true;
  }

  private isHostConnection(attachment: ConnectionAttachment): boolean {
    return (
      attachment.role === "controller" &&
      !!attachment.profileId &&
      this.readState<string | null>("hostProfileId") === attachment.profileId
    );
  }

  private isConnectedProfile(profileId: string): boolean {
    const player = this.readPlayer(profileId);
    return player?.connected === 1;
  }

  private closeSupersededControllerSockets(profileId: string, activeConnectionId: string): void {
    for (const connection of this.getActiveConnections()) {
      if (
        connection.attachment.role === "controller" &&
        connection.attachment.profileId === profileId &&
        connection.attachment.connectionId !== activeConnectionId
      ) {
        this.send(connection.ws, {
          type: "controller_replaced",
          profileId,
          reason: "Another device connected with this profile.",
        });
        connection.ws.close(4000, "Controller replaced");
      }
    }
  }

  private getRequiredSnapshot(): Promise<RoomSnapshot> {
    return this.getSnapshot().then((snapshot) => {
      if (!snapshot) throw new Error("Room was not initialized.");
      return snapshot;
    });
  }

  private readPlayers(hostProfileId: string | null): PlayerSnapshot[] {
    return this.ctx.storage.sql
      .exec<PlayerRow>(
        `
          SELECT *
          FROM players
          ORDER BY joined_at ASC, profile_id ASC
        `,
      )
      .toArray()
      .map((row) => mapPlayerRow(row, hostProfileId));
  }

  private readPlayer(profileId: string): PlayerRow | null {
    const [player] = this.ctx.storage.sql
      .exec<PlayerRow>("SELECT * FROM players WHERE profile_id = ?", profileId)
      .toArray();

    return player ?? null;
  }

  private getActiveConnections(): Array<{ ws: WebSocket; attachment: ConnectionAttachment }> {
    return this.ctx
      .getWebSockets()
      .map((ws) => ({ ws, attachment: this.getAttachment(ws) }))
      .filter((connection): connection is { ws: WebSocket; attachment: ConnectionAttachment } =>
        Boolean(connection.attachment),
      );
  }

  private getAttachment(ws: WebSocket): ConnectionAttachment | null {
    const attachment = ws.deserializeAttachment();
    if (!attachment || typeof attachment !== "object") return null;

    const candidate = attachment as Partial<ConnectionAttachment>;
    if (
      typeof candidate.connectionId !== "string" ||
      (candidate.role !== "stage" && candidate.role !== "controller")
    ) {
      return null;
    }

    return {
      connectionId: candidate.connectionId,
      role: candidate.role,
      profileId: typeof candidate.profileId === "string" ? candidate.profileId : undefined,
    };
  }

  private broadcast(event: ServerEvent, except?: WebSocket): void {
    for (const { ws } of this.getActiveConnections()) {
      if (ws !== except) this.send(ws, event);
    }
  }

  private send(ws: WebSocket, event: ServerEvent): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event));
    }
  }

  private bumpVersion(): number {
    const version = (this.readState<number>("version") ?? 0) + 1;
    this.writeState("version", version);
    return version;
  }

  private readState<T>(key: StateKey): T | null {
    const [row] = this.ctx.storage.sql
      .exec<{ value: string }>("SELECT value FROM room_state WHERE key = ?", key)
      .toArray();

    if (!row) return null;

    return JSON.parse(row.value) as T;
  }

  private writeState(key: StateKey, value: unknown): void {
    this.ctx.storage.sql.exec(
      "INSERT OR REPLACE INTO room_state (key, value) VALUES (?, ?)",
      key,
      JSON.stringify(value),
    );
  }

  private ensureSchema(): void {
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS room_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS players (
        profile_id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        connection_id TEXT,
        connected INTEGER NOT NULL,
        joined_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL
      )
    `);
  }
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const route = parseRoute(url.pathname);

    if (request.method === "POST" && route.kind === "create-room") {
      const joinCode = createJoinCode();
      const room = env.ROOM_OBJECT.getByName(joinCode);
      const snapshot = await room.initialize(joinCode);

      return Response.json({
        room: snapshot,
        joinCode,
        stageUrl: `/stage/${joinCode}`,
        controllerUrl: `/join/${joinCode}`,
        websocketUrl: `/ws/${joinCode}`,
      });
    }

    if (route.kind === "room-websocket") {
      const room = env.ROOM_OBJECT.getByName(route.joinCode);
      return room.fetch(request);
    }

    if (request.method === "GET" && route.kind === "room-api") {
      const room = env.ROOM_OBJECT.getByName(route.joinCode);
      const snapshot = await room.getSnapshot();
      if (!snapshot) {
        return Response.json({ error: "Room not found." }, { status: 404 });
      }

      return Response.json({ room: snapshot });
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

function mapPlayerRow(row: PlayerRow, hostProfileId: string | null): PlayerSnapshot {
  return {
    profileId: row.profile_id,
    displayName: row.display_name,
    connected: row.connected === 1,
    host: hostProfileId === row.profile_id,
    connectionId: row.connection_id,
    joinedAt: row.joined_at,
    lastSeenAt: row.last_seen_at,
  };
}

function parseRoute(pathname: string):
  | { kind: "create-room" }
  | { kind: "room-api"; joinCode: string }
  | { kind: "room-websocket"; joinCode: string }
  | { kind: "asset" } {
  const parts = pathname.split("/").filter(Boolean);

  if (parts.length === 2 && parts[0] === "api" && parts[1] === "rooms") {
    return { kind: "create-room" };
  }

  if (parts.length === 3 && parts[0] === "api" && parts[1] === "rooms") {
    return { kind: "room-api", joinCode: normalizeJoinCode(parts[2]) };
  }

  if (parts.length === 4 && parts[0] === "api" && parts[1] === "rooms" && parts[3] === "ws") {
    return { kind: "room-websocket", joinCode: normalizeJoinCode(parts[2]) };
  }

  if (parts.length === 2 && parts[0] === "ws") {
    return { kind: "room-websocket", joinCode: normalizeJoinCode(parts[1]) };
  }

  return { kind: "asset" };
}

function parseRole(role: string | null): ConnectionRole | null {
  if (role === "stage" || role === "controller") return role;
  return null;
}

function parseClientMessage(rawMessage: ArrayBuffer | string): ClientMessage | null {
  if (typeof rawMessage !== "string") return null;

  try {
    const message = JSON.parse(rawMessage) as Partial<ClientMessage>;
    if (!message || typeof message.type !== "string") return null;

    if (message.type === "snapshot_request") return { type: "snapshot_request" };
    if (message.type === "ping") return { type: "ping", nonce: message.nonce };
    if (message.type === "profile_update" && typeof message.displayName === "string") {
      return { type: "profile_update", displayName: message.displayName };
    }
    if (message.type === "settings_update") return { type: "settings_update", settings: message.settings ?? {} };
    if (message.type === "round_start") return { type: "round_start" };
    if (message.type === "round_end") return { type: "round_end" };
  } catch {
    return null;
  }

  return null;
}

function sanitizeSettingsPatch(current: RoomSettings, patch: Partial<RoomSettings>): RoomSettings {
  const allowedDurations: RoomSettings["durationSeconds"][] = [30, 60, 90, 120, 180];
  const durationSeconds = allowedDurations.includes(patch.durationSeconds as RoomSettings["durationSeconds"])
    ? (patch.durationSeconds as RoomSettings["durationSeconds"])
    : current.durationSeconds;

  return {
    gridSize: 4,
    durationSeconds,
    hintsEnabled: typeof patch.hintsEnabled === "boolean" ? patch.hintsEnabled : current.hintsEnabled,
    tutorialEnabled: typeof patch.tutorialEnabled === "boolean" ? patch.tutorialEnabled : current.tutorialEnabled,
  };
}

function normalizeJoinCode(value: string): string {
  return value.trim().toUpperCase();
}

function normalizeProfileId(value: string): string {
  return value.trim().slice(0, 64);
}

function normalizeDisplayName(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, 32);
}

function defaultDisplayName(profileId: string): string {
  return `Player ${profileId.slice(0, 4).toUpperCase()}`;
}

function createJoinCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);

  return [...bytes].map((byte) => alphabet[byte % alphabet.length]).join("");
}
