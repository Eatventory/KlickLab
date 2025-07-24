const { formatLocalDateTime } = require('./formatLocalDateTime');
const { getLocalNow, getIsoNow, floorToNearest10Min, getNearestHourFloor, getOneHourAgo, getTodayStart } = require('./timeUtils');

const localNow = getLocalNow();
const isoNow = getIsoNow();
const tenMinutesFloor = formatLocalDateTime(floorToNearest10Min());
const NearestHourFloor = formatLocalDateTime(getNearestHourFloor());
const oneHourFloor = formatLocalDateTime(getOneHourAgo());
const todayStart = formatLocalDateTime(getTodayStart());

function buildQueryWhereClause (table = "minutes", period = 7) {
  let res = "";
  if (table === "daily") {
    res = `date >= toDate('${localNow}') - INTERVAL ${period} DAY AND date <= toDate('${localNow}')`;
  } else if (table === "hourly") {
    res = `date_time >= toDateTime('${todayStart}') AND date_time <= toDateTime('${oneHourFloor}')`;
  } else if (table === "minutes") {
    res = `date_time >= toDateTime('${NearestHourFloor}') AND date_time < toDateTime('${tenMinutesFloor}')`;
  }
  return res;
}

module.exports = { buildQueryWhereClause };