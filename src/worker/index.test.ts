import {
  abortAllDurableObjects,
  env,
  reset,
  runDurableObjectAlarm,
  SELF,
} from "cloudflare:test";
import { afterEach, describe, expect, it } from "vitest";
import type { RoomObject, RoomSnapshot, ServerEvent } from "./index";

type RoomStub = DurableObjectStub<RoomObject>;
type RoomEvent<T extends ServerEvent["type"]> = Extract<ServerEvent, { type: T }>;

const FIXED_NOW = 1_800_000_000_000;
const eventTimeoutMs = 2_000;
let openSockets: WebSocket[] = [];

afterEach(async () => {
  for (const socket of openSockets) {
    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
      socket.close(1000, "test cleanup");
    }
  }
  openSockets = [];
  await reset();
});

describe("RoomObject realtime skeleton", () => {
  it("creates a room through the Worker HTTP route", async () => {
    const response = await SELF.fetch("https://boggle.test/api/rooms", { method: "POST" });
    expect(response.status).toBe(200);

    const body = await readJson<{
      room: RoomSnapshot;
      joinCode: string;
      stageUrl: string;
      controllerUrl: string;
      websocketUrl: string;
    }>(response);

    expect(body.joinCode).toMatch(/^[A-Z2-9]{6}$/);
    expect(body.room.joinCode).toBe(body.joinCode);
    expect(body.room.status).toBe("lobby");
    expect(body.room.settings.durationSeconds).toBe(180);
    expect(body.stageUrl).toBe(`/stage/${body.joinCode}`);
    expect(body.controllerUrl).toBe(`/join/${body.joinCode}`);
    expect(body.websocketUrl).toBe(`/ws/${body.joinCode}`);

    const snapshotResponse = await SELF.fetch(`https://boggle.test/api/rooms/${body.joinCode}`);
    expect(snapshotResponse.status).toBe(200);
    const snapshotBody = await readJson<{ room: RoomSnapshot }>(snapshotResponse);
    expect(snapshotBody.room.joinCode).toBe(body.joinCode);
  });

  it("persists room, player, settings, and round state through SQLite-backed storage", async () => {
    const room = await createRoom("PERSIST1");
    const host = await connectController(room, { profileId: "p-host", displayName: "Adam" });

    const settingsUpdate = waitForEvent(host.socket, "settings_updated");
    host.socket.send(JSON.stringify({ type: "settings_update", settings: { durationSeconds: 60 } }));
    await settingsUpdate;

    const roundStarted = waitForEvent(host.socket, "round_started");
    host.socket.send(JSON.stringify({ type: "round_start" }));
    await roundStarted;

    const beforeRestart = await room.getSnapshot();
    expect(beforeRestart?.settings.durationSeconds).toBe(60);
    expect(beforeRestart?.status).toBe("active_round");
    expect(beforeRestart?.players).toHaveLength(1);

    await abortAllDurableObjects();
    const resumedRoom = env.ROOM_OBJECT.getByName("PERSIST1");
    const resumedSnapshot = await resumedRoom.getSnapshot();

    expect(resumedSnapshot?.joinCode).toBe("PERSIST1");
    expect(resumedSnapshot?.settings.durationSeconds).toBe(60);
    expect(resumedSnapshot?.status).toBe("active_round");
    expect(resumedSnapshot?.round?.state).toBe("active");
    expect(resumedSnapshot?.players[0]?.profileId).toBe("p-host");
  });

  it("marks a room expired when the alarm runs", async () => {
    const room = await createRoom("EXPIRE1");
    await connectController(room, { profileId: "p1", displayName: "One" });

    const ran = await runDurableObjectAlarm(room);
    expect(ran).toBe(true);

    const snapshot = await room.getSnapshot();
    expect(snapshot?.status).toBe("expired");
    expect(snapshot?.players[0]?.connected).toBe(false);
  });

  it("routes a stage WebSocket through the Worker", async () => {
    const createResponse = await SELF.fetch("https://boggle.test/api/rooms", { method: "POST" });
    const created = await readJson<{ joinCode: string }>(createResponse);

    const response = await SELF.fetch(`https://boggle.test/ws/${created.joinCode}?role=stage`, {
      headers: { Upgrade: "websocket" },
    });

    const socket = webSocketFromResponse(response);
    const firstSnapshotPromise = waitForEvent(socket, "room_snapshot");
    socket.accept();
    const firstSnapshot = await firstSnapshotPromise;

    expect(firstSnapshot.snapshot.joinCode).toBe(created.joinCode);
    expect(firstSnapshot.snapshot.stageConnections).toBe(1);
  });

  it("lets 20 controllers join and receive consistent snapshots", async () => {
    const room = await createRoom("LOAD20");
    const controllers = [];

    for (let index = 1; index <= 20; index += 1) {
      controllers.push(
        await connectController(room, {
          profileId: `p${String(index).padStart(2, "0")}`,
          displayName: `Player ${index}`,
        }),
      );
    }

    const snapshots = await Promise.all(
      controllers.map((controller) => requestSnapshot(controller.socket)),
    );
    const serialized = snapshots.map((event) => JSON.stringify(event.snapshot));

    expect(new Set(serialized).size).toBe(1);
    expect(snapshots[0]?.snapshot.players).toHaveLength(20);
    expect(snapshots[0]?.snapshot.players.every((player) => player.connected)).toBe(true);
    expect(snapshots[0]?.snapshot.controllerConnections).toBe(20);
    expect(snapshots[0]?.snapshot.hostProfileId).toBe("p01");
  });

  it("assigns host to the first connected controller", async () => {
    const room = await createRoom("HOST01");
    await connectController(room, { profileId: "p1", displayName: "One" });
    await connectController(room, { profileId: "p2", displayName: "Two" });

    const snapshot = await room.getSnapshot();
    expect(snapshot?.hostProfileId).toBe("p1");
    expect(snapshot?.players.find((player) => player.profileId === "p1")?.host).toBe(true);
    expect(snapshot?.players.find((player) => player.profileId === "p2")?.host).toBe(false);
  });

  it("broadcasts profile updates to the stage", async () => {
    const room = await createRoom("PROFILE1");
    const stage = await connectStage(room);
    const controller = await connectController(room, { profileId: "p1", displayName: "Adam" });

    const profileUpdated = waitForEvent(stage.socket, "player_updated");
    controller.socket.send(JSON.stringify({ type: "profile_update", displayName: "Adam S." }));
    const event = await profileUpdated;

    expect(event.player.displayName).toBe("Adam S.");
    expect(event.snapshot.players[0]?.displayName).toBe("Adam S.");
  });

  it("transfers host on disconnect and supports reconnect/resync", async () => {
    const room = await createRoom("RECON1");
    const first = await connectController(room, { profileId: "p1", displayName: "One" });
    const second = await connectController(room, { profileId: "p2", displayName: "Two" });

    const hostChanged = waitForEvent(second.socket, "host_changed");
    first.socket.close(1000, "leaving");
    const hostEvent = await hostChanged;

    expect(hostEvent.hostProfileId).toBe("p2");
    expect(hostEvent.snapshot.players.find((player) => player.profileId === "p1")?.connected).toBe(false);
    expect(hostEvent.snapshot.players.find((player) => player.profileId === "p2")?.host).toBe(true);

    const reconnected = await connectController(room, { profileId: "p1", displayName: "One Again" });

    expect(reconnected.snapshot.hostProfileId).toBe("p2");
    expect(reconnected.snapshot.players.find((player) => player.profileId === "p1")?.connected).toBe(true);
    expect(reconnected.snapshot.players.find((player) => player.profileId === "p1")?.displayName).toBe(
      "One Again",
    );
  });

  it("enforces one active device per profile", async () => {
    const room = await createRoom("ACTIVE1");
    const first = await connectController(room, { profileId: "p1", displayName: "First" });
    const firstConnectionId = first.snapshot.players[0]?.connectionId;

    const replaced = waitForEvent(first.socket, "controller_replaced");
    const second = await connectController(room, { profileId: "p1", displayName: "Second" });
    const replacedEvent = await replaced;
    const secondConnectionId = second.snapshot.players[0]?.connectionId;

    expect(replacedEvent.profileId).toBe("p1");
    expect(second.snapshot.players).toHaveLength(1);
    expect(second.snapshot.players[0]?.displayName).toBe("Second");
    expect(secondConnectionId).toBeTruthy();
    expect(secondConnectionId).not.toBe(firstConnectionId);

    const settled = await waitForSnapshot(room, (snapshot) => snapshot.controllerConnections === 1);
    expect(settled.players[0]?.connected).toBe(true);
    expect(settled.players[0]?.displayName).toBe("Second");
  });

  it("broadcasts minimal host settings and round start/end events", async () => {
    const room = await createRoom("ROUND1");
    const stage = await connectStage(room);
    const host = await connectController(room, { profileId: "host", displayName: "Host" });

    const settingsUpdated = waitForEvent(stage.socket, "settings_updated");
    host.socket.send(JSON.stringify({ type: "settings_update", settings: { durationSeconds: 90 } }));
    const settingsEvent = await settingsUpdated;
    expect(settingsEvent.settings.durationSeconds).toBe(90);

    const roundStarted = waitForEvent(stage.socket, "round_started");
    host.socket.send(JSON.stringify({ type: "round_start" }));
    const startEvent = await roundStarted;
    expect(startEvent.snapshot.status).toBe("active_round");
    expect(startEvent.round.endsAt).toBeTruthy();

    const roundEnded = waitForEvent(stage.socket, "round_ended");
    host.socket.send(JSON.stringify({ type: "round_end" }));
    const endEvent = await roundEnded;
    expect(endEvent.snapshot.status).toBe("round_ended");
    expect(endEvent.round?.state).toBe("ended");
  });
});

