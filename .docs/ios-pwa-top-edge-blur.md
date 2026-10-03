# iOS PWA top edge blur

## Symptom

In the installed iOS app (home screen PWA, `display: standalone`), the top of the header is blurred and partially obscured. The blur disappears once a sticky section header scrolls up to the top edge.

## Cause

Since iOS 26, installed web apps get the Liquid Glass "scroll edge effect": a progressive blur that the system draws above the web view at the top edge. No CSS property or meta tag disables it.

WebKit skips the effect only when its probe finds a suitable element at the top edge (`LocalFrameView::fixedContainerEdges`). The probe:

- hit-tests the midpoint of the top edge at about `y = 4px`
- looks for a `position: fixed` or `sticky` box that spans at least 90% of the viewport width
- needs a plain, opaque `background-color` on that box (gradients and images don't count)

When it finds one, iOS fills the status bar area with that colour instead of blurring.

## Fix

An opaque, full-width fixed strip at `top: 0` in the body colour, so the probe always finds one:

- `ui/src/lib/components/shared/app/AppLayout.svelte`: `statusBarCoverClass` renders the strip (`fixed top-0 inset-x-0`, `bg-gray-200 dark:bg-gray-700`, `pointer-events-none`), with height `--oa-safe-area-top`.
- `ui/src/app.css`: defines `--oa-safe-area-top`. In iOS standalone mode it is at least `8px`:

  ```css
  @supports (-webkit-touch-callout: none) {
    @media (display-mode: standalone) {
      --oa-safe-area-top: max(8px, env(safe-area-inset-top));
    }
  }
  ```

  Without `apple-mobile-web-app-status-bar-style="black-translucent"`, `env(safe-area-inset-top)` is `0`. The minimum height is what makes the strip reachable by the probe. The strip is `0px` tall elsewhere, so other browsers and desktop are unaffected.

- `ui/src/app.html`: `viewport-fit=cover` in the viewport meta, so `env(safe-area-inset-*)` reports real values.
- The page top padding (`AppLayout.svelte`) and the sticky offsets (`Section.svelte`, `Story.svelte`) add `--oa-safe-area-top`, so content and sticky headers stay below the strip.

## Keep in mind

- Keep the strip's `background-color` plain and opaque. Adding transparency, a gradient or a `backdrop-filter` brings the blur back.
- The strip must stay full width and fixed at `top: 0`.
- New sticky or fixed elements at the top need `top: var(--oa-safe-area-top)` so they don't end up under the strip.
- The fix can only be verified on an iPhone with the app installed to the home screen. Desktop browsers and emulators don't show the effect.

## References

- [stacker.news #3248](https://github.com/stackernews/stacker.news/pull/3248): 8px opaque fixed strip, the approach used here
- [mono-agent #1028](https://github.com/robertsreberski/mono-agent/pull/1028): description of the WebKit top edge probe
- [homecast-web #199](https://github.com/parob/homecast-web/pull/199): status bar colour is taken from a fixed container, not sampled from the page
