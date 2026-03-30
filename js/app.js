let guideData = {};
let currentFilter = 'all';
let currentFlavor = 'all';
let debounceTimer;

// 页面加载时获取数据
document.addEventListener('DOMContentLoaded', async () => {
    await loadGuideData();
    initEventListeners();
    showAllItems();
    initNavAndChecklist();
    initAdmin(); // 新增：初始化后台管理
    initCamera(); // 新增：初始化拍照功能
});

// 加载指引数据 - 优先从localStorage读取，无数据时从JSON文件加载
async function loadGuideData() {
    // 先尝试从localStorage加载
    const savedData = localStorage.getItem('guideData');
    if (savedData) {
        try {
            guideData = JSON.parse(savedData);
            console.log('从本地存储加载数据');
            return;
        } catch (error) {
            console.error('本地存储数据解析失败:', error);
            localStorage.removeItem('guideData'); // 清除损坏的数据
        }
    }

    // 从JSON文件加载
    try {
        const response = await fetch('./data/guide-data.json');
        guideData = await response.json();
        console.log('从JSON文件加载数据');
    } catch (error) {
        console.error('数据加载失败:', error);
        showResult({
            title: '数据加载失败',
            content: '<p>请检查网络连接或刷新页面重试</p>',
            type: 'error'
        });
    }
}

// 初始化事件监听
function initEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const chips = document.querySelectorAll('.chip');

    // 点击搜索按钮搜索
    searchBtn.addEventListener('click', () => {
        handleSearch();
    });

    // 回车搜索
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });

    // 分类筛选点击
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            if (chip.dataset.filter) {
                // 分类筛选
                const filterChips = document.querySelectorAll('[data-filter]');
                filterChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                currentFilter = chip.dataset.filter;
            } else if (chip.dataset.flavor) {
                // 风味筛选
                const flavorChips = document.querySelectorAll('[data-flavor]');
                flavorChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                currentFlavor = chip.dataset.flavor;
            }
            handleFilter();
        });
    });
}

// 显示所有项目（卡片列表）
function showAllItems() {
    const resultSection = document.getElementById('resultSection');
    let filteredData = filterData(guideData, currentFilter, currentFlavor);

    if (Object.keys(filteredData).length === 0) {
        resultSection.innerHTML = `
            <div class="no-result">
                <h3>暂无相关内容</h3>
                <p>当前筛选条件下没有找到内容</p>
            </div>
        `;
        return;
    }

    let html = '<div class="card-grid">';
    for (const [key, item] of Object.entries(filteredData)) {
        const strengthColor = getStrengthColor(item.strength);
        let extraTags = '';
        if (item.strength) {
            extraTags = `<span class="strength-tag" style="background-color: ${strengthColor}">${item.strength}</span>`;
        } else if (item.type === 'food') {
            extraTags = `<span class="taste-tag">${item.taste}</span>`;
        }
        html += `
            <div class="card" data-key="${key}">
                <div class="card-header">
                    <h3 class="card-title">${item.title}</h3>
                    ${extraTags}
                </div>
                <div class="card-footer">
                    <span class="category-tag">${item.category || item.type}</span>
                    ${item.makingTime ? `<span class="time-tag">${item.makingTime}</span>` : ''}
                </div>
            </div>
        `;
    }
    html += '</div>';

    resultSection.innerHTML = html;

    // 绑定卡片点击事件
    document.querySelectorAll('.card').forEach(card => {
        card.addEventListener('click', () => {
            const key = card.dataset.key;
            showDetail(guideData[key]);
        });
    });
}

// 获取酒精感颜色
function getStrengthColor(strength) {
    switch (strength) {
        case '轻': return '#10b981'; // 绿色
        case '中': return '#f59e0b'; // 橙色
        case '烈': return '#ef4444'; // 红色
        default: return 'transparent';
    }
}

// 处理筛选
function handleFilter() {
    const searchInput = document.getElementById('searchInput');
    const keyword = searchInput.value.trim().toLowerCase();

    if (keyword) {
        handleSearch();
    } else {
        showAllItems();
    }
}

