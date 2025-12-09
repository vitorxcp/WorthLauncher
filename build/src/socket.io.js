/* Otimização CSS Injetada via JS */
const styleParams = document.createElement('style');
styleParams.innerHTML = `
    #chat-messages {
        contain: strict;
        content-visibility: auto; 
        contain-intrinsic-size: 0 500px;
        will-change: scroll-position;
        overflow-anchor: auto; /* IMPORTANTE: Ajuda o navegador a fixar o scroll */
    }
    .msg-item {
        contain: content;
    }
    .show {
        opacity: 1 !important;
        transform: translateY(0) !important;
    }
`;
document.head.appendChild(styleParams);

const els = {
    friendList: document.getElementById("friends-list"),
    chatMsgs: document.getElementById("chat-messages"),
    chatInput: document.getElementById("chat-input"),
    chatForm: document.getElementById("chat-form"),
    friendInput: document.getElementById("input-add-friend"),
    btnAddFriend: document.getElementById("btn-add-friend"),
    headerNick: document.getElementById("chat-header-nick"),
    headerStatus: document.getElementById("chat-header-status"),
    headerAvatar: document.getElementById("chat-header-avatar"),
    placeholder: document.getElementById("chat-placeholder"),
    myStatusDot: document.getElementById("my-status-dot"),
    myStatusText: document.getElementById("my-status-text")
};

let currentChatFriend = null;
let fullChatHistory = []; 
let isInternalScroll = false;

const ICONS = {
    check: `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="opacity-50"><polyline points="20 6 9 17 4 12"/></svg>`,
    checkRead: `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-green-400 drop-shadow-[0_0_3px_rgba(74,222,128,0.5)]"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg>`
};

const topSentinel = document.createElement("div");
topSentinel.style.height = "20px";
topSentinel.style.width = "100%";
topSentinel.style.opacity = "0";

const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && currentChatFriend && !isInternalScroll) {
        loadOlderMessages();
    }
}, { root: els.chatMsgs, rootMargin: "200px 0px 0px 0px" });

const socket = io("http://elgae-sp1-b001.elgaehost.com.br:9099", {
    auth: { nick: currentUser.user, uuid: currentUser.uuid, status: localStorage.getItem('status-account') || "online" },
    transports: ["websocket"],
    reconnection: true,
    autoConnect: true
});

window.closeConnectionSocket = function() {
    if (socket.connected) {
        socket.disconnect();
        updateMyStatusUI("offline");
    }
};

window.openConnectionSocket = function() {
    const newIdentity = { nick: currentUser.user, uuid: currentUser.uuid };
    
    localStorage.setItem("chat_identity", JSON.stringify(newIdentity));
    socket.auth = newIdentity;
    
    if (socket.connected) socket.disconnect();
    socket.connect();
};

socket.on("connect", () => {
    updateMyStatusUI(localStorage.getItem('status-account') || "online")
});
socket.on("disconnect", () => updateMyStatusUI("offline"));

socket.on("init:data", (data) => {  
    requestAnimationFrame(() => {
        renderFriendsList(data.friends || []);
        if (data.requests) checkPendingRequests(data.requests);
        setTimeout(checkGlobalNotification, 300);
    });
});

socket.on("friend:request_received", (req) => showInviteToast(req.from));
socket.on("friend:new", (friend) => addFriendToUI(friend));
socket.on("friend:status_update", ({ nick, status }) => updateFriendStatusUI(nick, status));

socket.on("chat:history", ({ friend, messages }) => {
    if (currentChatFriend !== friend) return;
    fullChatHistory = messages || [];
    renderInitialHistory();
});

socket.on("chat:receive", (msg) => {
    const isChatOpen = currentChatFriend === msg.sender || msg.sender === socket.auth.nick;
    if (isChatOpen) {
        fullChatHistory.push(msg);
        appendSingleMessage(msg, true); 
    } else {
        showNotificationBadge(msg.sender);
        document.getElementById("social-ping")?.classList.remove("hidden-force");
    }
});

socket.on("notification:msg", (data) => {
    if (currentChatFriend !== data.from) {
        showNotificationBadge(data.from);
        document.getElementById("social-ping")?.classList.remove("hidden-force");
    } else {
        socket.emit("chat:mark_read", data.from);
    }
});

