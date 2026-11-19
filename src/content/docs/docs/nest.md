---
title: Dev boxes (graft nest)
description: Spin up a dev box, a VM cloned from your golden image, and work in it from a shell or VS Code over Remote-SSH.
---

A **nest** is graft's name for a dev box: a VM cloned from one of your **saplings** (golden images), the same image your CI runners use. You get a Mac dev environment with the full toolchain already baked in, and the host stays a thin client. `graft nest --code` opens VS Code over Remote-SSH into the box, so the editor, terminal, language servers, and builds all run guest-side.

```sh
graft nest                       # picker: resume a box / clone a repo / mount here / scratch
graft nest your-org/app          # clone a repo into a persistent box and shell in
graft nest your-org/app --code   # same, but open VS Code into it
graft nest app                   # resume the persistent box 'app'
graft nest .                     # mount the current directory into an ephemeral box
graft nest ls                    # list dev boxes
graft nest rm [box]              # remove a box (picker if omitted)
```

`open` is the default subcommand, so `graft nest <target>` is shorthand for `graft nest open <target>`.

It is Codespaces or dev containers, but for native macOS and iOS work, which containers can't do because Xcode and the simulator need a real macOS VM. Because your box is a clone of the image your CI runs, "works on my machine" goes away: your machine is the CI machine.

## The model: clone is persistent, mount is ephemeral

Persistence isn't a separate choice. It falls out of where the code comes from:

| Source | Box | Resume? | Connect |
|---|---|---|---|
| clone `<repo>` | persistent (`graft-dev-<repo>`) | yes | shell or `--code` |
| mount `.` (`$PWD`) | ephemeral, deleted on exit | never | shell or `-- cmd` |
| scratch (no repo) | ephemeral | no | shell or `--code` |

- **Clone** copies the repo into the VM (`~/work/<repo>`), so `node_modules`, Pods, branches, and build state live there. That is worth keeping and resuming; it is your dev home. Auth is a short-lived `gh` token over HTTPS, nothing is stored in the VM, and `git push` / `git pull` use VS Code's forwarded credentials.
- **Mount** shares your current directory from the host. Your files are the source of truth on your laptop, so there is nothing in the VM worth keeping. graft spins a fresh ephemeral box each time and deletes it when you're done. Use it for "run my local files in a CI-identical environment."
- A mount box can't be resumed anyway: Tart mounts are fixed at boot, so a different directory means a fresh boot. Resume only applies to clone boxes. Repeated work belongs in a clone; one-off work belongs in a mount.

VM names keep the `graft-dev-<repo>` prefix. That is how you'll see them in `graft leaf list` and `tart list`.

## Connecting: shell or VS Code

A shell is the default. `--code` opens VS Code over Remote-SSH into the box. The interactive picker asks which you want.

```sh
graft nest your-org/app --code   # clone + open VS Code
graft nest app                   # resume into a shell
graft nest . -- yarn test        # mount $PWD, run one command, tear down
```

:::note
`--code` boxes are always left running, because VS Code can't tell graft when you've closed the window. Remove them with `graft nest rm <box>`.
:::

### VS Code prerequisites

- The `code` CLI on your `PATH` (VS Code, then Cmd-Shift-P, then "Shell Command: Install 'code' command in PATH").
- The **Remote - SSH** extension. graft installs it if it's missing.
- graft mints a dedicated key (`~/.graft/dev_ed25519`), injects it into the box, and writes a self-managed `~/.ssh/graft.config` that your main SSH config includes. The box therefore also shows up in VS Code's Remote Explorer, and you can open it from there too.

## Flags

```sh
graft nest [open] [<target>] [--code] [--image <image>] [--ref <ref>] [--name <name>]
           [--mount <mount> ...] [--network <network>] [--profile <profile>]
           [--ephemeral] [-- <command> ...]
```

| Flag | What it does |
|---|---|
| `<target>` | `owner/repo` or a git URL (clone), a box name (resume), `.` (mount this directory), or omit to pick |
| `--code` | Open VS Code into the VM over Remote-SSH (default: a shell) |
| `--image <image>` | Base image for a new box (default: pick from local images) |
| `--ref <ref>` | Branch or tag to clone (with a repo target) |
| `--name <name>` | Override the box name. It stays in the `graft-dev-` namespace and shows in `ls`. Useful for a second box on the same repo |
| `--mount <mount>` | Extra host mount, `path`, `name:path`, or `name:path:ro`, repeatable. Boot-time only: you can't mount into a running box |
| `--network <network>` | VM networking: `nat` (default), `bridged:<iface>`, or `softnet`. Use bridged behind a corporate proxy such as Zscaler; see [Headless hosts](/docs/headless-hosts/#bridged-networking) |
| `--profile <profile>` | Profile whose GitHub App backs the repo picker (default: active) |
| `--ephemeral` | Force a throwaway box even when cloning |
| `-- <command>` | Run a command in the box instead of an interactive shell |

To build the image a box clones from, see [Recipes](/docs/recipes/). The full flag list for every command is in the [CLI reference](/docs/cli/#nest).
