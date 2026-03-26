'use client';

export const ALERTS_UPDATED_EVENT = 'alerts:updated';

export function emitAlertsUpdated() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(ALERTS_UPDATED_EVENT));
}
