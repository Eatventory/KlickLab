/**
 * 서비스 계층
 *  └─ 퍼널 Sankey 에서 “다음 단계 Top N”을 조회하는 비즈니스 로직만 담당
 *
 * - 컨트롤러(routes)와 분리해 테스트‧재사용을 쉽게 만들기 위함
 * - SQL 인젝션을 막기 위해 ClickHouse 파라미터 바인딩({name:Type}) 사용
 */

const clickhouse = require('../src/config/clickhouse'); // 싱글턴 클라이언트

/**
 * 특정 퍼널 단계(Step)에서 사용자들이 가장 많이 이동한 '다음 단계 Top N'을 조회하는 함수.
 * @param {Object} params
 * @param {string} params.page   클릭한 노드(예: '/cart')
 * @param {string} params.from   조회 시작일(YYYY-MM-DD)
 * @param {string} params.to     조회 종료일(YYYY-MM-DD)
 * @param {number} [params.limit=5] 반환할 결과 개수
 * @returns {Promise<Array<{target:string, sessions:number}>>}
 */
async function getNextSteps({ page, from, to, limit = 5 }) {
    const sql = `
      SELECT target,
      toUInt64(sum(sessions)) AS sessions
      FROM   klicklab.funnel_links_daily
      WHERE  source = {page:String}
        AND  event_date BETWEEN {from:Date} AND {to:Date}
      GROUP  BY target
      ORDER  BY sessions DESC
      LIMIT  {limit:UInt8};
    `;
    const result = await clickhouse.query({
        query: sql,
        query_params: { page, from, to, limit: Number(limit) },
        format: 'JSONEachRow'
    });
    return result.json();
}
module.exports = { getNextSteps };
