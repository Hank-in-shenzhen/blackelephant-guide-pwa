/**
 * Cloudflare Worker - Checklist 同步后端
 * API:
 *   POST /submit       - 员工提交完成清单（照片分片存储到 KV）
 *   GET /submissions   - 店长获取提交记录
 *   GET /photo/:submitId/:itemIndex - 获取某个照片（从分片合并返回）
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

class ChecklistWorker {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      if (url.pathname === '/submit' && request.method === 'POST') {
        return await this.handleSubmit(request, env);
      }
      if (url.pathname === '/submissions' && request.method === 'GET') {
        return await this.handleGetSubmissions(request, env);
      }
      // 照片访问：GET /photo/:submitId/:itemIndex
      if (url.pathname.startsWith('/photo/') && request.method === 'GET') {
        return await this.handleGetPhoto(request, env);
      }
      return new Response('Worker is running!', {
        headers: { 'Content-Type': 'text/plain' },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  }

  // 处理照片：分片存储到 KV
  async storePhotoShards(submitId, itemIndex, base64Data, env) {
    const SHARD_SIZE = 800; // 每片最大字符数，留空间给元数据
    const totalShards = Math.ceil(base64Data.length / SHARD_SIZE);
    const photoKey = `photo:${submitId}:${itemIndex}`;
    const metaKey = `${photoKey}:meta`;

    // 存储元数据：总片数和总长度
    await env.CHECKLIST_KV.put(metaKey, JSON.stringify({
      total: totalShards,
      length: base64Data.length
    }));

    // 分片存储
    for (let i = 0; i < totalShards; i++) {
      const shard = base64Data.slice(i * SHARD_SIZE, (i + 1) * SHARD_SIZE);
      await env.CHECKLIST_KV.put(`${photoKey}:${i}`, shard);
    }

    return `${submitId}:${itemIndex}`;
  }

  // 从 KV 分片读取照片
  async getPhotoShards(submitId, itemIndex, env) {
    const photoKey = `photo:${submitId}:${itemIndex}`;
    const metaKey = `${photoKey}:meta`;

    const metaData = await env.CHECKLIST_KV.get(metaKey);
    if (!metaData) return null;

    const { total } = JSON.parse(metaData);
    let result = '';
    for (let i = 0; i < total; i++) {
      const shard = await env.CHECKLIST_KV.get(`${photoKey}:${i}`);
      if (shard) result += shard;
    }
    return result;
  }

  async handleSubmit(request, env) {
    const body = await request.json();
    const { employeeId, date, checklistType, items } = body;

    if (!employeeId || !checklistType || !items) {
      return new Response(JSON.stringify({ error: '缺少必要字段' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const submitId = `${date}-${checklistType}-${employeeId}-${Date.now()}`;

    // 处理照片：分片存储到 KV
    const processedItems = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.photo && item.photo.startsWith('data:')) {
        try {
          // 去掉 data:image/jpeg;base64, 前缀，只存纯 base64
          const pureBase64 = item.photo.split(',')[1];
          await this.storePhotoShards(submitId, i, pureBase64, env);
          processedItems.push({ text: item.text, done: item.done, photo: `${submitId}:${i}` });
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

    const kvKey = `submissions:${date}:${checklistType}`;
    const existing = await env.CHECKLIST_KV.get(kvKey);
    const list = existing ? JSON.parse(existing) : [];
    list.push(record);
    await env.CHECKLIST_KV.put(kvKey, JSON.stringify(list));

    return new Response(JSON.stringify({ success: true, submitId }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  async handleGetSubmissions(request, env) {
    const url = new URL(request.url);
    const date = url.searchParams.get('date');
    const checklistType = url.searchParams.get('checklistType');

    if (!date || !checklistType) {
      return new Response(JSON.stringify({ error: '缺少 date 或 checklistType 参数' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const kvKey = `submissions:${date}:${checklistType}`;
    const data = await env.CHECKLIST_KV.get(kvKey);

    return new Response(JSON.stringify({
      submissions: data ? JSON.parse(data) : [],
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // 返回照片（从分片合并）
  async handleGetPhoto(request, env) {
    const url = new URL(request.url);
    // path: /photo/submitId:itemIndex -> 用 lastIndexOf(':') 分离
    const path = url.pathname.replace('/photo/', '');
    const lastColonIdx = path.lastIndexOf(':');
    if (lastColonIdx === -1) {
      return new Response('Not Found', { status: 404 });
    }
    const submitId = path.substring(0, lastColonIdx);
    const itemIndex = path.substring(lastColonIdx + 1);

    const base64Data = await this.getPhotoShards(submitId, itemIndex, env);
    if (!base64Data) {
      return new Response('Photo not found', { status: 404 });
    }

    // 返回 data URL
    const dataUrl = `data:image/jpeg;base64,${base64Data}`;
    return new Response(dataUrl, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  }
}

export default {
  fetch: (request, env) => new ChecklistWorker().fetch(request, env),
};
