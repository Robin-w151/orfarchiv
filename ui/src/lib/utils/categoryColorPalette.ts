const categoryColorPalette = new Map([
  ['Inland', 'bg-blue-100 hover:bg-blue-50'],
  ['Ausland', 'bg-amber-100 hover:bg-amber-50'],
  ['Wirtschaft', 'bg-indigo-100 hover:bg-indigo-50'],
  ['Umwelt', 'bg-green-100 hover:bg-green-50'],
  ['Gesundheit', 'bg-red-100 hover:bg-red-50'],
  ['Sport', 'bg-purple-100 hover:bg-purple-50'],
  ['Chronik', 'bg-stone-100 hover:bg-stone-50'],
  ['Religion', 'bg-rose-100 hover:bg-rose-50'],
  ['Science', 'bg-cyan-100 hover:bg-cyan-50'],
  ['Kultur', 'bg-fuchsia-100 hover:bg-fuchsia-50'],
]);

function getCategoryColorClass(category: string): string {
  return categoryColorPalette.get(category) ?? '';
}

export default getCategoryColorClass;
