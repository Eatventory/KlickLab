const { formatLocalDateDay, formatLocalDateTime } = require('./formatLocalDateTime');

const now = new Date();

const getLocalNow = () => formatLocalDateDay(now);
const getIsoNow = () => formatLocalDateTime(now);

const floorToNearest10Min = (date = now) => {
  const d = new Date(date);
  d.setMinutes(Math.floor(d.getMinutes() / 10) * 10, 0, 0);
  return d;
};

const getOneHourAgo = () => {
  const d = new Date(now);
  d.setHours(d.getHours() - 1, 0, 0, 0);
  return d;
};

const getTodayStart = () => new Date(new Date().setHours(0, 0, 0, 0));

module.exports = {
  getLocalNow,
  getIsoNow,
  floorToNearest10Min,
  getOneHourAgo,
  getTodayStart,
  formatLocalDateTime,
};
