import NotificationView from './NotificationView.svelte';

const args = {
  id: 'notification1',
  title: 'Beispielerinnerung',
  text: 'Das ist eine Beispielerinnerung. Rechts vom Text befinden sich die möglichen Aktionen.',
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
    title: {
      type: 'string',
      description: 'Title of the notification.',
      table: {
        defaultValue: { summary: args.title },
      },
      control: 'text',
    },
    text: {
      type: 'string',
      description: 'Main text of the notification.',
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
