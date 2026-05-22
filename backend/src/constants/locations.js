const CAMPUS_LOCATIONS = [
  { id: 'GATE_MAIN', name: 'Cong chinh' },
  { id: 'LIBRARY', name: 'Thu vien' },
  { id: 'CAMPUS_SQUARE', name: 'San truong' },
  { id: 'HALL_A', name: 'Sanh toa nha A' },
  { id: 'HALL_B', name: 'Sanh toa nha B' },
];

const CAMPUS_LOCATION_IDS = new Set(CAMPUS_LOCATIONS.map((location) => location.id));

module.exports = {
  CAMPUS_LOCATIONS,
  CAMPUS_LOCATION_IDS,
};
