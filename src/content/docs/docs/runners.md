---
title: Ephemeral runners
description: Create a GitHub App, store its key in the Keychain, configure pools, and tend ephemeral GitHub Actions runners.
---

`graft arborist tend` runs ephemeral GitHub Actions runners. An *arborist* is the runner supervisor: it keeps each pool at its desired size, and every runner boots a fresh VM, runs exactly one job, and is destroyed.

## 1. Create a GitHub App

Graft authenticates as a GitHub App, not a PAT. Give the App **Self-hosted runners: Read & write** (org) or **Administration: Read & write** (repo), install it on your org or repo, and download its private key (`.pem`).

To skip the manual steps, `graft secrets create-app` runs GitHub's App manifest flow. It opens your browser, you click **Create GitHub App**, and Graft stores the key in the Keychain for you. Pass `--org <org>` to create it under an organization you own, `--name` to choose the App name, and `--profile <name>` to also set that profile's App ID. The [desktop app](/docs/desktop-app/) can do the same thing.

## 2. Import the key into the Keychain

If you made the App by hand, import its key. It never lives on disk.

```sh
# Interactive hosts (login keychain):
graft secrets import --app-id <APP_ID> --pem ./app.pem
rm -P ./app.pem          # then shred the file

# Headless daemon hosts (system keychain, no login session at boot):
sudo graft secrets import --app-id <APP_ID> --pem ./app.pem --keychain /Library/Keychains/System.keychain
```

Graft resolves the key from the Keychain by App ID. There is no key path in config. The profile records *which* keychain each App's key lives in (`github.scope`: `login`, `system`, or a path), so there's no global flag to remember at run time. `graft init` sets it for you.

`graft secrets list` shows the App IDs with a stored key, and `graft secrets rm --app-id <APP_ID>` removes one.

## 3. Configure

`graft init` is the interactive route: it picks a backend, creates a profile, adds pools, and imports keys. To write the profile by hand, see [Configuration](/docs/configuration/).

```sh
graft config template > my-config.json
graft config validate --config my-config.json
```

Before you tend anything, check that the auth chain works without booting a VM:

```sh
graft arborist check
```

It mints an App token and creates and deletes a probe runner against the target. Add `--no-probe` to stop after the token step. Use `--app-id` and `--target` for a one-off check outside a profile.

## 4. Tend

```sh
graft arborist tend            # backgrounds a detached supervisor, then attaches a live view
graft arborist attach          # re-attach a live, read-only view (Ctrl+C detaches; it keeps tending)
graft status                   # supervisor liveness + live runner snapshot
graft stop                     # graceful shutdown
```

`tend` backgrounds the supervisor by default and attaches a live view. **Ctrl+C detaches the view and leaves the supervisor running.** Re-attach any time with `graft arborist attach`, and stop it with `graft stop`. It survives the launching terminal closing, so you don't need nohup or launchd.

Run a second `tend` and it detects the running one and offers to reconnect, kill, or cancel.

| Flag | Effect |
|------|--------|
| `--profile NAME` | Tend this profile instead of the active one. |
| `--foreground` | Supervise in the current process (blocking, live dashboard). Ctrl+C stops it. |
| `--daemon` | For launchd-managed hosts. launchd does the supervising. |
| `-v`, `--verbose` | Echo every step above the live status. |
| `--monitor` | Also report health to the configured webhook and logs. See [Health](/docs/health/). |

:::note
Running headless or on an EC2 Mac? Tart needs an active GUI login session. See [Headless hosts](/docs/headless-hosts/).
:::

## Labels and `runs-on:`

A pool's `labels` are its tags, and a workflow's `runs-on:` targets them. The default is `["self-hosted", <os>, <pool name>]`. Labels are baked into the JIT config, so they're immutable per runner.

```yaml
jobs:
  build:
    runs-on: [self-hosted, macos, release]
```

With the pool from the [configuration](/docs/configuration/) example, that job lands on a `macos-release` runner.

## Managing runner registrations

Graft's runners register with GitHub as they start. If a supervisor dies uncleanly you can be left with offline registrations ("husks").

```sh
graft arborist runners list              # graft's runner registrations for the profile's targets
graft arborist runners prune             # delete offline graft runners
```

Both take `--profile NAME`. `prune` only removes offline runners. `--include-online` also removes online ones, which kills live registrations.

## Where next

- [Configuration](/docs/configuration/) for the profile and pool fields.
- [Orchard](/docs/orchard/) to scale past two VMs per host.
- [Health](/docs/health/) for the health monitor.
