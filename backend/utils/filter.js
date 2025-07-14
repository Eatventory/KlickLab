function buildFilterCondition({
  period = "1day",
  userType = "all",
  device = "all",
}) {
  let timeFilter = "toDate(timestamp) = today()";
  switch (period) {
    case "5min":
      timeFilter = "timestamp >= now() - interval 5 minute";
      break;
    case "1hour":
      timeFilter = "timestamp >= now() - interval 1 hour";
      break;
    case "1day":
      timeFilter = "timestamp >= now() - interval 1 day";
      break;
    case "1week":
      timeFilter = "timestamp >= now() - interval 7 day";
      break;
  }

  const deviceFilter = device !== "all" ? `AND device_type = '${device}'` : "";
  let userFilter = "";

  if (userType === "new") {
    userFilter = `
      AND user_id IN (
        SELECT user_id FROM events 
        WHERE toDate(timestamp) = today()
        GROUP BY user_id
        HAVING min(toDate(timestamp)) = today()
      )
    `;
  } else if (userType === "returning") {
    userFilter = `
      AND user_id IN (
        SELECT user_id FROM events
        WHERE toDate(timestamp) = today()
        GROUP BY user_id
        HAVING min(toDate(timestamp)) < today()
      )
    `;
  }

  return `${timeFilter} ${deviceFilter} ${userFilter}`;
}

module.exports = { buildFilterCondition };
