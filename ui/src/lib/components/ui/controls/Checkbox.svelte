<script lang="ts">
  import classNames from 'classnames';

  export let id: string;
  export let label: string;

  const wrapperClass = classNames(['inline-flex gap-3']);
  const labelClass = classNames(['flex-1']);
</script>

<span class={wrapperClass}>
  <input {id} type="checkbox" on:select />
  <label class={labelClass} for={id}>{label}</label>
</span>
