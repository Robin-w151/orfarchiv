export const defaultScreenSize = 'w-screen max-w-screen-lg';

export const defaultPadding = 'px-3 sm:px-6 py-2 sm:py-3';
export const defaultGap = 'gap-2 sm:gap-3';

export const defaultText = 'text-gray-800 dark:text-gray-300';
export const defaultBackground = 'bg-white dark:bg-gray-900';

export const defaultAlertTextBox = `
  flex flex-col ${defaultGap}
  ${defaultPadding}
  w-full
  sm:text-lg
  ${defaultText}
  ${defaultBackground}
`;

export const defaultMenuClass = `
  flex flex-col gap-2
  p-2
`;
export const defaultMenuItemClass = `
  flex gap-2
  p-2
  text-blue-700 hover:text-fuchsia-600 focus:text-fuchsia-600 hover:bg-gray-100 focus:bg-gray-100
  dark:text-blue-500 dark:hover:text-fuchsia-400 dark:focus:text-fuchsia-400 dark:hover:bg-gray-800 dark:focus:bg-gray-800
  focus:outline-none
  rounded-lg cursor-pointer
  transition
`;