// 处理搜索（最简单有效的方法，确保能工作）
function handleSearch() {
    const searchInput = document.getElementById('searchInput');
    let keyword = searchInput.value.trim().toLowerCase();

    if (!keyword) {
        showAllItems();
        return;
    }

    // 简单模糊匹配
    const results = [];

    // 需要过滤掉的模板项
    const excludedKeys = ['===== 小吃类SOP模板开始 =====', '小吃模板示例'];

    for (const [key, item] of Object.entries(guideData)) {
        // 跳过非对象类型的数据项、checklist和模板项
        if (typeof item !== 'object' || item === null ||
            item.type === 'checklist' || excludedKeys.includes(key)) {
            continue;
        }

        const title = item.title ? item.title.toLowerCase() : '';
        const keyStr = key.toLowerCase();
        const keywords = item.keywords || [];

        if (title.includes(keyword) ||
            keyStr.includes(keyword) ||
            keywords.some(k => k.toLowerCase().includes(keyword))) {
            results.push({ key, item });
        }
    }

    if (results.length === 0) {
        showResult({
            title: '🔍 未找到相关指引',
            content: `<p>您输入的关键词「${keyword}」暂无匹配内容</p><p>请尝试其他关键词或切换筛选条件</p>`,
            type: 'no-result'
        });
    } else if (results.length === 1) {
        showDetail(results[0].item);
    } else {
        const resultSection = document.getElementById('resultSection');
        let html = '<div class="card-grid">';
        for (const result of results) {
            const { key, item } = result;
            const strengthColor = getStrengthColor(item.strength);
            let extraTags = '';
            if (item.strength) {
                extraTags = `<span class="strength-tag" style="background-color: ${strengthColor}">${item.strength}</span>`;
            } else if (item.type === 'food') {
                extraTags = `<span class="taste-tag">${item.taste}</span>`;
            }
            html += `
                <div class="card" data-key="${key}">
                    <div class="card-header">
                        <h3 class="card-title">${item.title}</h3>
                        ${extraTags}
                    </div>
                    <div class="card-footer">
                        <span class="category-tag">${item.category || item.type}</span>
                        ${item.makingTime ? `<span class="time-tag">${item.makingTime}</span>` : ''}
                    </div>
                </div>
            `;
        }
        html += '</div>';

        resultSection.innerHTML = html;

        // 绑定卡片点击事件
        document.querySelectorAll('.card').forEach(card => {
            card.addEventListener('click', () => {
                const key = card.dataset.key;
                showDetail(guideData[key]);
            });
        });
    }

    // 搜索完成后失焦
    document.getElementById('searchInput').blur();
}

// 关键词匹配（旧版保留）
function matchKeyword(keyword) {
    let filteredData = filterData(guideData, currentFilter, currentFlavor);

    // 精确匹配
    if (filteredData[keyword]) {
        return filteredData[keyword];
    }

    // 模糊匹配
    for (const [key, value] of Object.entries(filteredData)) {
        if (key.toLowerCase().includes(keyword)) {
            return value;
        }
        if (value.keywords && value.keywords.some(k => k.toLowerCase().includes(keyword))) {
            return value;
        }
    }

    // 无匹配结果
    return {
        title: '🔍 未找到相关指引',
        content: `<p>您输入的关键词「${keyword}」暂无匹配内容</p><p>请尝试其他关键词</p>`,
        type: 'no-result'
    };
}

// 筛选数据
function filterData(data, filter, flavor) {
    let result = {};

    // 需要过滤掉的模板项和特定项
    const excludedKeys = ['===== 小吃类SOP模板开始 =====', '小吃模板示例', '上班了', '下班了'];

    // 先应用分类筛选
    if (filter === 'all') {
        // 复制数据并排除特定项
        for (const [key, item] of Object.entries(data)) {
            if (!excludedKeys.includes(key)) {
                result[key] = item;
            }
        }
    } else {
        for (const [key, item] of Object.entries(data)) {
            // 先排除特定项
            if (excludedKeys.includes(key)) {
                continue;
            }

            if (filter === 'long' && item.category === '长饮') {
                result[key] = item;
            } else if (filter === 'short' && item.category === '短饮') {
                result[key] = item;
            } else if (filter === 'signature' && item.category === '招牌') {
                result[key] = item;
            } else if (filter === 'drink' && item.category === '饮品') {
                result[key] = item;
            } else if (filter === 'flow' && item.type === 'flow') {
                result[key] = item;
            } else if (filter === 'food' && item.type === 'food') {
                result[key] = item;
            } else if (filter === 'fried' && item.category === '炸物') {
                result[key] = item;
            } else if (filter === 'snack' && item.category === '小食') {
                result[key] = item;
            } else if (filter === 'main' && item.category === '主食') {
                result[key] = item;
            } else if (filter === 'signature-food' && item.category === '招牌小吃') {
                result[key] = item;
            }
        }
    }

    // 过滤掉checklist类型和非对象类型，只在checklist页面显示
    const filteredResult = {};
    for (const [key, item] of Object.entries(result)) {
        if (typeof item === 'object' && item !== null && item.type !== 'checklist') {
            filteredResult[key] = item;
        }
    }

    // 再应用风味筛选
    if (flavor !== 'all') {
        const flavorResult = {};
        for (const [key, item] of Object.entries(filteredResult)) {
            if (item.flavors && item.flavors.some(f => f === flavor)) {
                flavorResult[key] = item;
            }
        }
        return flavorResult;
    }

    return filteredResult;
}

// 解析SOP内容，提取配方和步骤
function parseSopContent(content) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');

    // 提取配方
    const ingredients = [];
    const ingredientsEl = doc.querySelector('h3:has(+ p)') || doc.querySelector('h3 + p')?.previousElementSibling;
    if (ingredientsEl && ingredientsEl.textContent.includes('配方')) {
        let nextEl = ingredientsEl.nextElementSibling;
        while (nextEl && nextEl.tagName === 'P') {
            ingredients.push(nextEl.textContent);
            nextEl = nextEl.nextElementSibling;
        }
    }

    // 提取步骤
    const steps = [];
    const stepsEl = doc.querySelector('h3:has(+ ol)') || doc.querySelector('h3 + ol')?.previousElementSibling;
    if (stepsEl && stepsEl.textContent.includes('步骤')) {
        const ol = stepsEl.nextElementSibling;
        if (ol) {
            ol.querySelectorAll('li').forEach(li => {
                steps.push(li.textContent);
            });
        }
    }

    // 提取注意事项
    const notes = [];
    const notesEl = doc.querySelector('h3:has(+ p):not(:has(+ p + ol))') || doc.querySelector('h3 + p:not(:has(+ ol))')?.previousElementSibling;
    if (notesEl && notesEl.textContent.includes('注意')) {
        let nextEl = notesEl.nextElementSibling;
        while (nextEl && nextEl.tagName === 'P' && !nextEl.textContent.includes('🎥')) {
            notes.push(nextEl.textContent);
            nextEl = nextEl.nextElementSibling;
        }
    }

    // 提取视频链接
    const videoLink = doc.querySelector('a[target="_blank"]')?.href || '';

    return { ingredients, steps, notes, videoLink };
}

