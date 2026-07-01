import type { Command } from "@boke/plugin-sdk";

export class CommandRegistry {
  private commands = new Map<string, Command>();
  private listeners = new Set<() => void>();

  register(command: Command): () => void {
    if (this.commands.has(command.id)) {
      console.warn(`[boke] Command "${command.id}" already registered; overwriting.`);
    }
    this.commands.set(command.id, command);
    this.notify();
    return () => this.unregister(command.id);
  }

  unregister(id: string): void {
    this.commands.delete(id);
    this.notify();
  }

  get(id: string): Command | undefined {
    return this.commands.get(id);
  }

  list(): ReadonlyArray<Command> {
    return [...this.commands.values()].filter((cmd) => {
      if (cmd.hidden) return false;
      if (cmd.checkCallback && !cmd.checkCallback(true)) return false;
      return true;
    });
  }

  listAll(): ReadonlyArray<Command> {
    return [...this.commands.values()];
  }

  async run(id: string): Promise<void> {
    const cmd = this.commands.get(id);
    if (!cmd) throw new Error(`Unknown command: ${id}`);
    if (cmd.checkCallback && !cmd.checkCallback(false)) return;
    await cmd.callback();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const l of this.listeners) l();
  }
}

export const commandRegistry = new CommandRegistry();
