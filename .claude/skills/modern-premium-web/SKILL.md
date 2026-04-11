---
name: modern-premium-web
description: "Premium, modern frontend design for Vardi public pages and admin surfaces. Use when designing or styling UI components, pages, layouts, dashboards, dark mode, animation, or marketing pages in this codebase. Push the output toward an intentional, premium product feel instead of generic template UI."
---

# Modern Premium Web — Vardi

This skill defines how Vardi web interfaces should look and feel. Every page, component, and interaction should feel intentional, refined, and worth paying for — whether it's a public landing page or an admin dashboard.

## The North Star

Think **Linear meets Apple meets Stripe**. What they share:

- **Obsessive typography** — type does most of the heavy lifting, not decoration
- **Color with purpose** — a few strong choices, not a rainbow
- **Space as a design element** — generous whitespace signals confidence
- **Dark mode that feels native** — not inverted light mode, but designed *for* darkness
- **Motion that earns its keep** — one perfect animation beats twelve good ones
- **No visual noise** — every pixel exists for a reason

If something looks like it could appear on any SaaS template site, it's wrong. If it looks like a team of designers spent weeks on it, it's right.

## Two Contexts, One System

### Public Pages (landing, marketing, about)
Full premium treatment. Cinematic hero sections, editorial typography, atmospheric backgrounds, signature animations. This is where Vardi makes its first impression — it should feel *expensive*.

### Admin Console (dashboard, settings, data views)
Subtle premium. The interface is functional first, but elevated through typography, spacing, color precision, and polish. Think Linear's dashboard: clean, well-spaced, quietly beautiful. No flashy animations — just refined craft in every detail.

---

## Aesthetic Direction

### Typography
Typography is the single biggest lever for premium feel. Get this right and everything else follows.

- **Display font**: Bold, distinctive, high-contrast. Use for h1-h2 and hero text. Satoshi, Cabinet Grotesk, or DM Serif Display — never system defaults.
- **Body font**: Clean, readable, slightly warm. Inter is acceptable for body only.
- **Hierarchy is everything**: Size jumps should be dramatic (not 16→18→20, more like 16→24→48). Weight contrast matters more than size.
- **Letter-spacing**: Tighten display text (`-0.02em` to `-0.04em`). Slightly open small caps or labels (`0.05em`).
- Variable WOFF2 only, preloaded, with `size-adjust` fallbacks to prevent CLS.

### Color & Palette

Vardi's palette: warm-dominant (orange → coral → rose gradient) with cool counterpoints (teal, soft lavender). Deep navy for dark surfaces, warm off-white for light.

**Why colors look bland and how to fix it:**
The #1 reason AI-generated UI looks generic is timid color use — low-chroma grays everywhere with one muted accent. Premium apps commit to their palette.

- **Saturate the primary**: the warm coral/orange should feel *alive* — push chroma. `oklch(0.70 0.19 40)` not `oklch(0.70 0.08 40)`
- **Backgrounds aren't just gray**: light mode surfaces should be warm cream/off-white (`oklch(0.97 0.005 80)`), not neutral gray or stark white. Think quality paper — soothing, warm, something you can stare at for hours without fatigue. Dark surfaces should be navy-tinted, not `#1a1a1a`
- **Light mode texture**: consider very subtle background texture (fine dot grids, light noise, or paper grain at 2-5% opacity) to add depth without visual noise. A flat `bg-white` or `bg-gray-50` background is the hallmark of a template. The goal is warmth and tactility
- **Use gradient washes**: subtle gradients between warm tones on section backgrounds and hero areas add richness. Alternate warm cream sections with slightly cooler or slightly warmer off-white — never the same flat surface everywhere
- **Accent colors pop**: teal and lavender are supporting but should still have noticeable chroma. Muted doesn't mean invisible
- **Hover/active states via `color-mix(in oklch, ...)`**: derive, don't hand-pick every shade
- **Status colors get the brand treatment**: success, warning, error tones should harmonize with the warm palette — not stock Tailwind green/yellow/red
- OKLCH color space throughout (matches existing `globals.css`)
- A dominant color with sharp accents beats an evenly-distributed palette

### Light Mode — Warm, Soothing, Paper-Like

Light mode should feel like a warm cream canvas that's easy on the eyes for extended use. Not clinical white, not flat gray — something with warmth and subtle texture that feels almost physical.

- **Base surface**: warm cream (`oklch(0.97 0.005 80)`) — never pure `#fff` or neutral `gray-50`
- **Subtle texture**: fine dot grids, paper grain, or soft noise at very low opacity (2-5%) give surfaces tactile quality without distraction
- **UI chrome is understated**: borders, separators, and shadows should barely announce themselves — `border-border/40`, `shadow-xs`, or just whitespace
- **Cards and containers**: slightly lighter or slightly darker than the base surface — the difference should be felt more than seen
- **Text warmth**: body text should lean warm-neutral, not pure black. `oklch(0.20 0.01 60)` reads easier than `#000`
- **Accent colors feel organic**: warm coral, amber, and teal accents should harmonize with the cream surface — nothing should feel grafted on

