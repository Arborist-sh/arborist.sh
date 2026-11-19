---
title: Architecture
description: How graft's VMProvider abstraction, supervisor loop, tart exec provisioning, and SecretStore fit together.
---

Everything pivots on **`VMProvider`**: `capacity`, `acquire`, `release`, plus an `exec` channel. The supervisor never calls `tart` directly, so `LocalTartProvider` (single host) and `OrchardProvider` (multi-host fleet, see [Orchard](/docs/orchard/)) are a drop-in swap: same runner logic, different backend. The same move backs `SecretStore` (Keychain now, Vault or 1Password later).

## The supervisor loop

The supervisor (`graft arborist tend`) is a desired-state loop. Each pool's `count` becomes that many slots, and each slot runs this forever:

```text
PoolSupervisor (actor, desired-state loop)
  +- per slot, forever:
       provider.acquire(image, os)            -> RunningVM
       GitHubAppClient.generateJITConfig(...) -> JIT blob   (App JWT -> installation token -> JIT)
       RunnerProvisioner.runEphemeralRunner   -> tart exec ./run.sh --jitconfig, wait for exit
       provider.release(vm)                   -> tart stop + delete
```

Every job gets a fresh VM, and the JIT config is single-use, so a runner picks up one job and exits.

## Provisioning with tart exec

Provisioning uses **`tart exec`** (the Tart Guest Agent): no SSH, no keys, no passwords. Stock cirruslabs images ship the agent. Custom images must include it. (With the Orchard backend the same script travels over `orchard ssh` instead; see [Orchard](/docs/orchard/#how-the-runner-gets-into-the-vm).)

## Secrets

`SecretStore` is the seam for the GitHub App private key. Today the implementation is the macOS Keychain, keyed by App ID, in the login or system keychain; nothing about the key lives in config. See [Install](/docs/install/) and [Headless hosts](/docs/headless-hosts/#keychain-on-a-headless-host).

## Platform

graft is macOS only, on Apple Silicon. Linux guests are a planned future epic and are unproven.

Source: [github.com/Arborist-sh/graft](https://github.com/Arborist-sh/graft).
