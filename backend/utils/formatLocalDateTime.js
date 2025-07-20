function formatLocalDateTime(date, noDash = false) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  if (noDash) return `${yyyy}${mm}${dd}${hh}${mi}${ss}`
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

function formatLocalDateDay(date, noDash = false) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  if (noDash) return `${yyyy}${mm}${dd}`
  return `${yyyy}-${mm}-${dd}`;
}

module.exports = { formatLocalDateTime, formatLocalDateDay };