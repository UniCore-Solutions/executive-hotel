/**
 * Test-only fixture data — NOT used by production code.
 *
 * Kept here (split out of the former `src/data/index.ts`) only because
 * `pricing.test.ts` and `availability.test.ts` exercise their pure functions
 * against a realistic property/offer shape. Note the image URLs are
 * hotlinked third-party CDN links (booking.com, tripcdn, unsplash) — fine
 * for tests, never for production rendering.
 */
import type { Property, Offer } from '@/types';

const BK = {
  roomTwoBedsDesk:
    'https://cf.bstatic.com/xdata/images/hotel/max1024x768/572979699.jpg?k=2d66343c58755b8db3dde1f0604ee1e1891e6bbb61d7d015d98a309417c39e41&o=',
  roomBedDeskTv:
    'https://cf.bstatic.com/xdata/images/hotel/max1024x768/572979710.jpg?k=28183c9921918bf87bc3195a46554a65a84eafffb9d3a4f5274533e971def62a&o=',
  roomWhiteBedDressing:
    'https://cf.bstatic.com/xdata/images/hotel/max1024x768/572979724.jpg?k=720f06aec316d7dd877dec0db374d6a1bb3f80adf7a2ffb1d0a7e9d868474eb7&o=',
  bedroomBlueChairs:
    'https://cf.bstatic.com/xdata/images/hotel/max1024x768/572984057.jpg?k=376fcf6b7d645d777fcbef5edbe1e58d5e2dd478457547702da11cf4f39bcbc3&o=',
  roomTwoBlueChairs:
    'https://cf.bstatic.com/xdata/images/hotel/max1024x768/572984066.jpg?k=fccdab338c38b9d217b46f3037ec98f51d8c687e5dfcf433bf62bda4be30fedb&o=',
  lobbyWoodenWall:
    'https://cf.bstatic.com/xdata/images/hotel/max1024x768/572984359.jpg?k=c319f2502790e9a3a12181017bfb98066f040aebf48c6f02f4665c04a5aad074&o=',
  lobbyWaitingArea:
    'https://cf.bstatic.com/xdata/images/hotel/max1024x768/576912113.jpg?k=e4a8439005872a2f65d93838b01e518ee5386fcf62eceaf457b1d91023f99a68&o=',
  livingRoomCouches:
    'https://cf.bstatic.com/xdata/images/hotel/max1024x768/576912115.jpg?k=3a21a2147228c930cc1321494aac9d1bfe1af6c8c4e5c7fe51758a348f2b78b3&o=',
};

const TRIP = (id: string) => `https://aw-d.tripcdn.com/images/${id}.jpg`;

