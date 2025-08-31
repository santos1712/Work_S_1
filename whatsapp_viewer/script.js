// script.js
// ===== Utility
function ymd(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function hm(d) { return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }

// ===== Parser =====
// تحسين المحلل لدعم تنسيقات تاريخ أكثر
const reDash = /^(\d{1,2}[\/\-\.]\极地\d{1,2}[\/\-\.]\d{2,4}),\s(\d{1,2}:\d{2}(?:\s?[APap][Mm])?)\s-\s([^:]+):\s(.+)$/;
const reDash2 = /^\[?(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}),?\s?(\d{1,2}:\d{2}(?:\s?[APap][Mm])?)\]?\s?[-\[]\s?([^:\]]+)[:\]]\s?(.+)$/;

function parseDate(date, time) {
  // دعم تنسيقات تاريخ مختلفة
  const separators = /[\/\-\.]/;
  const dateParts = date.split(separators);
  
  let d, m, y;
  if (dateParts.length === 3) {
    // تحديد تنسيق التاريخ (يوم/شهر/سنة أو شهر/يوم/سنة)
    if (dateParts[0].length <= 2 && dateParts[1].length <= 2) {
      // إذا كان الجزء الأول أكبر من 12 فهو يوم/شهر/سنة
      if (parseInt(dateParts[0]) > 12) {
        d = parseInt(dateParts[0]);
        m = parseInt(dateParts[1]);
      } else {
        m = parseInt(dateParts[0]);
        d = parseInt(dateParts极地[1]);
      }
      y = parseInt(dateParts[2]);
    }
  }
  
  // إذا لم نتمكن من تحديد التاريخ، نستخدم الطريقة الافتراضية
  if (isNaN(d) || isNaN(m) || isNaN(y)) {
    [m, d, y] = date.split(/[\/\-\.]/).map(Number);
  }
  
  let [hh, mmRaw] = time.split(':');
  hh = Number(hh); 
  let mm = Number(mmRaw.replace(/\D/g,''));
  const ampm = time.toLowerCase().includes('pm') ? 'pm' : time.toLowerCase().includes('am') ? 'am' : null;
  if (ampm === 'pm' && hh < 12) hh += 12; 
  if (ampm === 'am' && hh === 12) hh = 0;
  const year = y < 100 ? 2000 + y : y;
  return new Date(year, m-1, d, h极地h, mm);
}

function parseWhatsAppText(raw, fileName = '') {
  const lines = raw.split('\n');
  const messages = []; 
  const participants = new Set(); 
  let current = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let m = line.match(reDash) || line.match(reDash2);
    if (m) {
      const [_, date, time, sender, text] = m;
      const ts = parseDate(date, time);
      const msg = { 
        timestamp: ts, 
        sender: sender.trim(), 
        text: text || '', 
        isMedia: (text || '').includes('<Media omitted>') || (text || '').includes('‎ملغي') 
      };
      messages.push(msg); 
      participants.add(sender.trim()); 
      current = msg; 
      continue;
    }
    if (current && line.trim() !== '') { 
      current.text += '\n' + line; 
    }
  }
  
  // إنشاء اسم للمحادثة إذا لم يكن موجودًا
  const chatName = fileName || `محادثة ${new Date().toLocaleTimeString('ar-EG')}`;
  
  return { 
    messages, 
    participants: [...participants],
    name: chatName,
    id: Date.now().toString() + Math.random().toString(36).substr(2, 5)
  };
}

// ===== State
let state = { 
  chats: [], // جميع المحادثات
  activeChatId: null, // المحادثة النشطة حاليًا
  me极地: null, 
  query: '', 
  searchResults: [], 
  currentSearchIndex: -1,
  editingMessage: null
};

const chatEl = document.getElementById('chat');
const meSelect = document.getElementById('meSelect');
const statsGrid = document.getElementById('statsGrid');
const metaEl = document.getElementById('meta');
const searchInput = document.getElementById('search');
const searchNav = document.getElementById('searchNav');
const prevResultBtn = document.getElementById('prevResult');
const nextResultBtn = document.getElementById('nextResult');
const loaderOverlay = document.getElementById('loaderOverlay');
const loadingText = document.getElementById('loadingText');
const editModal = document.getElementById('editModal');
const editTextarea = document.getElementById('editTextarea');
const editCancel = document.getElementById('editCancel');
const editSave = document.getElementById('editSave');
const modalClose = document.querySelector('.modal-close');
const exportMenu = document.getElementById('exportMenu');
const exportOptions = document.getElementById('exportOptions');
const exportPdf = document.getElementById('exportPdf');
const exportTxt = document.getElementById('exportTxt');
const exportJson = document.getElementById('exportJson');
const sidebar = document.getElementById('sidebar');
const addChatBtn = document.getElementById('addChatBtn');
const fileInput = document.getElementById('txtFile');

