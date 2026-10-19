export const CAMPUS_ROOM_GROUPS = [
  {
    building: "PTC",
    rooms: ["ITS 200", "ITS 201", ...range("PTC", 302, 306), ...range("PTC", 403, 406)],
  },
  {
    building: "NH",
    rooms: [...range("NH", 116, 119), ...range("NH", 216, 220), ...range("NH", 317, 320), ...range("NH", 416, 420)],
  },
  {
    building: "CMA",
    rooms: [...range("CMA", 123, 128), ...range("CMA", 223, 228), ...range("CMA", 323, 328), ...range("CMA", 423, 428)],
  },
  {
    building: "RS",
    rooms: [
      ...range("RS", 240, 248),
      ...range("RS", 340, 346),
      "Mock Hospital (3rd flr)",
      "Teachers Lounge (4th flr)",
      "Human Anatomy 3 (4th flr)",
      "Human Anatomy 4 (4th flr)",
      ...range("RS", 540, 549),
      ...range("RS", 640, 649),
      ...range("RS", 740, 749),
      ...range("RS", 841, 844),
    ],
  },
  { building: "CCJE", rooms: [...range("CCJE", 150, 153), ...range("CCJE", 250, 253), ...range("CCJE", 350, 353)] },
  {
    building: "MBA",
    rooms: [...range("MBA", 203, 212), ...range("MBA", 303, 312), "AVR (4th flr)", "Chemistry room (4th flr)"],
  },
  { building: "BE", rooms: [...range("BE", 201, 208), ...range("BE", 301, 308), ...range("BE", 401, 408)] },
];

function range(prefix: string, start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, index) => `${prefix} ${start + index}`);
}
