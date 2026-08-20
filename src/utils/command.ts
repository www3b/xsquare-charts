import {createLogger} from './logger.js';
import {createEventBus} from './eventBus.js';

/**
 * Command — паттерн Группа (команда) + Командный стек (undo/redo).
 * Фигурирует в UX-доке: редактор должен поддерживать undo/redo
 * на действия пользователя.
 *
 *   const cmd = new NodeCreateCommand(node);
 *   editor.execute(cmd);          // apply() + push в стек
 *   editor.execute(new ...);
 *   editor.undo();  editor.redo();
 */
export interface Command {
  readonly type: string
  /** Применить изменение. */
  execute(ctx?: unknown): void
  /** Откатить изменение. */
  undo(ctx?: unknown): void
  /** Можно ли безопасно откатить без потери данных. */
  canUndo?(): boolean
}

export interface CommandStackEvents {
  executed: { command: Command; canUndo: boolean; canRedo: boolean }
  undone: { command: Command; canUndo: boolean; canRedo: boolean }
  redone: { command: Command; canUndo: boolean; canRedo: boolean }
  cleared: Record<string, never>
  changed: { size: number; canUndo: boolean; canRedo: boolean }
}

export class CommandStack {
  readonly bus = createEventBus();
  readonly log = createLogger('commandStack');

  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private context: unknown;

  constructor(context?: unknown) {
    this.context = context;
  }

  execute(command: Command): Command {
    command.execute(this.context);
    this.undoStack.push(command);
    this.redoStack = [];
    this.notify('executed', command);
    return command;
  }

  undo(): Command | undefined {
    while (this.undoStack.length) {
      const command = this.undoStack.pop() as Command;
      if (command.canUndo && command.canUndo() === false) {
        continue;
      }
      command.undo(this.context);
      this.redoStack.push(command);
      this.notify('undone', command);
      return command;
    }
    return undefined;
  }

  redo(): Command | undefined {
    const command = this.redoStack.pop();
    if (!command) {
      return undefined;
    }
    command.execute(this.context);
    this.undoStack.push(command);
    this.notify('redone', command);
    return command;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.bus.emit('cleared');
    this.notify('cleared' as keyof CommandStackEvents, undefined as never);
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  get size(): number {
    return this.undoStack.length;
  }

  on<T extends keyof CommandStackEvents>(
    event: T,
    fn: (payload: CommandStackEvents[T]) => void,
  ): () => void {
    this.bus.on(event as string, fn);
    return () => this.bus.off(event as string, fn as (...args: any[]) => any);
  }

  get undoCommands(): Command[] {
    return this.undoStack.slice();
  }

  private notify(event: keyof CommandStackEvents, command: Command | undefined): void {
    const payload = {
      command,
      canUndo: this.canUndo,
      canRedo: this.canRedo,
    } as CommandStackEvents[keyof CommandStackEvents];
    this.bus.emit(event as string, payload);
    this.bus.emit('changed', {
      size: this.size,
      canUndo: this.canUndo,
      canRedo: this.canRedo,
    } as CommandStackEvents['changed']);
  }
}

export default CommandStack;
