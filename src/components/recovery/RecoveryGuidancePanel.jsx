import React, { useEffect, useState } from 'react';
import { CircleHelp, X } from 'lucide-react';

const storagePrefix = 'sblocco_recovery_guidance_v1:';

export default function RecoveryGuidancePanel({ concept, title, children }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(window.localStorage.getItem(`${storagePrefix}${concept}`) !== 'seen');
    } catch {
      setVisible(true);
    }
  }, [concept]);

  if (!visible) return null;

  function dismiss() {
    try {
      window.localStorage.setItem(`${storagePrefix}${concept}`, 'seen');
    } catch {
      // The explanation can still be dismissed for the current page view.
    }
    setVisible(false);
  }

  return (
    <aside className="learner-plan-update" role="note" aria-label={title}>
      <CircleHelp size={18} aria-hidden="true" />
      <div style={{ flex: 1 }}>
        <strong>{title}</strong>
        <div>{children}</div>
      </div>
      <button type="button" className="learner-guidance-dismiss" onClick={dismiss} aria-label={`Chiudi: ${title}`}>
        <X size={16} aria-hidden="true" />
      </button>
    </aside>
  );
}
