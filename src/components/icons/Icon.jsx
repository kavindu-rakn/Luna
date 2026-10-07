import React from 'react';
import { ICONS } from './icons';

// One of Luna's own icons (src/components/icons/icons.js), drawn in the current
// text colour. Decorative by default: the control around it carries the name.
const Icon = ({ name, size = 20, className, title, ...rest }) => {
  const parts = ICONS[name];
  if (!parts) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ? `icon ${className}` : 'icon'}
      aria-hidden={title ? undefined : 'true'}
      role={title ? 'img' : undefined}
      focusable="false"
      {...rest}
    >
      {title && <title>{title}</title>}
      {parts.map(([Tag, attributes], i) => <Tag key={i} {...attributes} />)}
    </svg>
  );
};

export default Icon;
