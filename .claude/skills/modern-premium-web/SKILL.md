---
name: modern-premium-web
description: Premium frontend direction for Checkpoint Vardi. Use when designing or styling public pages, dashboard surfaces, layouts, components, motion, or typography in this repo so the UI feels intentional and product-grade instead of generic.
---

# Modern Premium Web - Vardi

Use this skill for visual design work in `apps/web` and `packages/ui`.

## Product feel

The interface should feel trustworthy, calm, and deliberate:

- premium without luxury gimmicks
- operational without looking like a template dashboard
- modern, but grounded enough for safety work

## Visual direction

- warm paper-like light surfaces instead of flat white
- deep basalt or ink surfaces in darker areas instead of pure black
- one strong accent family, not a rainbow
- typography does most of the work
- whitespace is part of the design, not empty leftover space

## Design rules

- avoid generic SaaS hero-plus-three-cards layouts
- give pages a distinct rhythm and hierarchy
- use expressive type choices, not browser defaults
- keep motion sparse and meaningful
- design desktop and mobile intentionally, not as an afterthought
- use the repo's CSS variables and shared UI primitives as the base layer

## Public pages

- stronger storytelling
- bolder layout moves
- a memorable first screen

## Workspace surfaces

- calmer, denser, more operational
- clear hierarchy over decoration
- strong table, form, and navigation polish

## Implementation hints

- keep styles token-driven
- define repeated choices as CSS variables before repeating raw values
- prefer subtle gradients, texture, and contrast shifts over flat fills
- avoid purple-by-default palettes
- if animation is added, include a reduced-motion fallback

## Anti-patterns

- generic component-library defaults with no point of view
- overusing glass, blur, or gradients until readability drops
- a dark mode that is just inverted light mode
- multiple accent colors competing for attention
- dense admin layouts with no breathing room
