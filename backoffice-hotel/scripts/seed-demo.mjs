import { request } from 'graphql-request';

const API = process.env.HOTEL_API_URL || 'http://localhost:8180/graphql';

async function main() {
  const login = await request(API, `
    mutation Login($email: String!, $password: String!) {
      login(input: { email: $email, password: $password }) { token }
    }
  `, { email: 'admin@hotelcollection.test', password: 'admin123' });
  const headers = { Authorization: `Bearer ${login.login.token}` };

  const existing = await request(API, `
    query Hotels { adminHotels(page: { page: 0, size: 100 }) { total, items { id, name } } }
  `, {}, headers);
  const demo = existing.adminHotels.items.find((h) => h.name === 'Azure Bay Resort');
  let hotelId = demo?.id;

  if (!hotelId) {
    const created = await request(API, `
      mutation CreateHotel($input: AdminHotelInput!) {
        createHotel(input: $input) { id, name, status }
      }
    `, {
      input: {
        name: 'Azure Bay Resort', brand: 'Hotel Collection', hotelType: 'resort',
        description: 'Demo resort for the back office.', addressLine1: '1 Marina Drive',
        city: 'Lisbon', countryCode: 'ES', defaultCurrency: 'EUR',
        checkInTime: '15:00', checkOutTime: '12:00', starRating: 4, status: 'active',
      },
    }, headers);
    hotelId = created.createHotel.id;
    console.log(`Created hotel ${hotelId}`);
  } else {
    console.log(`Using existing hotel ${hotelId}`);
  }

  const workspace = await request(API, `
    query Workspace($hotelId: ID!) {
      adminHotel(hotelId: $hotelId) {
        roomTypes { id, name }
        ratePlans { id, name }
        availability { id }
        hotel { id, defaultCurrency }
      }
    }
  `, { hotelId }, headers);
  const w = workspace.adminHotel;

  let roomTypeId = w.roomTypes.find((rt) => rt.name === 'Deluxe Sea View')?.id;
  if (!roomTypeId) {
    const created = await request(API, `
      mutation CreateRoomType($hotelId: ID!, $input: AdminRoomTypeInput!) {
        createRoomType(hotelId: $hotelId, input: $input) { id }
      }
    `, {
      hotelId,
      input: { name: 'Deluxe Sea View', maxAdults: 2, maxChildren: 1, bedConfiguration: 'King',
        sizeSqm: 34, viewType: 'Sea', status: 'active' },
    }, headers);
    roomTypeId = created.createRoomType.id;
    console.log(`Created room type ${roomTypeId}`);
  }

  const roomTypes = await request(API, `
    query RoomTypes($hotelId: ID!) {
      adminHotel(hotelId: $hotelId) { roomTypes { id, rooms { id, roomNumber } } }
    }
  `, { hotelId }, headers);
  const rt = roomTypes.adminHotel.roomTypes.find((x) => x.id === roomTypeId);
  if (!rt.rooms.some((r) => r.roomNumber === '101')) {
    await request(API, `
      mutation CreateRoom($hotelId: ID!, $input: AdminRoomInput!) {
        createRoom(hotelId: $hotelId, input: $input) { id }
      }
    `, { hotelId, input: { roomTypeId, roomNumber: '101', floor: '1', status: 'active',
      housekeepingStatus: 'clean', maintenanceStatus: 'ok' } }, headers);
    console.log('Created room 101');
  }

  let ratePlanId = w.ratePlans.find((rp) => rp.name === 'Standard Rate')?.id;
  if (!ratePlanId) {
    const created = await request(API, `
      mutation CreateRatePlan($hotelId: ID!, $input: AdminRatePlanInput!) {
        createRatePlan(hotelId: $hotelId, input: $input) { id }
      }
    `, { hotelId, input: { name: 'Standard Rate', code: 'STD', currencyCode: 'EUR',
      isRefundable: true, paymentTiming: 'prepay_deposit', depositPercentage: 20,
      minStay: 1, status: 'active' } }, headers);
    ratePlanId = created.createRatePlan.id;
    console.log(`Created rate plan ${ratePlanId}`);
  }

  const links = await request(API, `
    query Links($hotelId: ID!) {
      adminHotel(hotelId: $hotelId) { ratePlans { id, links { id, roomTypeId, prices { id } } } }
    }
  `, { hotelId }, headers);
  const rp = links.adminHotel.ratePlans.find((x) => x.id === ratePlanId);
  const link = rp.links.find((l) => l.roomTypeId === roomTypeId);

  const today = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  const from = iso(today);
  const to = iso(new Date(today.getTime() + 89 * 86400000));

  if (!link) {
    await request(API, `
      mutation Link($roomTypeId: ID!, $ratePlanId: ID!) {
        linkRoomTypeRatePlan(roomTypeId: $roomTypeId, ratePlanId: $ratePlanId) { id }
      }
    `, { roomTypeId, ratePlanId }, headers);
    console.log('Linked room type to rate plan');
    await request(API, `
      mutation SetPrices($linkId: ID!, $prices: [RatePlanPriceInput!]!) {
        setRatePlanPrices(linkId: $linkId, prices: $prices) { id }
      }
    `, { linkId: undefined, prices: [] }, headers).catch(() => {});
  } else {
    await request(API, `
      mutation SetPrices($linkId: ID!, $prices: [RatePlanPriceInput!]!) {
        setRatePlanPrices(linkId: $linkId, prices: $prices) { id }
      }
    `, { linkId: link.id, prices: [{ validFrom: from, validTo: to, priceAmount: 189.0 }] }, headers);
    console.log('Set prices');
  }

  const availability = await request(API, `
    query Availability($hotelId: ID!) {
      adminHotel(hotelId: $hotelId) { availability { id } }
    }
  `, { hotelId }, headers);
  if (availability.adminHotel.availability.length === 0) {
    const rows = [];
    for (let i = 0; i < 90; i++) {
      rows.push({ roomTypeId, stayDate: iso(new Date(today.getTime() + i * 86400000)),
        totalInventory: 10, outOfOrder: 0, blocked: 0 });
    }
    await request(API, `
      mutation UpdateAvailability($hotelId: ID!, $rows: [AvailabilityUpdateInput!]!) {
        updateAvailability(hotelId: $hotelId, rows: $rows) { id }
      }
    `, { hotelId, rows }, headers);
    console.log('Seeded 90 days of availability');
  }

  const promos = await request(API, `
    query Promos($hotelId: ID!) {
      adminPromotions(hotelId: $hotelId) { id }
    }
  `, { hotelId }, headers);
  if (promos.adminPromotions.length === 0) {
    await request(API, `
      mutation CreatePromotion($hotelId: ID!, $input: AdminPromotionInput!) {
        createPromotion(hotelId: $hotelId, input: $input) { id }
      }
    `, { hotelId, input: { name: 'Summer Escape', code: 'SUMMER25', description: '15% off stays of 3+ nights',
      discountType: 'PERCENTAGE', discountValue: 15.0, status: 'active',
      stayWindowStart: iso(today), stayWindowEnd: iso(new Date(today.getTime() + 120 * 86400000)) } }, headers);
    console.log('Created promotion');
  }

  console.log('Seed complete. hotelId=' + hotelId);
}

main().catch((err) => { console.error(err); process.exit(1); });