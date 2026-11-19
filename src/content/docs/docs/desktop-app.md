---
title: Desktop app
description: Graft.app is a desktop companion to the CLI, with a sidebar for runners, nests, saplings, seeds, and config.
---

`Graft.app` is a full desktop companion to the CLI (the menu-bar app grown up). It's a sidebar over the same things the CLI manages.

## Install

```sh
brew install cirruslabs/cli/tart
brew install --cask arborist-sh/tap/graft-app
```

The cask installs the CLI too and needs macOS Sonoma or later. See [Install](/docs/install/).

## Sidebar

- **Dashboard**: live runners and leaves (VMs) with phase and age. Start and stop tending.
- **Canopy**: the [Orchard](/docs/orchard/) fleet at a glance: trunk (controller) reachability, capacity, branches (workers), and leaves.
- **Nests**: dev boxes. Open in VS Code or a shell, start and stop, and watch live provisioning status. See [Nests](/docs/nest/).
- **Saplings**: golden images. Grow one from a seed, pull, remove, and inspect what a base image already has baked in.
- **Seeds**: a structured `.graft` builder where you add only the toolchain, scripts, and simulators you want, with version dropdowns. It switches to and from raw YAML and shows a compiled-script preview. See [Recipes](/docs/recipes/).
- **Profiles, Pools, Secrets**: full [configuration](/docs/configuration/) without editing JSON.

## GitHub App creation

The app can create a GitHub App for you end-to-end using GitHub's manifest flow, with no manual key download. It can also smart-import an existing key. The CLI equivalent is `graft secrets create-app`. See [Runners](/docs/runners/).

## Vocabulary

Graft names its parts after a tree: sapling (golden image), seed (`.graft` recipe), nest (dev box), leaf (VM), tree (Orchard fleet), trunk (controller), branch (worker), and arborist (the runner supervisor). If that's not your style, a **Standard** and **Graft** vocabulary toggle in Settings switches the labels.
