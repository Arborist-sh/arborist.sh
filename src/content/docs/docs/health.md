---
title: Health and monitoring
description: The detection-only health monitor that rides on graft arborist tend, graft plant, and graft branch, and where its findings go.
---

The health monitor is graft's self-monitoring loop: a continuous pass that watches a running fleet and reports what's wrong. It is **detection-first**. It observes, classifies, and ships findings to wherever you want them. It does not remediate anything (yet); see [the self-healing seam](#the-self-healing-seam).

`graft arborist check` verifies the GitHub App auth chain once and exits. The monitor keeps the doctor in the room: it runs the auth check plus more detectors on a cadence, for as long as the process runs.

```sh
graft arborist tend --monitor                 # supervise the pools and report health
graft arborist tend --monitor --profile work  # a specific profile
graft plant --monitor                         # trunk host vitals + controller health
graft branch <trunk-url> --monitor            # worker host vitals
```

The monitor is a flag on the long-running processes, not a separate command. Sweep cadence, webhooks, and thresholds come from the profile's `monitor` block (see [Config](#config)); there is no CLI flag for the interval.

## Each role tends itself

A full Orchard fleet runs three long-running graft processes, and each takes its own `--monitor`. They share the same event schema and sinks, but the detectors match what that host can actually see:

| Process | Vantage | `--monitor` detectors |
|---|---|---|
| `graft arborist tend` | supervisor (demand) | auth, runner, capacity, wedged-slot, deadwood |
| `graft branch` | worker host | disk, memory, `tart` health, stranded VMs |
| `graft plant` | controller host | disk, memory, controller-responding |

The supervisor sees that a worker is paused (the symptom) through the controller API. The branch process, running on that Mac, sees why: its disk is full. Branch and trunk monitors carry no GitHub credentials (host probes only), so "the worker holds no secret" still holds. All three emit the same event to the same JSONL and webhook, so one dashboard covers them. With the local Tart backend there is just the one process, `graft arborist tend --monitor`.

Run the supervisor monitor on the host where `tend` lives: it holds the GitHub App key and writes `~/.graft/state`. That is not necessarily the trunk; on a real Orchard fleet the controller can be a separate Linux box with no key and no supervisor state, and the monitor reaches it remotely through the Orchard API.

## What it watches

Each detector reuses a probe graft already has. The event JSON uses plain machine categories; the horticultural names are just how we talk about them.

| Category (JSON) | Metaphor | What it flags |
|---|---|---|
| `auth` | rot | GitHub App auth chain fails (key, JWT, installation, token) |
| `runner` | blight | a graft-named runner registered but offline on GitHub (a missed deregistration) |
| `capacity` | drought | configured count exceeds host capacity; a fleet worker is paused; the controller is unreachable |
| `leaf` | wilt | a slot wedged in a transient phase (booting, provisioning, ...) past a timeout |
| `supervisor` | deadwood | a graft VM the backend still has that no slot owns (a leak) |
| `host` | soil | low disk, memory pressure, `tart` or controller unhealthy, stranded worker VMs (branch and trunk monitors) |

### Severity

| Severity | Meaning |
|---|---|
| `info` | a normal observation, such as the periodic heartbeat |
| `warn` | degraded, worth a look, not yet dropping work |
| `critical` | actively broken, will drop jobs |
| `recovered` | a previously reported problem has cleared |

The monitor **edge-triggers**: it emits a problem when it first appears or its severity changes, stays quiet while it persists unchanged, and emits `recovered` when it clears. A periodic `info` heartbeat (default every 300s) proves the monitor is alive even when everything is healthy.

## Where findings go

Every event fans out to all configured sinks at once. Slack, PagerDuty, and Sentry are just reformatters in front of a webhook.

| Sink | Destination | Always on? |
|---|---|---|
| log | normal graft stdout/stderr (human lines) | yes |
| JSONL | `~/.graft/logs/health.jsonl`, one event per line, append-only | yes |
| snapshot | `~/.graft/state/health.json`, the current set of active problems | yes |
| webhook | `POST <url>` per event, JSON body | when `monitor.webhooks` is set |

`health.jsonl` is your durable history (`tail -f` it, ship it anywhere line-oriented). `health.json` is the pull surface for a dashboard: it holds only what's wrong right now (a `warn` or `critical` upserts by key; `recovered` clears it).

## Event schema

```json
{
  "timestamp": "2026-06-12T21:30:00Z",
  "severity": "warn",
  "category": "runner",
  "checkID": "offline-runner",
  "subject": "graft-9f2a...",
  "message": "graft runner registered but offline on org:acme, likely a missed deregistration",
  "detail": { "target": "org:acme", "runnerId": "42", "status": "offline" },
  "suggestedAction": "deregister it (`graft arborist runners prune`) so the slot can replace it"
}
```

| Field | Notes |
|---|---|
| `timestamp` | ISO-8601 (UTC) |
| `severity` | `info`, `warn`, `critical`, or `recovered` |
| `category` | `auth`, `runner`, `capacity`, `leaf`, `supervisor`, or `host` |
| `checkID` | stable sub-id within a category (`offline-runner`, `wedged-slot`, `orphan-vm`, ...) |
| `subject` | the pool, VM, runner, or host it's about; absent if global |
| `message` | human summary |
| `detail` | string-to-string context, varies by check |
| `suggestedAction` | a hint; graft does not act on it yet |

`category` + `checkID` + `subject` together identify a condition, so a webhook receiver can dedup and correlate a problem with its later `recovered`.

## Wiring an alert sink

A receiver is tiny: it gets the schema above and reformats. A complete relay to Slack:

```python
# health_relay.py: POST graft health events, forward problems to Slack
from http.server import BaseHTTPRequestHandler, HTTPServer
import json, urllib.request

SLACK = "https://hooks.slack.com/services/XXX/YYY/ZZZ"

class H(BaseHTTPRequestHandler):
    def do_POST(self):
        e = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        if e["severity"] in ("warn", "critical", "recovered"):
            tag = {"warn": "WARN", "critical": "CRITICAL", "recovered": "RECOVERED"}[e["severity"]]
            text = f'[{tag}] *{e["category"]}/{e["checkID"]}* {e.get("subject","")}: {e["message"]}'
            urllib.request.urlopen(SLACK, json.dumps({"text": text}).encode())
        self.send_response(204); self.end_headers()

HTTPServer(("", 8099), H).serve_forever()
```

Then point graft at it:

```json
"monitor": { "webhooks": ["http://127.0.0.1:8099"] }
```

The same shape forwards to PagerDuty (Events API v2) or Sentry; only the reformat differs. The webhook sink never blocks the monitor: a dead receiver degrades to a warning in graft's own log, nothing more.

## Config

A `monitor` block is optional. Absent, you get observe-only defaults (no webhooks). It sits at the top level of a profile, alongside `provider`, `github`, and `pools`:

```json
{
  "provider": { "type": "tart" },
  "github": { "appId": 12345, "target": "org:acme" },
  "pools": [ { "name": "macos", "image": "...", "os": "macos", "count": 2 } ],
  "monitor": {
    "intervalSeconds": 60,
    "webhooks": ["http://127.0.0.1:8099"],
    "heartbeatSeconds": 300,
    "slotStuckTimeoutSeconds": 300,
    "webhookMinSeverity": "warn"
  }
}
```

| Key | Default | Meaning |
|---|---|---|
| `intervalSeconds` | 60 | seconds between sweeps |
| `webhooks` | `[]` | URLs each event is POSTed to |
| `heartbeatSeconds` | 300 | minimum spacing of the `info` heartbeat; `0` disables |
| `slotStuckTimeoutSeconds` | 300 | a transient-phase slot older than this is flagged |
| `webhookMinSeverity` | `warn` | floor for webhook delivery (`recovered` always goes) |

## The self-healing seam

Remediation is the next layer, deliberately not built yet: you trust detection in the wild first, then flip on healers one at a time. The seam is published. [`Remediator`](https://github.com/Arborist-sh/graft/blob/main/Sources/GraftCore/Remediator.swift) is a protocol that consumes the same event stream the sinks carry, reads `suggestedAction`, and dispatches on `category` and `checkID`. When it lands it will be opt-in and guarded by backoff and a circuit breaker so it absorbs failures instead of amplifying them. It will never be on by default.
