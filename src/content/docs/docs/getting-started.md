---
title: What is Graft?
description: Graft is one golden Tart VM image for macOS that powers both your dev environment and your ephemeral CI runners.
---

Graft is one golden [Tart](https://tart.run) VM image for macOS that powers both your **dev environment** and your **ephemeral CI runners**. It's open source and built for fleets.

Linux guests are a planned future epic. macOS is the supported target today.

Graft does three things off one `.graft` seed (the recipe file that describes an image):

- **`graft sapling grow`** grows a golden image (a *sapling*) with your full toolchain and warm caches (Xcode, Node, CocoaPods, Detox and so on) baked in.
- **`graft nest`** lets you develop *inside* that image over VS Code Remote-SSH. A nest is a dev box. Think Codespaces for native macOS and iOS, off the exact image your CI uses.
- **`graft arborist tend`** runs ephemeral GitHub Actions runners. Each one boots a fresh VM, registers with GitHub, runs **exactly one job**, then tears itself down. Ephemerality is enforced by construction (JIT runners), not by convention, so there's no state drift and no leftover secrets.

Because dev and CI share one image, "works on my machine" stops being a thing.

## Why

- Built for **fleets**: scale to any number of runners across hosts, with Apple's per-host macOS-VM limits respected by construction.
- **Warm by default**: caches bake into the image via APFS copy-on-write, so every ephemeral runner gets an instant private warm cache. "Refresh" is just a rebuild.
- Designed from day one to swap a local Tart backend for an [Orchard](https://github.com/cirruslabs/orchard) fleet without touching the runner logic.

Graft owes a lot to [Tartelet](https://github.com/shapehq/tartelet), which pioneered the ephemeral-Tart-runner approach on macOS. Graft pushes that idea toward multi-host fleets and a shared dev/CI image.

## The Apple 2-VM limit

Apple Silicon enforces a hard limit of **2 concurrent macOS VMs per host** in the XNU kernel. Graft respects it: macOS pools are capped at 2 VMs per host, budgeted across all pools.

To scale macOS beyond 2, add hosts. That's what the Orchard backend is for. Linux guests would be uncapped, bounded by RAM and cores, but Linux is a planned future epic and hasn't been validated.

## What's proven

| Area | State |
|------|-------|
| VM layer (`tart` clone, boot, IP, destroy) | Working |
| GitHub App auth and JIT runner config | Built. HTTP unverified without a real App |
| Keychain secret store (login and system) | Working. Cross-process read needs ACL hardening |
| `tart exec` provisioning and runner loop | Built. Runner download unverified on a live VM |
| Pool supervisor, state, daemon | Built and unit-tested |
| Image builder, `graft nest`, `.graft` recipes | Built and tested. A real image was baked end-to-end |
| Orchard multi-host backend | Verified end-to-end against a live controller |
| Health monitor (`--monitor`) | Built and unit-tested. Detection-only, per-role agents |
| **Linux guests** | **Planned (future epic).** The OS-aware plumbing exists (runner arch, capacity, Orchard `--os linux`), but it's unproven and has known gaps: local `tart exec` is macOS-guest only, runner deps and run-as-root aren't handled, and the image builder is macOS-only. |

Graft is built and driven end-to-end on macOS. The parts that need real GitHub credentials or a booted VM to fully prove are flagged in code (`TODO(real-VM)`).

## Where next

- [Install](/docs/install/): Homebrew, the desktop app, or build from source.
- [Recipes](/docs/recipes/): write a `.graft` seed and grow a sapling.
- [Nests](/docs/nest/): develop inside the VM.
- [Runners](/docs/runners/): set up ephemeral GitHub Actions runners.
