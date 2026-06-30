/* ============================================
   知我 — Main JavaScript
   ============================================ */

// ============================================
// Assessment Engine
// ============================================
const ASSESSMENT_DATA = {
  phq9: {
    name: 'PHQ-9 抑郁自评量表',
    total: 9,
    questions: [
      '做事时提不起劲或没有兴趣？',
      '感到心情低落、沮丧或绝望？',
      '入睡困难、睡不安稳或睡眠过多？',
      '感觉疲倦或没有活力？',
      '食欲不振或吃太多？',
      '觉得自己很糟——或觉得自己很失败？',
      '对事物专注有困难，例如阅读报纸或看电视时？',
      '动作或说话速度缓慢到别人已经觉察？或正好相反？',
      '有不如死掉或用某种方式伤害自己的念头？'
    ],
    report: function(score) {
      const levels = [
        { max: 4,  label: '无抑郁倾向',   desc: '你目前的心理状态良好，请继续保持积极的生活方式。' },
        { max: 9,  label: '轻度抑郁倾向',  desc: '你可能有轻度抑郁倾向，建议关注自己的情绪变化，适当放松。' },
        { max: 14, label: '中度抑郁倾向',  desc: '你可能有中度抑郁倾向，建议重视并尝试与信任的人聊聊。' },
        { max: 19, label: '中重度抑郁倾向', desc: '建议寻求专业心理咨询师的帮助，你并不孤单。' },
        { max: 27, label: '重度抑郁倾向',  desc: '强烈建议尽快寻求专业心理医生的帮助，这很重要。' }
      ];
      return levels.find(l => score <= l.max) || levels[levels.length - 1];
    }
  },
  gad7: {
    name: 'GAD-7 焦虑自评量表',
    total: 7,
    questions: [
      '感觉紧张、焦虑或烦躁？',
      '无法停止或控制担忧？',
      '对各种各样的事情担忧过多？',
      '很难放松下来？',
      '由于不安而无法静坐？',
      '变得容易烦恼或急躁？',
      '感到似乎将有可怕的事情发生？'
    ],
    report: function(score) {
      const levels = [
        { max: 4,  label: '无焦虑倾向',   desc: '你目前的焦虑水平正常，请保持轻松的心态。' },
        { max: 9,  label: '轻度焦虑倾向',  desc: '你可能有轻度焦虑倾向，建议适当进行放松练习。' },
        { max: 14, label: '中度焦虑倾向',  desc: '你可能有中度焦虑倾向，建议重视并主动寻求缓解方法。' },
        { max: 21, label: '重度焦虑倾向',  desc: '建议尽快寻求专业心理咨询师的帮助，专业的支持会让一切变好。' }
      ];
      return levels.find(l => score <= l.max) || levels[levels.length - 1];
    }
  }
};

// Current assessment state
let currentAssessment = null;
let currentQuestion = 0;
let answers = [];

function startAssessment(type) {
  currentAssessment = type;
  currentQuestion = 0;
  answers = [];
  sessionStorage.setItem('zhiwo_assessment_type', type);
  window.location.href = 'assessment.html';
}

function initAssessment() {
  const type = sessionStorage.getItem('zhiwo_assessment_type');
  if (!type) { window.location.href = 'scales.html'; return; }

  currentAssessment = type;
  const data = ASSESSMENT_DATA[type];

  document.getElementById('scaleName').textContent = data.name;
  document.getElementById('totalNum').textContent = '/' + data.total;
  renderQuestion();
}

function renderQuestion() {
  const data = ASSESSMENT_DATA[currentAssessment];
  const q = currentQuestion + 1;

  // Update question number text
  document.getElementById('currentNum').textContent = q;
  document.getElementById('totalNum').textContent = '/' + data.total;

  document.getElementById('questionText').textContent = data.questions[currentQuestion];

  // Reset option selection
  document.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
  const nextBtn = document.getElementById('nextBtn');
  nextBtn.disabled = true;
  nextBtn.classList.remove('active');

  // Prev button state
  const prevBtn = document.getElementById('prevBtn');
  if (currentQuestion > 0) {
    prevBtn.disabled = false;
    prevBtn.classList.add('active');
  } else {
    prevBtn.disabled = true;
    prevBtn.classList.remove('active');
  }

  // Update progress bar (600px)
  const progress = ((currentQuestion) / data.total) * 600;
  const fill = document.getElementById('progressFill');
  if (fill) {
    fill.setAttribute('width', progress);
  }

  // Re-bind animation
  const assessment = document.querySelector('.assessment');
  assessment.classList.remove('fade-in');
  void assessment.offsetWidth;
  assessment.classList.add('fade-in');
}

function selectOption(el, value) {
  document.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  answers[currentQuestion] = value;
  document.getElementById('nextBtn').disabled = false;
  document.getElementById('nextBtn').classList.add('active');
}

