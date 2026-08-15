import type { ReactNode } from 'react';

// An action that is a link when it has somewhere to go, and a genuinely
// disabled button when it doesn't.
//
// The obvious shortcut — an `<a>` with no `href` and `aria-disabled` — looks
// right and is wrong: an anchor without an href has no link role, isn't
// focusable, and is announced as nothing at all. Since several of
// CampusPal's primary actions are deliberately unavailable while the backend
// catches up (Contact with no phone number, Directions with no coordinates),
// that state has to be properly announced rather than merely greyed out.
// SRS NFR-10.
export function ActionLink({
  href,
  external,
  disabledTitle,
  className = '',
  children,
  ...rest
}: {
  href?: string;
  external?: boolean;
  // Announced (and shown on hover) when there is no destination — say WHY,
  // not just that it's unavailable.
  disabledTitle: string;
  className?: string;
  children: ReactNode;
  'aria-label'?: string;
}) {
  if (!href) {
    return (
      <button
        type="button"
        disabled
        title={disabledTitle}
        className={`${className} cursor-not-allowed opacity-50`}
        {...rest}
      >
        {children}
      </button>
    );
  }

  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={className}
      {...rest}
    >
      {children}
    </a>
  );
}
