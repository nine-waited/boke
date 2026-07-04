import type { Ctx } from "@milkdown/ctx";
import { commandsCtx, editorViewCtx } from "@milkdown/kit/core";
import {
  addBlockTypeCommand,
  clearTextInCurrentBlockCommand,
  codeBlockSchema,
  listItemSchema,
  selectTextNearPosCommand,
  setBlockTypeCommand,
  wrapInBlockTypeCommand,
} from "@milkdown/kit/preset/commonmark";
import { createTable } from "@milkdown/kit/preset/gfm";

export type MarkdownInsertBlock = "code" | "table" | "math" | "taskList";

export function insertMarkdownBlock(ctx: Ctx, block: MarkdownInsertBlock): void {
  const commands = ctx.get(commandsCtx);
  const view = ctx.get(editorViewCtx);
  const { from } = view.state.selection;

  commands.call(clearTextInCurrentBlockCommand.key);

  switch (block) {
    case "code":
      commands.call(setBlockTypeCommand.key, {
        nodeType: codeBlockSchema.type(ctx),
      });
      break;
    case "table":
      commands.call(addBlockTypeCommand.key, {
        nodeType: createTable(ctx, 3, 3),
      });
      commands.call(selectTextNearPosCommand.key, { pos: from });
      break;
    case "math":
      commands.call(addBlockTypeCommand.key, {
        nodeType: codeBlockSchema.type(ctx),
        attrs: { language: "LaTeX" },
      });
      break;
    case "taskList":
      commands.call(wrapInBlockTypeCommand.key, {
        nodeType: listItemSchema.type(ctx),
        attrs: { checked: false },
      });
      break;
  }
}
