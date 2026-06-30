# 知我 (Zhiwo) v1.0.0

> AI 心理陪伴对话 + 标准化心理量表自评工具

## 简介

**知我** 是一款关注心理健康的自评与陪伴 Web 应用。纯静态前端架构，主打两个核心功能：

1. **AI 心理陪伴对话** — 接入 Coze（扣子）API，提供流式 AI 对话，用户可倾诉情绪并获得陪伴式回复
2. **标准化心理量表自评** — 集成国际标准 PHQ-9（抑郁）和 GAD-7（焦虑）量表，帮助用户量化评估情绪状态

---

## 技术栈

| 层面　　　 | 技术　　　　　　　　　　　　　　　　　　　 |
| :-----------| :-------------------------------------------|
| 前端　　　 | 纯原生 HTML5 + CSS3 + Vanilla JS（无框架） |
| 字体　　　 | Google Fonts Inter　　　　　　　　　　　　 |
| 本地服务器 | Node.js `http` 模块（端口 8091）　　　　　 |
| 外部 API　 | Coze 扣子 API（SSE 流式响应）　　　　　　　|
| 客户端存储 | `sessionStorage`（标签页关闭即清除）　　　 |
| 设计基准　 | Figma 1440×1024　　　　　　　　　　　　　　|

---

## 页面结构（7 个页面）

| 页面 | 文件 | 功能 |
|:--|:--|:--|
| 首页 | `index.html` | 品牌展示 + 快速对话入口 |
| AI 对话 | `chat.html` | 调用 Coze API，流式对话，含打字动画 |
| 量表选择 | `scales.html` | 选择 PHQ-9 或 GAD-7 |
| 逐题评测 | `assessment.html` | 逐题答题，支持键盘快捷键 |
| 评测报告 | `report.html` | 展示分数、等级标签、描述 |
| 情绪历史 | `history.html` | 历次评测记录列表 |
| 关于页 | `about.html` | 应用介绍、量表说明、免责声明 |

### 导航关系

```
首页 ──(输入文字→跳转)──> AI对话
AI对话 ──([ASSESSMENT_COMPLETE]→跳转)──> 量表选择

量表选择 ──(选择 PHQ-9/GAD-7)──> 逐题评测
逐题评测 ──(完成所有题目)──> 评测报告

各页面通过顶部导航栏互相跳转（assessment.html 和 report.html 不出现在导航栏中）
```

---

## 项目文件结构

```
zhiwo-new/
├── index.html              # 首页
├── chat.html               # AI 对话页
├── scales.html             # 量表选择页
├── assessment.html         # 逐题评测页
├── report.html             # 评测报告页
├── history.html            # 情绪历史页
├── about.html              # 关于页
├── server.js               # 本地静态文件服务器
├── package.json            # npm 配置
├── css/
│   └── style.css           # 全部样式（18KB）
├── js/
│   └── main.js             # 全部业务逻辑（14KB）
└── images/
    ├── logo.svg            # 品牌 Logo
    ├── intro.svg           # 首页介绍图
    ├── send-btn.svg        # 发送按钮图标
    ├── card-phq9-title.svg # PHQ-9 卡片标题
    ├── card-phq9.svg       # PHQ-9 卡片背景
    ├── card-gad7-title.svg # GAD-7 卡片标题
    ├── card-gad7.svg       # GAD-7 卡片背景
    ├── report-unit.svg     # 报告页"分"字图
    ├── history-icon.svg    # 历史页空状态图标
    ├── next-btn.svg        # 下一步按钮图标
    ├── chat-dialog.svg     # 对话页参考图
    ├── progress-bar.svg    # 进度条参考图
    └── question-number.svg # 题目编号参考图
```

---

## 数据流（sessionStorage）

所有页面间数据传递通过 `sessionStorage` 完成，无后端数据库：

| sessionStorage Key | 类型 | 写入页 | 读取页 |
|:--|:--|:--|:--|
| `zhiwo_home_message` | String | index.html | chat.html |
| `zhiwo_assessment_type` | `"phq9"` / `"gad7"` | scales.html | assessment.html |
| `zhiwo_report_score` | Number | assessment.html | report.html |
| `zhiwo_report_label` | String | assessment.html | report.html |
| `zhiwo_report_desc` | String | assessment.html | report.html |
| `zhiwo_report_date` | String | assessment.html | report.html |
| `zhiwo_report_scale` | String | assessment.html | （预留） |
| `zhiwo_history` | JSON Array | assessment.html | history.html |

### 历史记录数据格式

```json
[
  {
    "scale": "PHQ-9 抑郁自评量表",
    "score": 12,
    "label": "中度抑郁倾向",
    "date": "2026/6/30 11:20:00"
  }
]
```

---

## 量表评分体系

### PHQ-9（9 题 / 0-27 分）

| 分数 | 等级 |
|:--|:--|
| 0-4 | 无抑郁倾向 |
| 5-9 | 轻度抑郁倾向 |
| 10-14 | 中度抑郁倾向 |
| 15-19 | 中重度抑郁倾向 |
| 20-27 | 重度抑郁倾向 |

### GAD-7（7 题 / 0-21 分）

| 分数 | 等级 |
|:--|:--|
| 0-4 | 无焦虑倾向 |
| 5-9 | 轻度焦虑倾向 |
| 10-14 | 中度焦虑倾向 |
| 15-21 | 重度焦虑倾向 |

每题选项：没有(0分) / 有几天(1分) / 一半以上天数(2分) / 几乎每天(3分)

---

## 外部 API

**Coze 扣子对话 API：**

```
POST https://api.coze.cn/v3/chat
Authorization: Bearer {TOKEN}
Content-Type: application/json

{
  "bot_id": "7656059514227146792",
  "user_id": "zhiwo_user_001",
  "stream": true,
  "auto_save_history": true,
  "additional_messages": [{ "role": "user", "content": "...", "content_type": "text" }]
}
```

- 响应格式：SSE（Server-Sent Events）
- 流式增量文本通过 `conversation.message.delta` 事件传递
- AI 回复中包含 `[ASSESSMENT_COMPLETE]` 时，前端自动显示"去完成量表自评 →"按钮

---

## 启动方式

```bash
# 安装依赖（无运行依赖，server.js 只用了 Node 内置模块）
npm install

# 启动本地服务器
npm start

# 浏览器访问
# http://localhost:8091
```

---

## 设计特点

1. **单文件 JS/CSS**：所有逻辑集中在 `main.js`（414 行），样式集中在 `style.css`
2. **无路由/无框架**：纯多页应用，页面跳转使用 `window.location.href`
3. **响应式**：支持 1440px 基准桌面 + 600px 移动端适配
4. **键盘快捷键**：评测页按 1/2/3/4 选择选项，Enter 下一题
5. **动画效果**：消息气泡淡入、打字动画、题目切换过渡

## 注意事项

- `sessionStorage` 存储，关闭标签页后所有评测历史、对话记录丢失
- Coze API Token 硬编码在前端 JS 中（`main.js` 第 172 行），存在安全风险
- `user_id` 固定为 `zhiwo_user_001`，无用户登录/注册系统
- AI 对话当前不支持多轮上下文记忆（每次请求只发当前一条消息）