### Dark Mode — A First-Class Experience

Dark mode is not "light mode with inverted colors." It's a separate design that happens to show the same content. Both modes must feel equally intentional.

**Dark mode surfaces:**
- Deep navy base (`oklch(0.18 0.03 260)`) — never pure black (`#000`)
- Layered surfaces: each elevation step is a subtle lightness increase (+0.02-0.04 in OKLCH L)
- Cards and panels: use subtle borders (`1px solid oklch(1 0 0 / 0.06)`) instead of shadows

**Dark mode color adaptation:**
- Warm brand colors lift slightly in lightness (+0.05-0.08 L) so they pop on dark backgrounds
- Gradients become more subtle — lower chroma, closer tones
- Text: off-white (`oklch(0.93 0.005 80)`) not pure white — reduces eye strain
- Muted secondary text that's readable but clearly subordinate

**Dark mode atmosphere:**
- Subtle radial glow behind primary CTAs using brand warm color at 5-10% opacity
- Soft gradient meshes on section backgrounds — barely visible but add depth
- Borders and surface elevation replace shadows entirely

**Dark mode anti-patterns:**
- Pure black backgrounds
- Colors that looked good in light mode used unchanged
- Harsh white text on dark surfaces
- Shadows that disappear into the dark background
- Flat, lifeless sections with no depth variation

### Layout — Breaking the Template

Predictable layouts are the other hallmark of generic AI output: hero → 3-column features → testimonials → CTA. Premium sites surprise.

**Public pages:**
- Break the grid — let elements overlap, bleed to edges, or float asymmetrically
- Mix full-width and contained sections. Alternate rhythm to avoid monotony
- Use large-scale type as a compositional element, not just headings
- Bento grids (mixed-size cards in non-uniform layouts) feel modern
- Stagger content left/right instead of center-center-center

**Admin console:**
- Consistent rhythm (4/8/16/24/32/48px scale) but with breathing room
- Dashboard pages: use varied card sizes and a clear visual hierarchy — not a uniform grid of identical cards
- Data-dense views: whitespace between sections prevents visual fatigue
- Page headers: strong title + muted description + right-aligned actions — consistent across all pages

**Both:**
- Generous whitespace is mandatory — if a section feels dense, add space before adding content
- Negative space communicates hierarchy more than borders do
- Responsive layouts should feel designed for each breakpoint, not just reflowed

### Depth & Surface

- Light mode: minimal shadows, let whitespace and borders define hierarchy
- Dark mode: surface elevation + borders, no shadows
- Occasional soft glow behind CTAs (brand warm color, low opacity)
- Consistent border radius from existing `--radius` scale
- Glass/frosted effects sparingly and only where they add real value

---

## Motion

### Philosophy
Motion should feel like breathing — natural, unhurried, inevitable. It communicates orchestration and flow, which is core to Vardi's identity.

### What Works
- Fade + subtle rise (8-16px translateY) for section entrances
- Opacity micro-transitions on hover (120-220ms)
- One ambient animation in the hero (slow pulse, gradient drift, or ripple expansion)
- Staggered reveals with `animation-delay` for grouped elements
- View Transitions API for page navigation

### What Doesn't
- Bounce easing, spinning, blinking
- Multiple competing animation loops
- Motion that draws attention to itself over content
- Heavy parallax on mobile
- Any animation without `prefers-reduced-motion` fallback

### Timing
- Section entrances: 300-500ms, `cubic-bezier(0.22, 1, 0.36, 1)`
- Hover: 120-200ms, `ease-out`
- Ambient loops: 6-12s, `ease-in-out`
- Always use the **no-motion-first** pattern — static by default, motion as progressive enhancement

### Recommended Tools
- **Motion v12** (`motion/react`) for component enter/exit
- **CSS scroll-driven animations** for scroll-triggered entrances
- **GSAP + ScrollTrigger** only if CSS scroll-driven is insufficient
- **View Transitions API** for page transitions (baseline in all browsers)

---

## Component Patterns

Output must be working React + Tailwind code. Stock shadcn/ui defaults look generic — every component needs intentional customization. Here's what premium looks like for the patterns you build most often.

### Data Tables

Default tables (zebra stripes, cramped rows, plain headers) scream "admin template." Premium tables feel like a well-typeset spreadsheet.

- **Row height**: generous vertical padding (`py-3.5` to `py-4`) — rows need room to breathe
- **Headers**: small, uppercase, tracked-out (`text-xs uppercase tracking-wider text-muted-foreground`) — understated, not bold
- **Hover**: subtle full-row highlight instead of zebra stripes — `hover:bg-muted/50`
- **Numbers**: use tabular-nums (`font-variant-numeric: tabular-nums`) for column alignment
- **Sticky header**: blur backdrop on scroll — `sticky top-0 backdrop-blur-sm bg-background/80`
- **Borders**: single bottom border per row (`border-b border-border/50`), no vertical borders, no outer border
- **Actions column**: right-aligned, muted until row hover — appears on demand
- **Dark mode**: reduce border opacity further, slightly lift row hover color

