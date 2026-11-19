---
title: VS Code extension
description: Syntax highlighting, completion, hover docs, snippets and render/grow commands for .graft recipes in VS Code.
---

The **Graft** extension adds editor support for **`.graft`** seeds (and `Graftfile`), the declarative recipes behind [`graft sapling grow`](/docs/recipes/).

- **Syntax highlighting.** graft keywords are colored, and the bash inside `run: |` / `script: |` blocks is highlighted as shell.
- **Completion + hover.** Type a field and get the declarative keys (`node`, `ruby`, `brew`, `xcode-first-launch`, ...) with docs on what each compiles to.
- **Snippets.** `graft`, `graft-rn`, `graft-ios` scaffold a recipe.
- **Commands.** `Graft: Render compiled provisioning script` (an eye icon in the editor title bar) and `Graft: Build image from this recipe`. Both shell out to the `graft` CLI on your PATH.
- **File icon.** `.graft` files get the Graft mark in icon themes that support language icons (e.g. Seti, the default).
- **JSON schema.** Bundled at [`schemas/graft.schema.json`](https://github.com/Arborist-sh/graft/blob/main/editors/vscode/schemas/graft.schema.json).

## Install

From the Extensions view (`Shift+Cmd+X`), search **Graft** and click Install, or:

```sh
code --install-extension arborist-sh.graftfile
```

**Build from source:** open `editors/vscode` in VS Code and press **F5** for an Extension Development Host, or package a `.vsix` yourself:

```sh
cd editors/vscode
npx @vscode/vsce package
code --install-extension dotgraft-0.1.0.vsix
```

## What the commands run

Both commands save the active `.graft` file and run a command in a terminal named `graft`. Make sure `graft` (or a symlink to your dev build) is on the PATH the integrated terminal uses.

Today the extension sends:

```sh
graft image render -f "<file>"
graft image build  -f "<file>"
```

:::caution
Those are the old verb names. The current CLI spells them `graft sapling render --seed <file>` and `graft sapling grow --seed <file>`, and `graft image ...` is no longer a command. Until the extension is updated, the two commands will fail in the terminal; run the `graft sapling` equivalents by hand. (Checked against `editors/vscode/extension.js`, which still builds the command as `graft image <sub> -f <file>`.)
:::

There is no build step for the extension itself; it is plain JS plus declarative contributions.
