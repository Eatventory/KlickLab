const clickhouse = require('../src/config/clickhouse');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const { formatLocalDateTime } = require('../utils/formatLocalDateTime');

// SQL 인젝션 공격 방지용
function escapeSQLString(str) {
  return str.replace(/'/g, "''");
}

async function getUserByEmail(email) {
  const escapedEmail = escapeSQLString(email);
  const query = `
    SELECT id, email, password_hash, sdk_key
    FROM users
    WHERE email = '${escapedEmail}'
    LIMIT 1
  `;
  const res = await clickhouse.query({ query, format: 'JSON' });
  const json = await res.json();
  return json.data[0] || null;
}

async function createUser(email, password) {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  const escapedEmail = escapeSQLString(email);
  
  const uuid = randomUUID();
  const now = new Date();
  const localDatetime = formatLocalDateTime(now);

  await clickhouse.insert({
    table: 'users',
    values: [
      { email: escapedEmail, password_hash: hash, sdk_key: uuid, created_at: localDatetime, updated_at: localDatetime }
    ],
    format: 'JSONEachRow'
  });

  const newUser = await getUserByEmail(email);
  return newUser.id;
}

module.exports = { getUserByEmail, createUser };