function prevQuestion() {
  if (currentQuestion <= 0) return;
  currentQuestion--;
  renderQuestion();
}

function nextQuestion() {
  const data = ASSESSMENT_DATA[currentAssessment];
  currentQuestion++;
  if (currentQuestion >= data.total) {
    // Calculate score and go to report
    const totalScore = answers.reduce((a, b) => a + b, 0);
    const report = data.report(totalScore);
    sessionStorage.setItem('zhiwo_report_score', totalScore);
    sessionStorage.setItem('zhiwo_report_label', report.label);
    sessionStorage.setItem('zhiwo_report_desc', report.desc);
    sessionStorage.setItem('zhiwo_report_date', new Date().toLocaleString('zh-CN'));
    sessionStorage.setItem('zhiwo_report_scale', data.name);

    // Save to history
    saveToHistory(data.name, totalScore, report.label);
    window.location.href = 'report.html';
  } else {
    renderQuestion();
  }
}

function initReport() {
  const score = sessionStorage.getItem('zhiwo_report_score');
  if (score === null) { window.location.href = 'scales.html'; return; }

  document.getElementById('reportScore').textContent = score;
  document.getElementById('reportChip').textContent = sessionStorage.getItem('zhiwo_report_label');
  document.getElementById('reportDesc').textContent = sessionStorage.getItem('zhiwo_report_desc');
  document.getElementById('reportDate').textContent = sessionStorage.getItem('zhiwo_report_date');
}

// ============================================
// Chat — 直接调用 Coze 扣子 API
// ============================================

const COZE_TOKEN = 'pat_SkzkDaJsGCZG3ryWdKUqSQUlfsEiOHtpOaNjOlzLh2mfR6sDekXrg5DbFMx0CBZ8';
const COZE_BOT_ID = '7656059514227146792';
const COZE_API = 'https://api.coze.cn/v3/chat';

let chatHistory = [];

function goChat() {
  const homeInput = document.getElementById('homeInput');
  const text = homeInput ? homeInput.value.trim() : '';
  if (text) {
    sessionStorage.setItem('zhiwo_home_message', text);
    homeInput.value = '';
  }
  window.location.href = 'chat.html';
}

