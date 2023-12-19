<script lang="ts">
  import { page } from '$app/stores';
  import { error, redirect } from '@sveltejs/kit';

  const path = $page.url.pathname;
  if (path === '/favicon.ico') {
    error(404, 'Not found');
  }

  redirect(302, '/');
</script>
