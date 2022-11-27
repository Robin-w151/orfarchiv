import CheckboxCmp from '$lib/components/ui/controls/Checkbox.svelte';

const args = {
  id: 'checkbox',
  label: 'Checkbox',
  checked: false,
};

export default {
  title: 'FormControl/Checkbox',
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
  },
};

const Template = (args) => ({
  Component: CheckboxCmp,
  props: args,
});

export const Checkbox = Template.bind({});
