/**
 * 腾讯云 SCF (云函数) - 统一入口
 * 支持:
 *   POST /submit  - 员工提交
 *   GET  /submissions - 店长获取提交
 *   GET  /photo/:submitId/:itemIndex - 获取照片
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

// 保存照片
function savePhoto(submitId, itemIndex, base64Data) {
  const photoPath = path.join(PHOTOS_DIR, `${submitId}:${itemIndex}.txt`);
  fs.writeFileSync(photoPath, base64Data);
  return `${submitId}:${itemIndex}`;
}

// CORS 头
function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

// 统一响应
function respond(statusCode, body, contentType = 'application/json') {
  return {
    statusCode,
    headers: {
      'Content-Type': contentType,
      ...getCorsHeaders(),
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  };
}

// 解析 querystring
function parseQuery(qs) {
  if (!qs) return {};
  if (typeof qs === 'object') return qs;
  const params = {};
  qs.split('&').forEach(pair => {
    const [k, v] = pair.split('=');
    params[decodeURIComponent(k)] = decodeURIComponent(v || '');
  });
  return params;
}

// 解析 body (base64 或 json)
function parseBody(body, contentType) {
  if (!body) return {};
  const str = Buffer.from(body, 'base64').toString('utf8') || body;
  try {
    return JSON.parse(str);
  } catch {
    return {};
  }
}

// 保存照片到文件系统
function savePhotoFile(submitId, itemIndex, base64Data) {
  const photoPath = path.join(PHOTOS_DIR, `${submitId}:${itemIndex}.txt`);
  fs.writeFileSync(photoPath, base64Data);
}

// 获取照片
function getPhotoFile(submitId, itemIndex) {
  const photoPath = path.join(PHOTOS_DIR, `${submitId}:${itemIndex}.txt`);
  if (!fs.existsSync(photoPath)) return null;
  return fs.readFileSync(photoPath, 'utf8');
}

// POST /submit
async function handleSubmit(body) {
  ensureDirs();
  const { employeeId, date, checklistType, items } = body;

  if (!employeeId || !checklistType || !items) {
    return respond(400, { error: '缺少必要字段' });
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

  return respond(200, { success: true, submitId });
}

// GET /submissions
async function handleGetSubmissions(query) {
  const { date, checklistType } = query;

  if (!date || !checklistType) {
    return respond(400, { error: '缺少 date 或 checklistType 参数' });
  }

  const listFile = path.join(SUBMISSIONS_DIR, date, `${checklistType}.json`);

  if (!fs.existsSync(listFile)) {
    return respond(200, { submissions: [] });
  }

  const data = fs.readFileSync(listFile, 'utf8');
  const submissions = JSON.parse(data);

  return respond(200, { submissions });
}

// GET /photo/:submitId/:itemIndex
async function handleGetPhoto(pathParts) {
  if (!pathParts || pathParts.length < 2) {
    return respond(404, 'Not found');
  }

  const submitId = pathParts[0];
  const itemIndex = pathParts[1];
  const base64Data = getPhotoFile(submitId, itemIndex);

  if (!base64Data) {
    return respond(404, 'Photo not found');
  }

  const dataUrl = `data:image/jpeg;base64,${base64Data}`;
  return respond(200, dataUrl, 'text/plain');
}

// 入口
exports.main_handler = async (event, context) => {
  // OPTIONS 预检
  if (event.httpMethod === 'OPTIONS') {
    return respond(200, '');
  }

  const path = event.path || '/';
  const method = event.httpMethod || 'GET';
  const query = event.queryStringParameters || {};

  console.log(`${method} ${path}`, query);

  // 路由
  if (path === '/submit' && method === 'POST') {
    const body = parseBody(event.body, event.headers['content-type']);
    return await handleSubmit(body);
  }

  if (path === '/submissions' && method === 'GET') {
    return await handleGetSubmissions(query);
  }

  // /photo/ 开头的路径
  if (path.startsWith('/photo/')) {
    const pathParts = path.replace('/photo/', '').split('/');
    return await handleGetPhoto(pathParts);
  }

  return respond(404, { error: 'Not found' });
};
