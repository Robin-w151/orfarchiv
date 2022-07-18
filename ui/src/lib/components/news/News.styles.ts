import classNames from 'classnames';

export const newsClass = classNames(['flex flex-col gap-3 items-center']);

export const newsLoadingWrapperClass = classNames(['mt-12 w-24 h-24', 'text-blue-900']);

export const bucketClass = classNames([
  'w-full',
  'overflow-hidden',
  'bg-white',
  'divide-y-2 divide-solid',
  'rounded-lg',
]);

export const bucketTitleClass = classNames([
  'flex justify-center sticky top-2',
  'px-3 py-2',
  'w-48',
  'text-blue-900 bg-white',
  'rounded-lg shadow-md',
]);
