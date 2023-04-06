import NewsListView from './NewsListView.svelte';

export default {
  title: 'Content/NewsList',
  component: NewsListView,
};

const Template = () => ({
  Component: NewsListView,
});

export const NewsList = Template.bind({});
