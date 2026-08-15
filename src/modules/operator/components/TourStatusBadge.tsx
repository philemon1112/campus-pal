import type { TourStatus } from '@/lib/api';

// The DRAFT -> PENDING_REVIEW -> APPROVED lifecycle badge, shared by the
// operator console and the admin moderation screen so a tour reads the same
// on both sides of the handover.
const statusStyles: Record<TourStatus, string> = {
  DRAFT: 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400',
  PENDING_REVIEW: 'bg-accent-500/10 text-accent-500',
  APPROVED: 'bg-brand-50 text-brand-600 dark:bg-brand-700/20 dark:text-brand-500',
  SUSPENDED: 'bg-danger-500/10 text-danger-500',
};

const statusLabels: Record<TourStatus, string> = {
  DRAFT: 'Draft',
  PENDING_REVIEW: 'In review',
  APPROVED: 'Approved',
  SUSPENDED: 'Suspended',
};

export function TourStatusBadge({ status }: { status: TourStatus }) {
  return (
    <span
      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}
