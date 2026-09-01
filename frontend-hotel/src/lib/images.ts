/** Image-URL helpers shared by the search/room/booking UI. */

export const img = (id: string, w = 1200) =>
  /^https?:\/\//.test(id)
    ? id
    : `https://images.unsplash.com/${id}?q=80&w=${w}&auto=format&fit=crop`;

export const IMG_FALLBACK = img('photo-1489493585363-d69421e0edd3', 1200);