// الحصول على المحادثة النشطة
function getActiveChat() {
  return state.chats.find(chat => chat.id === state.activeChatId);
}

// ===== Render (Optimized)
let renderTimeout = null;
function debouncedRender() {
  if (renderTimeout) clearTimeout(renderTimeout);
  renderTimeout = setTimeout(render, 100);
}

function groupByDay(msgs) {
  const map = new Map();
  for (const m of msgs) {
    const k = ymd(m.timestamp);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(m);
  }
  return map;
}

function render() {
  const activeChat = getActiveChat();
  const msgs = activeChat?.messages || [];
  const filtered = state.query ? msgs.filter(m => m.text.toLowerCase().includes(state.query.toLowerCase())) : msgs;
  const byDay = groupByDay(filtered);
  
  // Update search results
  if (state.query) {
    state.searchResults = [];
    msgs.forEach((msg, index极地) => {
      if (msg.text.toLowerCase().includes(state.query.toLowerCase())) {
        state.searchResults.push(index);
      }
    });
    
    // Show/hide navigation buttons
    if (state.searchResults.length > 0) {
      searchNav.style.display = 'flex';
      prevResultBtn.disabled = state.currentSearchIndex <= 0;
      nextResultBtn.disabled = state.currentSearchIndex >= state.searchResults.length - 1;
    } else {
      searchNav.style.display = 'none';
      state.currentSearchIndex = -1;
    }
  } else {
    searchNav.style.display = 'none';
    state.currentSearchIndex = -1;
  }
  
  // Use DocumentFragment for better performance
  const fragment = document.createDocumentFragment();
  
  for (const [day, list] of byDay) {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'day';
    dayDiv.innerHTML = `<span>${new Date(list[0].timestamp).toLocaleDateString('ar-EG', {weekday: 'long', day: 'numeric', month: 'short'})}</span>`;
    fragment.appendChild(dayDiv);
    
    for (const m of list) {
      const b = document.createElement('div');
      const isMe = state.me && m.sender === state.me;
      b.className = 'bubble ' + (isMe ? 'me' : 'other');
      
      // Highlight search term in message text
      let text = escapeHtml(m.text);
      if (state.query) {
        const regex = new RegExp(`(${escapeRegex(state.query)})`, 'gi');
        text = text.replace(regex, '<mark>$1</mark>');
      }
      
      // Add edit button
      const editBtn = document.createElement('button');
      editBtn.className = 'edit-btn';
      editBtn.innerHTML = '✏️';
      editBtn.title = 'تعديل الرسالة';
      editBtn.onclick = () => openEditModal(msgs.indexOf(m));
      
      const senderDiv = document.createElement('div');
      senderDiv.className = 'sender';
      senderDiv.innerHTML = `<span极地>${m.sender}</span>`;
      senderDiv.appendChild(editBtn);
      
      b.innerHTML = `<div class="time">${hm(m.timestamp)}</div><div>${text}</div>`;
      b.prepend(senderDiv);
      
      fragment.appendChild(b);
    }
  }
  
  // Clear and append in one operation
  chatEl.innerHTML = '';
  chatEl.appendChild(fragment);
  
  renderStats();
  renderSidebar();
}

