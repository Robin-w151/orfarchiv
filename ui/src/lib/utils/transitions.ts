import { browser } from '$app/environment';
import { cubicIn, cubicInOut, cubicOut, linear } from 'svelte/easing';

export const transitionDefaults = {
  duration: 150,
  easing: cubicInOut,
};

export function rollFade(node: Element) {
  const opacity = +getComputedStyle(node).opacity;

  return {
    ...transitionDefaults,
    css: (t: number, u: number) => `transform: translateY(${0.5 * u}rem); opacity: ${t * opacity}`,
  };
}

export function rollDown(node: Element) {
  const height = window.screen.availHeight;
  const opacity = +getComputedStyle(node).opacity;

  return {
    duration: 250,
    easing: linear,
    css: (t: number) => {
      return `max-height: ${t * height}px; opacity: ${t * opacity}; overflow: hidden`;
    },
  };
}

export function useReducedMotion(): boolean {
  if (!browser) {
    return false;
  }

  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  return mediaQuery.matches;
}
