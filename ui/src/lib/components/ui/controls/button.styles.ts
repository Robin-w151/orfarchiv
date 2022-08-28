import classNames from 'classnames';

export type BtnType = 'primary' | 'secondary';

const primaryClass = classNames([
  'text-white bg-blue-800 hover:bg-blue-700 disabled:bg-gray-600',
  'outline-hidden focus:outline outline-2 outline-offset-2 outline-blue-700 disabled:outline-gray-600',
  'shadow-lg',
]);

const linkClass = classNames([
  'text-blue-800 hover:text-blue-600 hover:bg-blue-100',
  'outline-hidden focus:outline outline-2 outline-blue-800',
  'hover:shadow-lg',
]);

export const buttonClassFn = ({ btnType, iconOnly, clazz }: { btnType: BtnType; iconOnly: boolean; clazz?: string }) =>
  classNames([
    'flex justify-center',
    iconOnly ? 'p-2' : 'px-3 py-2',
    !iconOnly && 'w-28 min-w-fit',
    btnType === 'primary' && primaryClass,
    btnType === 'secondary' && linkClass,
    'rounded-md',
    clazz,
  ]);
