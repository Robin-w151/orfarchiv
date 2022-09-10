import classNames from 'classnames';

export type BtnType = 'primary' | 'secondary';

const primaryClass = (focus: boolean) =>
  classNames([
    'text-white bg-blue-700 hover:bg-blue-600 disabled:bg-gray-600',
    focus && 'focus:outline-none focus:ring-2 ring-offset-2 ring-blue-700 disabled:ring-gray-600',
    'shadow-lg',
  ]);

const secondaryClass = (focus: boolean) =>
  classNames([
    'text-blue-700 hover:text-fuchsia-600 hover:bg-blue-100',
    focus && 'focus:outline-none focus:ring-2 ring-blue-700',
    'hover:shadow-lg',
  ]);

export const buttonClassFn = ({
  btnType,
  iconOnly,
  noFocus,
  disabled,
  clazz,
}: {
  btnType: BtnType;
  iconOnly: boolean;
  noFocus?: boolean;
  disabled: boolean;
  clazz?: string;
}) => {
  const focus = noFocus === undefined ? true : !noFocus;
  return classNames([
    'flex justify-center',
    iconOnly ? 'p-2' : 'px-3 py-2',
    !iconOnly && 'w-28 min-w-fit',
    btnType === 'primary' && primaryClass(focus),
    btnType === 'secondary' && secondaryClass(focus),
    'rounded-md',
    'transition',
    disabled && 'cursor-not-allowed',
    clazz,
  ]);
};
