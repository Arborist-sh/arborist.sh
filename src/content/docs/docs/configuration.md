---
title: Configuration
description: Profiles, the profile JSON shape, and every provider, github, pool, and secrets field.
---

Graft's runner setup lives in a profile: one JSON file holding the backend, the GitHub App, the pools, and where secrets are stored. `graft init` and `graft profile create` write one interactively. This page is the reference for the file itself.

## Profiles

Profiles live at `~/.graft/profiles/<name>.json`. One is active at a time. `graft arborist tend`, `graft arborist check`, and `graft config validate` use the active profile unless you pass `--profile NAME` or `--config PATH`. Switch setups (personal versus work) with `graft profile use`.

```sh
graft profile create          # interactive wizard: new profile + pools
graft profile list            # list profiles (active marked *)
graft profile use <name>      # set the active profile
graft profile show [name]     # print a profile's config
graft profile path [name]     # print a profile's file path
graft profile rm <name>       # delete a profile
```

## The profile shape

`graft config template` prints a starter:

```json
{
  "provider": { "type": "tart" },
  "github": { "appId": 12345, "target": "org:my-org", "scope": "login" },
  "pools": [
    {
      "name": "macos-release",
      "image": "ghcr.io/cirruslabs/macos-tahoe-xcode:latest",
      "os": "macos",
      "count": 2,
      "labels": ["self-hosted", "macos", "release"]
    }
  ],
  "secrets": { "store": "keychain" }
}
```

### `provider`

The backend. `{ "type": "tart" }` runs VMs on this host. `{ "type": "orchard", "controllerURL": …, "serviceAccount": …, "maxVMs": … }` schedules them onto an Orchard fleet. See [Orchard](/docs/orchard/).

### `github`

The App and where runners register. It's declared once at the profile level and inherited by every pool.

| Field | Meaning |
|-------|---------|
| `appId` | The GitHub App ID. |
| `target` | Where runners register: `org:NAME` or `repo:OWNER/NAME`. |
| `scope` | Which keychain holds the App's key: `login` (interactive Mac), `system` (headless or daemon host), or a keychain path. Defaults to `login`. |
| `runnerGroupId` | The runner group. Defaults to `1`. Must be 1 or higher for org targets. |

The App ID and its key always travel together, so there's no separate key path to configure. See [Runners](/docs/runners/) for importing the key.

### `pools`

A pool is just its workload.

| Field | Meaning |
|-------|---------|
| `name` | The pool's name. Also used in the default labels. |
| `image` | The Tart image to clone: a registry image or a local [sapling](/docs/recipes/). |
| `os` | Guest OS, `macos`. Linux is a planned future epic. |
| `count` | How many runners to keep. macOS is capped at 2 VMs per host across all pools. |
| `labels` | The pool's tags. A workflow's `runs-on:` targets these. Defaults to `["self-hosted", <os>, <name>]`. |
| `cpu` | Optional CPU cores per leaf. Defaults to the backend default. |
| `memory` | Optional memory per leaf, in megabytes. Defaults to the backend default. |

Pool sizing is independent of the image, so a small lint pool and a fat e2e pool can share one toolchain image. On Orchard, `memory` is also requested from the scheduler so a branch isn't over-packed.

Pools can also carry `mounts` (host cache directories, preferably read-only) and `network` (`bridged:<iface>` for hosts where NAT is blocked). See [Recipes](/docs/recipes/) for the caching strategy.

### Overriding `github` per pool

A pool may carry its own `github` object to override the profile's, which makes a multi-repo profile possible. It takes the same fields (`appId`, `target`, `scope`, `runnerGroupId`). Normally you don't need this.

### `secrets`

`{ "store": "keychain" }`. Keys are resolved from the macOS Keychain by App ID.

## Editing pools from the CLI

```sh
graft pool new [--profile NAME]      # interactive wizard (image picked from the machine)
graft pool list [--profile NAME]
graft pool rm <name> [--profile NAME]
graft pool add --name N --image I [--os macos] [--count N] [--labels a,b,c] \
               [--cpu N] [--memory MB] [--mount PATH[:ro]] \
               [--app-id A --target T [--runner-group-id N]] [--profile NAME]
```

`pool add` adds or replaces a pool. Without `--app-id` and `--target` the pool inherits the profile's `github`. With them, it gets its own override. `--labels` takes a comma-separated list, and blank means the default. `--mount` is repeatable and accepts `path`, `name:path`, or `name:path:ro`.

## Validate

```sh
graft config validate [--profile NAME] [--config PATH] [--skip-keys]
```

It checks that the config is well-formed and, unless you pass `--skip-keys`, that each App's private key is present in the Keychain. To test auth against GitHub itself, run `graft arborist check`.
