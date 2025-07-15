function buildSegmentWhereClause(filters = {}) {
  const conditions = [];

  if (filters.isNew === true) {
    conditions.push('user_id IS NULL');
  } else if (filters.isNew === false) {
    conditions.push('user_id IS NOT NULL');
  }

  if (filters.device === 'mobile') {
    conditions.push("device_type = 'mobile'");
  } else if (filters.device === 'desktop') {
    conditions.push("device_type = 'desktop'");
  }

  if (filters.exitPage) {
    conditions.push(`page_path = '${filters.exitPage}'`);
  }

  // 필요시 추가 필드들
  // if (filters.browser) ...
  // if (filters.country) ...

  return conditions.length ? `AND ${conditions.join(' AND ')}` : '';
}

module.exports = { buildSegmentWhereClause };
