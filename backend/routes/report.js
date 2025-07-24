const express = require("express");
const router = express.Router();
const { format } = require("@fast-csv/format");
const stream = require("stream");
const clickhouse = require("../src/config/clickhouse");
const authMiddleware = require("../middlewares/authMiddleware");
const { formatLocalDateTime } = require("../utils/formatLocalDateTime");

const { getKpiQueries } = require("../utils/reportUtils");

router.get("/kpi-report", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate)
    return res.status(400).json({ error: "Missing startDate or endDate" });

  try {
    const queries = getKpiQueries(sdk_key, startDate, endDate);

    const results = await Promise.all(
      Object.entries(queries).map(([key, { query }]) =>
        clickhouse
          .query({ query, format: "JSON" })
          .then((r) => r.json())
          .then((r) => ({ key, data: r.data || [] }))
      )
    );

    const response = {};
    for (const { key, data } of results) {
      response[key] = {
        category: queries[key].category,
        data,
      };
    }

    res.json(response);
  } catch (err) {
    console.error("[ERROR] /api/kpi-report 실패:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/kpi-report/csv", async (req, res) => {
  const reportData = req.body;

  if (!reportData || typeof reportData !== "object") {
    return res.status(400).json({ error: "Missing or invalid report data" });
  }

  const dateTime = formatLocalDateTime(new Date(), true);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="kpi-report-export-${dateTime}.csv"`
  );

  // // UTF-8 with BOM 추가 (엑셀 한글 깨짐 방지)
  res.write("\uFEFF");

  res.write("\uFEFF");

  try {
    const sections = Object.entries(reportData);

    for (const [key, section] of sections) {
      const { category, data } = section;
      if (!Array.isArray(data) || data.length === 0) continue;

      // 제목 줄 삽입
      res.write(`## ${category}\n`);

      const csvStream = format({ headers: true });
      csvStream.pipe(res, { end: false });

      const keys = Object.keys(data[0]);
      for (const row of data) {
        const rowOut = {};
        keys.forEach((k) => {
          if (k === "date" && row[k]) {
            // date를 문자열로 변환 (엑셀 자동 변환 방지)
            rowOut[k] = '="' + String(row[k]) + '"';
          } else {
            rowOut[k] = row[k] ?? "";
          }
        });
        csvStream.write(rowOut);
      }

      await new Promise((resolve) => {
        csvStream.end(() => {
          res.write("\n\n");
          resolve();
        });
      });
    }

    res.end();
  } catch (err) {
    console.error("[ERROR] CSV 생성 실패:", err);
    res.status(500).end();
  }
});

router.get("/kpi-report/txt", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate)
    return res.status(400).json({ error: 'Missing startDate or endDate' });

  try {
    const queries = getKpiQueries(sdk_key, startDate, endDate);
    const results = await Promise.all(
      Object.entries(queries).map(async ([key, { query }]) => {
        const data = await clickhouse.query({ query, format: 'JSON' }).then(r => r.json());
        return { key, category: queries[key].category, data: data.data || [] };
      })
    );

    const fileName = `kpi-report-${startDate}_to_${endDate}.txt`;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    let output = '';
    for (const { category, data } of results) {
      if (data.length === 0) continue;

      output += `## ${category}\n`;
      const headers = Object.keys(data[0]);
      output += headers.join('\t') + '\n';
      for (const row of data) {
        output += headers.map(h => row[h]).join('\t') + '\n';
      }
      output += '\n';
    }

    res.send(output);
  } catch (err) {
    console.error('[ERROR] KPI TXT 생성 실패:', err);
    res.status(500).end();
  }
});

router.get("/kpi-report/md", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate)
    return res.status(400).json({ error: 'Missing startDate or endDate' });

  try {
    const queries = getKpiQueries(sdk_key, startDate, endDate);
    const results = await Promise.all(
      Object.entries(queries).map(async ([key, { query }]) => {
        const data = await clickhouse.query({ query, format: 'JSON' }).then(r => r.json());
        return { key, category: queries[key].category, data: data.data || [] };
      })
    );

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="kpi-report-${startDate}_to_${endDate}.md"`);

    let output = `# KPI 리포트 (${startDate} ~ ${endDate})\n\n`;

    for (const { category, data } of results) {
      if (data.length === 0) continue;

      output += `## ${category}\n\n`;

      const headers = Object.keys(data[0]);
      output += `| ${headers.join(' | ')} |\n`;
      output += `| ${headers.map(() => '---').join(' | ')} |\n`;

      for (const row of data) {
        output += `| ${headers.map(h => row[h]).join(' | ')} |\n`;
      }

      output += `\n`;
    }

    res.send(output);
  } catch (err) {
    console.error('[ERROR] KPI MD 생성 실패:', err);
    res.status(500).end();
  }
});

router.get("/kpi-report/html", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate)
    return res.status(400).json({ error: 'Missing startDate or endDate' });

  try {
    const queries = getKpiQueries(sdk_key, startDate, endDate);
    const results = await Promise.all(
      Object.entries(queries).map(async ([key, { query }]) => {
        const data = await clickhouse.query({ query, format: 'JSON' }).then(r => r.json());
        return { key, category: queries[key].category, data: data.data || [] };
      })
    );

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="kpi-report-${startDate}_to_${endDate}.html"`);

    let html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>KPI 리포트</title>
      <style>
        body { font-family: sans-serif; padding: 20px; }
        h1 { font-size: 22px; margin-top: 40px; }
        table { border-collapse: collapse; width: 100%; margin-top: 10px; margin-bottom: 30px; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: center; font-size: 13px; }
        th { background-color: #f0f0f0; }
      </style>
    </head><body>`;

    html += `<h1>KPI 리포트 (${startDate} ~ ${endDate})</h1>`;

    for (const { category, data } of results) {
      if (data.length === 0) continue;

      html += `<h2>${category}</h2>`;
      html += `<table><thead><tr>`;
      const headers = Object.keys(data[0]);
      headers.forEach(h => html += `<th>${h}</th>`);
      html += `</tr></thead><tbody>`;
      data.forEach(row => {
        html += `<tr>${headers.map(h => `<td>${row[h]}</td>`).join('')}</tr>`;
      });
      html += `</tbody></table>`;
    }

    html += `</body></html>`;
    res.send(html);
  } catch (err) {
    console.error('[ERROR] KPI HTML 생성 실패:', err);
    res.status(500).end();
  }
});

module.exports = router;
