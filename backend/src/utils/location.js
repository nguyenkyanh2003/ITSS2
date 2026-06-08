const { CAMPUS_LOCATION_IDS } = require('../constants/locations');

const normalizeLocationId = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const normalized = String(value).trim();
  return CAMPUS_LOCATION_IDS.has(normalized) ? normalized : null;
};

module.exports = { normalizeLocationId };
