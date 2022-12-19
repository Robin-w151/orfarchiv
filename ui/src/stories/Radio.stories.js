import RadioView from './RadioView.svelte';

const args = {
  id: 'radio',
  name: 'radio',
  label: 'Radio',
  value: 'radio-value',
};

export default {
  title: 'Controls/Radio',
  args,
  argTypes: {
    id: {
      type: 'string',
      description: 'Element id attribute',
      control: 'text',
    },
    name: {
      type: 'string',
      description: 'Element name attribute. Should be the same for all radio controls from one group.',
      control: 'text',
    },
    label: {
      type: 'string',
      description: 'Companion label text content',
      control: 'text',
    },
    value: {
      type: 'string',
      description:
        'Value of this particular radio control. If equal to bound group, the radio control should be active.',
      control: 'text',
    },
    onChange: {
      action: 'change',
      description: 'Called when the state of the radio control is activated',
    },
  },
};

const Template = (args) => ({
  Component: RadioView,
  props: args,
  on: {
    change: args.onChange,
  },
});

export const Radio = Template.bind({});
