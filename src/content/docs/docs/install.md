---
title: Install
description: Install the Graft CLI and desktop app with Homebrew, or build from source.
---

## Requirements

- An Apple Silicon Mac. Intel isn't supported.
- macOS 14 (Sonoma) or later.
- [Tart](https://tart.run).
- A GitHub App (not a PAT) with self-hosted-runner admin permission, only if you want ephemeral [runners](/docs/runners/).

## CLI

Homebrew doesn't install Tart for you, so install it first:

```sh
brew install cirruslabs/cli/tart
brew install arborist-sh/tap/graft
```

## Desktop app

The desktop app (`Graft.app`) installs the CLI too. It needs macOS Sonoma or later.

```sh
brew install --cask arborist-sh/tap/graft-app
```

You still need Tart. If you haven't installed it, run `brew install cirruslabs/cli/tart` as above. See [Desktop app](/docs/desktop-app/) for what it does.

## Build from source

You need a Swift 6 toolchain.

```sh
swift build -c release
sudo cp .build/release/graft /usr/local/bin/graft
```

## Verify

```sh
graft --version
```

## Next

- [Recipes](/docs/recipes/) to grow your first sapling.
- [Runners](/docs/runners/) to set up CI.
