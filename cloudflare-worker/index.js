/**
 * Cloudflare Worker - Checklist 同步后端
 * API:
 *   POST /submit   - 员工提交完成清单
 *   GET /submissions - 店长获取提交记录
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
      return new Response('Worker is running!', {
        headers: { 'Content-Type': 'text/plain' },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
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
    const record = {
      submitId,
      employeeId,
      date,
      checklistType,
      items,
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
}

export default {
  fetch: (request, env) => new ChecklistWorker().fetch(request, env),
};