// 显示详情（快速操作模式 - 原学习模式内容，更直观）
function showDetail(item) {
    const resultSection = document.getElementById('resultSection');

    resultSection.innerHTML = `
        <div class="sop-header">
            <button class="back-btn">← 返回列表</button>
        </div>
        <div class="learn-mode">
            <div class="result-title">${item.title}</div>
            <div class="result-content">${item.content}</div>
        </div>
    `;

    // 绑定事件
    document.querySelector('.back-btn').addEventListener('click', () => {
        showAllItems();
    });

    // 保持屏幕常亮
    if ('wakeLock' in navigator) {
        navigator.wakeLock.request('screen').catch(() => {});
    }
}

// 全局搜索功能（详情页底部搜索框）
function handleGlobalSearch() {
    const searchInput = document.getElementById('globalSearchInput');
    let keyword = searchInput.value.trim().toLowerCase();

    if (!keyword) return;

    // 使用与主搜索相同的逻辑
    document.getElementById('searchInput').value = keyword;
    showAllItems();
    handleSearch();
}

// 展示结果（旧版保留）
function showResult(result) {
    const resultSection = document.getElementById('resultSection');

    if (result.type === 'no-result') {
        resultSection.innerHTML = `
            <div class="no-result">
                <h3>${result.title}</h3>
                ${result.content}
            </div>
        `;
    } else {
        resultSection.innerHTML = `
            <div class="result-title">${result.title}</div>
            <div class="result-content">${result.content}</div>
        `;
    }
}

// ==================== Checklist功能 ====================
let currentChecklistType = 'open';
let checklistData = {
    open: [],
    close: []
};

// 初始化导航和checklist事件监听
function initNavAndChecklist() {
    const navTabs = document.querySelectorAll('.nav-tab');
    const checklistTabs = document.querySelectorAll('.checklist-tab');
    const resetBtn = document.getElementById('reset-btn');

    // 主导航标签切换
    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            navTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const tabName = tab.dataset.tab;
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.add('hidden');
            });
            document.getElementById(`${tabName}-tab`).classList.remove('hidden');

            if (tabName === 'checklist') {
                renderChecklist();
            }
        });
    });

    // Checklist标签切换
    checklistTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            checklistTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentChecklistType = tab.dataset.checklist;
            renderChecklist();
        });
    });

    // 重置按钮
    resetBtn.addEventListener('click', () => {
        if (confirm('确定要重置当前清单吗？所有勾选状态将被清除。')) {
            resetChecklist();
        }
    });

    // 提交按钮（初始化时绑定一次，不在renderChecklist里重复绑定）
    const submitBtn = document.getElementById('submit-checklist-btn');
    if (submitBtn) {
        submitBtn.addEventListener('click', () => {
            if (confirm('确认提交？店长将收到你的完成通知。')) {
                submitChecklist();
            }
        });
    }

    // 初始化checklist数据
    loadChecklistData();
}

// 加载checklist数据
function loadChecklistData() {
    const today = new Date().toDateString();
    const savedDate = localStorage.getItem('checklistDate');

    // 如果是新的一天，重置checklist
    if (savedDate !== today) {
        localStorage.setItem('checklistDate', today);
        checklistData = {
            open: guideData['checklist-open'].items.map(item => ({ text: item, done: false, photo: null })),
            close: guideData['checklist-close'].items.map(item => ({ text: item, done: false, photo: null }))
        };
        saveChecklistData();
    } else {
        // 从localStorage加载数据
        const savedOpen = localStorage.getItem('checklistOpen');
        const savedClose = localStorage.getItem('checklistClose');

        if (savedOpen && savedClose) {
            checklistData.open = JSON.parse(savedOpen);
            checklistData.close = JSON.parse(savedClose);
        } else {
            // 如果localStorage没有数据，从guideData初始化
            checklistData = {
                open: guideData['checklist-open'].items.map(item => ({ text: item, done: false, photo: null })),
                close: guideData['checklist-close'].items.map(item => ({ text: item, done: false, photo: null }))
            };
            saveChecklistData();
        }
    }
}

// 保存checklist数据到localStorage
function saveChecklistData() {
    localStorage.setItem('checklistOpen', JSON.stringify(checklistData.open));
    localStorage.setItem('checklistClose', JSON.stringify(checklistData.close));
}

// 重置当前checklist
function resetChecklist() {
    const items = currentChecklistType === 'open'
        ? guideData['checklist-open'].items
        : guideData['checklist-close'].items;

    checklistData[currentChecklistType] = items.map(item => ({ text: item, done: false, photo: null }));
    saveChecklistData();
    renderChecklist();
}

