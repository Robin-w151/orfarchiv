import RadioCmp from '$lib/components/ui/controls/Radio.svelte';

const args = {
  id: 'radio',
  name: 'radio',
  label: 'Radio',
  checked: false,
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
    checked: {
      type: 'boolean',
      description: 'Controls whether the radio control is active',
      control: 'boolean',
    },
    onChange: {
      action: 'change',
      description: 'Called when the state of the radio control is activated',
    },
  },
};

const Template = (args) => ({
  Component: RadioCmp,
  props: args,
  on: {
    change: args.onChange,
  },
});

export const Radio = Template.bind({});
