import ButtonView from './ButtonView.svelte';

const args = {
  type: 'button',
  btnType: 'primary',
  size: 'normal',
  iconOnly: false,
  round: false,
  disabled: false,
  title: 'Button',
};

export default {
  title: 'Controls/Button',
  component: ButtonView,
  args,
  argTypes: {
    type: {
      type: 'string',
      description: 'HTMLButtonElement type attribute',
      table: {
        defaultValue: { summary: args.type },
      },
      control: { type: 'select' },
      options: ['button', 'reset', 'submit'],
    },
    btnType: {
      type: 'string',
      description: 'Style type',
      table: {
        defaultValue: { summary: args.btnType },
      },
      control: { type: 'select' },
      options: ['primary', 'secondary', 'monochrome'],
    },
    size: {
      type: 'string',
      description: 'Size type',
      table: {
        defaultValue: { summary: args.size },
      },
      control: { type: 'select' },
      options: ['small', 'normal'],
    },
    iconOnly: {
      type: 'boolean',
      description: 'Enables icon-only mode',
      table: {
        defaultValue: { summary: args.iconOnly },
      },
      control: 'boolean',
    },
    round: {
      type: 'boolean',
      description: 'Enables fully rounded button',
      table: {
        defaultValue: { summary: args.round },
      },
    },
    disabled: {
      type: 'boolean',
      description: 'Disables button (HTMLButtonElement disabled attribute)',
      table: {
        defaultValue: { summary: args.disabled },
      },
      control: 'boolean',
    },
    title: {
      type: 'string',
      description: 'HTMLElement title (should render default browser tooltip)',
      control: 'text',
    },
    onClick: {
      action: 'click',
      description: 'Called when the button is clicked',
    },
    onKeydown: {
      action: 'keydown',
      description: 'Called when a key is pressed down',
    },
  },
};

const Template = (args) => ({
  Component: ButtonView,
  props: args,
  on: {
    click: args.onClick,
    keydown: args.onKeydown,
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

export const Round = Template.bind({});
Round.args = {
  btnType: 'monochrome',
  size: 'small',
  iconOnly: true,
  round: true,
};