async function createRoom(joinCode: string): Promise<RoomStub> {
  const room = env.ROOM_OBJECT.getByName(joinCode);
  await room.initialize(joinCode, FIXED_NOW);
  return room;
}

async function connectStage(room: RoomStub): Promise<{
  socket: WebSocket;
  snapshot: RoomSnapshot;
}> {
  const response = await room.fetch(
    new Request("https://room.test/ws?role=stage", {
      headers: { Upgrade: "websocket" },
    }),
  );
  const socket = webSocketFromResponse(response);
  const firstSnapshot = waitForEvent(socket, "room_snapshot");
  socket.accept();
  const event = await firstSnapshot;
  return { socket, snapshot: event.snapshot };
}

async function connectController(
  room: RoomStub,
  options: { profileId: string; displayName: string },
): Promise<{
  socket: WebSocket;
  snapshot: RoomSnapshot;
}> {
  const url = new URL("https://room.test/ws");
  url.searchParams.set("role", "controller");
  url.searchParams.set("profileId", options.profileId);
  url.searchParams.set("displayName", options.displayName);

  const response = await room.fetch(
    new Request(url, {
      headers: { Upgrade: "websocket" },
    }),
  );
  const socket = webSocketFromResponse(response);
  const firstSnapshot = waitForEvent(socket, "room_snapshot");
  socket.accept();
  const event = await firstSnapshot;

  return { socket, snapshot: event.snapshot };
}

