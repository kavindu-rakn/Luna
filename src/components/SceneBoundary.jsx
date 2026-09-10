import { Component } from 'react';

/**
 * Contains a failure in a 3D scene to that scene.
 *
 * The Moon and the orbital diagram are the only parts of Luna that need WebGL,
 * and each is loaded as its own chunk. Without this, a device with WebGL disabled,
 * a GPU process crash, or a chunk that fails to download would all bubble up to
 * the app-wide error boundary and replace every working panel with an error page.
 * Here the scene gives way to its fallback and everything else carries on.
 */
class SceneBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    // A degraded-but-working state, not a crash: warn rather than error
    console.warn(`${this.props.name || '3D scene'} unavailable, showing fallback:`, error?.message || error);
    this.props.onError?.(error);
  }

  render() {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children;
  }
}

export default SceneBoundary;
