# 黑象工作指引督导应用

---

## 现状速览

**当前坐标：** 鸡尾酒SOP查询、Checklist、双模式切换均可用。搜索和筛选正常工作。小吃筛选数据只有美式薯条一个，snack/main/signature-food 分类无内容。

**积木状态：** 稳固 — 鸡尾酒SOP、到店/打烊流程、Checklist、双模式切换。还没拆 — app.js 是单文件（600+行），模块化未做。

**下一步：** 补充小吃SOP数据，或根据需求实现 quiz 小测验功能。

**安全快照：** Git `0ae144e`（修复脏数据+富文本编辑），数据默认从 guide-data.json 加载，用户修改后存 localStorage。

---

## 项目信息
- **部署地址**：https://hank-in-shenzhen.github.io/blackelephant-guide-pwa/ (GitHub Pages)
- **备用部署**：https://blackelephant-guide-pwa.vercel.app/ (Vercel)
- **GitHub仓库**：https://github.com/Hank-in-shenzhen/blackelephant-guide-pwa.git
- **技术栈**：纯 HTML + CSS + JavaScript（无框架依赖）

---

## ✅ 已完成功能

### 基础功能
- [x] 首页UI设计（黑金配色）
- [x] 搜索功能（支持关键词，防抖300ms）
- [x] 内容详情展示，点击卡片即可打开
- [x] 视频链接跳转功能

### 数据录入
- [x] 29款鸡尾酒SOP（含招牌特调）
- [x] 到店流程、打烊流程
- [x] 开工/打烊Checklist（每日自动重置，状态持久化）

### 分类筛选
- [x] 分类筛选（全部/长饮/短饮/招牌/饮品/流程）
- [x] 风味筛选（清爽/果香/花香/茶香/微苦/酸甜/烟熏）
- [x] 酒精感标签（轻/中/烈，颜色区分）
- [x] 小吃分类筛选（炸物/小食/主食/招牌小吃）

### 模式切换
- [x] 快速操作模式（超大字体、单步切换、进度条）
- [x] 学习模式（完整信息展示）
- [x] 一键切换，自动记忆偏好

### PWA + 部署
- [x] manifest.json + service-worker.js（离线缓存）
- [x] GitHub Pages + Vercel 双部署

---

## 📋 待完成功能

### 高优先级
- [ ] **小吃SOP数据补充** — 现在只有美式薯条，口味/制作时间筛选需数据支持
- [ ] **quiz小测验** — 看完SOP后弹出2-3道题检验学习效果

### 中优先级
- [ ] 收藏功能、历史记录
- [ ] 库存盘点功能（PRD v2）

### 低优先级
- [ ] 云端数据库（Supabase）
- [ ] 图片上传支持

---

## 📝 记录日志

| 日期 | 操作内容 | 完成人 |
|------|----------|--------|
| 2026-03-28 | 修复脏数据、修复SOP编辑富内容丢失、替换步骤编辑器为contenteditable | Claude |
| 2026-03-25 | 布局优化：搜索框固定底部 + 快速模式紧凑布局 | Hank |
| 2026-03-25 | 清理冗余文件，删除过时文档 | Claude |
| 2026-03-27 | 优化搜索框UI，开发后台管理界面（密码保护、SOP增删改、Checklist管理） | Claude |
| 2026-03-27 | 修复SOP详情页背景颜色，修复视频链接问题 | Claude |
| 2026-03-27 | 删除卡片"查看详情"按钮，点击卡片任意位置即可打开 | CLINE |

---

## 文件结构

```
work-guide-pwa/
├── index.html              # 主页面
├── manifest.json           # PWA配置
├── service-worker.js       # PWA离线支持
├── css/style.css          # 样式（黑金配色）
├── js/app.js              # 应用逻辑（单文件600+行）
├── data/guide-data.json   # SOP数据
├── PROJECT_STATUS.md      # 本文件
├── 黑象培训系统PRDv2.md  # 产品需求文档
└── 小吃SOP添加指南.md     # 小吃SOP添加说明
```
