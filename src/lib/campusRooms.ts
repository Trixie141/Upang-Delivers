export type CampusRoomFloor = {
  floor: string;
  rooms: string[];
};

export type CampusBuilding = {
  building: string;
  floors: CampusRoomFloor[];
};

const numbered = (values: string) => values.split(/,\s*/);
const floor = (floor: string, rooms: string) => ({ floor, rooms: numbered(rooms) });

export const CAMPUS_BUILDINGS: CampusBuilding[] = [
  {
    building: "RS",
    floors: [
      floor("2nd Floor", "201, 202, 203, 204, 205, 206, 207, 208, CAHS Faculty Office, 211, 212, 213, 215"),
      floor("3rd Floor", "301, 303, 304, 307, 308, 309, 310, 311, 312, 313, 314, 315, CAS Faculty Office"),
      floor("4th Floor", "Employees Lounge, Nursing Skills Lab, Anatomy Lab"),
      floor("5th Floor", "535, 536, 537, 538, 539, 540, 541, 542, 543, 544, 545, 546, 547, 548, 549"),
      floor("6th Floor", "635, 636, 637, 638, 639, 640, 641, 642, 643, 644, 645, 646, 647, 648, 649"),
      floor("7th Floor", "735, 736, 737, 738, 739, 740, 741, 742, 743, 744, 745, 756, 747, 748"),
      floor("8th Floor", "848, 849"),
    ],
  },
  {
    building: "MBA",
    floors: [
      floor("2nd Floor", "201, 202, 203, Human Resources, 207, 208, 209, 210, 211, 212"),
      floor("3rd Floor", "CEA, 307, 308, 309, 310, 311, 312"),
      floor("4th Floor", "401, 402, 403, 404, 405, 406, 407 A, 407 B, 408, 409, 410, 411, 412"),
    ],
  },
  {
    building: "CCJE",
    floors: [
      floor("1st Floor", "150, 151, 152, 153"),
      floor("2nd Floor", "250, 251, 252, 253"),
      floor("3rd Floor", "350, 351, 352, 353"),
      floor("4th Floor", "453, Crime Lab"),
    ],
  },
  {
    building: "BE",
    floors: [
      floor("1st Floor", "101, 102, 103, 104, 105, 106, 107"),
      floor("2nd Floor", "201, 202, 203, 204, 205, 206, 207, 208"),
      floor("3rd Floor", "301, 302, 303, 304, 305, 306, 307, 308"),
      floor("4th Floor", "401, 402, 403, 404, 405, 406, 407, 408"),
    ],
  },
  {
    building: "NH",
    floors: [
      floor("1st Floor", "113, 114, 115, 116, 117, 118, 119, 120, 121"),
      floor("2nd Floor", "213, 214, 215, 216, 217, 218, 219, 220, 221, 222"),
      floor("3rd Floor", "313, 314, 315, 316, 317, 318, 319, 320, 321, 322"),
      floor("4th Floor", "413, 414, 415, 416, 417, 418, 419, 420, 421"),
      floor("5th Floor", "510, 512, 514, 516"),
    ],
  },
  {
    building: "CMA",
    floors: [
      floor("1st Floor", "123, 124, 125, 126, 127, 128"),
      floor("2nd Floor", "223, 224, 225, 226, 227, 228, 229, CMA Office, 232, 233, 234"),
      floor("3rd Floor", "323, 324, 325, 326, 327, 328, 329, 330, 334"),
      floor("4th Floor", "Cold Kitchen, 425, 426, 427, 428, Reception Hall, Suite Room, BR1, BR2, Banquet Hall, Storage Room"),
    ],
  },
  {
    building: "PTC",
    floors: [
      floor("2nd Floor", "MAC Lab, Union Office"),
      floor("3rd Floor", "301, 302, 303, 304, 305, 306"),
      floor("4th Floor", "CITE Office, 403, 404, 405, 406, Library"),
    ],
  },
  {
    building: "ITS",
    floors: [
      floor("1st Floor", "CSDL Office"),
      floor("2nd Floor", "200, 201"),
    ],
  },
  {
    building: "University Library",
    floors: [floor("University Library", "University Library")],
  },
  {
    building: "University Gymnasium",
    floors: [floor("University Gymnasium", "University Gymnasium")],
  },
];

export const getBuilding = (name: string) => CAMPUS_BUILDINGS.find(({ building }) => building === name);
