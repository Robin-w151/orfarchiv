import clsx from 'clsx';

export type BtnType = 'primary' | 'secondary';

const primaryClass = (focusEnabled: boolean) =>
  clsx([
    'text-white bg-blue-700 hover:bg-blue-600 disabled:bg-gray-600',
    focusEnabled && 'focus:outline-none focus:ring-2 ring-offset-2 ring-blue-700 disabled:ring-gray-600',
    'shadow-lg',
  ]);

const secondaryClass = (focusEnabled: boolean) =>
  clsx([
    'text-blue-700 disabled:text-gray-600 hover:text-fuchsia-600 disabled:bg-transparent hover:bg-gray-100',
    'dark:text-blue-500 dark:disabled:text-gray-400 dark:hover:text-fuchsia-400 dark:disabled:bg-transparent dark:hover:bg-gray-800',
    focusEnabled &&
      'focus:text-fuchsia-600 dark:focus:text-fuchsia-400 focus:outline-none focus:ring-2 ring-blue-700 dark:ring-blue-500',
    'hover:shadow-lg disabled:hover:shadow-none',
  ]);

export const buttonClassFn = ({
  btnType,
  iconOnly,
  customStyle,
  focusDisabled,
  clazz,
}: {
  btnType: BtnType;
  iconOnly: boolean;
  focusDisabled?: boolean;
  clazz?: string;
  customStyle?: boolean;
}) => {
  const focusEnabled = focusDisabled === undefined ? true : !focusDisabled;
  return customStyle
    ? clazz
    : clsx([
        'flex justify-center gap-1',
        iconOnly ? 'p-2' : 'px-3 py-2',
        !iconOnly && 'w-28 min-w-fit',
        btnType === 'primary' && primaryClass(focusEnabled),
        btnType === 'secondary' && secondaryClass(focusEnabled),
        'rounded-md',
        'transition',
        'disabled:cursor-not-allowed',
        clazz,
      ]);
};
