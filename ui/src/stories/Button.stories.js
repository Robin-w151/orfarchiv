import ButtonView from './ButtonView.svelte';

const defaultArgs = {
  type: 'button',
  btnType: 'primary',
  size: 'normal',
  iconOnly: false,
  disabled: false,
  title: 'Button',
};

export default {
  title: 'Button',
  component: ButtonView,
  args: defaultArgs,
  argTypes: {
    type: {
      type: 'string',
      description: 'HTMLButtonElement type',
      table: {
        defaultValue: { summary: defaultArgs.type },
      },
      control: { type: 'select' },
      options: ['button', 'reset', 'submit'],
    },
    btnType: {
      type: 'string',
      description: 'Style type',
      table: {
        defaultValue: { summary: defaultArgs.btnType },
      },
      control: { type: 'select' },
      options: ['primary', 'secondary'],
    },
    size: {
      type: 'string',
      description: 'Size type',
      table: {
        defaultValue: { summary: defaultArgs.size },
      },
      control: { type: 'select' },
      options: ['small', 'normal'],
    },
    iconOnly: {
      type: 'boolean',
      description: 'Enables icon-only mode',
      table: {
        defaultValue: { summary: defaultArgs.iconOnly },
      },
      control: 'boolean',
    },
    disabled: {
      type: 'boolean',
      description: 'Disables button (HTMLButtonElement disabled attribute)',
      table: {
        defaultValue: { summary: defaultArgs.disabled },
      },
      control: 'boolean',
    },
    title: {
      type: 'string',
      description: 'HTMLElement title (should render default browser tooltip)',
      control: 'text',
    },
  },
};

const Template = (args) => ({
  Component: ButtonView,
  props: args,
  on: {
    click: args.onClick,
  },
});

export const Primary = Template.bind({});
Primary.args = {
  btnType: 'primary',
};

export const Secondary = Template.bind({});
Secondary.args = {
  btnType: 'secondary',
};

export const IconOnly = Template.bind({});
IconOnly.args = {
  btnType: 'primary',
  iconOnly: true,
};