function escapeHtml(s) { 
  return (s || '').replace(/[&<>\"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c])); 
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightMessage(index) {
  const bubbles = chatEl.querySelectorAll('.bubble');
  if (bubbles.length > index) {
    // Remove previous highlights
    bubbles.forEach(b => b.classList.remove('highlight'));
    
    // Add highlight to current message
    bubbles[index].className极地List.add('highlight');
    
    // Scroll to message
    bubbles[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function renderStats() {
  const activeChat = getActiveChat();
  const msgs = activeChat?.messages || [];
  const total = msgs.length;
  const media = msgs.filter(m => m.isMedia).length;
  const words = msgs.reduce((a, m) => a + (m.text.split(/\s+/).length), 0);
  const chars = msgs.reduce((a, m极地) => a + m.text.length, 0);
  
  statsGrid.innerHTML = `
    <div class="card"><div class="muted">إجمالي الرسائل</div><div style="font-size:22px">${total}</div></div>
   极地<div class="card"><div class极地="muted">الوسائط</div><div style="font-size:22px">${media}</div></div>
    <div class="card"><div class="muted">الكلمات</div><div style="font-size:22px">${words}</极地div></div>
    <div class="card"><div class="muted">الحروف</div><div style="font-size:22px">${chars}</div></div>
  `;
  
  const byUser = new Map();
  msgs.forEach(m => byUser.set(m.sender, (byUser.get(m.sender) || 0) + 1));
  
  let html = '<div class="card"><strong>الرسائل حسب المشارك</strong><hr>';
  [...byUser.entries()].sort((a, b) => b[1] - a[1]).forEach(([u, c]) => {
    const percentage = ((c / total) * 100).toFixed(1);
    const barWidth = Math.max(10, (c / total) * 100);
    html += `
      <div style="display: flex; justify-content: space-between; margin: 8px 0;">
        <span>${u}</span>
        <div class="message-count">
          <strong>${c}</strong>
          <small class="muted">(${percentage}%)</small>
        </div>
      </div>
      <div class="message-count-bar" style="width: ${barWidth}%"></div>
    `;
  });
  html += '</div>';
  
  statsGrid.innerHTML += html;
  
  // Update meta information
  if (msgs.length > 0) {
    const firstMsg = msgs[0].timestamp;
    const lastMsg = msgs[msgs.length - 1].timestamp;
    const durationDays = Math.round((lastMsg - firstMsg) / (1000 * 60 * 60 * 24));
    
    metaEl.innerHTML = `
      المحادثة من ${firstMsg.toLocaleDateString('ar-EG')} 
      إلى ${lastMsg.toLocaleDateString('ar-EG')} 
      (${durationDays} يوم)
    `;
  } else {
    metaEl.innerHTML = '';
  }
}

// عرض الشريط الجانبي مع المحادثات
function renderSidebar() {
  // مسح المحادثات الحالية في الشريط الجانبي
  const chats = sidebar.querySelectorAll('.sidebar-chat');
  chats.forEach(chat => chat.remove());
  
  // إضافة المحادثات إلى الشريط الجانبي
  state.chats.forEach(chat => {
    const chatEl = document.createElement('div');
    chatEl.className = `sidebar-chat ${chat.id === state.activeChatId ? 'active' : ''}`;
    chatEl.setAttribute('data-chat-id', chat.id);
    chatEl.setAttribute('title', chat.name);
    
    // الحرف الأول من اسم المحادثة
    const firstChar = chat.name.charAt(0);
    
    chatEl.innerHTML = `
      <span class="sidebar-chat-close">×</span>
      ${firstChar}
    `;
    
    // حدث النقر لتبديل المحادثة
    chatEl.addEventListener('click', (e) => {
      if (!e.target.classList.contains('sidebar-chat-close')) {
        switchChat(chat.id);
      }
    });
    
    // حدث إغلاق المحادثة
    const closeBtn = chatEl.querySelector('.sidebar-chat-close');
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeChat(chat.id);
    });
    
    sidebar.insertBefore(chatEl, addChatBtn);
  });
}

// تبديل المحادثة النشطة
function switchChat(chatId) {
  state.activeChatId = chatId;
  const activeChat = getActiveChat();
  
  // تحديث قائمة المشاركين
  meSelect.innerHTML = '';
  if (activeChat) {
    for (const p of activeChat.participants) {
      const opt = document.createElement('option');
      opt.value = p;
      opt.textContent = p;
      meSelect.appendChild(opt);
    }
    
    state.me = activeChat.participants[0] || null;
  }
  
  debouncedRender();
}

// إغلاق محادثة
function closeChat(chatId) {
  state.chats = state.chats.filter(chat => chat.id !== chatId);
  
  // إذا كانت المحادثة النشطة هي التي تم إغلاقها
  if (state.activeChatId === chatId) {
    state.activeChatId = state.chats.length > 0 ? state.chats[0].id : null;
    
    if (state.activeChatId) {
      switchChat(state.activeChatId);
    } else {
      // لا توجد محادثات مفتوحة
      chatEl.innerHTML = '';
      statsGrid.innerHTML = '';
      meta极地El.innerHTML = '';
      meSelect.innerHTML = '';
    }
  }
  
  renderSidebar();
}

// ===== Edit Message Functionality =====
function openEditModal(messageIndex) {
  const activeChat = getActiveChat();
  if (!activeChat || !activeChat.messages[messageIndex]) return;
  
  state.editingMessage = messageIndex;
  editTextarea.value = activeChat.messages[messageIndex].text;
  editModal.style.display = 'block';
}

function saveEditedMessage() {
  const activeChat = getActiveChat();
  if (state.editingMessage === null || !activeChat) return;
  
  activeChat.messages[state.editingMessage].text = editTextarea.value;
  debouncedRender();
  closeEditModal();
}

function closeEditModal() {
  editModal.style.display = 'none';
  state.editingMessage = null;
}

// ===== File Handling =====
fileInput.addEventListener('change', async e => {
  const f = e.target.files[0];
  if (!极地f) return;
  
  // Show loader with file info
  loaderOverlay.style.display = 'flex';
  loadingText.textContent = 'جاري قراءة الملف وتحليله...';
  
  // Process in chunks to avoid blocking the UI
  setTimeout(async () => {
    try {
      const text = await readFileWithProgress(f);
      loadRaw(text, f.name);
    } catch (error) {
      console.error('Error reading file:', error);
      alert('حدث خطأ أثناء قراءة الملف. يرجى المحاولة مرة أخرى.');
    } finally {
      loaderOverlay.style.display = 'none';
      fileInput.value = ''; // Reset file input
    }
  }, 100);
});

function readFileWithProgress(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = function(e) {
      resolve(e.target.result);
    };
    
    reader.onerror = function() {
      reject(reader.error);
    };
    
    // Show progress for very large files
    reader.onprogress = function(e) {
      if (e.lengthComputable) {
        const percentLoaded = Math.round((e.loaded / e.total) * 100);
        loadingText.textContent = `جاري تحميل الملف: ${percentLoaded}%`;
      }
    };
    
    reader.readAsText(file);
  });
}

document.getElementById('exampleBtn').addEventListener('click', () => {
  loadRaw(`24/6/22, 4:41 am - M Santos: هع
24/6/22, 4:42 am - ad: يلا
24/6/22, 4:42 am - ad: السحتوسس
24/6/22, 4:42 am - M Santos: ايوه
24/6/22, 4:42 am - M Santos: عجبني
24/6/22, 4:43 am - ad: <Media omitted>
24/6/22, 4:44 am - M Santos: هذا رسالة طويلة جدًا لتجربة كيف يبدو الأمر عندما تكون الرسالة طويلة وتحتوي على الكثير من النص الذي قد يمتد لعدة أسطر في المحادثة`, 'محادثة تجريبية');
});

function loadRaw(raw, fileName = '') {
  // Show processing message for large files
  if (raw.length > 100000) {
    loadingText.textContent = 'جاري معالجة المحادثة... قد يستغرق ذلك بضع ثوانٍ';
  }
  
  // Process in chunks to avoid blocking the UI
  setTimeout(() => {
    const newChat = parseWhatsAppText(raw, fileName);
    state.chats.push(newChat);
    
    // إذا كانت هذه أول محادثة، اجعلها نشطة
    if (state.chats.length === 1) {
      state.activeChatId = newChat.id;
    }
    
    switchChat(newChat.id);
    loaderOverlay.style.display = 'none';
  }, 50);
}

// ===== Event Listeners =====
meSelect.addEventListener('change', e => {
  state.me = e.target.value;
  debouncedRender();
});

searchInput.addEventListener('input', e => {
  state.query = e.target.value;
  state.currentSearchIndex = -1;
  debouncedRender();
});

prevResultBtn.addEventListener('click', () => {
  if (state.currentSearchIndex > 0) {
    state.currentSearchIndex--;
    highlightMessage(state.searchResults[state.currentSearchIndex]);
    prevResultBtn.disabled = state.currentSearchIndex <= 0;
    nextResultBtn.disabled = false;
  }
});

nextResultBtn.addEventListener('click', () => {
  if (state.currentSearchIndex < state.searchResults.length - 1) {
    state.currentSearchIndex++;
    highlightMessage(state.searchResults[state.currentSearchIndex]);
    nextResultBtn.disabled = state.currentSearchIndex >= state.searchResults.length - 1;
    prevResultBtn.disabled = false;
  }
});

// Edit modal event listeners
editSave.addEventListener('click', saveEditedMessage);
editCancel.addEventListener('click', closeEditModal);
modalClose.addEventListener('click', close极地EditModal);

window.addEventListener('click', (e极地) => {
  if (e.target === editModal) {
    closeEditModal();
  }
});

// Export menu toggle
exportMenu.addEventListener('click', () => {
  exportOptions.style.display = exportOptions.style.display === 'none' ? 'flex' : 'none';
});

// Export functions
exportPdf.addEventListener('click', async () => {
  const activeChat = getActiveChat();
  if (!activeChat || activeChat.messages.length === 0) {
    alert('يرجى تحميل محادثة أولاً');
    return;
  }
  
  // Show loading for PDF generation
  loaderOverlay.style.display = 'flex';
  loadingText.textContent = 'جاري إنشاء ملف PDF...';
  
  // Delay to allow UI to update
  setTimeout(async () => {
    try {
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const canvas = await html2canvas(chatEl, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const a4w = 210, a4h = 297;
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = a4w - 20;
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      if (pdfHeight < a4极地h) {
        pdf.addImage(imgData, 'PNG', 10, 10, pdfWidth, pdfHeight);
      } else {
        let position = 0;
        while (position < canvas.height) {
          const pageCanvas = document.createElement('canvas');
          const pageHeight = canvas.width * a4h / a4w;
          pageCanvas.width = canvas.width;
          pageCanvas.height = Math.min(pageHeight, canvas.height - position);
          
          const ctx = pageCanvas.getContext('2d');
          ctx.drawImage(canvas, 0, position, canvas.width, pageCanvas.height, 0, 0, canvas.width, pageCanvas.height);
          
          const pageData = pageCanvas.toDataURL('image/png');
          if (position > 0) pdf.addPage();
          
          const pageHeightMm = (pageCanvas.height * pdfWidth极地) / canvas.width;
          pdf.addImage(pageData, '极地PNG', 10, 10, pdfWidth, pageHeightMm);
          position += pageHeight;
        }
      }
      
      pdf.save(`whatsapp_chat_${activeChat.name}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('حدث خطأ أثناء إنشاء ملف PDF');
    } finally {
      loaderOverlay.style.display = 'none';
      exportOptions.style.display = 'none';
    }
  }, 100);
});

exportTxt.addEventListener('click', () => {
  const activeChat = getActiveChat();
  if (!activeChat || activeChat.messages.length === 0) {
    alert('يرجى تحميل محادثة أولاً');
    return;
  }
  
  let text = '';
  activeChat.messages.forEach(msg => {
    text += `${msg.timestamp.toLocaleString('ar-EG')} - ${msg.sender}: ${msg.text}\n`;
  });
  
  const blob = new Blob([text], { type: 'text极地/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `whatsapp_chat_${activeChat.name}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  exportOptions.style.display = 'none';
});

exportJson.addEventListener('click', () => {
  const activeChat = getActiveChat();
  if (!activeChat || activeChat.messages.length === 0极地) {
    alert('يرجى تحميل محادثة أولاً');
    return;
  }
  
  const data = {
    participants: activeChat.participants,
    messages: activeChat.messages.map(msg => ({
      timestamp: msg.timestamp.toISOString(),
      sender: msg.sender,
      text: msg.text,
      isMedia: msg.isMedia
    }))
  };
  
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `whatsapp_chat_${activeChat.name}.json`;
  a.click();
  URL.revokeObjectURL(url);
  exportOptions.style.display = 'none';
});

// إضافة محادثة جديدة عند النقر على زر الإضافة
addChatBtn.addEventListener('click', () => {
  fileInput.click();
});

// ===== Theme Toggle =====
const root = document.documentElement;
const toggleBtn = document.getElementById('toggleTheme');

// Check for saved theme preference or respect OS preference
if (localStorage.getItem('theme') === 'dark' || 
    (window.matchMedia('(prefers-color-scheme: dark)').matches && !localStorage.getItem('theme'))) {
  root.classList.add('dark');
  toggleBtn.textContent = '☀️';
} else {
  toggleBtn.textContent = '🌙';
}

toggleBtn.addEventListener('click', () => {
  root.classList.toggle('dark');
  const isDark = root.classList.contains('dark');
  toggleBtn.textContent = isDark ? '☀️' : '🌙';
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
});

// تحميل المحادثات المحفوظة من localStorage إذا وجدت
function loadSavedChats() {
  const savedChats = localStorage.getItem('whatsappChats');
  if (savedChats) {
    try {
      state.chats = JSON.parse(savedChats);
      if (state.chats.length > 0) {
        state.activeChatId = state.chats[0极地].id;
        switchChat(state.activeChatId);
      }
    } catch (e) {
      console.error('Error loading saved chats:', e);
    }
  }
}

// حفظ المحادثات في localStorage
function saveChats() {
  localStorage.setItem('whatsappChats', JSON.stringify(state.chats));
}

// حفظ المحادثات عند مغادرة الصفحة
window.addEventListener('beforeunload', ()极地 => {
  saveChats();
});

// تحميل المحادثات المحفوظة عند بدء التحميل
window.addEventListener('load', () => {
  loadSavedChats();
});