// 渲染checklist
function renderChecklist() {
    const items = checklistData[currentChecklistType];
    const title = currentChecklistType === 'open' ? '开工清单' : '打烊清单';
    const today = new Date().toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
    });

    document.getElementById('checklist-title').textContent = title;
    document.getElementById('checklist-date').textContent = `📅 ${today}`;

    const doneCount = items.filter(item => item.done).length;
    const totalCount = items.length;
    const progressPercent = totalCount > 0 ? (doneCount / totalCount * 100) : 0;

    document.getElementById('progress-text').textContent = `${doneCount}/${totalCount} 已完成`;
    document.getElementById('progress-fill').style.width = `${progressPercent}%`;

    const checklistItemsEl = document.getElementById('checklist-items');

    // 检查是否全部完成
    checklistItemsEl.innerHTML = renderChecklistItems(items);

    // 底部提交按钮显示/隐藏 + 更新文字
    const submitBtn = document.getElementById('submit-checklist-btn');
    if (doneCount === totalCount && totalCount > 0) {
        submitBtn.style.display = 'block';
        submitBtn.textContent = currentChecklistType === 'open' ? '✅ 确认开工完成' : '✅ 确认打烊完成';
    } else {
        submitBtn.style.display = 'none';
    }
}

// 渲染checklist项目
function renderChecklistItems(items) {
    return items.map((item, index) => {
        const isCompleted = item.done;
        const needsPhoto = index < 3; // 前3项需要拍照留档

        // 按钮状态：已完成显示✓，未完成前3项显示相机，其他显示圆圈
        let btnIcon = '';
        let btnClass = 'checklist-action-btn ';
        if (isCompleted) {
            btnIcon = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
            btnClass += 'done';
        } else if (needsPhoto) {
            btnIcon = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>';
            btnClass += 'photo';
        } else {
            btnIcon = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>';
            btnClass += 'check';
        }

        let html = '<li class="checklist-item' + (isCompleted ? ' completed' : '') + '" data-index="' + index + '">';
        html += '<span class="checklist-item-text">' + item.text + '</span>';
        html += '<button class="' + btnClass + '" data-index="' + index + '">' + btnIcon + '</button>';
        html += '</li>';
        if (item.photo) {
            html += '<li class="checklist-photo-row"><img src="' + item.photo + '" alt="拍照留档"></li>';
        }
        return html;
    }).join('');
}

// 切换checklist项目状态
function toggleChecklistItem(index) {
    const item = checklistData[currentChecklistType][index];

    // 前3项且未完成：打开相机
    if (index < 3 && !item.done) {
        currentCameraTargetIndex = index;
        document.getElementById('camera-input').click();
        return;
    }

    // 其他项或已完成项：直接切换状态
    item.done = !item.done;
    saveChecklistData();
    renderChecklist();
}

// 拍照功能：记录当前要拍照的项索引和类型
let currentCameraTargetIndex = null;
let currentCameraTargetType = null;