socket.on("server:online_count", (count) => {
    const el = document.getElementById("count-total-online");
    if(el) el.innerHTML = `
    <span class="relative flex h-2.5 w-2.5">
                <span
                  class="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-500"></span>
              </span>${count}</span></span>
    `;
});

socket.on("error", (msg) => showToast(msg, "error"));
socket.on("success", (msg) => showToast(msg, "success"));

function renderInitialHistory() {
    observer.unobserve(topSentinel);
    els.chatMsgs.innerHTML = "";
    els.chatMsgs.appendChild(topSentinel);

    const initialBatch = fullChatHistory.slice(-30);
    const fragment = document.createDocumentFragment();
    
    initialBatch.forEach(msg => {
        fragment.appendChild(createMessageElement(msg, false));
    });

    els.chatMsgs.appendChild(fragment);
    
    scrollToBottom(true);
    
    setTimeout(() => observer.observe(topSentinel), 500);
}

function loadOlderMessages() {
    const currentRenderedCount = els.chatMsgs.children.length - 1; 
    
    if (currentRenderedCount >= fullChatHistory.length) return;

    isInternalScroll = true;

    const nextIndex = fullChatHistory.length - currentRenderedCount;
    const startIndex = Math.max(0, nextIndex - 30);
    const olderBatch = fullChatHistory.slice(startIndex, nextIndex);
    
    if (olderBatch.length === 0) {
        isInternalScroll = false;
        return;
    }

    const prevHeight = els.chatMsgs.scrollHeight;
    const fragment = document.createDocumentFragment();

    olderBatch.forEach(msg => {
        fragment.appendChild(createMessageElement(msg, false));
    });

    topSentinel.after(fragment);

    requestAnimationFrame(() => {
        const newHeight = els.chatMsgs.scrollHeight;
        els.chatMsgs.scrollTop = newHeight - prevHeight;
        isInternalScroll = false;
    });
}

function appendSingleMessage(msg, animate = true) {
    const isMe = msg.sender === socket.auth.nick;
    
    const wasAtBottom = isUserAtBottom();

    const el = createMessageElement(msg, animate);
    els.chatMsgs.appendChild(el);

    if (isMe) {
        scrollToBottom(true);
    } else if (wasAtBottom) {
        scrollToBottom(false);
    }

    trimExcessMessages();
}

function trimExcessMessages() {
    const MAX_DOM_NODES = 150;
    
    if (els.chatMsgs.children.length > MAX_DOM_NODES) {
        for (let i = 0; i < 5; i++) {
            const node = topSentinel.nextElementSibling;
            if (node) node.remove();
        }
    }
}

function isUserAtBottom() {
    const threshold = 150;
    return (els.chatMsgs.scrollTop + els.chatMsgs.clientHeight) >= (els.chatMsgs.scrollHeight - threshold);
}

function scrollToBottom(force = false) {
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            if (force) {
                els.chatMsgs.scrollTop = els.chatMsgs.scrollHeight;
            } else {
                els.chatMsgs.scrollTo({ 
                    top: els.chatMsgs.scrollHeight, 
                    behavior: 'smooth' 
                });
            }
        });
    });
}

function createMessageElement(msg, animate = true) {
    const myNick = socket.auth.nick || JSON.parse(localStorage.getItem("chat_identity") || "{}").nick;
    const isMe = msg.sender === myNick;
    
    const time = new Date(msg.timestamp || Date.now())
        .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const fullDate = new Date(msg.timestamp || Date.now())
    .toLocaleString('pt-BR', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
    });

    const div = document.createElement("div");
    div.className = `flex ${isMe ? "justify-end" : "justify-start"} mb-1 msg-item`;
    
    if (!animate) {
        div.classList.add("show"); 
    } else {
        div.classList.add("msg-anim");
        requestAnimationFrame(() => div.classList.add("show"));
    }

    const statusIcon = msg.read ? ICONS.checkRead : ICONS.check;

    div.innerHTML = `
        <div class="max-w-[85%] min-w-[60px]
            ${isMe
            ? "bg-yellow-500/10 border border-yellow-500/20 text-yellow-50"
            : "bg-white/5 border border-white/10 text-gray-200"}
            rounded-2xl px-3 py-2 text-sm shadow-sm backdrop-blur-md">
            ${!isMe ? `<span class="text-[10px] text-yellow-500/90 block mb-0.5 font-bold tracking-wide">${msg.sender}</span>` : ""}
            <span class="break-words leading-snug block">${msg.text}</span>
            <div class="text-[9px] mt-1 text-right font-mono flex items-center justify-end gap-1 select-none text-gray-400">
                <span title-app="${fullDate}">${time}</span> <span title-app="${msg.read ? "Visualizada": "Não Visualizada"}">${isMe ? statusIcon : ""}</span>
            </div>
        </div>
    `;
    return div;
}

