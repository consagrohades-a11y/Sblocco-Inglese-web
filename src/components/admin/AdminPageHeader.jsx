import React from 'react';
import { adminText } from '../../styles/adminUi.js';

export default function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions = null,
}) {
  return (
    <header className="border-b border-ink/10 pb-6 dark:border-white/10">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          {eyebrow ? <p className={adminText.eyebrow}>{eyebrow}</p> : null}
          <h1 className={`${eyebrow ? 'mt-3 ' : ''}${adminText.title}`}>{title}</h1>
          {description ? <p className={`mt-3 ${adminText.description}`}>{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
