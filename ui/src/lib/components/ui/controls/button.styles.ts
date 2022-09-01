import classNames from 'classnames';

export type BtnType = 'primary' | 'secondary';

const primaryClass = classNames([
  'text-white bg-blue-800 hover:bg-blue-700 disabled:bg-gray-600',
  'focus:outline-none focus:ring-2 ring-offset-2 ring-blue-700 disabled:ring-gray-600',
  'shadow-lg',
]);

const secondaryClass = classNames([
  'text-blue-800 hover:text-blue-600 hover:bg-blue-100',
  'focus:outline-none focus:ring-2 ring-blue-800',
  'hover:shadow-lg',
]);

export const buttonClassFn = ({
  btnType,
  iconOnly,
  disabled,
  clazz,
}: {
  btnType: BtnType;
  iconOnly: boolean;
  disabled: boolean;
  clazz?: string;
}) =>
  classNames([
    'flex justify-center',
    iconOnly ? 'p-2' : 'px-3 py-2',
    !iconOnly && 'w-28 min-w-fit',
    btnType === 'primary' && primaryClass,
    btnType === 'secondary' && secondaryClass,
    'rounded-md',
    disabled && 'cursor-not-allowed',
    clazz,
  ]);
