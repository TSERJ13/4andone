import React from 'react';

/** One title block for every admin page: icon, title, short explanation, and the page's main actions on the right. */
export default function AdminPageHeader({
  icon,
  title,
  subtitle,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="ap-header">
      <div className="ap-title-row">
        {icon && <div className="ap-icon">{icon}</div>}
        <div className="ap-text">
          <h1 className="ap-title">{title}</h1>
          {subtitle && <p className="ap-subtitle">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="ap-actions">{children}</div>}
    </header>
  );
}
