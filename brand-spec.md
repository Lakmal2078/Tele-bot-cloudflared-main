# Fast xBet Cash — Landing Page v0 Brand Spec

## Direction

The landing page uses the **Secure Edge Fintech / Telegram Operations Console** direction. The hierarchy is intentionally action-led: understand the service, see capability and safety signals, choose a task, then open Telegram.

## Visual system

| Token | Value | Use |
|---|---|---|
| Background | `#070B12` / `#081525` | Page and deep surfaces |
| Primary action | `#A6F800` | Telegram and conversion actions |
| Secondary signal | `#00B4F8` | Links, status, navigation focus |
| Text | `#F1F5F9` | Headings and primary copy |
| Muted text | `#94A3B8` | Supporting copy |
| Radius | `16px`–`24px` | Controls and major modules |

The existing `BRAND_LOGO_SVG_COMPACT` remains the primary brand mark. The repository does not currently contain `xbet-og-security-edge.png`, so v0 uses a local CSS security-edge visual with the existing logo rather than referencing a missing asset. A generated hero image can replace `.edge-visual` in a later approved phase.

## Content rules

Numeric trust claims and sample testimonials are not presented as production proof until they have a source, timestamp, or owner-approved configuration. The trust rail therefore uses capability language: guided flows, Telegram-first access, status/audit trail, and local payment rails.

## Interaction rules

The desktop navigation keeps the main anchors visible. On narrow screens, `#menuToggle` opens the accessible `#mobileNav` drawer, which closes after navigation or Escape. The Telegram CTA remains available without requiring video playback. The live status fallback says “temporarily unavailable” rather than presenting a transient request failure as a definitive outage.

## Scope

This document records the Phase 1 and Phase 2 v0 decisions. Video production, replacement with an approved hero image, and full section restructuring remain separate phases.