### Navigation / Sidebar

The sidebar is the most-seen component — it must feel polished at a glance.

- **Active state**: don't just highlight the background. Use a combination: left accent bar (2-3px, brand color) + subtle background tint + font-weight change
- **Inactive items**: medium-weight text, muted color. Hover lifts to foreground color with smooth transition
- **Section groups**: tiny muted uppercase labels (`text-[11px] uppercase tracking-widest text-muted-foreground/70`) with generous spacing above
- **Icons**: consistent stroke width, sized to match text (`size-4`), muted color that lifts on hover/active
- **Transitions**: `transition-colors duration-150` on all interactive elements — instant feels cheap, too slow feels laggy
- **Collapse behavior**: smooth width animation, icons remain visible when collapsed
- **Dark mode**: active item gets a subtle warm glow or tinted background, not just a lighter gray

### Forms & Inputs

Forms are where users spend time — they must feel considered.

- **Input styling**: taller than default (`h-10` to `h-11`), slightly rounded, subtle border. Focus state: brand-colored ring (`ring-2 ring-primary/30`) not browser default blue
- **Labels**: above the input, slightly spaced (`mb-1.5`), medium weight — never inside the input as placeholder
- **Error states**: warm red (not harsh), with smooth fade-in for error messages. Border turns to error color.
- **Field groups**: generous gap between fields (`space-y-5` to `space-y-6`) — cramped forms feel cheap
- **Disabled state**: reduced opacity + `cursor-not-allowed`, not a different color scheme
- **Dark mode**: input backgrounds should be slightly elevated from the page surface — not the same as background. Use `bg-muted/30` or similar subtle lift

### Cards & Lists

Cards are the building blocks of the admin — they need variety and depth.

- **Card surface**: slightly elevated from background. Light: subtle shadow (`shadow-sm`). Dark: border + `bg-card` which should be 1 step lighter than background
- **Padding**: generous and consistent (`p-5` to `p-6`), never `p-3` — tight padding looks like a mobile app
- **Header area**: clear separation from content — either a bottom border or extra spacing, with a bold title and muted description
- **Hover (if interactive)**: slight lift (`hover:-translate-y-0.5 hover:shadow-md transition-all duration-200`). Dark: brighten border color
- **Status indicators**: small colored dots or subtle badges — not colored backgrounds on the entire card
- **Grid layouts**: use `gap-4` to `gap-6`, never dense packing. Cards should have room between them
- **Empty states**: centered, muted illustration or icon + helpful text — never just "No data"
- **Dark mode**: cards need visible boundaries — `border border-border/60` minimum. Without borders, dark cards melt into the background

### Buttons

Buttons reveal quality instantly. Stock buttons look like every other app.

- **Primary**: brand gradient or solid with refined hover (use `color-mix` to darken/lighten 10%). Slight shadow or glow in dark mode
- **Secondary**: ghost-style with border. Hover fills subtly. Never gray-on-gray
- **Sizing**: comfortable click targets (`h-9 px-4` minimum), tighter letter-spacing on labels (`tracking-tight`)
- **Icon buttons**: consistent size, enough padding so the icon doesn't feel cramped
- **Loading state**: subtle spinner that replaces text, keeps button width stable — not a full-button pulsing skeleton
- **Dark mode**: primary buttons need more contrast — lift the background lightness. Subtle glow (`shadow-[0_0_12px_oklch(...)]`) adds polish

---

## Stack Context

| Layer | Tool |
|-------|------|
| Framework | Next.js 15+ (App Router) |
| Runtime | React 19+ |
| Styling | Tailwind CSS v4 (CSS-first `@theme`) |
| Components | shadcn/ui (Radix + CVA + tailwind-merge) |
| Dark mode | `.dark` class variant |
| Color space | OKLCH in `globals.css` |
| Monorepo | pnpm workspaces |

Server Components for all static content. `"use client"` only for interactive leaves.

---

## Vardi Brand Alignment

**Brand symbols:** Clock + timeline bars (app icon), gradient arc from warm orange through coral to rose, stacked horizontal bars suggesting schedule/playlist. Deep navy background.

**Brand illustration:** Organic flowing blob shapes containing lifestyle scenes (fitness, mindfulness, creativity, daily life), connected by wave forms with concentric ripple motifs.

**Motion should suggest:**
- Timeline progression — left-to-right flow, sequential reveals
- Orchestration — ripple motifs expanding, wave connectors pulsing
- The clock metaphor — circular/arc motions, rhythmic timing

**Brand tone:**
- Energetic but controlled (not frenetic)
- Human and warm (not corporate)
- Curated and modern (not childish)
- Confident restraint — premium is what you *don't* do

---

## Review Heuristics

Before shipping, check:
- Does this look like a team of designers made it, or like an AI template?
- Is dark mode *designed* or just *derived*? Switch between modes — both should feel intentional.
- Could you remove 30% and make it better? If yes, remove it.
- Does the typography carry the design even without color?
- Is there one thing someone will remember about this page?
- On mobile, does it feel spacious or cramped?
