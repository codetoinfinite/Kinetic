'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

import { site } from '@/site.config';

/* ==========================================================================
   One broken component must not take the page with it.
   --------------------------------------------------------------------------
   Previews run real WebGL, real pointer maths, and real third-party code
   against whatever GPU the visitor happens to have. A driver that refuses a
   float texture throws during render, and without a boundary that unmounts
   the whole route — a grid of 40 working components replaced by a stack
   trace because one of them met an unusual machine.

   Scoped per preview, so the blast radius is one card.
   ========================================================================== */

interface Props {
  children: ReactNode;
  slug: string;
  fallback: ReactNode;
}

interface State {
  message: string | null;
}

export class PreviewErrorBoundary extends Component<Props, State> {
  override state: State = { message: null };

  static getDerivedStateFromError(error: unknown): State {
    return { message: error instanceof Error ? error.message : 'Preview failed to render' };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Named, because "Cannot read properties of null" with no component name
    // is indistinguishable from a bug in the site itself.
    console.error(
      `[${site.registryName}] preview "${this.props.slug}" crashed`,
      error,
      info.componentStack,
    );
  }

  override componentDidUpdate(previous: Props): void {
    // A remount with a different component should get a clean attempt rather
    // than inheriting the previous one's error state.
    if (previous.slug !== this.props.slug && this.state.message !== null) {
      this.setState({ message: null });
    }
  }

  override render(): ReactNode {
    if (this.state.message === null) return this.props.children;

    return (
      <div className="relative h-full w-full">
        <div className="absolute inset-0 opacity-30">{this.props.fallback}</div>
        <div className="absolute inset-x-0 bottom-0 border-t border-line bg-bg/80 px-3 py-2 backdrop-blur-sm">
          <p className="meta text-danger">Preview unavailable</p>
          <p className="mt-0.5 truncate text-[0.6875rem] text-faint" title={this.state.message}>
            {this.state.message}
          </p>
        </div>
      </div>
    );
  }
}