function selectFriend(nick, status) {
    if (currentChatFriend === nick) return;

    fullChatHistory = [];
    isInternalScroll = false;
    
    if (currentChatFriend) {
        document.getElementById(`friend-item-${currentChatFriend}`)?.classList.remove("bg-white/10", "border-yellow-500/50");
    }

    currentChatFriend = nick;
    document.getElementById(`friend-item-${nick}`)?.classList.add("bg-white/10", "border-yellow-500/50");

    els.placeholder?.classList.add("hidden-force");
    els.headerNick.innerText = nick;
    els.headerStatus.innerText = status ?? "OFFLINE";
    if (els.headerAvatar) els.headerAvatar.src = `https://mc-heads.net/avatar/${nick}`;
    document.getElementById(`badge-${nick}`)?.classList.add("hidden-force");

    checkGlobalNotification();

    els.chatMsgs.innerHTML = `<div class="h-full flex items-center justify-center"><span class="animate-spin h-5 w-5 border-2 border-yellow-500 rounded-full border-t-transparent"></span></div>`;

    socket.emit("chat:mark_read", nick);
    socket.emit("chat:select", nick);
}

function createFriendElement(friend) {
    const div = document.createElement("div");
    div.id = `friend-item-${friend.nick}`;
    div.className = "p-2 rounded-xl cursor-pointer transition flex items-center gap-3 group relative mb-1 border border-transparent hover:bg-white/5";
    div.onclick = () => selectFriend(friend.nick, friend.status);

    const statusColor = getStatusColor(friend.status);
    
    div.innerHTML = `
        <div class="relative shrink-0">
            <img src="https://mc-heads.net/avatar/${friend.nick}" title-app="${friend.nick}" class="w-9 h-9 rounded-lg bg-black/30 shadow-sm" loading="lazy">
            <div id="status-dot-${friend.nick}" class="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#121212] ${statusColor}" title-app="${friend.status || "offline"}"></div>
        </div>
        <div class="flex-1 min-w-0">
            <h4 class="text-sm font-bold text-gray-200 truncate leading-tight">${friend.nick}</h4>
            <p id="status-text-${friend.nick}" class="text-[10px] text-gray-500 uppercase truncate font-semibold tracking-wide">${friend.status || "OFFLINE"}</p>
        </div>
        <div id="badge-${friend.nick}" class="${friend.hasUnread ? "" : "hidden-force"} w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#121212] animate-pulse mr-1"></div>
    `;
    return div;
}

function renderFriendsList(friends) {
    els.friendList.innerHTML = "";
    if (!friends || friends.length === 0) {
        els.friendList.innerHTML = `<div class="text-center mt-10 text-gray-600 text-xs">Nenhum amigo.</div>`;
        return;
    }
    const fragment = document.createDocumentFragment();
    friends.forEach(f => fragment.appendChild(createFriendElement(f)));
    els.friendList.appendChild(fragment);
}

function addFriendToUI(friend) {
    if (els.friendList.innerText.includes("Nenhum amigo")) els.friendList.innerHTML = "";
    if (document.getElementById(`friend-item-${friend.nick}`)) return;
    const el = createFriendElement(friend);
    el.classList.add("animate-in", "fade-in");
    els.friendList.appendChild(el);
}

els.chatForm.onsubmit = (e) => {
    e.preventDefault();
    const text = els.chatInput.value.trim();
    if (!text || !currentChatFriend) return;

    scrollToBottom(true);
    socket.emit("chat:send", { targetNick: currentChatFriend, text });
    els.chatInput.value = "";
    els.chatInput.focus();
};

