import DateInputComponent from '$lib/components/ui/controls/DateInput.svelte';

const args = {
  id: 'date-input',
  value: '',
};

export default {
  title: 'Controls/DateInput',
  component: DateInputComponent,
  args,
  argTypes: {
    id: {
      type: 'string',
      description: 'Element id attribute',
      control: 'text',
    },
    value: {
      type: 'string',
      description: 'Current value of the date-input control',
      control: 'text',
    },
    onChange: {
      action: 'change',
      description: 'Called when the value of the date-input control is changed',
    },
  },
};

export const DateInput = (args) => ({
  Component: DateInputComponent,
  props: args,
  on: {
    change: args.onChange,
  },
});
