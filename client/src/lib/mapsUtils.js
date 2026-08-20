const COORD_RE = /@(-?\d+\.\d+),(-?\d+\.\d+)/;

const addressQuery = (field) =>
  [field?.name, field?.address, field?.area, 'Malaysia'].filter(Boolean).join(', ');

// Clickable "open in Google Maps" link — the admin-set link if there is one
// (works for any format: short share link, place URL, etc.), otherwise a
// search link built from the field's name/address/area.
export function getMapsLink(field) {
  if (field?.maps_url) return field.maps_url;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressQuery(field))}`;
}

// Embeddable iframe src. Google only allows framing its dedicated embed
// endpoints (not a regular maps.google.com/place page), so this reads
// coordinates out of the admin-set link when present — most Google Maps URLs
// for a dropped pin contain an "@lat,lng" segment — and otherwise falls back
// to a text-query embed built from the field's address. Both work without a
// Maps API key.
export function getMapsEmbedSrc(field) {
  const coords = field?.maps_url?.match(COORD_RE);
  if (coords) {
    const [, lat, lng] = coords;
    return `https://www.google.com/maps?q=${lat},${lng}&z=16&output=embed`;
  }
  return `https://www.google.com/maps?q=${encodeURIComponent(addressQuery(field))}&output=embed`;
}
