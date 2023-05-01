import clsx from 'clsx';

export type BtnType = 'primary' | 'secondary' | 'monochrome';
export type Size = 'small' | 'normal';

interface Variant {
  color: string;
  colorDark?: string;
  outline: string;
}

const layout = 'flex justify-center gap-1';
const miscellaneous = 'disabled:shadow-none hover:shadow-lg focus:shadow-lg transition disabled:cursor-not-allowed';

const primary = {
  color: 'text-white bg-blue-700 hover:bg-blue-600 disabled:bg-gray-600',
  outline: 'focus:outline-none focus:ring-2 ring-offset-2 ring-blue-700 disabled:ring-gray-600',
} satisfies Variant;
const secondary = {
  color: 'text-blue-700 disabled:text-gray-600 hover:text-fuchsia-600 disabled:bg-transparent hover:bg-gray-200',
  colorDark:
    'dark:text-blue-500 dark:disabled:text-gray-400 dark:hover:text-fuchsia-400 dark:disabled:bg-transparent dark:hover:bg-gray-700',
  outline:
    'focus:text-fuchsia-600 dark:focus:text-fuchsia-400 focus:outline-none focus:ring-2 ring-blue-700 dark:ring-blue-500',
} satisfies Variant;
const monochrome = {
  color: 'text-gray-700 disabled:text-gray-600 hover:text-gray-800 disabled:bg-transparent hover:bg-gray-200',
  colorDark:
    'dark:text-gray-300 dark:disabled:bg-gray-400 dark:hover:text-gray-200 dark:disabled:bg-transparent dark:hover:bg-gray-700',
  outline: 'focus:outline-none focus:ring-2 ring-blue-700 dark:ring-blue-500',
} satisfies Variant;

const sizeClass = (size: Size, iconOnly: boolean) =>
  clsx([
    size === 'small' && 'text-sm',
    size === 'small' && (iconOnly ? 'p-1' : 'px-3 py-1'),
    size === 'small' && !iconOnly && 'w-20',
    size === 'normal' && (iconOnly ? 'p-2' : 'px-3 py-2'),
    size === 'normal' && !iconOnly && 'w-28',
    'min-w-fit',
  ]);
const roundedClass = (round: boolean) => (round ? 'rounded-full' : 'rounded-md');
const primaryClass = (focusEnabled: boolean) => clsx([primary.color, focusEnabled && primary.outline]);
const secondaryClass = (focusEnabled: boolean) =>
  clsx([secondary.color, secondary.colorDark, focusEnabled && secondary.outline]);
const monochromeClass = (focusEnabled: boolean) =>
  clsx([monochrome.color, monochrome.colorDark, focusEnabled && monochrome.outline]);

export const buttonClassFn = ({
  btnType,
  size,
  iconOnly,
  round,
  customStyle,
  focusDisabled,
  clazz,
}: {
  btnType: BtnType;
  size: Size;
  iconOnly: boolean;
  round: boolean;
  focusDisabled?: boolean;
  clazz?: string;
  customStyle?: boolean;
}) => {
  const focusEnabled = focusDisabled === undefined ? true : !focusDisabled;
  return customStyle
    ? clazz
    : clsx([
        layout,
        sizeClass(size, iconOnly),
        roundedClass(round),
        btnType === 'primary' && primaryClass(focusEnabled),
        btnType === 'secondary' && secondaryClass(focusEnabled),
        btnType === 'monochrome' && monochromeClass(focusEnabled),
        miscellaneous,
        clazz,
      ]);
};
