import { useEffect } from 'react';

// A small transient confirmation — replaces plain text next to the Save button
// (LESSONS.md, turn 4's UX findings). Auto-dismisses after ~3 seconds and is
// also dismissible by click. No dependency: a controlled component.
export default function Toast({ message, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="toast" role="status" onClick={onDismiss}>
      {message}
    </div>
  );
}