els.btnAddFriend.onclick = () => {
    const nick = els.friendInput.value.trim();
    if (!nick || nick === socket.auth.nick) return;
    const old = els.btnAddFriend.innerHTML;
    els.btnAddFriend.innerHTML = `<span class="animate-spin h-3 w-3 border-2 border-black border-t-transparent rounded-full"></span>`;
    socket.emit("friend:add", nick);
    setTimeout(() => { els.btnAddFriend.innerHTML = old; els.friendInput.value = ""; }, 500);
};

function updateFriendStatusUI(nick, status) {
    const dot = document.getElementById(`status-dot-${nick}`);
    const text = document.getElementById(`status-text-${nick}`);
    if (dot) dot.className = `absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#121212] ${getStatusColor(status)}`;
    if (dot) dot.setAttribute("title-app", status);
    if (text) text.innerText = status;
    if (currentChatFriend === nick) els.headerStatus.innerText = status;
}

function showNotificationBadge(nick) {
    document.getElementById(`badge-${nick}`)?.classList.remove("hidden-force");
    const item = document.getElementById(`friend-item-${nick}`);
    if (item && item.parentNode) item.parentNode.prepend(item);
}

function checkGlobalNotification() {
    const hasUnread = document.querySelector('[id^="badge-"]:not(.hidden-force)');
    const ping = document.getElementById("social-ping");
    if(ping) hasUnread ? ping.classList.remove("hidden-force") : ping.classList.add("hidden-force");
}

function getStatusColor(status) {
    return { online: "bg-green-500", ocupado: "bg-red-500", ausente: "bg-yellow-500" }[status] || "bg-gray-500";
}

function updateMyStatusUI(status) {
    localStorage.setItem('status-account', status);
    const map = { online: ["bg-green-500", "Online"], ocupado: ["bg-red-500", "Ocupado"], ausente: ["bg-yellow-500", "Ausente"], offline: ["bg-gray-500", "Offline"] };
    const data = map[status] || map["offline"];
    els.myStatusDot.className = `w-2.5 h-2.5 rounded-full ${data[0]}`;
    els.myStatusText.innerText = data[1];
}

window.changeMyStatus = (s) => {
    updateMyStatusUI(s);
    if(socket.connected) socket.emit("status:change", s);
};

function showToast(msg, type = "info") {
    const color = type === "error" ? "text-red-400 bg-red-500/10 border-red-500/20" : "text-green-400 bg-green-500/10 border-green-500/20";
    const toast = document.createElement("div");
    toast.className = `fixed top-10 right-10 px-4 py-2 rounded-lg border text-xs font-bold shadow-xl z-[100] animate-in slide-in-from-right fade-in duration-300 ${color}`;
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => { toast.classList.add("opacity-0"); setTimeout(() => toast.remove(), 300); }, 3000);
}

function showInviteToast(from) {
    const toast = document.createElement("div");
    toast.className = "fixed bottom-5 right-5 bg-[#121212] border border-white/10 p-4 rounded-xl shadow-2xl z-50 flex flex-col gap-2 w-64 animate-in slide-in-from-bottom fade-in duration-300";
    toast.innerHTML = `
        <div class="flex items-center gap-2"><img src="https://mc-heads.net/avatar/${from}" class="w-6 h-6 rounded bg-black/50"><div><div class="text-sm text-white font-bold">Solicitação</div><div class="text-xs text-gray-400">de <span class="text-yellow-500">${from}</span></div></div></div>
        <div class="flex gap-2 mt-1"><button onclick="respondInvite('${from}', true, this)" class="flex-1 bg-green-600 hover:bg-green-500 text-white py-1.5 rounded-lg text-xs font-bold transition">Aceitar</button><button onclick="respondInvite('${from}', false, this)" class="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white py-1.5 rounded-lg text-xs font-bold transition">Recusar</button></div>`;
    document.body.appendChild(toast);
}

window.respondInvite = (requesterNick, accept, btn) => {
    socket.emit("friend:respond", { requesterNick, accept });
    const box = btn.closest("div.fixed");
    if (box) { box.style.opacity = "0"; setTimeout(() => box.remove(), 300); }
};

function checkPendingRequests(requests) {
    if (Array.isArray(requests)) requests.forEach(r => showInviteToast(r.from));
}