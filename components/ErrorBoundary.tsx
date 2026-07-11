"use client";

import { Component, type ReactNode } from "react";

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: unknown) {
    console.error("ArmModel crashed:", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ position: "absolute", top: 60, left: 10, color: "red", fontFamily: "monospace", fontSize: 12, whiteSpace: "pre-wrap", maxWidth: 500 }}>
          {String(this.state.error.stack || this.state.error.message)}
        </div>
      );
    }
    return this.props.children;
  }
}
