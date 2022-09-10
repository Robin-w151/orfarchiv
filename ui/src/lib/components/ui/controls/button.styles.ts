import classNames from 'classnames';

export type BtnType = 'primary' | 'secondary';

const primaryClass = (focusEnabled: boolean) =>
  classNames([
    'text-white bg-blue-700 hover:bg-blue-600 disabled:bg-gray-600',
    focusEnabled && 'focus:outline-none focus:ring-2 ring-offset-2 ring-blue-700 disabled:ring-gray-600',
    'shadow-lg',
  ]);

const secondaryClass = (focusEnabled: boolean) =>
  classNames([
    'text-blue-700 hover:text-fuchsia-600 hover:bg-gray-100',
    focusEnabled && 'focus:text-fuchsia-600 focus:outline-none focus:ring-2 ring-blue-700',
    'hover:shadow-lg',
  ]);

export const buttonClassFn = ({
  btnType,
  iconOnly,
  focusDisabled,
  clazz,
}: {
  btnType: BtnType;
  iconOnly: boolean;
  focusDisabled?: boolean;
  clazz?: string;
}) => {
  const focusEnabled = focusDisabled === undefined ? true : !focusDisabled;
  return classNames([
    'flex justify-center',
    iconOnly ? 'p-2' : 'px-3 py-2',
    !iconOnly && 'w-28 min-w-fit',
    btnType === 'primary' && primaryClass(focusEnabled),
    btnType === 'secondary' && secondaryClass(focusEnabled),
    'rounded-md',
    'transition delay-50',
    'disabled:cursor-not-allowed',
    clazz,
  ]);
};
