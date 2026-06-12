import { Component } from 'react'

// Phase 9 — top-level error boundary. A render crash anywhere in the tree
// shows a friendly bilingual recovery card instead of a blank white screen.
// "Try again" re-renders in place; "Reload" does a full refresh. User progress
// is safe either way — it lives in localStorage, not component state.
export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Keep diagnostics in the console for debugging; no external reporting.
    console.error('AppErrorBoundary caught:', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="app-error-boundary" role="alert">
        <div className="app-error-card">
          <span className="app-error-emoji" aria-hidden="true">🌸</span>
          <h1>حدث خطأ غير متوقع</h1>
          <p>لا تقلق — تقدّمك محفوظ. جرّب المتابعة أو أعد تحميل الصفحة.</p>
          <p className="app-error-en">Something went wrong. Your progress is safe — try again or reload.</p>
          <div className="app-error-actions">
            <button className="btn btn-primary" onClick={() => this.setState({ error: null })}>
              المتابعة / Try again
            </button>
            <button className="btn btn-secondary" onClick={() => window.location.reload()}>
              إعادة التحميل / Reload
            </button>
          </div>
          <details className="app-error-details">
            <summary>تفاصيل تقنية / Technical details</summary>
            <pre>{String(this.state.error?.stack || this.state.error)}</pre>
          </details>
        </div>
      </div>
    )
  }
}