export const PROPERTY: Property = {
  id: 'executive-hotel',
  name: 'Executive Hotel',
  brand: 'Executive Hotel',
  city: 'Rabat',
  area: 'Agdal',
  type: 'Boutique Hotel',
  tagline:
    'A 4-star boutique hotel in Rabat’s Agdal district, steps from the National Library and Mohammed V University.',
  rating: 4.4,
  reviewCount: 967,
  checkIn: '15:00',
  checkOut: '12:00',
  description:
    '4-star rooms with free Wi-Fi in the Agdal district of Rabat — air-conditioned rooms with a desk, kettle, safe, flat-screen TV and private shower bathroom, a restaurant serving French, Mediterranean and Moroccan cuisine, and a free buffet breakfast.',
  longDescription:
    'Located in the Agdal-Ryad district in Rabat, Executive Hotel offers 4-star rooms with free Wi-Fi. All air-conditioned rooms come with a work desk, an electric kettle, a safety deposit box, a flat-screen TV and a private bathroom with a walk-in shower, plus bed linen and towels. A free buffet breakfast is served each morning, and the restaurant cooks French, Mediterranean and Moroccan cuisine, with vegetarian and halal options on request. Free private parking is available on site, and a paid airport shuttle runs to Rabat-Salé Airport. Arabic, English, Spanish and French are spoken at the 24-hour reception.',
  amenities: [
    'Free Wi-Fi',
    'Free private parking',
    'Free buffet breakfast',
    'Restaurant — French · Mediterranean · Moroccan',
    'Business centre & meeting rooms',
    '24-hour reception',
    'Laundry & dry cleaning',
    'Paid airport shuttle',
  ],
  highlights: ['Free Wi-Fi', 'Free private parking', 'Free buffet breakfast'],
  location: {
    address: '72 Rue Oued Sebou, Agdal, 10106 Rabat, Morocco',
    mapImage: BK.lobbyWaitingArea,
    distances: [
      { label: 'Kasbah of the Udayas', value: '4.5 km' },
      { label: 'Hassan Tower', value: '4.3 km' },
      { label: 'Rabat-Ville train station', value: '2.3 km' },
      { label: 'Rabat-Salé Airport', value: '12 km · 20 min drive' },
    ],
  },
  facilities: [
    {
      name: 'Restaurant',
      desc: 'French, Mediterranean and Moroccan cuisine served on site. Vegetarian and halal options available on request.',
      icon: 'utensils',
    },
    {
      name: 'Free buffet breakfast',
      desc: 'Served every morning in the restaurant.',
      icon: 'coffee',
    },
    {
      name: 'Business centre & meeting rooms',
      desc: 'Desk space, fax and photocopying, plus meeting and banquet facilities.',
      icon: 'shield',
    },
    {
      name: '24-hour reception',
      desc: 'Arabic, English, Spanish and French spoken around the clock, with luggage storage and safety deposit boxes.',
      icon: 'shield',
    },
    { name: 'Free private parking', desc: 'Free on-site parking for guests.', icon: 'car' },
    {
      name: 'Laundry & dry cleaning',
      desc: 'Laundry and dry-cleaning service during your stay.',
      icon: 'drop',
    },
  ],
  restaurants: [
    {
      name: 'Restaurant',
      type: 'French · Mediterranean · Moroccan',
      hours: '',
      dress: '',
      reservation: false,
      desc: 'The hotel restaurant serves French, Mediterranean and Moroccan cuisine. Vegetarian and halal options can be requested.',
    },
    {
      name: 'Buffet breakfast',
      type: 'Free · every morning',
      hours: '',
      dress: '',
      reservation: false,
      desc: 'A free buffet breakfast is available each morning at the accommodation.',
    },
    {
      name: 'Coffee Shop',
      type: 'À la carte',
      hours: '',
      dress: '',
      reservation: false,
      desc: 'The à la carte Coffee Shop prepares halal dishes through the day.',
    },
  ],
  policies: [
    {
      name: 'Check-in',
      value: 'From 15:00 until 23:30. Luggage storage at the 24-hour reception.',
      icon: 'clock',
    },
    {
      name: 'Check-out',
      value: 'From 06:00 until 12:00.',
      icon: 'clock',
    },
    {
      name: 'Children',
      value: 'Children are welcome. Baby cots can be added to rooms on request.',
      icon: 'child',
    },
    {
      name: 'Pets',
      value: 'Pets are not allowed.',
      icon: 'paw',
    },
    {
      name: 'Smoking',
      value: 'No smoking on site.',
      icon: 'cigarette',
    },
    {
      name: 'Parking',
      value: 'Free private parking is available on site.',
      icon: 'car',
    },
  ],
  experiences: [
    {
      name: 'Kasbah of the Udayas',
      desc: 'The 12th-century kasbah at the mouth of the Bou Regreg — 4.5 km from the hotel by taxi.',
      icon: 'eye',
    },
    {
      name: 'Hassan Tower',
      desc: 'The unfinished Almohad minaret and its esplanade, a 4.3 km ride from the hotel.',
      icon: 'eye',
    },
    {
      name: 'Bouregreg Marina',
      desc: 'The modern marina between Rabat and Salé, 6 km away, with restaurants and a riverside promenade.',
      icon: 'pin',
    },
    {
      name: 'The National Library',
      desc: 'The National Library of the Kingdom of Morocco and the university quarter are within walking distance.',
      icon: 'pin',
    },
  ],
  faq: {
    general: [
      {
        q: 'What time is check-in and check-out?',
        a: 'Check-in is from 15:00 until 23:30 and check-out from 06:00 until 12:00. Luggage storage is available at the 24-hour reception.',
      },
      {
        q: 'Is breakfast included?',
        a: 'Yes — a free buffet breakfast is served every morning. The à la carte Coffee Shop prepares halal dishes through the day.',
      },
      { q: 'Is there parking?', a: 'Yes — free private parking is available on site.' },
      {
        q: 'Do you offer airport transfers?',
        a: 'Rabat-Salé Airport is 12 km from the hotel. A paid airport shuttle can be arranged at reception.',
      },
    ],
    bookings: [
      {
        q: 'Can I cancel or change my reservation?',
        a: 'Most rates can be cancelled free of charge up to 2–7 days before check-in (see your rate). You can modify your dates, guests or room from the My Reservation page.',
      },
      {
        q: 'How do I find my reservation?',
        a: 'Use the My Reservation page with your confirmation number (e.g. RC-8F3K2Q) and the email used at booking. No account needed.',
      },
      {
        q: 'Do you take payment now?',
        a: 'In this prototype, payment is simulated. In production the full stay or a deposit is charged through a secure payment provider — we never store card details.',
      },
      {
        q: 'Can I book without an account?',
        a: 'Yes. A guest account is optional and only adds conveniences like saving preferences.',
      },
    ],
    atTheProperty: [
      {
        q: 'Does the hotel have a pool?',
        a: 'No — the hotel does not have a pool. Guests enjoy the on-site restaurant, business centre and free parking instead.',
      },
      {
        q: 'Is the hotel suitable for families?',
        a: 'Children are welcome and baby cots can be added to rooms on request. Pets are not allowed.',
      },
      {
        q: 'Which languages are spoken at reception?',
        a: 'Arabic, English, Spanish and French are spoken around the clock at the 24-hour reception.',
      },
    ],
  },
  gallery: [
    {
      src: BK.lobbyWoodenWall,
      category: 'general',
      alt: 'Lobby with a wooden feature wall at Executive Hotel',
    },
    {
      src: BK.lobbyWaitingArea,
      category: 'general',
      alt: 'Lobby waiting area with chairs and tables at Executive Hotel',
    },
    {
      src: BK.livingRoomCouches,
      category: 'general',
      alt: 'Living room with couches and chairs at Executive Hotel',
    },
    {
      src: BK.roomTwoBedsDesk,
      category: 'rooms',
      alt: 'Double room with two beds and a desk at Executive Hotel',
    },
    {
      src: BK.roomBedDeskTv,
      category: 'rooms',
      alt: 'Room with a bed, a desk and a TV at Executive Hotel',
    },
    {
      src: BK.roomWhiteBedDressing,
      category: 'rooms',
      alt: 'Bedroom with a white bed at Executive Hotel',
    },
    {
      src: BK.bedroomBlueChairs,
      category: 'rooms',
      alt: 'Bedroom with a bed and two blue chairs at Executive Hotel',
    },
    {
      src: BK.roomTwoBlueChairs,
      category: 'rooms',
      alt: 'Hotel room with a bed and two blue chairs at Executive Hotel',
    },
    {
      src: TRIP('0223i12000l4acfph291E'),
      category: 'rooms',
      alt: 'Executive Suite at Executive Hotel',
    },
    {
      src: TRIP('0222z12000l6x2nio090D'),
      category: 'rooms',
      alt: 'Superior room at Executive Hotel',
    },
  ],
  reviews: [
    {
      author: 'Abdulrahim',
      country: 'Saudi Arabia',
      rating: 5,
      date: 'April 2026',
      stay: 'Superior Double or Twin',
      title: 'Comfortable beds, nice location',
      text: 'Comfortable beds, nice location. Staff are helpful — especially Yaqub. Free parking.',
    },
    {
      author: 'Abdellatif',
      country: 'Morocco',
      rating: 5,
      date: 'May 2026',
      stay: 'Double or Twin',
      title: 'Very clean and quiet',
      text: 'Very clean, good service, and very quiet.',
    },
    {
      author: 'Abdelrahman',
      country: 'United Arab Emirates',
      rating: 5,
      date: 'January 2026',
      stay: 'Double or Twin',
      title: 'Close to all services',
      text: 'The property was clean, close to all services and the staff were very helpful.',
    },
    {
      author: 'Hireche',
      country: 'France',
      rating: 4,
      date: 'April 2026',
      stay: 'Superior Double or Twin',
      title: 'Good location',
      text: 'Good location. I had a room on the 4th floor with a balcony.',
    },
    {
      author: 'Celine',
      country: 'United Kingdom',
      rating: 4,
      date: 'January 2026',
      stay: 'Double or Twin',
      title: 'Good value for money',
      text: 'Location. Friendly, polite, helpful staff. Clean rooms. Good breakfast.',
    },
  ],
  images: [BK.lobbyWoodenWall, BK.livingRoomCouches, BK.lobbyWaitingArea, BK.roomTwoBedsDesk],
  rooms: [
    {
      id: 'superior-double-or-twin',
      name: 'Superior Double or Twin',
      images: [
        TRIP('0222z12000l6x2nio090D'),
        TRIP('0222t12000l74i3xk4EE9'),
        TRIP('0225y12000l6x2ew8ADC4'),
        TRIP('0220e12000l6x2jxe20D2'),
        TRIP('0223912000l6x2kqrB002'),
      ],
      description:
        'Air-conditioned superior room with a double bed, a work desk, an electric kettle, a safety deposit box, a flat-screen TV with satellite channels and a private bathroom with a walk-in shower.',
      capacity: { adults: 2, children: 1 },
      bed: '1 Double Bed or 2 Single Beds',
      size: '22 m²',
      category: 'standard',
      amenities: [
        'Air conditioning',
        'Work desk',
        'Electric kettle',
        'Safety deposit box',
        'Flat-screen TV',
        'Private bathroom with shower',
        'Wardrobe',
        'Free Wi-Fi',
      ],
      pricePerNight: 1050,
      cancellationPolicy: 'Free cancellation up to 2 days before check-in',
      availability: 'available',
      importantInfo: [
        'Check-in from 15:00 until 23:30',
        'Check-out until 12:00',
        'No smoking on site',
        'No pets allowed',
        'Free private parking on site',
      ],
    },
    {
      id: 'double-or-twin',
      name: 'Double or Twin',
      images: [
        TRIP('0226n12000l74i0sp565A'),
        TRIP('0220512000l74i3xe4F95'),
        TRIP('0226h12000l74i1ywFF46'),
        TRIP('0221g12000l4achk59F1D'),
        TRIP('0222b12000l6x2jjzEB0A'),
      ],
      description:
        'Air-conditioned room with a double bed or two single beds, a work desk, an electric kettle, a safety deposit box, a flat-screen TV with satellite channels and a private bathroom with a walk-in shower.',
      capacity: { adults: 2, children: 1 },
      bed: '1 Double Bed or 2 Single Beds',
      size: '23 m²',
      category: 'standard',
      amenities: [
        'Air conditioning',
        'Work desk',
        'Electric kettle',
        'Safety deposit box',
        'Flat-screen TV',
        'Private bathroom with shower',
        'Wardrobe',
        'Free Wi-Fi',
      ],
      pricePerNight: 910,
      cancellationPolicy: 'Free cancellation up to 1 day before check-in',
      availability: 'available',
      importantInfo: [
        'Check-in from 15:00 until 23:30',
        'Check-out until 12:00',
        'No smoking on site',
        'No pets allowed',
        'Free private parking on site',
      ],
    },
    {
      id: 'executive-suite',
      name: 'Executive Suite',
      images: [
        TRIP('0223i12000l4acfph291E'),
        TRIP('0220p12000l4acwub7DBA'),
        TRIP('0581c12000sqn19vbC80A'),
        TRIP('0226z12000l4acsnk84D6'),
        TRIP('0225d12000l4acuchEA08'),
      ],
      description:
        'Spacious air-conditioned suite with a sofa bed, its own terrace, a work desk, an electric kettle, a safety deposit box, a flat-screen TV and a private bathroom with a walk-in shower.',
      capacity: { adults: 2, children: 1 },
      bed: '1 Sofa Bed',
      size: '24 m²',
      view: 'Terrace',
      category: 'suite',
      amenities: [
        'Air conditioning',
        'Terrace',
        'Work desk',
        'Electric kettle',
        'Safety deposit box',
        'Flat-screen TV',
        'Private bathroom with shower',
        'Wardrobe',
        'Free Wi-Fi',
      ],
      pricePerNight: 1550,
      cancellationPolicy: 'Free cancellation up to 3 days before check-in',
      availability: 'available',
      importantInfo: [
        'Check-in from 15:00 until 23:30',
        'Check-out until 12:00',
        'No smoking on site',
        'No pets allowed',
        'Free private parking on site',
      ],
    },
  ],
};

