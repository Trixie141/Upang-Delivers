// Approximate GPS bounds for the campus-map image used by the frontend.
// Keep these values in sync with CAMPUS_BOUNDS in src/screens/MyRequests.tsx.
export const CAMPUS_GPS_BOUNDS = {
  south: 16.0460,
  north: 16.0474,
  west: 120.3410,
  east: 120.3427,
};

export function isInsideCampus(lat, lng) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= CAMPUS_GPS_BOUNDS.south &&
    lat <= CAMPUS_GPS_BOUNDS.north &&
    lng >= CAMPUS_GPS_BOUNDS.west &&
    lng <= CAMPUS_GPS_BOUNDS.east
  );
}
