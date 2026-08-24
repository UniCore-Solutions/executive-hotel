/** Static content: global site navigation (header/footer) + contact facts. */

export const TEL = 'tel:+212537278860';
export const TEL_DISPLAY = '+212 5 37 27 88 60';

export interface NavLinkSpec {
  labelKey: string;
  ref: string;
  homeRef: string;
}

/** Desktop + mobile main navigation. `ref` is used off the home page, `homeRef` on it
    (direct section anchors on `/`, otherwise the section on `/hotel`). */
export const NAV_LINKS: readonly NavLinkSpec[] = [
  { labelKey: 'rooms', ref: '/hotel#rooms', homeRef: '/#rooms' },
  { labelKey: 'offers', ref: '/offers', homeRef: '/#offers' },
  { labelKey: 'experiences', ref: '/hotel#experiences', homeRef: '/#experiences' },
  { labelKey: 'reviews', ref: '/hotel#reviews', homeRef: '/#reviews' },
  { labelKey: 'faq', ref: '/faq', homeRef: '/faq' },
];

/** Extra utility entries appended to the mobile menu. */
export const MOBILE_UTILITY_LINKS: readonly { label: string; href: string }[] = [
  { label: 'My reservation', href: '/reservation' },
  { label: 'Account', href: '/account' },
];
