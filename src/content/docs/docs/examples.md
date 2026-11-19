---
title: Example recipes
description: Starting-point .graft seeds for React Native, Detox, Fastlane, Node CI and script-based images, with the rn-ios fast-build recipe in full.
---

These are starting points for `graft sapling grow`: generic, meant to be adapted. A seed is a **`.graft`** file (YAML with declarative toolchain fields), or plain `.yml`/`.json`. Pin the versions to match your project's lockfiles ("works in CI, fails locally" is almost always version drift).

All of them live in [`examples/images/`](https://github.com/Arborist-sh/graft/tree/main/examples/images) in the graft repo.

| Recipe | Base | For |
|--------|------|-----|
| [`rn-detox.graft`](https://github.com/Arborist-sh/graft/blob/main/examples/images/rn-detox.graft) | `macos-tahoe-xcode` | React Native + Detox iOS e2e |
| [`rn-ios.graft`](https://github.com/Arborist-sh/graft/blob/main/examples/images/rn-ios.graft) | `macos-tahoe-xcode` | React Native iOS: fast-build reference (baked workspace + ccache) |
| [`ios-fastlane.graft`](https://github.com/Arborist-sh/graft/blob/main/examples/images/ios-fastlane.graft) | `macos-tahoe-xcode` | iOS build/release with Fastlane |
| [`node-ci.json`](https://github.com/Arborist-sh/graft/blob/main/examples/images/node-ci.json) | `macos-tahoe-base` | Lean Node/TS CI, using the `run:` escape hatch |
| [`script-based/`](https://github.com/Arborist-sh/graft/tree/main/examples/images/script-based) | `macos-tahoe-xcode` | Point at an existing `provision.sh` |

```sh
graft sapling render --seed examples/images/rn-detox.graft   # see the compiled script
graft sapling grow   --seed examples/images/rn-detox.graft   # grow the sapling
graft nest open --image rn-detox                             # shell in, your repo mounted
```

## Declarative fields

graft compiles these (in this order) into provisioning steps. This is the short version; the full field reference is on the [recipes page](/docs/recipes/).

| Field | Expands to |
|-------|-----------|
| `node: "20.19.4"` | `fnm install`/`default` + `corepack` + a stable `/usr/local/bin` node symlink (Xcode needs it) |
| `ruby: "3.3.5"` | `rbenv install` + `global` + `bundler` |
| `brew: [pkg, …]` | `brew install …` |
| `gems: [pkg, …]` | `gem install … --no-document` |
| `npm: [pkg, …]` | `npm install -g …` |
| `xcode-first-launch: true` | `sudo xcodebuild -runFirstLaunch` |
| `warm-simulators: ["iPhone 17 Pro"]` | cold-boot each (warms on-disk caches) + shutdown |
| `run: \|` / `script:` | escape hatch: raw bash / a script file, run last |

- `node:`/`ruby:` assume the **`cirruslabs/*-xcode`** base (it ships `fnm`/`rbenv`). On a bare `*-base` image, install them yourself via `run:` (see `node-ci.json`).
- For caching strategy (bake vs. mount, APFS copy-on-write, the read-only rule for shared caches), see [.graft recipes](/docs/recipes/).
- Keep images that contain proprietary code **private**: don't `graft sapling push` them to a public registry.

## Worked example: rn-ios

`rn-ios.graft` is the best reference. It bakes `node_modules`, Pods, and DerivedData at a stable path plus a warm ccache, so a runner's `yarn`/`pod install` and `xcodebuild` are near-instant. The paired workflow and the reasoning behind each choice are in [React Native iOS fast builds](/docs/rn-ios-fast-builds/).

```yaml
# React Native iOS — fast-build reference image. Bakes node_modules/Pods/DerivedData at a
# stable path (path: workspace) + a warm ccache, so a runner's yarn/pod install and
# xcodebuild are near-instant. See the rn-ios-fast-builds docs page for the paired workflow.
#
# NOTE: with `path: workspace` the app's source is baked into this image (not just its
# caches) — keep it private, don't `graft sapling push` it anywhere public.
name: rn-ios
from: ghcr.io/cirruslabs/macos-tahoe-xcode:latest

# ── Toolchain ──────────────────────────────────────────────
node: "20.19.4"
ruby: "3.3.5"
cocoapods: "1.15.2"
xcode-first-launch: true
warm-simulators: ["iPhone 17 Pro"]  # cold-boot once to warm sim caches

# ── System config ───────────────────────────────────────────
known-hosts: [github.com]
disable-spotlight: true             # mdutil -a -i off (CI perf)

# ── VM shape ───────────────────────────────────────────────
# xcodebuild is CPU-bound and barely parallelizes across VMs, so one big leaf beats two
# small ones — size generously rather than splitting the pool.
cpu: 8
memory: 16384                       # megabytes

# ── Warm the app tree + caches ───────────────────────────────
# Replace the url with your repo. `path: workspace` keeps the clone at the exact path
# actions/checkout uses, so node_modules/Pods/DerivedData all bake in at the job's path.
repos:
  - url: https://github.com/your-org/app.git
    ref: main
    path: workspace
    run:
      - yarn install --frozen-lockfile
      - cd ios && bundle exec pod install
      # -derivedDataPath build keeps DerivedData inside the tree (ios/build) so it travels
      # with the checkout and ccache's path rewriting covers it; use the same flag in the job.
      - cd ios && xcodebuild -workspace App.xcworkspace -scheme App -sdk iphonesimulator -configuration Debug -destination 'generic/platform=iOS Simulator' -derivedDataPath build build CODE_SIGNING_ALLOWED=NO
      # marker the job compares against to decide whether pod install is needed at all
      - shasum -a 256 ios/Podfile.lock | awk '{print $1}' > "$HOME/.rn-ios-baked-podfile-lock-sha256"

ccache: true                        # floor under DerivedData for ObjC/C++ pods

# ── Verify + shrink ────────────────────────────────────────
verify:
  - node --version
  - pod --version
  - ccache --version
cleanup: true                       # preserves CocoaPods/DerivedData/ccache/yarn caches
```