async function sendMessage() {
  const input = document.getElementById('chatInput');
  const dialog = document.getElementById('chatDialog');
  if (!input || !dialog) return;

  const text = input.value.trim();
  if (!text) return;

  // 用户消息
  const userMsgEl = document.createElement('div');
  userMsgEl.className = 'chat-msg user fade-in';
  userMsgEl.textContent = text;
  dialog.appendChild(userMsgEl);
  scrollToBottom(dialog);

  input.value = '';
  input.focus();

  // typing — 友好的等待提示
  const typing = document.createElement('div');
  typing.className = 'chat-typing';
  typing.innerHTML = '<span></span><span></span><span></span><b>知我正在思考...</b>';
  dialog.appendChild(typing);
  scrollToBottom(dialog);

  try {
    // 直接调用 Coze API
    const response = await fetch(COZE_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${COZE_TOKEN}`
      },
      body: JSON.stringify({
        bot_id: COZE_BOT_ID,
        user_id: 'zhiwo_user_001',
        stream: true,
        auto_save_history: true,
        additional_messages: [{ role: 'user', content: text, content_type: 'text' }]
      })
    });

    if (!response.ok) {
      throw new Error(`服务器错误: ${response.status}`);
    }

    // 读取 SSE 流
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let rawBuffer = '';
    let fullContent = '';
    let aiMsg = null;  // 延迟创建，等真正有内容时

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      rawBuffer += decoder.decode(value, { stream: true });

      // 解析 SSE 格式: event: xxx\ndata: {...}\n\n
      const events = rawBuffer.split('\n\n');
      rawBuffer = events.pop() || '';  // 保留未完成的部分

      for (const event of events) {
        // 提取 event 和 data 行
        let eventType = '';
        let dataStr = '';
        for (const line of event.split('\n')) {
          const t = line.trim();
          if (t.toLowerCase().startsWith('event:')) {
            eventType = t.replace(/event:\s*/i, '').trim();
          } else if (t.toLowerCase().startsWith('data:')) {
            dataStr = t.replace(/data:\s*/i, '').trim();
          }
        }

        // 只在 delta 事件中追加增量文本，避免 completed 完整内容重复
        const isDelta = eventType.includes('.delta');
        if (dataStr && isDelta && !eventType.includes('.created') && !eventType.includes('.in_progress') && eventType !== 'ping') {
          try {
            const obj = JSON.parse(dataStr);
            // 跳过 verbose 内部元数据
            if (obj.type === 'verbose') continue;
            const content = typeof obj.content === 'string' ? obj.content : '';
            if (content) {
              // 第一次有内容时：移除 typing，创建 AI 气泡
              if (!aiMsg) {
                typing.remove();
                aiMsg = document.createElement('div');
                aiMsg.className = 'chat-msg ai fade-in';
                dialog.appendChild(aiMsg);
              }
              fullContent += content;
              aiMsg.textContent = fullContent;
              scrollToBottom(dialog);
            }
          } catch (e) { /* 非 JSON，忽略 */ }
        }
      }
    }

    console.log(`[Coze] 最终内容长度: ${fullContent.length}, 内容: "${fullContent.slice(0, 100)}"`);

    if (fullContent.trim()) {
      chatHistory.push({ role: 'assistant', content: fullContent });
    } else if (!aiMsg) {
      // 没收到任何内容，替换 typing 为错误提示
      typing.remove();
      aiMsg = document.createElement('div');
      aiMsg.className = 'chat-msg ai fade-in';
      aiMsg.textContent = '抱歉，没有收到回复。';
      dialog.appendChild(aiMsg);
    }

    scrollToBottom(dialog);

    // 检测 [ASSESSMENT_COMPLETE]
    if (fullContent.includes('[ASSESSMENT_COMPLETE]')) {
      const btn = document.createElement('button');
      btn.className = 'chat-assess-btn fade-in';
      btn.textContent = '去完成量表自评 →';
      btn.onclick = () => window.location.href = 'scales.html';
      dialog.appendChild(btn);
      scrollToBottom(dialog);
    }

  } catch (err) {
    typing.remove();
    console.error('[Coze] 错误:', err);
    
    const errMsg = document.createElement('div');
    errMsg.className = 'chat-msg ai fade-in';
    errMsg.textContent = `连接失败: ${err.message}`;
    dialog.appendChild(errMsg);
    scrollToBottom(dialog);
  }
}

function scrollToBottom(el) {
  el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
}

// ============================================
// History Storage
// ============================================
function saveToHistory(scaleName, score, label) {
  const history = JSON.parse(sessionStorage.getItem('zhiwo_history') || '[]');
  history.push({
    scale: scaleName,
    score: score,
    label: label,
    date: new Date().toLocaleString('zh-CN')
  });
  sessionStorage.setItem('zhiwo_history', JSON.stringify(history));
}

function loadHistory() {
  const history = JSON.parse(sessionStorage.getItem('zhiwo_history') || '[]');
  const container = document.querySelector('.history-empty');
  if (!container || history.length === 0) return;

  // Replace empty state with history list
  container.innerHTML = '';
  container.style.justifyContent = 'flex-start';
  container.style.paddingTop = '80px';
  container.style.gap = '20px';
  container.style.width = '700px';

  history.reverse().forEach(entry => {
    const row = document.createElement('div');
    row.style.cssText = `
      width:100%; display:flex; align-items:center; justify-content:space-between;
      padding:20px 32px; border:1px solid #000; border-radius:50px;
      font-family:Inter; transition: background 0.2s;
    `;
    row.innerHTML = `
      <span style="font-weight:300;font-size:18px;line-height:1;">${entry.scale}</span>
      <div style="display:flex;align-items:center;gap:2px;">
        <span style="font-weight:600;font-size:24px;line-height:1;">${entry.score}</span>
        <span style="font-weight:600;font-size:24px;line-height:1;">分</span>
      </div>
      <span style="font-weight:400;font-size:14px;color:rgba(0,0,0,0.5);line-height:1;">${entry.label}</span>
      <span style="font-weight:100;font-size:14px;color:rgba(0,0,0,0.4);line-height:1;">${entry.date}</span>
    `;
    container.appendChild(row);
  });
}

// ============================================
// Init on DOM ready
// ============================================
document.addEventListener('DOMContentLoaded', function() {
  const path = window.location.pathname;

  if (path.includes('assessment')) {
    initAssessment();
  } else if (path.includes('report')) {
    initReport();
  } else if (path.includes('history')) {
    loadHistory();
  } else if (path.includes('chat')) {
    // Auto-send message from home page
    const homeMsg = sessionStorage.getItem('zhiwo_home_message');
    if (homeMsg) {
      sessionStorage.removeItem('zhiwo_home_message');
      const input = document.getElementById('chatInput');
      if (input) { input.value = homeMsg; }
      sendMessage();
    }
  }

  // Keyboard navigation for assessment
  document.addEventListener('keydown', function(e) {
    if (!path.includes('assessment')) return;
    const keys = ['1', '2', '3', '4'];
    const idx = keys.indexOf(e.key);
    if (idx >= 0) {
      const options = document.querySelectorAll('.option');
      if (options[idx]) selectOption(options[idx], idx);
    }
    if (e.key === 'Enter' && !document.getElementById('nextBtn').disabled) {
      nextQuestion();
    }
  });
});
