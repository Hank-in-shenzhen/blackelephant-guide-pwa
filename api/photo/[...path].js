/**
 * GET /api/photo/:submitId/:itemIndex
 * 获取照片
 */

const fs = require('fs');
const path = require('path');

const PHOTOS_DIR = '/tmp/checklist-data/photos';

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).end();
    return;
  }

  try {
    // req.query.path is an array like ['submitId', 'itemIndex']
    const pathParts = req.query.path;
    if (!pathParts || pathParts.length < 2) {
      res.status(404).end('Not found');
      return;
    }

    const submitId = pathParts[0];
    const itemIndex = pathParts[1];
    const photoPath = path.join(PHOTOS_DIR, `${submitId}:${itemIndex}.txt`);

    if (!fs.existsSync(photoPath)) {
      res.status(404).end('Photo not found');
      return;
    }

    const base64Data = fs.readFileSync(photoPath, 'utf8');
    const dataUrl = `data:image/jpeg;base64,${base64Data}`;

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.status(200).send(dataUrl);
  } catch (err) {
    console.error('Get photo error:', err);
    res.status(500).end(err.message);
  }
};
