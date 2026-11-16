// One edit-together room: the saved definition it started from, every Creator record since (in arrival order)
// and the people in it. Each socket keeps its id, name, colour and presence in socket.client.
import type { WebSocket } from "ws";

export type EditClient = { id: string; name: string; slot: number; state: unknown; roomKey: string };
export type EditSocket = WebSocket & { client: EditClient };

/** Colour slots, skipping 5 (yellow is unreadable with white text); 0 is gray and never assigned. */
const SLOTS = [1, 2, 3, 4, 6, 7, 8, 9];

/** The colour of each slot: the same values as survey-core's --sjs2-color-utility-user-bg-color-N. */
export const PALETTE = ["#808080", "#1570EF", "#CA4FFB", "#19B35C", "#19B394", "#F9C50B", "#F99130", "#F1529C", "#02ADEB", "#4E6198"];

export class EditRoom {
  seed: unknown;
  /** append-only: never deduplicated, replayed in this order */
  log: unknown[] = [];
  clients = new Set<EditSocket>();
  #dropTimer: NodeJS.Timeout | null = null;

  constructor(seed: unknown) {
    this.seed = seed;
  }

  freeSlot(): number {
    const taken = new Set([...this.clients].map((ws) => ws.client.slot));
    return SLOTS.find((slot) => !taken.has(slot)) ?? SLOTS[this.clients.size % SLOTS.length];
  }

  /** Everyone else who has shared their presence: { clientId, name, colorIndex, color, state }. */
  roster(except: EditSocket) {
    return [...this.clients].filter((ws) => ws !== except && ws.client.state !== null).map((ws) => EditRoom.peer(ws));
  }

  /** Creator's plugin paints rings and cursors from `color`, so each peer carries it next to colorIndex. */
  static peer(ws: EditSocket) {
    const { id, name, slot, state } = ws.client;
    return { clientId: id, name, colorIndex: slot, color: PALETTE[slot], state };
  }

  /** Send to everyone in the room except the sender. ws keeps the order of send() calls on each socket. */
  broadcast(from: EditSocket, message: unknown): void {
    const json = JSON.stringify(message);
    for (const ws of this.clients) if (ws !== from) ws.send(json);
  }

  dropAfter(ms: number, drop: () => void): void {
    this.#dropTimer = setTimeout(() => this.clients.size === 0 && drop(), ms);
  }

  cancelDrop(): void {
    if (this.#dropTimer) clearTimeout(this.#dropTimer);
    this.#dropTimer = null;
  }
}
