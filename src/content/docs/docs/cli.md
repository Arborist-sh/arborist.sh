---
title: CLI reference
description: Every graft command and flag, in the order graft --help lists them.
---

Generated from `graft` v0.5.6. Run `graft help <command>` or `graft <command> --help` for the live text. Every command also accepts `-h`/`--help` and `--version`. Profile-aware commands default to the active profile (`graft profile use`).

```sh
graft <command> [subcommand] [flags]
```

## init

Interactive setup: create a profile, add pools, import keys.

```sh
graft init
```

## arborist

Tend the tree: supervise, check, and inspect.

```sh
graft arborist tend [-c <config>] [--profile <p>] [--foreground] [--daemon] [-v] [--monitor]   supervise runners until stopped
graft arborist attach [-c <config>] [--profile <p>]                                            live read-only view of a running supervisor (Ctrl-C detaches)
graft arborist check [--app-id <id>] [--target <t>] [--runner-group-id <n>] [-c <config>] [--profile <p>] [--pool <name>] [--no-probe]   verify the GitHub App auth chain (no VM boot)
graft arborist canopy [--profile <p>]                                                          tree overview: trunk, branches, free capacity
graft arborist branches [--profile <p>]                                                        list branches (workers) and leaf capacity
graft arborist leaves [--profile <p>] [--all]                                                  list leaves (VMs); --all shows the whole cluster
graft arborist runners list [--profile <p>]                                                    list graft runners on GitHub
graft arborist runners prune [--profile <p>] [--include-online]                                delete offline runner husks (--include-online is dangerous)
```

`tend` backgrounds a detached supervisor by default and attaches a live view. `--foreground` supervises in the current process; `--daemon` is for launchd-managed hosts; `--monitor` also runs the [health monitor](/docs/health/).

## status

Show supervisor and runner state.

```sh
graft status
```

## stop

Gracefully stop a running supervisor.

```sh
graft stop
```

## plant

Plant the trunk: run the Orchard controller in the foreground. See [Orchard](/docs/orchard/).

```sh
graft plant [--data-dir <dir>] [--monitor]   controller state dir (default ~/.orchard/controller); --monitor reports trunk host health
```

## branch

Graft a branch on: run a worker that joins the tree.

```sh
graft branch <url> [--token <t>] [--name <n>] [--labels k=v,...] [--reserve <GB>] [--leaves <N>] [--monitor]   join the trunk at <url>
```

## prune

Prune a branch: remove a worker from the tree.

```sh
graft prune <name> [--url <url>] [--profile <p>]   deregister a worker
```

## bonsai

A whole tiny tree (trunk plus branch) on this machine, for local testing.

```sh
graft bonsai [--data-dir <dir>]
```

## profile

Manage config profiles (switch between, say, personal and work).

```sh
graft profile create          interactively create a profile (alias: new)
graft profile list            list profiles (active marked with *)
graft profile use <name>      set the active profile
graft profile show [<name>]   print a profile's config (default: active)
graft profile rm <name>       delete a profile
graft profile path [<name>]   print a profile's file path (default: active)
```

## pool

Add, remove, or list pools in a profile.

```sh
graft pool new [--profile <p>]                 interactively add a pool (alias: create)
graft pool add --name <n> --image <img> [--os macos|linux] [--count <n>] [--labels a,b] [--mount <spec> ...] [--cpu <n>] [--memory <MB>] [--app-id <id> --target <t> [--runner-group-id <n>]] [--profile <p>]   add or replace a pool
graft pool rm <name> [--profile <p>]           remove a pool
graft pool list [--profile <p>]                list pools
```

`--mount` takes `path`, `name:path`, or `name:path:ro` and is repeatable. `--count` defaults to 2 and `--os` to `macos`.

## leaf

Low-level VM (leaf) plumbing.

```sh
graft leaf create <image> [--os macos|linux]   clone + boot a VM, wait for its IP, print name<TAB>ip
graft leaf rm <name>                           stop and destroy a leaf
graft leaf list [--all]                        list graft-managed VMs (--all: every Tart VM)
graft leaf ip <name> [--wait]                  print a VM's IP (--wait polls until assigned)
```

## config

Validate configuration or print a starter template.

```sh
graft config validate [-c <config>] [--profile <p>] [--skip-keys]   check a config is well-formed
graft config template                                               print a starter config to stdout
```

## secrets

Manage GitHub App private keys in the macOS Keychain. Every subcommand takes `--keychain <file>` (default: login keychain, e.g. `/Library/Keychains/System.keychain`).

```sh
graft secrets create-app [--org <org>] [--name <name>] [--profile <p>] [--keychain <k>]   create a GitHub App in your browser and store its key
graft secrets import --app-id <id> --pem <file> [--name <name>] [--keychain <k>]          import a private-key PEM (then shred the file)
graft secrets list [--keychain <k>]                                                       list App IDs with a stored key
graft secrets fetch-names [--force] [--keychain <k>]                                      resolve and store display names from GitHub
graft secrets rm --app-id <id> [--keychain <k>]                                           remove a stored key
```

## sapling

Grow and manage saplings, the golden images leaves clone from. See [Recipes](/docs/recipes/).

```sh
graft sapling grow --seed <file> [--name <n>] [-c <config>] [--profile <p>] [--network nat|bridged:<iface>|softnet]   build an image from a .graft / .yml / .json seed
graft sapling render --seed <file>      print the provisioning script a recipe compiles to (no build)
graft sapling inspect <image>           boot an image and report the tools/versions baked in
graft sapling list                      list local images and VMs
graft sapling rm <name>                 delete a local image or VM
graft sapling prune [--force]           remove leftover build VMs (--force also removes running ones)
graft sapling push <name> <ref>         push a local image to a registry
graft sapling pull <ref>                pull an image from a registry
graft sapling template                  print a starter recipe
```

## nest

Spin up or resume a nest (dev box) from a sapling. `open` is the default subcommand. See [Dev boxes](/docs/nest/).

```sh
graft nest [open] [<target>] [--code] [--image <img>] [--ref <ref>] [--name <n>] [--mount <spec> ...] [--network nat|bridged:<iface>|softnet] [--profile <p>] [--ephemeral] [-- <cmd> ...]   clone, resume, mount ., or pick
graft nest ls                           list dev boxes
graft nest rm [<box>]                   remove a dev box (picker if omitted)
```
