import NotificationView from './NotificationView.svelte';

const args = {
  id: 'notification1',
  text: 'This is a sample notification.',
  options: {
    actions: () => console.log('Clicked notification accept.'),
  },
};

export default {
  title: 'Controls/Notification',
  component: NotificationView,
  args,
  argTypes: {
    id: {
      type: 'string',
      description: 'ID of notification. Used for removing the correct notification.',
      table: {
        defaultValue: { summary: args.id },
      },
      control: 'text',
    },
    text: {
      type: 'string',
      description: 'ID of notification. Used for removing the correct notification.',
      table: {
        defaultValue: { summary: args.text },
      },
      control: 'text',
    },
  },
};

const Template = (args) => ({
  Component: NotificationView,
  props: args,
});

export const Notification = Template.bind({});
