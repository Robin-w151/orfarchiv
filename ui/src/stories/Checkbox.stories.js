import CheckboxCmp from '$lib/components/ui/controls/Checkbox.svelte';

const args = {
  id: 'checkbox',
  label: 'Checkbox',
  checked: false,
};

export default {
  title: 'Controls/Checkbox',
  args,
  argTypes: {
    id: {
      type: 'string',
      description: 'Element id attribute',
      control: 'text',
    },
    label: {
      type: 'string',
      description: 'Companion label text content',
      control: 'text',
    },
    checked: {
      type: 'boolean',
      description: 'Controls whether the checkbox is checked',
      control: 'boolean',
    },
    onChange: {
      action: 'change',
      description: 'Called when the state of the checkbox is changed',
    },
  },
};

const Template = (args) => ({
  Component: CheckboxCmp,
  props: args,
  on: {
    change: args.onChange,
  },
});

export const Checkbox = Template.bind({});
