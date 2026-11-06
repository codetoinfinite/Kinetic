'use client';

import { TreeView, TreeViewItem } from '@/registry/ui/tree-view';

/* BoardUI's own preview: a project file tree with src and components open
   and the components folder selected. Click a chevron (or use the arrow keys)
   to watch rows unfold and the guide lines reconnect. */
export default function Demo() {
  return (
    <TreeView
      aria-label="Project files"
      defaultExpandedKeys={['src', 'components']}
      defaultSelectedKeys={['components']}
      className="max-w-sm"
    >
      <TreeViewItem id="src" label="src">
        <TreeViewItem id="components" label="components">
          <TreeViewItem id="button" label="button.tsx" iconClassName="text-accent-700" trailingContent="4 KB" />
          <TreeViewItem id="button-styles" label="button.module.css" iconClassName="text-chart-5-active" trailingContent="1 KB" />
          <TreeViewItem id="input" label="input.tsx" iconClassName="text-accent-700" trailingContent="6 KB" />
        </TreeViewItem>
        <TreeViewItem id="hooks" label="hooks">
          <TreeViewItem id="use-theme" label="use-theme.ts" iconClassName="text-accent-700" />
          <TreeViewItem id="use-media-query" label="use-media-query.ts" iconClassName="text-accent-700" />
        </TreeViewItem>
        <TreeViewItem id="page" label="page.tsx" iconClassName="text-accent-700" />
      </TreeViewItem>
      <TreeViewItem id="public" label="public">
        <TreeViewItem id="logo" label="logo.svg" iconClassName="text-chart-5-active" />
        <TreeViewItem id="favicon" label="favicon.ico" />
      </TreeViewItem>
      <TreeViewItem id="readme" label="README.md" iconClassName="text-chart-1-active" />
      <TreeViewItem id="package" label="package.json" />
    </TreeView>
  );
}
