/**
 * GET /api/submissions?date=YYYY-MM-DD&checklistType=open|close
 * 店长获取提交记录
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = '/tmp/checklist-data';
const SUBMISSIONS_DIR = path.join(DATA_DIR, 'submissions');

module.exports = (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { date, checklistType } = req.query;

    if (!date || !checklistType) {
      res.status(400).json({ error: '缺少 date 或 checklistType 参数' });
      return;
    }

    const listFile = path.join(SUBMISSIONS_DIR, date, `${checklistType}.json`);

    if (!fs.existsSync(listFile)) {
      res.status(200).json({ submissions: [] });
      return;
    }

    const data = fs.readFileSync(listFile, 'utf8');
    const submissions = JSON.parse(data);

    res.status(200).json({ submissions });
  } catch (err) {
    console.error('Get submissions error:', err);
    res.status(500).json({ error: err.message });
  }
};
