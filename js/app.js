let guideData = {};
let currentFilter = 'all';
let currentFlavor = 'all';
let debounceTimer;

// 页面加载时获取数据
document.addEventListener('DOMContentLoaded', async () => {
    await loadGuideData();
    initEventListeners();
    showAllItems();
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
            }
        }
    }

    // 再应用风味筛选
    if (flavor !== 'all') {
        const flavorResult = {};
        for (const [key, item] of Object.entries(result)) {
            if (item.flavors && item.flavors.some(f => f === flavor)) {
                flavorResult[key] = item;
            }
        }
        return flavorResult;
    }

    return result;
}

// 显示详情
function showDetail(item) {
    const resultSection = document.getElementById('resultSection');
    resultSection.innerHTML = `
        <button class="back-btn">← 返回列表</button>
        <div class="result-title">${item.title}</div>
        <div class="result-content">${item.content}</div>
    `;

    // 绑定返回按钮事件
    document.querySelector('.back-btn').addEventListener('click', () => {
        showAllItems();
    });
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