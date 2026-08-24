import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';

const LS_KEYS = [
  'rc_reservations_v1',
  'rc_users_v1',
  'rc_session_v1',
  'rc_consent_v1',
  'rc_newsletter_v1',
  'rc_booking_done',
];

afterEach(() => {
  document.body.innerHTML = '';
  for (const k of LS_KEYS) localStorage.removeItem(k);
});
