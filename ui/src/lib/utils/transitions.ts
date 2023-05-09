import { browser } from '$app/environment';
import { cubicInOut } from 'svelte/easing';

export const transitionDefaults = {
  duration: 150,
  easing: cubicInOut,
};

export function rollFade(node: Element) {
  const opacity = +getComputedStyle(node).opacity;

  return {
    duration: transitionDefaults.duration,
    easing: transitionDefaults.easing,
    css: (t: number, u: number) => `transform: translateY(${0.5 * u}rem); opacity: ${t * opacity}`,
  };
}

export function useReducedMotion(): boolean {
  if (!browser) {
    return false;
  }

  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  return mediaQuery.matches;
}
