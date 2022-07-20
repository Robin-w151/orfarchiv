import type { CategoryColor } from '../models/categoryColor';

const categoryColorPalette: Map<string, CategoryColor> = new Map([
  ['Inland', { bgClass: 'bg-blue-100', bgHoverClass: 'hover:bg-blue-50' }],
  ['Ausland', { bgClass: 'bg-amber-100', bgHoverClass: 'hover:bg-amber-50' }],
  ['Wirtschaft', { bgClass: 'bg-indigo-100', bgHoverClass: 'hover:bg-indigo-50' }],
  ['Umwelt', { bgClass: 'bg-green-100', bgHoverClass: 'hover:bg-green-50' }],
  ['Gesundheit', { bgClass: 'bg-red-100', bgHoverClass: 'hover:bg-red-50' }],
  ['Sport', { bgClass: 'bg-purple-100', bgHoverClass: 'hover:bg-purple-50' }],
  ['Chronik', { bgClass: 'bg-stone-100', bgHoverClass: 'hover:bg-stone-50' }],
  ['Religion', { bgClass: 'bg-rose-100', bgHoverClass: 'hover:bg-rose-50' }],
  ['Science', { bgClass: 'bg-cyan-100', bgHoverClass: 'hover:bg-cyan-50' }],
  ['Kultur', { bgClass: 'bg-fuchsia-100', bgHoverClass: 'hover:bg-fuchsia-50' }],
]);

function getCategoryColorClass(category: string): CategoryColor | null {
  return categoryColorPalette.get(category) ?? null;
}

export default getCategoryColorClass;
