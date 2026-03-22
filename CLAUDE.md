# 黑象工作指引PWA - 项目开发规则

## 项目概述
- **项目名称**：黑象工作指引督导应用
- **部署地址**：https://hank-in-shenzhen.github.io/blackelephant-guide-pwa/ (GitHub Pages)
- **备用部署**：https://blackelephant-guide-pwa.vercel.app/ (Vercel)
- **GitHub仓库**：https://github.com/Hank-in-shenzhen/blackelephant-guide-pwa.git
- **技术栈**：纯 HTML + CSS + JavaScript（无框架依赖）
- **主要部署平台**：GitHub Pages

---

## 核心规则

### 1. 更新流程规则

#### GitHub Pages 部署（主要使用）
1. **本地修改文件**
2. **提交代码**：`git add . && git commit -m "描述修改内容"`
3. **推送到GitHub**：`git push`
4. **更新 gh-pages 分支**：
   ```bash
   git checkout gh-pages
   git rebase main
   git push -u origin gh-pages
   git checkout main
   ```
5. **（首次部署）配置 GitHub Pages**：
   - 需要**你手动操作**：打开 https://github.com/Hank-in-shenzhen/blackelephant-guide-pwa
   - 点击 **Settings** → 点击 **Pages**
   - 在 **Branch** 下拉菜单选择 `gh-pages`，点击 **Save**
6. **等待部署**：GitHub Pages 部署时间通常为 **1-5分钟**，需要等待

#### Vercel 部署（备用）
1. 只要推送到 main 分支，Vercel 会自动部署
2. 部署地址：https://blackelephant-guide-pwa.vercel.app/
3. 部署时间：**1-2分钟**

### 2. 数据修改规则
- 所有SOP数据存储在 `data/guide-data.json`
- 修改时保持JSON格式正确
- 每次数据更新后，在 `PROJECT_STATUS.md` 的记录日志中添加更新记录

### 3. 代码修改规则
- 保持纯 HTML + CSS + JS，不引入第三方框架
- 响应式设计优先，确保在手机端体验良好
- 修改前先看 `PROJECT_STATUS.md` 了解当前状态

### 4. 进度记录规则
- 每次完成功能，及时更新 `PROJECT_STATUS.md`
- 在「已完成功能」中打勾
- 在「记录日志」中添加更新记录

---

## 项目文件说明

| 文件 | 说明 |
|------|------|
| `index.html` | 主页面入口 |
| `css/style.css` | 全局样式 |
| `js/app.js` | 应用逻辑 |
| `data/guide-data.json` | 所有SOP数据 |
| `manifest.json` | PWA配置 |
| `service-worker.js` | PWA离线缓存 |
| `PROJECT_STATUS.md` | 项目状态记录（必读） |
| `CLAUDE.md` | 本文件（开发规则） |
| `任务留痕.md` | 任务执行历史 |

---

## 快速开始

每次回来开发，按以下步骤：
1. 先看 `PROJECT_STATUS.md` 了解当前状态
2. 确定要开发的功能
3. 修改对应文件
4. 提交并推送到GitHub
5. 验证在线部署效果