function webSocketFromResponse(response: Response): WebSocket {
  expect(response.status).toBe(101);
  const socket = response.webSocket;
  if (!socket) throw new Error("Expected WebSocket response.");

  return trackSocket(socket);
}

function trackSocket(socket: WebSocket): WebSocket {
  openSockets.push(socket);
  return socket;
}

function requestSnapshot(socket: WebSocket): Promise<RoomEvent<"room_snapshot">> {
  const event = waitForEvent(socket, "room_snapshot");
  socket.send(JSON.stringify({ type: "snapshot_request" }));
  return event;
}

function waitForEvent<T extends ServerEvent["type"]>(
  socket: WebSocket,
  type: T,
): Promise<RoomEvent<T>> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for ${type}`));
    }, eventTimeoutMs);

    const onMessage = (event: MessageEvent) => {
      const serverEvent = JSON.parse(String(event.data)) as ServerEvent;
      if (serverEvent.type !== type) return;

      cleanup();
      resolve(serverEvent as RoomEvent<T>);
    };

    const onClose = () => {
      cleanup();
      reject(new Error(`Socket closed before ${type}`));
    };

    const cleanup = () => {
      clearTimeout(timeout);
      socket.removeEventListener("message", onMessage);
      socket.removeEventListener("close", onClose);
    };

    socket.addEventListener("message", onMessage);
    socket.addEventListener("close", onClose);
  });
}

async function waitForSnapshot(
  room: RoomStub,
  predicate: (snapshot: RoomSnapshot) => boolean,
): Promise<RoomSnapshot> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const snapshot = await room.getSnapshot();
    if (snapshot && predicate(snapshot)) return snapshot;
    await scheduler.wait(10);
  }

  throw new Error("Timed out waiting for room snapshot predicate.");
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}