// 压缩照片
function compressPhoto(dataUrl, maxWidth, quality, callback) {
    const img = new Image();
    img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        if (w > maxWidth) {
            h = (h * maxWidth) / w;
            w = maxWidth;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        callback(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = dataUrl;
}

// 腾讯云 SCF API 地址
const API_BASE = 'https://1414474725-8a4g1sici9.ap-guangzhou.tencentscf.com';

// 提交 checklist 到后端
async function submitChecklist() {
    const typeLabel = currentChecklistType === 'open' ? '开工' : '打烊';

    // 获取员工名称（暂用 localStorage，之后改用账号系统）
    let employeeId = localStorage.getItem('employeeName');
    if (!employeeId) {
        employeeId = prompt('请输入你的名字（用于店长识别）：');
        if (!employeeId) return;
        localStorage.setItem('employeeName', employeeId);
    }

    const items = checklistData[currentChecklistType].map(item => ({
        text: item.text,
        done: item.done,
        photo: item.photo,
    }));

    const payload = {
        employeeId,
        date: new Date().toISOString().split('T')[0],
        checklistType: currentChecklistType,
        items,
    };

    try {
        const res = await fetch(`${API_BASE}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
            alert(`${typeLabel}清单已提交给店长！`);
        } else {
            alert(`提交失败：${data.error}`);
        }
    } catch (err) {
        alert(`提交失败：网络错误`);
        console.error(err);
    }
}

// 初始化拍照功能
function initCamera() {
    const cameraInput = document.getElementById('camera-input');

    // 按钮点击 → 统一由这个处理
    document.getElementById('checklist-items').addEventListener('click', (e) => {
        const btn = e.target.closest('.checklist-action-btn');
        if (!btn) return;

        const index = parseInt(btn.dataset.index);
        const item = checklistData[currentChecklistType][index];

        // 前3项且未完成 → 打开相机
        if (index < 3 && !item.done) {
            e.stopPropagation();
            currentCameraTargetIndex = index;
            currentCameraTargetType = currentChecklistType; // 记住当前是开工还是打烊
            cameraInput.click();
            return;
        }

        // 其他情况：切换完成状态
        e.stopPropagation();
        toggleChecklistItem(index);
    });

    // 文件选择后 → 保存照片并自动勾选
    cameraInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && currentCameraTargetIndex !== null && currentCameraTargetType !== null) {
            const idx = currentCameraTargetIndex;
            const type = currentCameraTargetType;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const base64Photo = ev.target.result;
                compressPhoto(base64Photo, 400, 0.6, (compressed) => {
                    checklistData[type][idx].photo = compressed;
                    checklistData[type][idx].done = true; // 自动勾选
                    saveChecklistData();
                    renderChecklist();
                });
            };
            reader.readAsDataURL(file);
        }
        cameraInput.value = '';
        currentCameraTargetIndex = null;
        currentCameraTargetType = null;
    });
}

// ==================== 员工进度（店长视图）====================
let progressPollingTimer = null;

function initEmployeeProgress() {
    // 填充日期选项（今天+最近7天）
    const dateSelect = document.getElementById('progress-date');
    if (dateSelect.options.length <= 1) {
        for (let i = 0; i <= 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const val = d.toISOString().split('T')[0];
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = val;
            dateSelect.appendChild(opt);
        }
        dateSelect.value = new Date().toISOString().split('T')[0];
    }

    // 刷新按钮
    document.getElementById('refresh-progress-btn').onclick = () => {
        loadEmployeeProgress();
    };

    // 类型切换
    document.getElementById('progress-type').onchange = () => {
        loadEmployeeProgress();
    };

    loadEmployeeProgress();

    // 每5秒轮询
    stopProgressPolling();
    progressPollingTimer = setInterval(loadEmployeeProgress, 5000);
}

function stopProgressPolling() {
    if (progressPollingTimer) {
        clearInterval(progressPollingTimer);
        progressPollingTimer = null;
    }
}

async function loadEmployeeProgress() {
    const date = document.getElementById('progress-date').value;
    const type = document.getElementById('progress-type').value;
    if (!date) return;

    try {
        const res = await fetch(`${API_BASE}/submissions?date=${date}&checklistType=${type}`);
        const data = await res.json();
        renderEmployeeSubmissions(data.submissions || [], type);
    } catch (err) {
        console.error('获取员工进度失败', err);
    }
}

function renderEmployeeSubmissions(submissions, type) {
    const container = document.getElementById('progress-list');
    if (!container) return;

    if (submissions.length === 0) {
        container.innerHTML = '<p style="color:#888;text-align:center;margin-top:20px;">暂无提交记录</p>';
        return;
    }

    const typeLabel = type === 'open' ? '开工' : '打烊';

    container.innerHTML = submissions.map(sub => `
        <div class="progress-card" style="background:#1a1a1a;border:1px solid #333;border-radius:12px;padding:16px;margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                <strong style="color:#D4AF37;font-size:16px;">${sub.employeeId}</strong>
                <span style="color:#888;font-size:12px;">${new Date(sub.submittedAt).toLocaleString('zh-CN')}</span>
            </div>
            <div style="margin-bottom:8px;color:#e0e0e0;font-size:14px;font-weight:600;">${typeLabel}清单</div>
            <ul style="list-style:none;padding:0;margin:0;">
                ${sub.items.map((item, i) => `
                    <li style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px solid #2a2a2a;font-size:14px;color:${item.done ? '#22c55e' : '#ef4444'};">
                        <span>${item.done ? '✅' : '⬜'}</span>
                        <span style="${item.done ? '' : 'opacity:0.5'}">${item.text}</span>
                        ${item.photo ? `<img src="${API_BASE}/photo/${item.photo}" data-photo="${API_BASE}/photo/${item.photo}" class="progress-photo" style="width:60px;height:60px;object-fit:cover;border-radius:6px;margin-left:8px;cursor:pointer;">` : ''}
                    </li>
                `).join('')}
            </ul>
        </div>
    `).join('');

    // 事件委托：点击照片放大
    container.querySelectorAll('.progress-photo').forEach(img => {
        img.addEventListener('click', () => showPhotoModal(img.dataset.photo));
    });
}

// 图片弹窗
function showPhotoModal(src) {
    const existing = document.getElementById('photo-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'photo-modal';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:pointer;';
    overlay.innerHTML = `<img src="${src}" style="max-width:90vw;max-height:90vh;border-radius:8px;">`;
    overlay.onclick = () => overlay.remove();
    document.body.appendChild(overlay);
}


// 全局卡片点击委托，确保所有卡片点击都能跳转到详情
document.addEventListener('click', (e) => {
    const card = e.target.closest('.card');
    if (card && !card.classList.contains('checklist-item')) {
        const key = card.dataset.key;
        if (key && window.guideData && window.guideData[key]) {
            e.preventDefault();
            e.stopPropagation();
            showDetail(window.guideData[key]);
        }
    }
});

// 清除缓存并刷新页面
function clearCacheAndReload() {
    localStorage.removeItem('guideData');
    location.reload();
}

// ==================== 后台管理功能 ====================
let adminLoggedIn = false;

// 后台管理初始化
function initAdmin() {
    // 登录功能
    const loginBtn = document.getElementById('adminLoginBtn');
    const loginError = document.getElementById('adminLoginError');
    const passwordInput = document.getElementById('adminPassword');

    loginBtn.addEventListener('click', () => {
        const password = passwordInput.value.trim();
        loginError.style.display = 'none';

        if (password === '123456') {
            adminLoggedIn = true;
            document.getElementById('admin-login').style.display = 'none';
            document.getElementById('admin-panel').style.display = 'block';
            renderAdminSopList();
        } else {
            loginError.textContent = '密码错误，请重新输入';
            loginError.style.display = 'block';
            passwordInput.value = '';
            passwordInput.focus();
        }
    });

    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loginBtn.click();
        }
    });

    // 后台导航切换
    const adminNavTabs = document.querySelectorAll('.admin-nav-tab');
    adminNavTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const adminTab = tab.dataset.adminTab;

            adminNavTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const panels = document.querySelectorAll('.admin-tab-panel');
            panels.forEach(panel => {
                if (panel.id === `${adminTab}-panel`) {
                    panel.style.display = 'block';
                } else {
                    panel.style.display = 'none';
                }
            });

            // 初始化对应面板
            if (adminTab === 'sop-manage') {
                stopProgressPolling();
                renderAdminSopList();
            } else if (adminTab === 'checklist-manage') {
                stopProgressPolling();
                renderChecklistEditPanel();
            } else if (adminTab === 'employee-progress') {
                initEmployeeProgress();
            }
        });
    });

    // SOP管理功能
    document.getElementById('addSopBtn').addEventListener('click', () => {
        openSopEditModal(null);
    });

    document.getElementById('closeSopModal').addEventListener('click', closeSopModal);
    document.getElementById('cancelSopEdit').addEventListener('click', closeSopModal);
    document.getElementById('saveSopBtn').addEventListener('click', saveSop);

    document.getElementById('sopType').addEventListener('change', (e) => {
        const type = e.target.value;
        const categoryGroup = document.getElementById('sopCategoryGroup');
        const strengthGroup = document.getElementById('sopStrengthGroup');
        const flavorsGroup = document.getElementById('sopFlavorsGroup');
        const tasteGroup = document.getElementById('sopTasteGroup');
        const makingTimeGroup = document.getElementById('sopMakingTimeGroup');

        if (type === 'cocktail') {
            categoryGroup.style.display = 'block';
            strengthGroup.style.display = 'block';
            flavorsGroup.style.display = 'block';
            tasteGroup.style.display = 'none';
            makingTimeGroup.style.display = 'none';
        } else if (type === 'food') {
            categoryGroup.style.display = 'block';
            strengthGroup.style.display = 'none';
            flavorsGroup.style.display = 'none';
            tasteGroup.style.display = 'block';
            makingTimeGroup.style.display = 'block';
        } else {
            categoryGroup.style.display = 'none';
            strengthGroup.style.display = 'none';
            flavorsGroup.style.display = 'none';
            tasteGroup.style.display = 'none';
            makingTimeGroup.style.display = 'none';
        }
    });

    // SOP搜索
    document.getElementById('sopSearchInput').addEventListener('input', () => {
        renderAdminSopList();
    });

    // Checklist管理功能
    document.getElementById('addOpenChecklistItem').addEventListener('click', () => {
        addChecklistItem('open');
    });
    document.getElementById('addCloseChecklistItem').addEventListener('click', () => {
        addChecklistItem('close');
    });
    document.getElementById('saveChecklistBtn').addEventListener('click', saveChecklistChanges);

    // 数据导出功能
    document.getElementById('exportDataBtn').addEventListener('click', exportData);

    // 数据重置功能
    document.getElementById('resetDataBtn').addEventListener('click', resetToOriginalData);
}

// 渲染SOP列表
function renderAdminSopList() {
    const sopList = document.getElementById('sopList');
    const searchInput = document.getElementById('sopSearchInput');
    const searchKeyword = searchInput.value.toLowerCase().trim();
    const filteredData = {};

    // 需要过滤掉的模板项
    const excludedKeys = ['===== 小吃类SOP模板开始 =====', '小吃模板示例'];

    for (const [key, item] of Object.entries(guideData)) {
        // 过滤掉checklist类型、模板项和非对象类型
        if (typeof item !== 'object' || item === null ||
            item.type === 'checklist' || excludedKeys.includes(key)) {
            continue;
        }

        // 统一类型识别：支持 'sop' 和 'cocktail' 类型
        const actualType = item.type === 'sop' ? 'cocktail' : item.type;

        if (!searchKeyword ||
            key.toLowerCase().includes(searchKeyword) ||
            (item.title && item.title.toLowerCase().includes(searchKeyword)) ||
            item.category?.toLowerCase().includes(searchKeyword) ||
            item.strength?.toLowerCase().includes(searchKeyword) ||
            item.keywords?.some(k => k.toLowerCase().includes(searchKeyword))) {
            filteredData[key] = { ...item, type: actualType };
        }
    }

    let html = '';
    for (const [key, item] of Object.entries(filteredData)) {
        // 统一类型识别：支持 'sop' 和 'cocktail' 类型
        const actualType = item.type === 'sop' ? 'cocktail' : item.type;
        const typeLabel = actualType === 'cocktail' ? '鸡尾酒' : actualType === 'food' ? '小吃' : '流程';

        html += `
            <div class="sop-item">
                <div class="sop-info">
                    <h4>${item.title}</h4>
                    <p>类型: ${typeLabel}${item.category ? ` · 分类: ${item.category}` : ''}${item.strength ? ` · 酒精感: ${item.strength}` : ''}</p>
                </div>
                <div class="sop-actions">
                    <button class="sop-edit-btn" onclick="editSop('${key}')">编辑</button>
                    <button class="sop-delete-btn" onclick="deleteSop('${key}')">删除</button>
                </div>
            </div>
        `;
    }

    if (Object.keys(filteredData).length === 0) {
        html = `
            <div class="no-result">
                <h3>暂无相关SOP</h3>
                <p>搜索条件: ${searchKeyword || '无'}</p>
                ${!searchKeyword ? '<p>您可以点击「新增SOP」按钮添加新内容</p>' : '<p>请尝试调整搜索关键词</p>'}
            </div>
        `;
    }

    sopList.innerHTML = html;
}

// 打开SOP编辑模态框
function openSopEditModal(sopKey) {
    const modal = document.getElementById('sopEditModal');
    const modalTitle = document.getElementById('sopModalTitle');
    const keyInput = document.getElementById('sopKey');

    keyInput.value = '';
    document.getElementById('sopTitle').value = '';
    document.getElementById('sopType').value = 'cocktail';
    document.getElementById('sopCategory').value = '';
    document.getElementById('sopStrength').value = '';
    document.getElementById('sopFlavors').value = '';
    document.getElementById('sopTaste').value = '咸香';
    document.getElementById('sopMakingTime').value = '';
    document.getElementById('sopKeywords').value = '';

    // 初始化内容编辑器
    document.getElementById('contentEditor').innerHTML = '';

    if (sopKey) {
        modalTitle.textContent = '编辑SOP';
        const item = guideData[sopKey];
        keyInput.value = sopKey;
        document.getElementById('sopTitle').value = item.title;

        // 统一类型处理：将 'sop' 类型转换为 'cocktail' 显示
        const actualType = item.type === 'sop' ? 'cocktail' : item.type || 'cocktail';
        document.getElementById('sopType').value = actualType;

        document.getElementById('sopCategory').value = item.category || '';
        document.getElementById('sopStrength').value = item.strength || '';
        document.getElementById('sopFlavors').value = item.flavors ? item.flavors.join(',') : '';
        document.getElementById('sopTaste').value = item.taste || '咸香';
        document.getElementById('sopMakingTime').value = item.makingTime || '';
        document.getElementById('sopKeywords').value = item.keywords ? item.keywords.join(',') : '';

        // 直接加载原始HTML内容，保留视频链接和格式
        document.getElementById('contentEditor').innerHTML = item.content || '';
    } else {
        modalTitle.textContent = '新增SOP';
    }

    // 根据类型显示/隐藏对应的字段
    const type = document.getElementById('sopType').value;
    const categoryGroup = document.getElementById('sopCategoryGroup');
    const strengthGroup = document.getElementById('sopStrengthGroup');
    const flavorsGroup = document.getElementById('sopFlavorsGroup');
    const tasteGroup = document.getElementById('sopTasteGroup');
    const makingTimeGroup = document.getElementById('sopMakingTimeGroup');

    if (type === 'cocktail') {
        categoryGroup.style.display = 'block';
        strengthGroup.style.display = 'block';
        flavorsGroup.style.display = 'block';
        tasteGroup.style.display = 'none';
        makingTimeGroup.style.display = 'none';
    } else if (type === 'food') {
        categoryGroup.style.display = 'block';
        strengthGroup.style.display = 'none';
        flavorsGroup.style.display = 'none';
        tasteGroup.style.display = 'block';
        makingTimeGroup.style.display = 'block';
    } else {
        categoryGroup.style.display = 'none';
        strengthGroup.style.display = 'none';
        flavorsGroup.style.display = 'none';
        tasteGroup.style.display = 'none';
        makingTimeGroup.style.display = 'none';
    }

    modal.style.display = 'flex';
    document.getElementById('sopKey').focus();
}

// HTML转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 关闭SOP编辑模态框
function closeSopModal() {
    document.getElementById('sopEditModal').style.display = 'none';
}

// 保存SOP
function saveSop() {
    let sopKey = document.getElementById('sopKey').value.trim();
    const title = document.getElementById('sopTitle').value.trim();
    const type = document.getElementById('sopType').value;
    const category = document.getElementById('sopCategory').value.trim();
    const strength = document.getElementById('sopStrength').value;
    const flavorsStr = document.getElementById('sopFlavors').value.trim();
    const taste = document.getElementById('sopTaste').value;
    const makingTime = document.getElementById('sopMakingTime').value.trim();
    const keywordsStr = document.getElementById('sopKeywords').value.trim();

    // 从富文本编辑器获取内容
    const content = document.getElementById('contentEditor').innerHTML.trim();

    if (!title) {
        alert('请填写标题');
        return;
    }

    if (!content) {
        alert('请填写内容');
        return;
    }

    // 如果没有填写key，自动根据标题生成
    if (!sopKey) {
        // 移除表情符号和特殊字符，保留中文、字母、数字和基本符号
        sopKey = title.replace(/[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}]/gu, '') // 移除表情
            .replace(/[^\w\u4e00-\u9fff\-_]/g, '') // 移除特殊字符
            .replace(/\s+/g, '-') // 空格转连字符
            .toLowerCase()
            .trim();

        // 确保key不重复
        let counter = 1;
        let originalKey = sopKey;
        while (sopKey in guideData) {
            sopKey = `${originalKey}-${counter}`;
            counter++;
        }

        document.getElementById('sopKey').value = sopKey;
    }

    const flavors = flavorsStr ? flavorsStr.split(/[,，]/).map(s => s.trim()).filter(Boolean) : [];
    const keywords = keywordsStr ? keywordsStr.split(/[,，]/).map(s => s.trim()).filter(Boolean) : [];

    guideData[sopKey] = {
        title,
        type,
        category: category || undefined,
        strength: strength || undefined,
        flavors: flavors.length > 0 ? flavors : undefined,
        taste: type === 'food' ? taste : undefined,
        makingTime: type === 'food' ? makingTime : undefined,
        keywords: keywords.length > 0 ? keywords : undefined,
        content
    };

    closeSopModal();
    renderAdminSopList();
    showAllItems();

    // 更新localStorage
    if (typeof saveGuideData === 'function') {
        saveGuideData();
    }

    alert('SOP保存成功');
}

// 编辑SOP
function editSop(key) {
    openSopEditModal(key);
}

// 删除SOP
function deleteSop(key) {
    if (!confirm('确定要删除该SOP吗？此操作无法撤销！')) {
        return;
    }

    delete guideData[key];
    renderAdminSopList();
    showAllItems();

    if (typeof saveGuideData === 'function') {
        saveGuideData();
    }

    alert('SOP删除成功');
}

// 渲染Checklist编辑面板
function renderChecklistEditPanel() {
    const openChecklistEl = document.getElementById('openChecklistEdit');
    const closeChecklistEl = document.getElementById('closeChecklistEdit');

    let openHtml = '';
    guideData['checklist-open']?.items?.forEach((item, index) => {
        openHtml += `
            <div class="checklist-edit-item">
                <input type="text" data-index="${index}" value="${item}" onchange="updateChecklistItem('open', ${index}, this.value)">
                <button class="delete-item-btn" onclick="deleteChecklistItem('open', ${index})">删除</button>
            </div>
        `;
    });
    openChecklistEl.innerHTML = openHtml;

    let closeHtml = '';
    guideData['checklist-close']?.items?.forEach((item, index) => {
        closeHtml += `
            <div class="checklist-edit-item">
                <input type="text" data-index="${index}" value="${item}" onchange="updateChecklistItem('close', ${index}, this.value)">
                <button class="delete-item-btn" onclick="deleteChecklistItem('close', ${index})">删除</button>
            </div>
        `;
    });
    closeChecklistEl.innerHTML = closeHtml;
}

// 添加Checklist项
function addChecklistItem(type) {
    const checklist = type === 'open' ? guideData['checklist-open'] : guideData['checklist-close'];
    const newItem = `新项${checklist.items.length + 1}`;
    checklist.items.push(newItem);

    const container = document.getElementById(type === 'open' ? 'openChecklistEdit' : 'closeChecklistEdit');
    const index = checklist.items.length - 1;
    container.innerHTML += `
        <div class="checklist-edit-item">
            <input type="text" data-index="${index}" value="${newItem}" onchange="updateChecklistItem('${type}', ${index}, this.value)">
            <button class="delete-item-btn" onclick="deleteChecklistItem('${type}', ${index})">删除</button>
        </div>
    `;
}

// 更新Checklist项
function updateChecklistItem(type, index, value) {
    const checklist = type === 'open' ? guideData['checklist-open'] : guideData['checklist-close'];
    checklist.items[index] = value;
}

// 删除Checklist项
function deleteChecklistItem(type, index) {
    const checklist = type === 'open' ? guideData['checklist-open'] : guideData['checklist-close'];
    checklist.items.splice(index, 1);
    renderChecklistEditPanel();
}

// 保存Checklist更改
function saveChecklistChanges() {
    if (typeof saveGuideData === 'function') {
        saveGuideData();
    }

    // 重置checklist数据
    loadChecklistData();

    alert('Checklist保存成功');
}

// 导出数据
function exportData() {
    const dataStr = JSON.stringify(guideData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `guide-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();

    URL.revokeObjectURL(url);
    alert('数据导出成功');
}

// 重置为原始数据
function resetToOriginalData() {
    if (!confirm('⚠️ 确定要重置为原始数据吗？\n\n此操作会：\n1. 清除所有已编辑的内容\n2. 恢复到初始的SOP和Checklist数据\n3. 此操作不可撤销！')) {
        return;
    }

    // 清除localStorage数据
    localStorage.removeItem('guideData');

    // 重新从JSON文件加载数据
    loadGuideData().then(() => {
        // 刷新显示
        renderAdminSopList();
        renderChecklistEditPanel();
        showAllItems();

        // 重置Checklist
        loadChecklistData();

        alert('✅ 数据已重置为原始状态');
    });
}

// 保存数据到localStorage的函数（如果需要持久化）
function saveGuideData() {
    localStorage.setItem('guideData', JSON.stringify(guideData));
}

// 从localStorage加载数据的函数
function loadGuideDataFromStorage() {
    const savedData = localStorage.getItem('guideData');
    if (savedData) {
        guideData = JSON.parse(savedData);
    }
}