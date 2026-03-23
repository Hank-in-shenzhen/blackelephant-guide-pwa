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
});

// 加载指引数据
async function loadGuideData() {
    try {
        const response = await fetch('./data/guide-data.json');
        guideData = await response.json();
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
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');
    const chips = document.querySelectorAll('.chip');

    // 点击搜索按钮
    searchBtn.addEventListener('click', handleSearch);

    // 回车搜索（防抖）
    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(handleSearch, 300);
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            clearTimeout(debounceTimer);
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
                    <button class="view-btn">查看详情</button>
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

// 处理搜索
function handleSearch() {
    const searchInput = document.getElementById('searchInput');
    const keyword = searchInput.value.trim().toLowerCase();

    if (!keyword) {
        showAllItems();
        return;
    }

    let filteredData = filterData(guideData, currentFilter, currentFlavor);
    let results = {};

    for (const [key, item] of Object.entries(filteredData)) {
        if (key.toLowerCase().includes(keyword) ||
            item.title.toLowerCase().includes(keyword) ||
            (item.keywords && item.keywords.some(k => k.toLowerCase().includes(keyword)))) {
            results[key] = item;
        }
    }

    if (Object.keys(results).length === 0) {
        showResult({
            title: '🔍 未找到相关指引',
            content: `<p>您输入的关键词「${keyword}」暂无匹配内容</p><p>请尝试其他关键词或切换筛选条件</p>`,
            type: 'no-result'
        });
    } else if (Object.keys(results).length === 1) {
        // 只有一个结果，直接显示详情
        const key = Object.keys(results)[0];
        showDetail(results[key]);
    } else {
        // 多个结果，显示卡片列表
        const resultSection = document.getElementById('resultSection');
        let html = '<div class="card-grid">';
        for (const [key, item] of Object.entries(results)) {
            const strengthColor = getStrengthColor(item.strength);
            html += `
                <div class="card" data-key="${key}">
                    <div class="card-header">
                        <h3 class="card-title">${item.title}</h3>
                        ${item.strength ? `<span class="strength-tag" style="background-color: ${strengthColor}">${item.strength}</span>` : ''}
                    </div>
                    <div class="card-footer">
                        <span class="category-tag">${item.category || item.type}</span>
                        <button class="view-btn">查看详情</button>
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

    // 先应用分类筛选
    if (filter === 'all') {
        result = { ...data };
    } else {
        for (const [key, item] of Object.entries(data)) {
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

    // 过滤掉checklist类型，只在checklist页面显示
    const filteredResult = {};
    for (const [key, item] of Object.entries(result)) {
        if (item.type !== 'checklist') {
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

// 显示详情（默认快速操作模式）
function showDetail(item) {
    const resultSection = document.getElementById('resultSection');
    const sopData = parseSopContent(item.content);
    let currentStep = 0;
    let currentMode = 'fast'; // fast:快速操作模式, learn:学习模式

    // 渲染页面
    function render() {
        if (currentMode === 'fast') {
            // 快速操作模式
            const currentStepData = sopData.steps[currentStep] || '没有步骤信息';
            resultSection.innerHTML = `
                <div class="sop-header">
                    <button class="back-btn">← 返回列表</button>
                    <button class="mode-switch-btn" id="modeSwitch">📚 学习模式</button>
                </div>
                <div class="fast-mode">
                    <div class="fast-title">${item.title}</div>
                    ${sopData.ingredients.length > 0 ? `
                        <div class="fast-ingredients">
                            <h3>原料</h3>
                            <div class="ingredients-list">
                                ${sopData.ingredients.map(ing => `<div class="ingredient-item">${ing}</div>`).join('')}
                            </div>
                        </div>
                    ` : ''}
                    <div class="step-container">
                        <div class="step-number">第 ${currentStep + 1}/${sopData.steps.length} 步</div>
                        <div class="step-content">${currentStepData}</div>
                        <div class="step-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${((currentStep + 1)/sopData.steps.length) * 100}%"></div>
                            </div>
                        </div>
                    </div>
                    <div class="step-controls">
                        <button class="step-btn" ${currentStep === 0 ? 'disabled' : ''} id="prevStep">⬅️ 上一步</button>
                        <button class="step-btn" ${currentStep === sopData.steps.length - 1 ? 'disabled' : ''} id="nextStep">下一步 ➡️</button>
                    </div>
                </div>
            `;
        } else {
            // 学习模式
            resultSection.innerHTML = `
                <div class="sop-header">
                    <button class="back-btn">← 返回列表</button>
                    <button class="mode-switch-btn" id="modeSwitch">⚡ 快速模式</button>
                </div>
                <div class="learn-mode">
                    <div class="result-title">${item.title}</div>
                    <div class="result-content">${item.content}</div>
                </div>
            `;
        }

        // 绑定事件
        bindEvents();
    }

    // 绑定所有事件
    function bindEvents() {
        // 返回按钮
        document.querySelector('.back-btn').addEventListener('click', () => {
            showAllItems();
        });

        // 模式切换按钮
        document.getElementById('modeSwitch').addEventListener('click', () => {
            currentMode = currentMode === 'fast' ? 'learn' : 'fast';
            render();
        });

        // 快速模式的步骤控制
        if (currentMode === 'fast') {
            // 上一步
            document.getElementById('prevStep')?.addEventListener('click', () => {
                if (currentStep > 0) {
                    currentStep--;
                    render();
                }
            });

            // 下一步
            document.getElementById('nextStep')?.addEventListener('click', () => {
                if (currentStep < sopData.steps.length - 1) {
                    currentStep++;
                    render();
                }
            });

            // 键盘控制
            document.removeEventListener('keydown', handleKeydown);
            document.addEventListener('keydown', handleKeydown);

            // 保持屏幕常亮
            if ('wakeLock' in navigator) {
                navigator.wakeLock.request('screen').catch(() => {});
            }
        }
    }

    // 键盘控制步骤
    function handleKeydown(e) {
        if (currentMode !== 'fast') return;
        if (e.key === 'ArrowLeft' && currentStep > 0) {
            currentStep--;
            render();
        } else if (e.key === 'ArrowRight' && currentStep < sopData.steps.length - 1) {
            currentStep++;
            render();
        }
    }

    // 初始渲染
    render();
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
            open: guideData['checklist-open'].items.map(item => ({ text: item, done: false })),
            close: guideData['checklist-close'].items.map(item => ({ text: item, done: false }))
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
                open: guideData['checklist-open'].items.map(item => ({ text: item, done: false })),
                close: guideData['checklist-close'].items.map(item => ({ text: item, done: false }))
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

    checklistData[currentChecklistType] = items.map(item => ({ text: item, done: false }));
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
    if (doneCount === totalCount && totalCount > 0) {
        checklistItemsEl.innerHTML = `
            <div class="completion-celebration">
                <h3>🎉 全部完成！</h3>
                <p>${currentChecklistType === 'open' ? '开工准备就绪' : '打烊工作完成'}</p>
            </div>
        ` + renderChecklistItems(items);
    } else {
        checklistItemsEl.innerHTML = renderChecklistItems(items);
    }

    // 绑定点击事件
    document.querySelectorAll('.checklist-item').forEach((item, index) => {
        item.addEventListener('click', () => {
            toggleChecklistItem(index);
        });
    });
}

// 渲染checklist项目
function renderChecklistItems(items) {
    return items.map((item, index) => `
        <li class="checklist-item ${item.done ? 'completed' : ''}" data-index="${index}">
            <div class="checklist-checkbox"></div>
            <span class="checklist-item-text">${item.text}</span>
        </li>
    `).join('');
}

// 切换checklist项目状态
function toggleChecklistItem(index) {
    checklistData[currentChecklistType][index].done = !checklistData[currentChecklistType][index].done;
    saveChecklistData();
    renderChecklist();
}

