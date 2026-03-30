/**
 * POST /api/submit
 * 员工提交完成清单
 */

const fs = require('fs');
const path = require('path');

// 存储目录
const DATA_DIR = '/tmp/checklist-data';
const SUBMISSIONS_DIR = path.join(DATA_DIR, 'submissions');
const PHOTOS_DIR = path.join(DATA_DIR, 'photos');

// 确保目录存在
function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(SUBMISSIONS_DIR)) fs.mkdirSync(SUBMISSIONS_DIR, { recursive: true });
  if (!fs.existsSync(PHOTOS_DIR)) fs.mkdirSync(PHOTOS_DIR, { recursive: true });
}

// 保存照片到文件系统
function savePhoto(submitId, itemIndex, base64Data) {
  const photoPath = path.join(PHOTOS_DIR, `${submitId}:${itemIndex}.txt`);
  fs.writeFileSync(photoPath, base64Data);
  return `${submitId}:${itemIndex}`;
}

// 获取照片
function getPhoto(submitId, itemIndex) {
  const photoPath = path.join(PHOTOS_DIR, `${submitId}:${itemIndex}.txt`);
  if (!fs.existsSync(photoPath)) return null;
  return fs.readFileSync(photoPath, 'utf8');
}

module.exports = (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    ensureDirs();
    const { employeeId, date, checklistType, items } = req.body;

    if (!employeeId || !checklistType || !items) {
      res.status(400).json({ error: '缺少必要字段' });
      return;
    }

    const submitId = `${date}-${checklistType}-${employeeId}-${Date.now()}`;

    // 处理照片
    const processedItems = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.photo && item.photo.startsWith('data:')) {
        try {
          const pureBase64 = item.photo.split(',')[1];
          const photoKey = savePhoto(submitId, i, pureBase64);
          processedItems.push({ text: item.text, done: item.done, photo: photoKey });
        } catch (err) {
          console.error('照片存储失败:', err);
          processedItems.push({ text: item.text, done: item.done, photo: null });
        }
      } else {
        processedItems.push({ text: item.text, done: item.done, photo: item.photo });
      }
    }

    const record = {
      submitId,
      employeeId,
      date,
      checklistType,
      items: processedItems,
      submittedAt: new Date().toISOString(),
    };

    // 保存到 JSON 文件
    const subDir = path.join(SUBMISSIONS_DIR, date);
    if (!fs.existsSync(subDir)) fs.mkdirSync(subDir, { recursive: true });
    const listFile = path.join(subDir, `${checklistType}.json`);

    let list = [];
    if (fs.existsSync(listFile)) {
      try { list = JSON.parse(fs.readFileSync(listFile, 'utf8')); } catch {}
    }
    list.push(record);
    fs.writeFileSync(listFile, JSON.stringify(list, null, 2));

    res.status(200).json({ success: true, submitId });
  } catch (err) {
    console.error('Submit error:', err);
    res.status(500).json({ error: err.message });
  }
};
