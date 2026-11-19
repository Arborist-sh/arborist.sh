---
title: Multi-host fleets (Orchard)
description: Scale past one Mac by running a trunk (Orchard controller) with branches (workers) that your runner VMs grow on.
---

A single Mac caps at **2 macOS VMs** (Apple's kernel limit). To run more runners, add hosts and let [Orchard](https://github.com/cirruslabs/orchard) schedule VMs across them. Orchard is Cirrus Labs' orchestrator for Tart: a **controller** that holds desired state and a fleet of **workers** (Apple Silicon Macs running `tart`) that actually boot the VMs.

graft's `OrchardProvider` is a drop-in swap for the local Tart backend: same pool config, same ephemeral runner loop, same `.graft` recipes. The only change is a `provider` of `{ "type": "orchard", ... }`. graft asks the controller to create a VM, the controller picks a worker with free capacity (and enforces the per-host 2-macOS limit for you), graft runs the runner over Orchard's SSH tunnel, and graft deletes the VM when the job is done.

graft calls a fleet a **tree**:

| Tree word | Orchard word | What it is |
|---|---|---|
| trunk | controller | schedules VMs, holds state (`graft plant`) |
| branch | worker | an Apple Silicon Mac that boots VMs (`graft branch <trunk-url>`) |
| leaf | VM | one ephemeral runner |
| arborist | supervisor | the runner loop (`graft arborist tend`) |

The vendor name only appears in `provider: "orchard"` config.

## How the fleet works

Three roles, loosely coupled, and that coupling is the point:

- **graft is demand.** Its job is a desired-state loop: keep `count` runners alive, forever. It keeps asking the controller for VMs and never checks how much room the fleet has.
- **Workers are supply.** A worker registers with the controller and idles, advertising its free slots. It never spins up a VM on its own.
- **The controller is the matchmaker.** It places each "I need a VM" request onto a worker with a free slot, respecting each host's 2-macOS-VM cap and labels.

So adding a host is a no-op event. The new worker registers and becomes another place the controller can put a VM. On graft's next acquire (seconds away, since slots churn constantly) the controller starts placing fresh VMs on it. Removing a worker is just as quiet: its share of the churn lands on the others.

### The ephemeral churn loop

Each of graft's `count` slots runs this forever:

```text
acquire   -> orchard create vm -> controller places it on a worker -> boots -> running
provision -> start the JIT runner inside the VM (over the SSH tunnel)
run       -> runner picks up ONE job, runs it, exits (jitconfig is single-use)
release   -> orchard delete vm -> worker destroys it
             |------------ loop back to acquire (a FRESH VM) ------------|
```

The VM is never reused, so every job gets a pristine one. Scaling the fleet is decoupled from graft: it keeps saying "I want `count` runners," and the controller rebalances across whatever workers exist.

### How the runner gets into the VM

graft holds the GitHub App key and mints a single-use JIT config (a base64 blob). That blob is embedded in a bash provisioning script graft pipes over the exec tunnel (`orchard ssh vm ... bash -s`, script on stdin). The path is graft, then the controller websocket, then the worker's gRPC, then the worker SSHes into the VM, where `bash -s` runs the script and `exec ./run.sh --jitconfig <blob>`. The runner registers with GitHub from inside the VM.

Two properties fall out of this. The worker is a dumb pipe: it shells bytes between the controller tunnel and the VM's sshd, never parses the script, never touches GitHub, and holds no secret. And the App key never leaves graft; only the disposable JIT token travels outward, into a VM that is destroyed after one job.

## Driving the tree from graft

You don't have to leave the graft CLI to run a fleet. It shells out to `orchard` underneath.

| Command | What it does |
|---|---|
| `graft plant` | Plant the trunk: run the controller in the foreground, capturing the one-time admin token so `branch` and `prune` can authenticate |
| `graft branch <trunk-url>` | Graft a branch on: run a worker on this Mac that joins the tree (mints its own bootstrap token, or pass `--token`) |
| `graft prune <name>` | Prune a branch: deregister a worker |
| `graft bonsai` | Grow a bonsai: a whole tiny tree (trunk plus branch) on this machine, for local testing |
| `graft arborist canopy` | At-a-glance tree overview: trunk, branches, advertised, used, and free capacity |
| `graft arborist branches` | Per-branch table (advertised leaf slots, paused state) plus the tree's free-slot total |
| `graft arborist leaves [--all]` | Leaves (VMs) on the tree: graft's by default, the whole cluster with `--all` |

Setup happens in `graft init`. It asks for the backend (local Tart or Orchard tree) and, for a tree, collects the trunk URL and service account and stashes the token in the Keychain. A local fleet, end to end:

```sh
graft plant                              # terminal 1: the trunk (leave running)
graft branch http://localhost:6120       # terminal 2: graft a branch on (leave running)
graft init                               # terminal 3: pick "Orchard tree", point at the trunk
graft arborist canopy                    # sanity-check
graft arborist tend                      # graft leaves onto the branches
```

For a one-machine smoke test, `graft bonsai` starts the trunk and a branch together.

The service-account token is stored in the Keychain, keyed by account name (the same mechanism as the GitHub App PEM), so it never lands in profile JSON. `tend` resolves it at start: an inline provider `token` wins if present, otherwise the Keychain, otherwise empty (fine for an unsecured local trunk). For a remote secured controller, `graft init` creates the service account for you when you hold an admin `orchard` context; otherwise it falls back to pasting an existing token.

### Branch flags

```sh
graft branch <url> [--token <token>] [--name <name>] [--labels <labels>]
                   [--reserve <reserve>] [--leaves <leaves>] [--monitor]
```

| Flag | What it does |
|---|---|
| `--token` | Bootstrap token. Default: mint one, which needs the trunk planted on this machine |
| `--name` | Branch name (default: this host's name) |
| `--labels` | Comma-separated `key=value` labels, e.g. `hardware=m4max`. Pools can require labels to target hardware |
| `--reserve N` | Reserve N GB of host RAM: advertise (total minus N) to the scheduler so leaves can't OOM the host |
| `--leaves N` | How many leaves this branch can hold. Default: the host's auto-detected ceiling (2 on macOS). Use `--leaves 1` per branch if you run two branches on one Mac |
| `--monitor` | Also report this branch's host vitals (disk, memory, tart) to the webhook and logs; see [Health](/docs/health/) |

`graft plant` takes `--data-dir` (controller state and accounts persist there; default `~/.orchard/controller`) and `--monitor`. `graft prune <name>` takes `--url` (default: the profile's `controllerURL`) and `--profile`.

## How graft talks to Orchard

graft shells out to the `orchard` CLI, just as the local backend shells out to `tart`, so the [`orchard` binary](https://tart.run/orchard/quick-start/) must be on the `PATH` of the machine running `graft arborist tend`:

```sh
brew install cirruslabs/cli/orchard
```

Auth and endpoint are passed to every `orchard` call via environment, so graft never runs `orchard context create` or touches `~/.config/orchard`:

| Env var | From config |
|---|---|
| `ORCHARD_URL` | `provider.controllerURL` |
| `ORCHARD_SERVICE_ACCOUNT_NAME` | `provider.serviceAccount` |
| `ORCHARD_SERVICE_ACCOUNT_TOKEN` | `provider.token` |

Each `VMProvider` method maps to one `orchard` subcommand:

| graft | orchard |
|---|---|
| acquire | `orchard create vm --image ... --os darwin\|linux [--host-dirs ...] [--net-*] graft-<uuid>`, then poll `get vm <name>/status` until `running` |
| release | `orchard delete vm <name>` |
| exec | `orchard ssh vm <name> "<cmd>"` |
| run the runner | `orchard ssh vm <name> "bash -s"` (script on stdin) |

graft deliberately passes neither `--restart-policy` (Orchard defaults to `Never`) nor `--wait` (Orchard's `--wait` bounds the whole port-forward rendezvous, and `--wait 0` would kill it; see [Troubleshooting](#troubleshooting)). Every VM is named `graft-<uuid>`, so the shutdown sweep can find and delete its own VMs without touching anything else on the cluster.

## Setup

For a single-machine smoke test, skip all of this and use `graft plant`, `graft branch http://localhost:6120`, and `graft init`. For a real fleet:

### 1. Stand up the controller

Run `orchard controller run` on a host reachable from your Macs and from wherever `graft arborist tend` lives. It can be a Linux box: the controller only schedules and holds state. Add TLS and auth per the [Orchard deployment guide](https://tart.run/orchard/deploying-controller/).

### 2. Two service accounts

A fleet uses two, with different roles.

- **graft** creates, execs, and deletes VMs. `graft init` creates this one and stores its token in the Keychain when you hold an admin `orchard` context. The manual equivalent:
  ```sh
  orchard create service-account graft \
    --roles compute:read --roles compute:write --roles compute:connect --token <token>
  ```
  Either way the token belongs in the Keychain, not plaintext config.
- **workers** need a bootstrap token so Macs can join:
  ```sh
  orchard get bootstrap-token <worker-service-account>
  ```

### 3. Join each Mac as a branch

On every Apple Silicon Mac that will boot VMs:

```sh
graft branch https://orchard.example.com:6120 \
  --token <bootstrap-token> \
  --name mac-studio-1 \
  --labels hardware=m4max
```

That is the entire per-Mac setup. The Mac needs `tart` installed and an active GUI login session (Virtualization.framework won't boot a VM without one; see [Headless hosts](/docs/headless-hosts/)). Keep the branch alive with a launchd job so it survives reboots. A branch runs no runner logic and holds no GitHub credentials. Add or remove branches anytime; the controller absorbs the change on graft's next acquire.

### 4. Point graft at the controller

`graft init` writes this block and stores the token in the Keychain for you. There is no `token` field because it is Keychain-backed:

```json
{
  "provider": {
    "type": "orchard",
    "controllerURL": "https://orchard.example.com:6120",
    "serviceAccount": "graft",
    "maxVMs": 8
  },
  "github": { "appId": 12345, "target": "org:my-org" },
  "pools": [
    {
      "name": "macos-ci",
      "image": "ghcr.io/cirruslabs/macos-tahoe-xcode:latest",
      "os": "macos",
      "count": 6,
      "labels": ["self-hosted", "macos", "ci"]
    }
  ],
  "secrets": { "store": "keychain", "scope": "login" }
}
```

Validate and run:

```sh
graft config validate
graft arborist tend
```

## Capacity and scheduling

graft does not second-guess placement. The controller schedules across the fleet and owns Apple's per-host 2-macOS-VM limit. Your pool `count` is the desired number of runners: graft spawns a slot for each one and keeps it filled.

Capacity is a throttle, not a cap on how many slots exist. graft tracks how many leaves it is running against the fleet's **ceiling**, the total `tart-vms` capacity the live (non-paused) workers advertise, capped at `maxVMs` (default 100), and acquires another leaf only while it is below that ceiling. A slot with no room parks in `waiting for capacity` and acquires the moment a slot frees or a branch joins. The ceiling is re-read continuously, so a fleet that grows or shrinks changes how many slots fill without restarting `tend`: start against an empty fleet, add branches later, and the pools fill on their own. If the controller is unreachable, graft falls back to the static `maxVMs` ceiling.

Because graft never holds more leaves than the ceiling, it doesn't over-subscribe the fleet or churn through create, pending, timeout, delete. Set `count` to the runners you want and `maxVMs` to your fleet's real capacity (about 2 macOS VMs per branch). `graft arborist canopy` and `graft arborist branches` show the live free-slot count.

:::note
Orchard can schedule a macOS image as an `os: linux` VM to dodge the 2-macOS-VM-per-host cap (the guest still runs macOS; only the bookkeeping differs). graft passes the pool's declared `os` straight through, so this is an operator choice. Set `os: linux` on the pool only if you've accepted the tradeoffs; see the Orchard docs.
:::

## Mounts and images

- **Images:** workers pull pool images themselves (`image-pull-policy` is if-not-present), so graft skips the local pre-pull it does for the Tart backend. Push your `graft sapling grow` images to a registry the workers can reach, with `graft sapling push`.
- **Mounts:** a pool's `mounts` become `orchard create vm --host-dirs ...`. These resolve on the worker host, not on the machine running `tend`, so they are only useful for paths that exist on the workers.
- **Networking:** a pool's `network` maps to `--net-bridged <iface>` or `--net-softnet` on the worker, same as the local backend.

## Troubleshooting

- **`orchard ssh` or port-forward fails instantly with `context deadline exceeded` (500).** Orchard's `--wait` flag is the deadline for the entire port-forward rendezvous (the controller waiting for the worker to stand up the SSH tunnel), not just "wait for the VM to be running." So `--wait 0` kills the tunnel in about 100 microseconds, before the worker can respond. graft never passes `--wait 0` for this reason. If you hit this driving `orchard` by hand, pass a real `--wait` (the CLI default is 60s).
- **Tart's default 1-day DHCP lease** can independently cause worker-to-VM communication problems (Orchard warns about it at startup). If VMs are genuinely unreachable, fix it per [tart.run/faq, DHCP lease time](https://tart.run/faq/#changing-the-default-dhcp-lease-time).

The Orchard integration was verified end to end against Orchard 0.55.0 (`orchard dev`, single Mac): `create vm` with `--os`, `get vm <name>/status` polling, `ssh vm` exec, the JIT runner downloading over `orchard ssh` and registering on GitHub, and `delete vm`. graft avoids `list vms --quiet` (added after 0.55.0) and doesn't pass `--restart-policy`.