export const OFFERS: Offer[] = [
  {
    id: 'summer2026',
    code: 'SUMMER2026',
    title: 'Early Bird Savings',
    desc: 'Book at least 21 days ahead and save 10% on Bed & Breakfast and Half Board rates.',
    discount: { type: 'percent', value: 10 },
    bookingWindow: { from: '2026-05-01', to: '2026-09-30' },
    stayWindow: { from: '2026-06-01', to: '2026-10-31' },
    minNights: 2,
    eligiblePlans: ['bb', 'hb'],
    badge: '−10%',
    conditions: [
      'Minimum stay of 2 nights',
      'Booked at least 21 days in advance',
      'Bed & Breakfast or Half Board rates',
    ],
  },
  {
    id: 'stay4pay3',
    code: 'STAY4PAY3',
    title: 'Long Stay — 4th Night Free',
    desc: 'Stay 4 nights or more and the cheapest night of your stay is on us.',
    discount: { type: 'night', every: 4, free: 1 },
    bookingWindow: { from: '2026-01-01', to: '2026-12-31' },
    stayWindow: { from: '2026-01-01', to: '2026-12-31' },
    minNights: 4,
    eligiblePlans: ['bb', 'hb', 'ro'],
    badge: '1 night free',
    conditions: [
      'Minimum stay of 4 nights',
      'Free night = lowest-priced night of the stay',
      'All rate plans eligible',
    ],
  },
  {
    id: 'bestrate',
    code: 'BESTRATE',
    title: 'Non-refundable Value Rate',
    desc: 'Save 15% on Room Only rates. Non-refundable — the full stay is charged at booking.',
    discount: { type: 'percent', value: 15 },
    bookingWindow: { from: '2026-01-01', to: '2026-12-31' },
    stayWindow: { from: '2026-01-01', to: '2026-12-31' },
    minNights: 1,
    eligiblePlans: ['ro'],
    badge: '−15%',
    conditions: [
      'Room Only rates only',
      'Non-refundable — full stay charged at booking',
      'This is our lowest available rate',
    ],
  },
  {
    id: 'corp10',
    code: 'CORP10',
    title: 'Corporate Rate',
    desc: 'For business guests travelling to Rabat — 8% off Bed & Breakfast rates with flexible cancellation.',
    discount: { type: 'percent', value: 8 },
    bookingWindow: { from: '2026-01-01', to: '2026-12-31' },
    stayWindow: { from: '2026-01-01', to: '2026-12-31' },
    minNights: 1,
    eligiblePlans: ['bb'],
    badge: '−8%',
    conditions: ['Bed & Breakfast rates only', 'No minimum stay', 'Free cancellation kept'],
  },
  {
    id: 'welcome5',
    code: 'WELCOME5',
    title: 'Newsletter Welcome Rate',
    desc: 'Join our newsletter and receive 5% off your first direct booking.',
    discount: { type: 'percent', value: 5 },
    bookingWindow: { from: '2026-01-01', to: '2026-12-31' },
    stayWindow: { from: '2026-01-01', to: '2026-12-31' },
    minNights: 1,
    eligiblePlans: ['bb', 'hb', 'ro'],
    badge: '−5%',
    conditions: [
      'One use per email address',
      'First direct booking only',
      'All rate plans eligible',
    ],
  },
];
