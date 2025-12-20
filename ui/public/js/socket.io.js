let currentSocialTab = 'friends';
let currentTicketId = null;

const PERF_CONFIG = {
    MAX_DOM_NODES: 100,
    MAX_HISTORY_MEMORY: 500,
    INITIAL_BATCH_SIZE: 15,
    SCROLL_THROTTLE: 100
};

let socket = null;
let socketinf = false;

const btnOptions = document.getElementById("btn-chat-options");
const menuDropdown = document.getElementById("menu-chat-dropdown");

if (btnOptions && menuDropdown) {
    const newBtn = btnOptions.cloneNode(true);
    btnOptions.parentNode.replaceChild(newBtn, btnOptions);

    newBtn.onclick = (e) => {
        e.stopPropagation();
        if (menuDropdown.classList.contains("hidden")) {
            updateChatOptionsContent();
            menuDropdown.classList.remove("hidden");
        } else {
            menuDropdown.classList.add("hidden");
        }
    };

    document.addEventListener("click", (e) => {
        if (!menuDropdown.classList.contains("hidden")) {
            if (!menuDropdown.contains(e.target) && e.target !== newBtn) {
                menuDropdown.classList.add("hidden");
            }
        }
        const emojiPicker = document.getElementById("emoji-picker");
        const btnEmoji = document.getElementById("btn-emoji-toggle");
        if (emojiPicker && !emojiPicker.classList.contains("hidden")) {
            if (!emojiPicker.contains(e.target) && e.target !== btnEmoji) {
                emojiPicker.classList.add("hidden");
            }
        }
    });
}

let isChatMenuInitialized = false;

function initChatMenu() {
    const btnOptions = document.getElementById("btn-chat-options");
    const menuDropdown = document.getElementById("menu-chat-dropdown");

    if (btnOptions && menuDropdown) {
        const newBtn = btnOptions.cloneNode(true);
        btnOptions.parentNode.replaceChild(newBtn, btnOptions);

        newBtn.onclick = (e) => {
            e.stopPropagation();

            if (menuDropdown.classList.contains("hidden")) {
                updateChatOptionsContent();
                menuDropdown.classList.remove("hidden");
            } else {
                menuDropdown.classList.add("hidden");
            }
        };

        if (!isChatMenuInitialized) {
            document.addEventListener("click", (e) => {
                const menu = document.getElementById("menu-chat-dropdown");
                const btn = document.getElementById("btn-chat-options");

                if (menu && !menu.classList.contains("hidden")) {
                    if (!menu.contains(e.target) && e.target !== btn) {
                        menu.classList.add("hidden");
                    }
                }
            });
            isChatMenuInitialized = true;
        }
    }
}

window.actionClearChat = () => {
    if (!currentChatFriend) return;

    if (!confirm("Tem certeza que deseja limpar o histórico desta conversa?\n⚠️ AVISO: Fazer isso irá apagar o historico para a outra pessoa!")) return;

    fullChatHistory = [];
    els.chatMsgs.innerHTML = "";

    document.getElementById("menu-chat-dropdown")?.classList.add("hidden");

    socket.emit("chat:clear_history", currentChatFriend);
    showToast("Histórico limpo.", "success");
};

window.actionRemoveFriend = () => {
    if (!currentChatFriend) return;

    if (!confirm(`Tem certeza que deseja remover ${currentChatFriend} da sua lista de amigos?`)) return;

    socket.emit("friend:remove", currentChatFriend);

    const friendItem = document.getElementById(`friend-item-${currentChatFriend}`);
    if (friendItem) friendItem.remove();

    currentChatFriend = null;
    els.placeholder?.classList.remove("hidden-force");

    document.getElementById("menu-chat-dropdown")?.classList.add("hidden");

    showToast("Amigo removido.", "success");
};

const RECENT_STORAGE_KEY = "worth_launcher_recent_emojis";
const MAX_RECENTS = 28;

const KEYWORD_DB = {
    "feliz sorriso alegria rir engraçado": ["😀", "😁", "😂", "🤣", "😃", "😄", "😅", "😆", "😉", "😊"],
    "amor coração love apaixonado beijo": ["😍", "🥰", "😘", "😗", "😙", "😚", "❤", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣", "💕", "💞", "💓", "💗", "💖", "💘", "💝"],
    "triste choro chorar depressivo": ["😥", "😮", "😪", "😫", "😓", "😔", "😕", "☹️", "🙁", "😖", "😞", "😟", "😤", "😢", "😭", "😦", "😧", "😨", "😩"],
    "raiva bravo ódio puto": ["😤", "😡", "😠", "🤬", "😈", "👿", "💀"],
    "dinheiro rico pagando": ["🤑", "💸", "💵", "💴", "💶", "💷", "💰", "💳", "💎"],
    "fogo quente fire": ["🔥", "✨", "🌟", "💫", "💥", "💢"],
    "ok positivo joinha sim": ["👍", "👌", "✅", "✔", "☑️"],
    "nao negativo ruim": ["👎", "❌", "🚫", "🛑"],
    "cachorro dog animal pet": ["🐶", "🐕", "🦮", "🐩", "🐾"],
    "gato cat gatinho": ["😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾", "🐱", "🐈"],
    "jogo game play": ["🎮", "🕹", "🎲", "🎯", "👾"],
    "comida fome food": ["🍏", "🍎", "🍔", "🍟", "🍕", "🌭", "🥪", "🌮", "🍖", "🍗", "🍩", "🍪", "🎂", "🍿"],
    "bebida drink": ["☕", "🍵", "🍺", "🍻", "🥂", "🍷", "🥃", "🍸", "🍹", "🥤", "🧃", "🥛"],
    "tecnologia pc computador": ["💻", "🖥️", "🖨️", "🖱️", "⌨️", "📱", "📲"],
    "tempo relogio hora": ["⌚", "⏰", "⏱️", "⏲️", "🕰️", "⌛", "⏳"],
    "musica som": ["🎵", "🎶", "🎼", "🎧", "🎤", "🎹", "🥁", "🎸", "🎺", "🎷", "🎻"],
    "susto medo": ["😱", "😨", "😰", "🥶", "😳"],
    "pensando duvida": ["🤔", "🤨", "🧐", "🙄"],
    "saudacao oi tchau mao": ["👋", "🤚", "🖐", "✋", "🖖", "🤝"],
    "forca forte academia": ["💪", "🏋️", "🤸"],
    "festa comemorar": ["🥳", "🎉", "🎊", "🎈", "🎁"]
};

const EMOJI_DATA = {
    recents: {
        icon: "clock",
        label: "Recentes",
        isDynamic: true,
        emojis: []
    },
    smileys: {
        icon: "smile",
        label: "Carinhas",
        emojis: [
            "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊", "😇",
            "🥰", "😍", "🤩", "😘", "😗", "☺", "😙", "😚", "😋", "😛", "😜", "🤪", "😝",
            "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄",
            "😬", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🤧",
            "🥵", "🥶", "🥴", "😵", "🤯", "🤠", "🥳", "😎", "🤓", "🧐", "😕", "😟", "🙁",
            "☹", "😮", "😯", "😲", "😳", "🥺", "😦", "😧", "😨", "😰", "😥", "😢", "😭",
            "😱", "😖", "😣", "😞", "😓", "😩", "😫", "🥱", "😤", "😡", "😠", "🤬", "😈",
            "👿", "💀", "☠", "💩", "🤡", "👹", "👺", "👻", "👽", "👾", "🤖"
        ]
    },
    gestures: {
        icon: "hand",
        label: "Gestos e Pessoas",
        emojis: [
            "👋", "🤚", "🖐", "✋", "🖖", "👌", "🤏", "✌", "🤞", "🤟", "🤘", "🤙", "👈",
            "👉", "👆", "🖕", "👇", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐",
            "🤲", "🤝", "🙏", "✍", "💅", "🤳", "💪", "🧠", "🦴", "👀", "👁", "👅", "👄",
            "💋", "💘", "💝", "💖", "💗", "💓", "💞", "💕", "💟", "❣", "💔", "❤", "🧡",
            "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "👶", "🧒", "👦", "👧", "🧑", "👱",
            "👨", "🧔", "👩", "🧓", "👴", "👵", "👮", "🕵", "💂", "👷", "🤴", "👸", "👳",
            "👲", "🧕", "🤵", "👰", "🤰", "🤱", "👼", "🎅", "🤶", "🦸", "🦹", "🧙", "🧚",
            "🧛", "🧜", "🧝", "🧞", "🧟", "🚶", "🏃", "💃", "🕺", "👯", "🧖", "🧗", "🧘"
        ]
    },
    animals: {
        icon: "cat",
        label: "Natureza",
        emojis: [
            "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷",
            "🐽", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒", "🐔", "🐧", "🐦", "🐤", "🐣", "🐥",
            "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🐛", "🦋", "🐌", "🐞",
            "🐜", "🦟", "🦗", "🕷", "🕸", "🦂", "🐢", "🐍", "🦎", "🦖", "🦕", "🐙", "🦑",
            "🦐", "🦞", "🦀", "🐡", "🐠", "🐟", "🐬", "🐳", "🐋", "🦈", "🐊", "🐅", "🐆",
            "🦓", "🦍", "🦧", "🐘", "🦛", "🦏", "🐪", "🐫", "🦒", "🦘", "🐃", "🐂", "🐄",
            "🐎", "🐖", "🐏", "🐑", "🦙", "🐐", "🦌", "🐕", "🐩", "🦮", "🐕‍🦺", "🐈", "🐓",
            "🦃", "🦚", "🦜", "🦢", "🦩", "🕊", "🐇", "🦝", "🦨", "🦡", "🦦", "🦥", "🐁",
            "🐀", "🐿", "🦔", "🐾", "🐉", "🐲", "🌵", "🎄", "🌲", "🌳", "🌴", "🌱", "🌿",
            "☘", "🍀", "🎍", "🎋", "🍃", "🍂", "🍁", "🍄", "🐚", "🌾", "💐", "🌷", "🌹",
            "🥀", "🌺", "🌸", "🌼", "🌻", "🌞", "🌝", "🌛", "🌜", "🌚", "🌕", "🌖", "🌗",
            "🌘", "🌑", "🌒", "🌓", "🌔", "🌙", "🌎", "🌍", "🌏", "🪐", "💫", "⭐", "🌟",
            "✨", "⚡", "☄", "💥", "🔥", "🌪", "🌈", "☀", "🌤", "⛅", "🌥", "☁", "🌦",
            "🌧", "⛈", "🌩", "🌨", "❄", "☃", "⛄", "🌬", "💨", "💧", "💦", "☔", "☂",
            "🌊", "🌫"
        ]
    },
    objects: {
        icon: "gamepad-2",
        label: "Objetos",
        emojis: [
            "🎮", "🕹", "🎲", "🎯", "👾", "🎳", "🎧", "🎤", "🎬", "🎨", "🎰", "🚗", "🚕",
            "🚙", "🚌", "🏎", "🚓", "🚑", "🚒", "🚐", "🚚", "🚛", "🚜", "🏍", "🛵", "🚲",
            "🛴", "🚀", "🛸", "🚁", "🛶", "⛵", "🚤", "🚢", "🛳", "⚓", "⛽", "🚧", "🚦",
            "🚥", "🚏", "🗺", "🗿", "🗽", "🗼", "🏰", "🏯", "🏟", "🎡", "🎢", "🎠", "⛲",
            "⛱", "🏖", "🏝", "🏜", "🌋", "⛰", "🏔", "🗻", "🏕", "⛺", "🏠", "🏡", "🏘",
            "🏚", "🏗", "🏭", "🏢", "🏬", "🏣", "🏤", "🏥", "🏦", "🏨", "🏪", "🏫", "🏩",
            "💒", "🏛", "⛪", "🕌", "🕍", "🕋", "⛩", "⌚", "📱", "📲", "💻", "⌨", "🖥",
            "🖨", "🖱", "🖲", "🕹", "🗜", "💽", "💾", "💿", "📀", "📼", "📷", "📸", "📹",
            "🎥", "📽", "🎞", "📞", "☎", "📟", "📠", "📺", "📻", "🎙", "🎚", "🎛", "🧭",
            "⏱", "⏲", "⏰", "🕰", "⌛", "⏳", "📡", "🔋", "🔌", "💡", "🔦", "🕯", "🪔",
            "🧯", "🛢", "💸", "💵", "💴", "💶", "💷", "💰", "💳", "💎", "⚖", "🧰", "🔧",
            "🔨", "⚒", "🛠", "⛏", "🔩", "⚙", "🧱", "⛓", "🧲", "🔫", "💣", "🧨", "🪓",
            "🔪", "🗡", "⚔", "🛡", "🚬", "⚰", "⚱", "🏺", "🔮", "📿", "🧿", "💈", "⚗",
            "🔭", "🔬", "🕳", "🩹", "🩺", "💊", "💉", "🩸", "🧬", "🦠", "🧼", "🧽", "🧹",
            "🧺", "🧻", "🚽", "🚰", "🚿", "🛁", "🛀", "🛁", "🛎", "🔑", "🗝", "🚪", "🪑",
            "🛋", "🛏", "🛌", "🧸", "🖼", "🛍", "🛒", "🎁", "🎈", "🎏", "🎀", "🎊", "🎉",
            "🎎", "🏮", "🎐", "🧧", "✉", "📩", "📨", "📧", "💌", "📥", "📤", "📦", "🏷",
            "📪", "📫", "📬", "📭", "📮", "📯", "📜", "📃", "📄", "📑", "🧾", "📊", "📈",
            "📉", "🗒", "🗓", "📆", "📅", "🗑", "📇", "🗃", "🗳", "🗄", "📋", "📁", "📂",
            "🗂", "🗞", "📰", "📓", "📔", "📒", "📕", "📗", "📘", "📙", "📚", "📖", "🔖",
            "🧷", "🔗", "📎", "🖇", "📐", "📏", "🧮", "📌", "📍", "✂", "🖊", "🖋", "✒",
            "🖌", "🖍", "📝", "✏", "🔍", "🔎", "🔏", "🔐", "🔒", "🔓"
        ]
    }
};

const emojiPicker = document.getElementById("emoji-picker");
const btnEmojiToggle = document.getElementById("btn-emoji-toggle");

let emojiHeaderTabs, emojiSearchInput, emojiScrollArea;

function initEmojiSystem() {
    if (!emojiPicker) return;

    loadRecents();

    emojiPicker.innerHTML = `
        <div class="h-10 border-b border-white/10 flex items-center px-1 bg-[#202020] shrink-0" id="emoji-header-tabs"></div>
        <div class="p-2 shrink-0 bg-[#202020]">
            <div class="relative group">
                <i data-lucide="search" class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 group-focus-within:text-yellow-500 transition"></i>
                <input type="text" id="emoji-search-input" placeholder="Pesquisar..." 
                    class="w-full bg-black/40 border border-white/5 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:border-yellow-500/50 outline-none transition-all">
                <button id="btn-clear-search" class="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white hidden">
                    <i data-lucide="x" class="w-3 h-3"></i>
                </button>
            </div>
        </div>
        <div id="emoji-scroll-area" class="flex-1 overflow-y-auto custom-scrollbar p-2 scroll-smooth"></div>
    `;

    emojiHeaderTabs = document.getElementById("emoji-header-tabs");
    emojiSearchInput = document.getElementById("emoji-search-input");
    emojiScrollArea = document.getElementById("emoji-scroll-area");
    const btnClearSearch = document.getElementById("btn-clear-search");

    renderEmojiTabs();
    renderEmojiContent();

    emojiSearchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        if (term.length > 0) {
            btnClearSearch.classList.remove("hidden");
            renderSearchResults(term);
        } else {
            btnClearSearch.classList.add("hidden");
            renderEmojiContent();
        }
    });

    btnClearSearch.onclick = () => {
        emojiSearchInput.value = "";
        btnClearSearch.classList.add("hidden");
        renderEmojiContent();
        emojiSearchInput.focus();
    };

    if (window.lucide) window.lucide.createIcons();
}

function renderEmojiTabs() {
    emojiHeaderTabs.innerHTML = "";
    Object.keys(EMOJI_DATA).forEach((key, index) => {
        const category = EMOJI_DATA[key];
        const btn = document.createElement("button");
        btn.className = `w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-all relative group ${index === 0 ? 'text-yellow-500 bg-white/5' : ''}`;
        btn.title = category.label;
        btn.innerHTML = `<i data-lucide="${category.icon}" class="w-4 h-4"></i>`;

        if (index === 0) btn.innerHTML += `<div class="absolute bottom-0 left-1 right-1 h-0.5 bg-yellow-500 rounded-t-full active-indicator"></div>`;

        btn.onclick = () => {
            emojiSearchInput.value = "";
            document.getElementById("btn-clear-search")?.classList.add("hidden");
            renderEmojiContent();

            setTimeout(() => {
                const section = document.getElementById(`emoji-cat-${key}`);
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                updateActiveTab(btn);
            }, 50);
        };
        emojiHeaderTabs.appendChild(btn);
    });
}

function updateActiveTab(activeBtn) {
    Array.from(emojiHeaderTabs.children).forEach(btn => {
        btn.classList.remove('text-yellow-500', 'bg-white/5');
        const indicator = btn.querySelector('.active-indicator');
        if (indicator) indicator.remove();
    });
    activeBtn.classList.add('text-yellow-500', 'bg-white/5');
    activeBtn.innerHTML += `<div class="absolute bottom-0 left-1 right-1 h-0.5 bg-yellow-500 rounded-t-full active-indicator"></div>`;
    if (window.lucide) window.lucide.createIcons();
}

function renderEmojiContent() {
    emojiScrollArea.innerHTML = "";
    const fragment = document.createDocumentFragment();

    Object.keys(EMOJI_DATA).forEach(key => {
        const category = EMOJI_DATA[key];

        if (key === 'recents' && category.emojis.length === 0) return;

        const title = document.createElement("div");
        title.id = `emoji-cat-${key}`;
        title.className = "text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 mt-2 px-1 pt-1 sticky top-0 bg-[#202020]/95 z-10 flex justify-between items-center";
        title.innerText = category.label;

        if (key === 'recents') {
            const clearRecentsBtn = document.createElement("button");
            clearRecentsBtn.innerHTML = "Limpar";
            clearRecentsBtn.className = "text-[9px] bg-white/5 hover:bg-red-500/20 hover:text-red-400 px-1.5 py-0.5 rounded transition cursor-pointer";
            clearRecentsBtn.onclick = (e) => { e.preventDefault(); clearAllRecents(); };
            title.appendChild(clearRecentsBtn);
        }

        fragment.appendChild(title);

        const grid = document.createElement("div");
        grid.className = "grid grid-cols-7 gap-1 mb-4";

        category.emojis.forEach(emoji => {
            const btn = document.createElement("button");
            btn.innerText = emoji;
            btn.className = "text-xl w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition active:scale-90 cursor-pointer select-none";
            btn.onclick = (e) => {
                e.preventDefault();
                handleEmojiClick(emoji);
            };
            grid.appendChild(btn);
        });
        fragment.appendChild(grid);
    });
    emojiScrollArea.appendChild(fragment);
}

function renderSearchResults(term) {
    emojiScrollArea.innerHTML = "";

    let results = new Set();

    for (const [keywords, emojiList] of Object.entries(KEYWORD_DB)) {
        if (keywords.includes(term)) {
            emojiList.forEach(emoji => results.add(emoji));
        }
    }

    Object.values(EMOJI_DATA).forEach(cat => {
        if (cat.label.toLowerCase().includes(term)) {
            cat.emojis.forEach(e => results.add(e));
        }
    });

    const fragment = document.createDocumentFragment();

    const title = document.createElement("div");
    title.className = "text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 px-1";
    title.innerText = `Resultados para "${term}"`;
    fragment.appendChild(title);

    if (results.size === 0) {
        const noRes = document.createElement("div");
        noRes.className = "flex flex-col items-center justify-center mt-10 opacity-50";
        noRes.innerHTML = `
        <i data-lucide="search-x" class="w-8 h-8 mb-2 text-white/75"></i>
        <span class="text-xs text-white/75">Nada encontrado</span>
        `;
        fragment.appendChild(noRes);
    } else {
        const grid = document.createElement("div");
        grid.className = "grid grid-cols-7 gap-1 mb-4";

        results.forEach(emoji => {
            const btn = document.createElement("button");
            btn.innerText = emoji;
            btn.className = "text-xl w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition active:scale-90 cursor-pointer select-none";
            btn.onclick = (e) => {
                e.preventDefault();
                handleEmojiClick(emoji);
            };
            grid.appendChild(btn);
        });
        fragment.appendChild(grid);
    }

    emojiScrollArea.appendChild(fragment);
    if (window.lucide) window.lucide.createIcons();
}

function loadRecents() {
    try {
        const saved = localStorage.getItem(RECENT_STORAGE_KEY);
        if (saved) {
            EMOJI_DATA.recents.emojis = JSON.parse(saved);
        }
    } catch (e) {
        console.error("Erro ao carregar emojis recentes", e);
        EMOJI_DATA.recents.emojis = [];
    }
}

function addToRecents(emoji) {
    let current = EMOJI_DATA.recents.emojis.filter(e => e !== emoji);

    current.unshift(emoji);

    if (current.length > MAX_RECENTS) {
        current = current.slice(0, MAX_RECENTS);
    }

    EMOJI_DATA.recents.emojis = current;
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(current));
}

function clearAllRecents() {
    EMOJI_DATA.recents.emojis = [];
    localStorage.removeItem(RECENT_STORAGE_KEY);
    renderEmojiContent();
}

function handleEmojiClick(emoji) {
    insertEmoji(emoji);
    addToRecents(emoji);
}

function insertEmoji(emoji) {
    const input = document.getElementById("chat-input");
    if (!input) return;

    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = input.value;

    input.value = text.substring(0, start) + emoji + text.substring(end);
    input.focus();
    input.selectionStart = input.selectionEnd = start + emoji.length;
}

let isEmojiSystemInitialized = false;

function initEmojiToggle() {
    const btnToggle = document.getElementById("btn-emoji-toggle");
    const picker = document.getElementById("emoji-picker");

    if (btnToggle && picker) {
        btnToggle.onclick = (e) => {
            e.stopPropagation();
            const isHidden = picker.classList.contains("hidden");

            if (isHidden) {
                if (!isEmojiSystemInitialized) {
                    initEmojiSystem();
                    isEmojiSystemInitialized = true;
                }
                picker.classList.remove("hidden");
                const rect = btnToggle.getBoundingClientRect();
                picker.style.left = `${Math.max(10, rect.right - 320)}px`;
                picker.style.top = `${Math.max(10, rect.top - 384 - 12)}px`;
            } else {
                picker.classList.add("hidden");
            }
        };
    }
}

document.addEventListener("click", (e) => {
    if (emojiPicker && !emojiPicker.classList.contains("hidden")) {
        if (!emojiPicker.contains(e.target) && e.target !== btnEmojiToggle) {
            emojiPicker.classList.add("hidden");
        }
    }
});

window.addEventListener('resize', () => {
    if (!emojiPicker.classList.contains("hidden")) {
        emojiPicker.classList.add("hidden");
    }
});

if (!document.getElementById('chat-dynamic-styles')) {
    const styleParams = document.createElement('style');
    styleParams.id = 'chat-dynamic-styles';
    styleParams.innerHTML = `
#chat-messages {
    flex: 1 1 0% !important;
    min-height: 0 !important;
    max-height: 100% !important;
    overflow-y: auto !important; 
    overflow-x: hidden !important;
    display: flex !important;
    flex-direction: column !important;
    position: relative !important;
    overflow-anchor: auto !important;
}
    
    .msg-item {
        flex-shrink: 0 !important;
        position: relative;
        z-index: 1;
    }

    .show { opacity: 1 !important; transform: translateY(0) !important; }

    #btn-scroll-bottom {
        position: absolute; bottom: 80px; right: 20px; width: 40px; height: 40px;
        background: rgba(0, 0, 0, 0.8); border: 1px solid rgba(255, 255, 255, 0.1);
        color: #eab308; border-radius: 50%; display: flex; align-items: center;
        justify-content: center; cursor: pointer; opacity: 0;
        transform: translateY(10px) scale(0.9); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: none; z-index: 50; box-shadow: 0 4px 15px rgba(0,0,0,0.5);
    }
    #btn-scroll-bottom.visible { opacity: 1; transform: translateY(0) scale(1); pointer-events: all; }
    #btn-scroll-bottom:hover { background: #eab308; color: black; transform: scale(1.1); border-color: #eab308; }
    
    .unread-separator {
        display: flex; align-items: center; justify-content: center; margin: 24px 0;
        position: relative; width: 100%; animation: fadeIn 0.3s ease;
    }
    .unread-separator::before, .unread-separator::after {
        content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.5), transparent);
    }
    .unread-badge {
        background: rgba(239, 68, 68, 0.15); color: #f87171; font-size: 10px; font-weight: 800;
        padding: 4px 12px; border-radius: 99px; border: 1px solid rgba(239, 68, 68, 0.3);
        margin: 0 12px; text-transform: uppercase; letter-spacing: 0.1em;
        box-shadow: 0 0 10px rgba(239, 68, 68, 0.1);
    }
    @keyframes fadeOutSeparator { to { opacity: 0; height: 0; margin: 0; transform: scaleY(0); } }
    
    #btn-scroll-bottom.new-message-alert::after {
        content: ''; position: absolute; top: 0; right: 0; width: 10px; height: 10px;
        background: #ef4444; border-radius: 50%; border: 2px solid #000; animation: pulse 2s infinite;
    }

    #typing-indicator {
        position: absolute; bottom: 90px; left: 24px; font-size: 0.75rem; color: #d1d5db;
        font-weight: 600; display: flex; align-items: center; gap: 8px; opacity: 0;
        transform: translateY(10px); pointer-events: none; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 20; background: rgba(24, 24, 27, 0.9); padding: 6px 12px;
        border-radius: 99px; border: 1px solid rgba(255,255,255,0.08);
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    #typing-indicator.visible { opacity: 1; transform: translateY(0); }
    .typing-dots { display: flex; gap: 4px; }
    .typing-dot {
        width: 4px; height: 4px; background: #eab308; border-radius: 50%;
        animation: typingBounce 1.4s infinite ease-in-out both;
    }
    .typing-dot:nth-child(1) { animation-delay: -0.32s; }
    .typing-dot:nth-child(2) { animation-delay: -0.16s; }
    
    @keyframes typingBounce {
        0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
        40% { transform: scale(1.2); opacity: 1; }
    }
    @keyframes pulse { 0% { transform: scale(0.95); opacity: 1; } 50% { transform: scale(1.2); opacity: 0.8; } 100% { transform: scale(0.95); opacity: 1; } }

    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { bg: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #eab308; }

    @keyframes msgPop {
        0% { opacity: 0; transform: translateY(10px) scale(0.98); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    .msg-anim { animation: msgPop 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
    
    @keyframes skeleton-pulse {
        0% { opacity: 0.08; }
        50% { opacity: 0.18; }
        100% { opacity: 0.08; }
    }

    .chat-skeleton {
        display: flex; flex-direction: column; gap: 16px; padding: 24px;
        height: 100%; justify-content: flex-end; pointer-events: none;
    }

    .skeleton-msg {
        display: flex; flex-direction: column; gap: 8px; width: 100%;
        animation: skeleton-fade-in 0.3s ease;
    }

    .skeleton-msg.mine { align-items: flex-end; }
    .skeleton-msg.theirs { align-items: flex-start; }

    .skeleton-header {
        width: 80px; height: 12px; background: white; border-radius: 4px;
        margin-bottom: 4px; animation: skeleton-pulse 1.5s infinite ease-in-out;
    }

    .skeleton-bubble {
        height: 40px; border-radius: 18px; background: white;
        animation: skeleton-pulse 1.5s infinite ease-in-out;
    }

    .opacity-0-force { opacity: 0 !important; }
    .no-scroll { overflow: hidden !important; }
    `;
    document.head.appendChild(styleParams);
}

const els = {
    friendList: document.getElementById("friends-list"),
    chatMsgs: document.getElementById("chat-messages"),
    chatInput: document.getElementById("chat-input"),
    chatForm: document.getElementById("chat-form"),
    friendInput: document.getElementById("input-add-friend"),
    btnAddFriend: document.getElementById("btn-add-friend"),
    headerNick: document.getElementById("chat-header-nick"),
    headerStatus: document.getElementById("chat-header-status"),
    headerStatusDot: document.getElementById("chat-header-status-dot"),
    headerAvatar: document.getElementById("chat-header-avatar"),
    placeholder: document.getElementById("chat-placeholder"),
    myStatusDot: document.getElementById("my-status-dot"),
    myStatusText: document.getElementById("my-status-text"),
    myStatusDescription: document.getElementById("my-status-description"),
    chatContainer: document.getElementById("chat-messages").parentElement
};

const btnScrollBottom = document.createElement("div");
btnScrollBottom.id = "btn-scroll-bottom";
btnScrollBottom.setAttribute("title-app", "Ir para o fim");
btnScrollBottom.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`;
if (getComputedStyle(els.chatContainer).position === 'static') {
    els.chatContainer.style.position = 'relative';
}
els.chatContainer.appendChild(btnScrollBottom);

btnScrollBottom.onclick = () => {
    scrollToBottom(true);
};

const typingIndicator = document.createElement("div");
typingIndicator.id = "typing-indicator";
typingIndicator.innerHTML = `
    <div class="typing-dots">
        <div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>
    </div>
    <span id="typing-text">digitando...</span>
`;
els.chatContainer.appendChild(typingIndicator);

let typingTimeout = null;
let isTyping = false;

els.chatInput.addEventListener('input', () => {
    if (!socket) return;

    if (!currentChatFriend && !currentTicketId) return;

    if (!isTyping) {
        isTyping = true;
        if (currentSocialTab === 'tickets' && currentTicketId) {
            socket.emit('chat:typing', { target: `ticket_${currentTicketId}`, state: true, isTicket: true });
        } else if (currentChatFriend) {
            socket.emit('chat:typing', { target: currentChatFriend, state: true });
        }
    }

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        isTyping = false;
        if (currentSocialTab === 'tickets' && currentTicketId) {
            socket.emit('chat:typing', { target: `ticket_${currentTicketId}`, state: false, isTicket: true });
        } else if (currentChatFriend) {
            socket.emit('chat:typing', { target: currentChatFriend, state: false });
        }
    }, 2000);
});

els.chatMsgs.addEventListener('scroll', () => {
    if (isScrollThrottled) return;
    isScrollThrottled = true;
    requestAnimationFrame(() => {
        const distanceToBottom = els.chatMsgs.scrollHeight - els.chatMsgs.scrollTop - els.chatMsgs.clientHeight;
        if (distanceToBottom > 500) btnScrollBottom.classList.add('visible');
        else {
            btnScrollBottom.classList.remove('visible', 'new-message-alert');
        }
        if (!menuDropdown.classList.contains("hidden")) menuDropdown.classList.add("hidden");
        setTimeout(() => isScrollThrottled = false, PERF_CONFIG.SCROLL_THROTTLE);
    });
});

let currentChatFriend = null;
let fullChatHistory = [];
let isInternalScroll = false;
let isScrollThrottled = false;

const ICONS = {
    check: `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="opacity-50"><polyline points="20 6 9 17 4 12"/></svg>`,
    checkRead: `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-green-400 drop-shadow-[0_0_3px_rgba(74,222,128,0.5)]"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg>`
};

const topSentinel = document.createElement("div");
topSentinel.style.height = "10px";
topSentinel.style.width = "100%";

const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && currentChatFriend && !isInternalScroll) {
        if (!isInternalScroll) loadOlderMessages();
    }
}, { root: els.chatMsgs, rootMargin: "100px 0px 0px 0px" });

function getAuthIdentity() {
    if (currentUser.uuid === "offline-uuid") currentUser.uuid = "00000000-0000-0000-0000-000000000000";
    return {
        nick: currentUser.user,
        uuid: currentUser.uuid,
        status: localStorage.getItem('status-account') || "online"
    };
}

function initializeSocket() {
    if (socket && socket.connected) return socket;

    if (!socket) {
        socket = io("http://elgae-sp1-b001.elgaehost.com.br:9099", {
            auth: getAuthIdentity(),
            transports: ["websocket"],
            reconnection: true,
            autoConnect: true
        });
    } else {
        socket.connect();
    }

    setupSocketEvents();
    return socket;
}

function openConnectionSocket() {
    const newIdentity = getAuthIdentity();
    localStorage.setItem("chat_identity", JSON.stringify(newIdentity));

    if (!socket || !socketinf) {
        if (socket) {
            socket.auth = newIdentity;
            socket.connect();
        } else {
            initializeSocket();
        }
    } else {
        socket.auth = newIdentity;
    }
}

setInterval(() => {
    if (!socket.connected) {
        socketinf = null;
        openConnectionSocket();
    }
}, 10000)

function closeConnectionSocket() {
    if (!socketinf || !socket) return;
    if (socket.connected) {
        socket.disconnect();
        socket = null;
    }
}

function renderChatLoading() {
    observer.unobserve(topSentinel);

    els.chatMsgs.innerHTML = `
        <div class="chat-skeleton">
            <div class="skeleton-msg theirs">
                <div class="skeleton-header"></div>
                <div class="skeleton-bubble" style="width: 45%; height: 40px; border-radius: 4px 18px 18px 18px;"></div>
            </div>
            <div class="skeleton-msg mine">
                 <div class="skeleton-bubble" style="width: 30%; height: 40px; border-radius: 18px 4px 18px 18px;"></div>
            </div>
            <div class="skeleton-msg theirs">
                <div class="skeleton-header"></div>
                <div class="skeleton-bubble" style="width: 60%; height: 60px; border-radius: 4px 18px 18px 18px;"></div>
            </div>
            <div class="skeleton-msg mine">
                <div class="skeleton-bubble" style="width: 25%; height: 40px; border-radius: 18px 4px 18px 18px;"></div>
            </div>
            <div class="skeleton-msg theirs">
                <div class="skeleton-header"></div>
                <div class="skeleton-bubble" style="width: 40%; height: 40px; border-radius: 4px 18px 18px 18px;"></div>
            </div>
        </div>
    `;
}

function setupSocketEvents() {
    socket.removeAllListeners();

    socket.on("connect", () => {
        socketinf = true;
        updateMyStatusUI(localStorage.getItem('status-account') || "online")
        socket.emit('ticket:list');
    });
    socket.on("disconnect", () => { });

    socket.on("init:data", (data) => {
        requestAnimationFrame(() => {
            renderFriendsList(data.friends || []);
            if (data.requests) checkPendingRequests(data.requests);
            checkGlobalNotification();
        });
    });

    socket.on('ticket:list_update', (tickets) => {
        if (currentSocialTab === 'tickets') {
            renderTicketList(tickets);
        }
    });

    socket.on("friend:request_received", (req) => showInviteToast(req.from));
    socket.on("friend:new", (friend) => addFriendToUI(friend));
    socket.on("friend:status_update", ({ nick, status }) => updateFriendStatusUI(nick, status));

    socket.on("chat:history", ({ friend, messages }) => {
        let sortedMessages = messages || [];

        sortedMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        if (currentSocialTab === 'friends') {
            if (currentChatFriend === friend) {
                fullChatHistory = sortedMessages;
            }
        }
        else if (currentSocialTab === 'tickets') {
            if (currentTicketId) {
                fullChatHistory = sortedMessages;
            }
        }

        if (fullChatHistory.length > PERF_CONFIG.MAX_HISTORY_MEMORY) {
            fullChatHistory = fullChatHistory.slice(-PERF_CONFIG.MAX_HISTORY_MEMORY);
        }

        renderInitialHistory();
    });

    socket.on("chat:read_confirm", ({ by, ticketId }) => {
        if (currentSocialTab === 'friends' && currentChatFriend === by) {
            updateMessagesToRead();
        }
        if (ticketId && currentSocialTab === 'tickets' && currentTicketId === ticketId) {
            updateMessagesToRead();
        }
    });

    socket.on("chat:typing_update", ({ from, state, isTicket, ticketId }) => {
        let isTarget = false;

        if (isTicket) {
            isTarget = (currentSocialTab === 'tickets' && currentTicketId === ticketId);
        } else {
            isTarget = (currentSocialTab === 'friends' && currentChatFriend === from);
        }

        if (isTarget) {
            const textEl = document.getElementById("typing-text");
            if (state) {
                if (textEl) textEl.innerText = `${from} está digitando...`;
                typingIndicator.classList.add("visible");
                if (isUserAtBottom()) scrollToBottom();
            } else {
                typingIndicator.classList.remove("visible");
            }
        }
    });

    socket.on("friend:removed", (removedNick) => {
        const el = document.getElementById(`friend-item-${removedNick}`);
        if (el) el.remove();
        if (currentChatFriend === removedNick) {
            currentChatFriend = null;
            els.placeholder?.classList.remove("hidden-force");
            els.chatMsgs.innerHTML = "";
            fullChatHistory = [];
        }
    });

    socket.on("launcher:cosmetics:player", (data1, data2) => {
        if (Array.isArray(data2)) {
            data2.forEach(cosmetic => {
                if (cosmetic.name) reloadCosmetics(cosmetic.name);
            });
        }
        else if (data2 && data2.name) {
            reloadCosmetics(data2.name);
        }

        else {
            console.error("[Erro] Formato desconhecido recebido:", data2);
        }
    });

    socket.on("auth_error", (data) => {
        socketinf = false;

        const msgElement = document.getElementById("auth-error-msg");
        if (msgElement) {
            msgElement.innerText = data.message || "Sua conexão foi recusada pelo servidor.";
        }

        if (currentUser?.user) {
            updateUserUI('Convidado', 'none');
            localStorage.setItem('worth_last_user', null);

            if (typeof savedAccounts !== 'undefined') {
                savedAccounts = savedAccounts.filter(account => account.user !== currentUser.user);
                saveAccountsToStorage();
            }
        }

        openModal("modal-auth-error");

        if (window.lucide) window.lucide.createIcons();
    });

    socket.on("error", (mensagem) => {
        console.warn("Erro do Servidor:", mensagem);
    });

    socket.on("ticket:receive", (msg) => {
        const myNick = socket.auth?.nick || "";
        if (msg.sender === myNick) return;

        if (currentSocialTab === 'tickets' && currentTicketId === msg.ticketId) {
            fullChatHistory.push(msg);
            appendSingleMessage(msg, true);
            scrollToBottom(true);
        } else {
            addUnreadBadgeToTicket(msg.ticketId);
            if (document.hidden || currentTicketId !== msg.ticketId) {
                sendDesktopNotification(`Ticket #${msg.ticketId}`, msg.text);
                showToast(`Nova mensagem no Ticket #${msg.ticketId}`, 'info');
            }
        }
    });

    socket.on("chat:receive", (msg) => {
        const myNick = socket.auth?.nick || "";
        if (msg.sender === myNick) return;

        const isChatOpen = currentChatFriend === msg.sender;

        if (isChatOpen) {
            typingIndicator.classList.remove("visible");
            fullChatHistory.push(msg);
            if (fullChatHistory.length > PERF_CONFIG.MAX_HISTORY_MEMORY) fullChatHistory.shift();

            appendSingleMessage(msg, true);
            scrollToBottom(true);
        } else {
            showNotificationBadge(msg.sender);
            document.getElementById("social-ping")?.classList.remove("hidden-force");
            sendDesktopNotification(msg.sender, msg.text);
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
        if (!el) return;

        const fmt = (n) => new Intl.NumberFormat('pt-BR').format(n);

        el.innerHTML = `
        <div class="flex items-center gap-2 px-2 py-1 rounded-lg transition-colors hover:bg-white/5 cursor-help group">
            <span class="relative flex h-2.5 w-2.5 shrink-0">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-500"></span>
            </span>
            <span class="text-xs font-bold text-gray-200 font-mono tracking-tight group-hover:text-white transition-colors">
                ${fmt(count.total)} <span class="text-gray-500 font-normal">Online</span>
            </span>
        </div>
    `;

        el.setAttribute("title-app", `
        <div class="w-32 text-xs">
            <div class="flex justify-between items-center mb-1 border-b border-white/10 pb-1">
                <span class="text-gray-400">No Launcher</span>
                <span class="text-white font-mono">${fmt(count.users)}</span>
            </div>
            <div class="flex justify-between items-center">
                <span class="text-yellow-500 font-bold">Jogando</span>
                <span class="text-yellow-500 font-mono font-bold">${fmt(count.usersLaunch)}</span>
            </div>
        </div>
    `);
    });

    socket.on("error", (msg) => { showToast(msg, "error"); resetAllLoadingButtons(); });
    socket.on("success", (msg) => { showToast(msg, "success"); resetAllLoadingButtons(); });
}

function requestNotificationPermission() {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
    }
}

function sendDesktopNotification(titleOrSender, text) {
    if (!("Notification" in window)) return;

    const myStatus = localStorage.getItem('status-account');
    if (myStatus === 'ausente' || myStatus === 'ocupado') {
        return;
    }

    if (Notification.permission !== "denied") {
        try {
            const title = `💬 ${titleOrSender}`;

            let iconUrl = `https://mc-heads.net/avatar/${titleOrSender}`;
            if (titleOrSender.startsWith("Ticket #")) {
                iconUrl = "https://cdn-icons-png.flaticon.com/512/4961/4961759.png";
            }

            const notif = new Notification(title, {
                body: text,
                icon: iconUrl,
                silent: false,
                tag: titleOrSender,
                renotify: true,
                requireInteraction: false
            });

            notif.onclick = () => {
                window.focus();

                if (titleOrSender.startsWith("Ticket #")) {
                    const matches = titleOrSender.match(/Ticket #([a-zA-Z0-9]+)/);
                    if (matches && matches[1]) {
                        const ticketId = matches[1];

                        if (typeof switchSocialTab === 'function') switchSocialTab('tickets');

                        setTimeout(() => {
                            if (typeof selectTicket === 'function') {
                                selectTicket({ id: ticketId, subject: 'Carregando...', status: 'open' });
                            }
                        }, 50);
                    }
                } else {
                    if (typeof switchSocialTab === 'function') switchSocialTab('friends');

                    setTimeout(() => {
                        if (typeof selectFriend === 'function') {
                            const friendData = document.getElementById(`status-dot-${titleOrSender}`)?.getAttribute('title-app');
                            selectFriend(titleOrSender, friendData || 'offline');
                        }
                    }, 50);
                }

                notif.close();
            };

        } catch (error) {
            console.error("Erro na notificação:", error);
        }
    }
}

window.addEventListener("load", () => {
    initializeSocket();
    requestNotificationPermission();
    initChatMenu();
    initEmojiToggle();
});

function createNewMessageSeparator() {
    const div = document.createElement("div");
    div.id = "unread-separator-line";
    div.className = "unread-separator select-none w-full shrink-0";
    div.style.height = "40px";
    div.innerHTML = `<span class="unread-badge">Novas Mensagens</span>`;
    return div;
}

function renderInitialHistory() {
    observer.unobserve(topSentinel);
    setTimeout(() => {
        els.chatMsgs.innerHTML = "";
        els.chatMsgs.appendChild(topSentinel);
        const startIndex = Math.max(0, fullChatHistory.length - PERF_CONFIG.INITIAL_BATCH_SIZE);
        const initialBatch = fullChatHistory.slice(startIndex);
        const fragment = document.createDocumentFragment();
        let lastRenderedDay = null;
        let hasInsertedUnreadSeparator = false;
        let targetScrollElementId = null;
        const myNick = socket.auth?.nick || JSON.parse(localStorage.getItem("chat_identity") || "{}").nick;
        if (startIndex > 0) {
            const prevMsg = fullChatHistory[startIndex - 1];
            lastRenderedDay = getDayKey(prevMsg.timestamp || Date.now());
        }
        for (let i = 0; i < initialBatch.length; i++) {
            const msg = initialBatch[i];
            const msgTimestamp = msg.timestamp || Date.now();
            const currentDay = getDayKey(msgTimestamp);
            if (currentDay !== lastRenderedDay) {
                fragment.appendChild(createDateSeparator(msgTimestamp));
                lastRenderedDay = currentDay;
            }
            if (!hasInsertedUnreadSeparator && !msg.read && msg.sender !== myNick) {
                const sep = createNewMessageSeparator();
                fragment.appendChild(sep);
                hasInsertedUnreadSeparator = true;
                targetScrollElementId = "unread-separator-line";
            }
            fragment.appendChild(createMessageElement(msg, false));
        }
        els.chatMsgs.appendChild(fragment);
        els.chatMsgs.style.scrollBehavior = 'auto';
        if (targetScrollElementId) {
            const el = document.getElementById(targetScrollElementId);
            if (el) {
                requestAnimationFrame(() => {
                    const targetPos = el.offsetTop - (els.chatMsgs.offsetHeight / 2);
                    els.chatMsgs.scrollTo({ top: targetPos, behavior: 'auto' });
                });
            }
        } else {
            els.chatMsgs.scrollTop = els.chatMsgs.scrollHeight;
        }
        requestAnimationFrame(() => {
            setTimeout(() => {
                els.chatMsgs.style.scrollBehavior = 'smooth';
                if (targetScrollElementId) setupUnreadRemover();
                handleReadStatusMarking(hasInsertedUnreadSeparator);
                observer.observe(topSentinel);
                els.chatMsgs.classList.remove('opacity-0-force', 'no-scroll');
                els.chatMsgs.classList.add('visible-force');
            }, 50);
        });
    }, 500);
}

function handleReadStatusMarking(hasSeparator) {
    if (!hasSeparator) {
        if (currentSocialTab === 'friends' && currentChatFriend) {
            socket.emit("chat:mark_read", currentChatFriend);
            document.getElementById(`badge-${currentChatFriend}`)?.classList.add("hidden-force");
        }
        if (currentSocialTab === 'tickets' && currentTicketId) {
            socket.emit("ticket:mark_read", currentTicketId);
            const badge = document.querySelector(`#ticket-item-${currentTicketId} .ticket-badge`);
            if (badge) badge.remove();
        }
        checkGlobalNotification();
    }
}

function createNewMessageSeparator() {
    const div = document.createElement("div");
    div.id = "unread-separator-line";
    div.className = "unread-separator select-none";
    div.innerHTML = `<span class="unread-badge">Novas Mensagens</span>`;
    return div;
}

function setupUnreadRemover() {
    const separator = document.getElementById("unread-separator-line");
    if (!separator) return;

    const removeAction = () => {
        const sep = document.getElementById("unread-separator-line");

        els.chatMsgs.removeEventListener("scroll", scrollHandler);
        els.chatInput.removeEventListener("click", removeAction);
        els.chatInput.removeEventListener("keydown", removeAction);

        if (sep) {
            sep.style.animation = "fadeOutSeparator 0.5s ease forwards";

            if (currentSocialTab === 'friends' && currentChatFriend) {
                socket.emit("chat:mark_read", currentChatFriend);
                document.getElementById(`badge-${currentChatFriend}`)?.classList.add("hidden-force");
                checkGlobalNotification();
            }

            if (currentSocialTab === 'tickets' && currentTicketId) {
                socket.emit("ticket:mark_read", currentTicketId);
                const ticketBadge = document.querySelector(`#ticket-item-${currentTicketId} .ticket-badge`);
                if (ticketBadge) ticketBadge.remove();
                checkGlobalNotification();
            }

            setTimeout(() => sep.remove(), 500);
        }
    };

    els.chatInput.addEventListener("click", removeAction, { once: true });
    els.chatInput.addEventListener("keydown", removeAction, { once: true });

    let scrollTimeout;
    const scrollHandler = () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(removeAction, 1500);
    };
    els.chatMsgs.addEventListener("scroll", scrollHandler, { once: true });
}

function loadOlderMessages() {
    const currentRenderedCount = els.chatMsgs.querySelectorAll('.msg-item').length;
    if (currentRenderedCount >= fullChatHistory.length) return;

    isInternalScroll = true;
    els.chatMsgs.style.scrollBehavior = 'auto';
    const previousScrollHeight = els.chatMsgs.scrollHeight;
    const previousScrollTop = els.chatMsgs.scrollTop;
    const itemsRemaining = fullChatHistory.length - currentRenderedCount;
    const batchSize = PERF_CONFIG.INITIAL_BATCH_SIZE;
    const endIndex = itemsRemaining;
    const startIndex = Math.max(0, endIndex - batchSize);

    const olderBatch = fullChatHistory.slice(startIndex, endIndex);

    if (olderBatch.length === 0) {
        isInternalScroll = false;
        els.chatMsgs.style.scrollBehavior = 'smooth';
        return;
    }

    const fragment = document.createDocumentFragment();
    const lastMsgOfNewBatch = olderBatch[olderBatch.length - 1];
    const firstMsgOfCurrentView = fullChatHistory[endIndex];

    if (lastMsgOfNewBatch && firstMsgOfCurrentView) {
        const dateNew = getDayKey(lastMsgOfNewBatch.timestamp || Date.now());
        const dateOld = getDayKey(firstMsgOfCurrentView.timestamp || Date.now());

        if (dateNew === dateOld) {
            const existingSeparator = topSentinel.nextElementSibling;
            if (existingSeparator && existingSeparator.classList.contains('date-separator')) {
                existingSeparator.remove();
            }
        }
    }

    let lastRenderedDay = null;
    if (startIndex > 0) {
        const msgBeforeBatch = fullChatHistory[startIndex - 1];
        lastRenderedDay = getDayKey(msgBeforeBatch.timestamp || Date.now());
    }

    olderBatch.forEach(msg => {
        const msgTimestamp = msg.timestamp || Date.now();
        const currentDay = getDayKey(msgTimestamp);

        if (currentDay !== lastRenderedDay) {
            fragment.appendChild(createDateSeparator(msgTimestamp));
            lastRenderedDay = currentDay;
        }

        fragment.appendChild(createMessageElement(msg, false));
    });
    topSentinel.after(fragment);
    const newScrollHeight = els.chatMsgs.scrollHeight;
    const heightDifference = newScrollHeight - previousScrollHeight;
    els.chatMsgs.scrollTop = previousScrollTop + heightDifference;
    isInternalScroll = false;
    requestAnimationFrame(() => {
        els.chatMsgs.style.scrollBehavior = 'smooth';
    });
}

function appendSingleMessage(msg, animate = true) {
    const isMe = msg.sender === (socket.auth?.nick || "");
    const wasAtBottom = isUserAtBottom();

    const lastMsgIndex = fullChatHistory.length - 2;
    if (lastMsgIndex >= 0) {
        const prevMsg = fullChatHistory[lastMsgIndex];
        const prevDay = getDayKey(prevMsg.timestamp || Date.now());
        const currentDay = getDayKey(msg.timestamp || Date.now());

        if (prevDay !== currentDay) {
            els.chatMsgs.appendChild(createDateSeparator(msg.timestamp || Date.now()));
        }
    }

    const el = createMessageElement(msg, animate);
    els.chatMsgs.appendChild(el);

    if (isMe) {
        scrollToBottom(true);
    } else if (wasAtBottom) {
        scrollToBottom(false);
    } else {
        btnScrollBottom.classList.add('new-message-alert');
    }

    trimExcessMessages();
}

function trimExcessMessages() {
    const msgs = els.chatMsgs.querySelectorAll('.msg-item');
    if (msgs.length > PERF_CONFIG.MAX_DOM_NODES) {
        const toRemove = msgs.length - PERF_CONFIG.MAX_DOM_NODES;
        if (isUserAtBottom()) {
            let removedCount = 0;
            let node = topSentinel.nextElementSibling;
            while (node && removedCount < toRemove) {
                const next = node.nextElementSibling;
                node.remove();
                node = next;
                if (node && node.classList.contains('msg-item')) removedCount++;
            }
        }
    }
}

function isUserAtBottom() {
    const threshold = 150;
    return (els.chatMsgs.scrollTop + els.chatMsgs.clientHeight) >= (els.chatMsgs.scrollHeight - threshold);
}

function scrollToBottom(force = false) {
    if (force) {
        els.chatMsgs.style.scrollBehavior = 'auto';
    }

    const scrollLogic = () => {
        els.chatMsgs.scrollTop = els.chatMsgs.scrollHeight;
    };

    requestAnimationFrame(scrollLogic);

    if (force) {
        setTimeout(() => {
            scrollLogic();
            els.chatMsgs.style.scrollBehavior = 'smooth';
        }, 100);
    }
}

function createMessageElement(msg, animate = true) {
    const myNick = socket.auth.nick || JSON.parse(localStorage.getItem("chat_identity") || "{}").nick;
    const isMe = msg.sender === myNick;

    const time = new Date(msg.timestamp || Date.now())
        .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const fullDate = new Date(msg.timestamp || Date.now())
        .toLocaleString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

    const div = document.createElement("div");
    div.className = `flex ${isMe ? "justify-end" : "justify-start"} mb-2 group msg-item w-full`;

    if (!animate) {
        div.classList.add("show");
    } else {
        div.classList.add("msg-anim");
    }

    const checkIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="opacity-40"><polyline points="20 6 9 17 4 12"/></svg>`;
    const readIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-blue-400"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg>`;
    const statusIcon = msg.read ? readIcon : checkIcon;
    const statusClass = msg.read ? "msg-status-read" : "msg-status-sent";
    const bubbleStyle = isMe
        ? "bg-[#2f2e1b] border border-white/5 text-gray-100 rounded-2xl rounded-tr-sm"
        : "bg-zinc-800 border border-white/5 text-gray-100 rounded-2xl rounded-tl-sm";

    div.innerHTML = `
        <div class="max-w-[75%] min-w-[80px] ${bubbleStyle} px-4 py-2.5 relative transition-transform hover:scale-[1.01]">
            ${!isMe ? `<span class="text-[10px] text-yellow-500/90 block mb-0.5 font-extrabold tracking-wider uppercase opacity-80 select-none">${msg.sender}</span>` : ""}
            <span class="break-words text-sm leading-relaxed font-medium block drop-shadow-sm">${msg.text}</span>
            <div class="text-[10px] mt-1.5 text-right font-bold font-mono flex items-center justify-end gap-1 select-none ${isMe ? 'text-[#dfdfdf66]' : 'text-white/30'}">
                <span title-app="${fullDate}">${time}</span> 
                <span title-app="${msg.read ? "Lida" : "Enviada"}" class="${isMe ? statusClass : ''}">${isMe ? statusIcon : ""}</span>
            </div>
        </div>
    `;
    return div;
}

function selectFriend(nick, status) {

    if (currentChatFriend === nick) return;
    renderChatLoading();

    fullChatHistory = [];
    isInternalScroll = false;
    observer.unobserve(topSentinel);

    if (currentChatFriend) {
        document.getElementById(`friend-item-${currentChatFriend}`)?.classList.remove("bg-white/10", "border-yellow-500/50");
    }

    currentChatFriend = nick;
    document.getElementById(`friend-item-${nick}`)?.classList.add("bg-white/10", "border-yellow-500/50");

    els.placeholder?.classList.add("hidden-force");
    els.headerNick.innerText = nick;
    els.headerStatus.innerText = status ?? "OFFLINE";

    if (els.headerStatusDot) {
        els.headerStatusDot.className = `w-2 h-2 rounded-full ${getStatusColor(status || "offline")}`;
    }
    if (els.headerAvatar) {
        els.headerAvatar.src = `https://mc-heads.net/avatar/${nick}`;
    }


    typingIndicator.classList.remove("visible");
    btnScrollBottom.classList.remove('visible');

    socket.emit("chat:select", nick);
    checkGlobalNotification();

    els.chatInput.focus();
}

function createFriendElement(friend) {
    const div = document.createElement("div");
    div.id = `friend-item-${friend.nick}`;
    div.className = "group relative p-3 rounded-2xl cursor-pointer transition-all duration-100 border border-transparent hover:bg-white/5 hover:border-white/5 flex items-center gap-4 mb-1 overflow-hidden";

    div.onclick = () => selectFriend(friend.nick, friend.status);

    const statusColors = {
        online: "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]",
        ocupado: "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]",
        ausente: "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]",
        offline: "bg-zinc-600"
    };
    const statusClass = statusColors[friend.status] || statusColors.offline;

    div.innerHTML = `
        <div class="absolute inset-0 bg-gradient-to-r from-yellow-500/0 via-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

        <div class="relative shrink-0">
            <img src="https://mc-heads.net/avatar/${friend.nick}" class="w-10 h-10 rounded-xl bg-zinc-900 shadow-md group-hover:scale-105 transition-transform duration-300" loading="lazy">
            <div id="status-dot-${friend.nick}" class="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-[3px] border-[#18181b] ${statusClass} transition-all" title-app="${friend.status || "offline"}"></div>
        </div>
        
        <div class="flex-1 min-w-0 flex flex-col justify-center">
            <h4 class="text-sm font-bold text-gray-200 truncate group-hover:text-yellow-400 transition-colors">${friend.nick}</h4>
            <p id="status-text-${friend.nick}" class="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">${friend.status || "OFFLINE"}</p>
        </div>
        
        <div id="badge-${friend.nick}" class="${friend.hasUnread ? "" : "hidden-force"} absolute right-3 w-2.5 h-2.5 bg-yellow-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(234,179,8,0.8)]"></div>
        
        <i data-lucide="chevron-right" class="w-4 h-4 text-zinc-600 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"></i>
    `;
    return div;
}

function sendSocketLauncherEvent(event) { };

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

    isTyping = false;
    clearTimeout(typingTimeout);
    socket.emit('chat:typing', { target: currentChatFriend, state: false });

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

function getDayKey(timestamp) {
    const d = new Date(timestamp);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function createDateSeparator(timestamp) {
    const dateStr = new Date(timestamp).toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    const div = document.createElement("div");
    div.className = "date-separator flex items-center justify-center my-6 opacity-60 select-none fade-in w-full px-4";
    div.innerHTML = `
        <div class="h-px bg-white/20 flex-1"></div>
        <span class="px-4 text-[10px] font-bold text-white/50 uppercase tracking-widest whitespace-nowrap">${dateStr}</span>
        <div class="h-px bg-white/20 flex-1"></div>
    `;
    return div;
}

function updateFriendStatusUI(nick, status) {
    const dot = document.getElementById(`status-dot-${nick}`);
    const text = document.getElementById(`status-text-${nick}`);
    if (dot) dot.className = `absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#121212] ${getStatusColor(status)}`;
    if (dot) dot.setAttribute("title-app", status);
    if (text) text.innerText = status;
    if (currentChatFriend === nick) {
        els.headerStatus.innerText = status;
        if (els.headerStatusDot) {
            els.headerStatusDot.className = `w-2 h-2 rounded-full ${getStatusColor(status || "offline")}`;
        }
    }
}

function showNotificationBadge(nick) {
    document.getElementById(`badge-${nick}`)?.classList.remove("hidden-force");
    const item = document.getElementById(`friend-item-${nick}`);
    if (item && item.parentNode) item.parentNode.prepend(item);
}

function checkGlobalNotification() {
    const hasUnread = document.querySelector('[id^="badge-"]:not(.hidden-force)');
    const ping = document.getElementById("social-ping");
    if (ping) hasUnread ? ping.classList.remove("hidden-force") : ping.classList.add("hidden-force");
}

function getStatusColor(status) {
    return { online: "bg-green-500", ocupado: "bg-red-500", ausente: "bg-yellow-500" }[status] || "bg-gray-500";
}

function updateMyStatusUI(status) {
    localStorage.setItem('status-account', status);
    const map = { online: ["bg-green-500", "Online", "Visível para todos"], ocupado: ["bg-red-500", "Ocupado", "Visível para todos (sem receber notificações)"], ausente: ["bg-yellow-500", "Ausente", "Visível para todos"], offline: ["bg-gray-500", "Offline", "Invisível para todos"] };
    const data = map[status] || map["offline"];
    els.myStatusDot.className = `w-2.5 h-2.5 rounded-full ${data[0]}`;
    els.myStatusText.innerText = data[1];
    const ind = document.getElementById('status-indicator');
    ind.setAttribute("title-app", data[1])
    ind.classList.remove('bg-red-500', 'bg-green-500');
    ind.classList.add(data[0]);
    els.myStatusDescription.innerText = data[2];
    setTimeout(() => {
        ind.classList.add(data[0]);
    }, 500);
}

window.changeMyStatus = (s) => {
    updateMyStatusUI(s);
    if (socket.connected) socket.emit("status:change", s);
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
        <div class="flex items-center gap-2">
            <img src="https://mc-heads.net/avatar/${from}" class="w-6 h-6 rounded bg-black/50">
            <div>
                <div class="text-sm text-white font-bold">Solicitação</div>
                <div class="text-xs text-gray-400">de <span class="text-yellow-500">${from}</span></div>
            </div>
        </div>
        <div class="flex gap-2 mt-1">
            <button onclick="respondInvite('${from}', true, this)" class="flex-1 bg-green-600 hover:bg-green-500 text-white py-1.5 rounded-lg text-xs font-bold transition">Aceitar</button>
            <button onclick="respondInvite('${from}', false, this)" class="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white py-1.5 rounded-lg text-xs font-bold transition">Recusar</button>
        </div>`;
    document.body.appendChild(toast);
}

window.respondInvite = (requesterNick, accept, btn) => {
    socket.emit("friend:respond", { requesterNick, accept });
    const box = btn.closest("div.fixed");
    if (box) {
        box.style.opacity = "0";
        setTimeout(() => box.remove(), 300);
    }
};

function checkPendingRequests(requests) {
    if (Array.isArray(requests)) requests.forEach(r => showInviteToast(r.from));
}

window.switchSocialTab = (tab) => {
    currentSocialTab = tab;

    const btnFriends = document.getElementById('tab-btn-friends');
    const btnTickets = document.getElementById('tab-btn-tickets');
    const contentFriends = document.getElementById('tab-content-friends');
    const contentTickets = document.getElementById('tab-content-tickets');
    const activeClass = "text-black bg-yellow-500 shadow-lg shadow-yellow-500/10";
    const inactiveClass = "text-zinc-500 hover:text-white hover:bg-white/5";
    const baseClass = "flex-1 py-2 text-xs font-bold rounded-xl transition-all";

    els.chatMsgs.innerHTML = "";
    els.placeholder?.classList.remove("hidden-force");
    els.headerNick.innerText = "...";
    els.headerStatus.innerText = "";
    els.headerAvatar.src = "";

    if (tab === 'friends') {
        btnFriends.className = `${baseClass} ${activeClass}`;
        btnTickets.className = `${baseClass} ${inactiveClass}`;
        contentFriends.classList.remove('hidden');
        contentTickets.classList.add('hidden');

        currentTicketId = null;
        currentChatFriend = null;

    } else {
        btnTickets.className = `${baseClass} ${activeClass}`;
        btnFriends.className = `${baseClass} ${inactiveClass}`;
        contentTickets.classList.remove('hidden');
        contentFriends.classList.add('hidden');

        currentChatFriend = null;
        currentTicketId = null;

        if (socket && socket.connected) socket.emit('ticket:list');
    }
};

window.openNewTicketModal = () => {
    const modal = document.getElementById('modal-new-ticket');
    if (modal) {
        modal.classList.remove('hidden');
        document.getElementById('input-ticket-subject')?.focus();
    }
};

window.setTicketFilter = (filter) => {
    currentTicketFilter = filter;
    if (socket && socket.connected) socket.emit('ticket:list');
};

window.confirmCreateTicket = () => {
    const input = document.getElementById('input-ticket-subject');
    const subject = input.value.trim();

    if (!subject) return showToast("Digite um assunto!", "error");

    socket.emit('ticket:create', { subject });

    document.getElementById('modal-new-ticket').classList.add('hidden');
    input.value = "";
    showToast("Criando ticket...", "info");
};

function selectTicket(ticket) {
    if (currentTicketId === ticket.id) return;
    renderChatLoading();

    currentChatFriend = null;
    currentTicketId = ticket.id;
    fullChatHistory = [];

    document.querySelectorAll('.ticket-item').forEach(el => el.classList.remove('bg-white/10', 'border-yellow-500/50'));
    document.getElementById(`ticket-item-${ticket.id}`)?.classList.add('bg-white/10', 'border-yellow-500/50');

    els.placeholder?.classList.add("hidden-force");
    els.headerNick.innerText = `Ticket #${ticket.id}`;
    els.headerStatus.innerText = ticket.subject;
    els.headerAvatar.src = "https://cdn-icons-png.flaticon.com/512/4961/4961759.png";
    els.headerAvatar.className = "relative w-11 h-11 rounded-xl object-cover border border-white/10 shadow-lg p-1.5 bg-[#231a00]";

    if (els.headerStatusDot) {
        els.headerStatusDot.className = `w-2 h-2 rounded-full ${ticket.status === 'open' ? 'bg-green-500' : 'bg-red-500'}`;
    }

    socket.emit('ticket:join', ticket.id);

    els.chatInput.focus();
}

window.actionCloseTicket = (id) => {
    if (confirm("Deseja encerrar este atendimento?")) {
        socket.emit('ticket:close', id);
    }
};

function updateMessagesToRead() {
    const readIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-blue-400"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg>`;

    const pendingMsgs = document.querySelectorAll('.msg-status-sent');

    pendingMsgs.forEach(el => {
        el.innerHTML = readIconSVG;
        el.classList.remove('msg-status-sent');
        el.classList.add('msg-status-read');
        if (el.parentElement) el.parentElement.setAttribute('title-app', 'Lida');
    });
}

let currentTicketFilter = 'all';

window.setTicketFilter = (filter) => {
    currentTicketFilter = filter;
    if (socket && socket.connected) socket.emit('ticket:list');
};

function renderTicketList(tickets) {
    const list = document.getElementById('tickets-list');
    if (!list) return;

    const filteredTickets = tickets.filter(t => {
        if (currentTicketFilter === 'all') return true;
        return t.status === currentTicketFilter;
    });

    list.innerHTML = "";

    const filterHeader = document.createElement("div");
    filterHeader.className = "flex gap-1 mb-2 px-1";
    filterHeader.innerHTML = `
        <button onclick="setTicketFilter('all')" class="flex-1 py-1 rounded text-[10px] font-bold transition ${currentTicketFilter === 'all' ? 'bg-white/10 text-white' : 'text-zinc-600 hover:text-zinc-400'}">Todos</button>
        <button onclick="setTicketFilter('open')" class="flex-1 py-1 rounded text-[10px] font-bold transition ${currentTicketFilter === 'open' ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-600 hover:text-emerald-500/50'}">Abertos</button>
        <button onclick="setTicketFilter('closed')" class="flex-1 py-1 rounded text-[10px] font-bold transition ${currentTicketFilter === 'closed' ? 'bg-red-500/20 text-red-400' : 'text-zinc-600 hover:text-red-500/50'}">Fechados</button>
    `;
    list.appendChild(filterHeader);

    if (filteredTickets.length === 0) {
        const emptyDiv = document.createElement("div");
        emptyDiv.className = "flex flex-col items-center justify-center h-40 text-zinc-700 gap-4 opacity-60";
        emptyDiv.innerHTML = `
            <i data-lucide="inbox" class="w-6 h-6 stroke-[1.5]"></i>
            <span class="text-xs font-medium">Nada aqui</span>
        `;
        list.appendChild(emptyDiv);
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    const fragment = document.createDocumentFragment();

    filteredTickets.forEach(ticket => {
        const div = document.createElement("div");
        div.id = `ticket-item-${ticket.id}`;
        div.className = `group relative p-3 rounded-2xl cursor-pointer transition-all duration-100 border border-transparent hover:bg-white/5 hover:border-white/5 flex items-center gap-4 mb-1 ticket-item ${currentTicketId === ticket.id ? 'bg-white/10 border-yellow-500/50' : ''}`;

        div.onclick = () => selectTicket(ticket);

        const statusColor = ticket.status === 'open' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-red-500';
        const iconColor = ticket.status === 'open' ? 'text-emerald-500' : 'text-red-500';
        const dateStr = new Date(ticket.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

        let badgeHtml = '';

        div.innerHTML = `
            <div class="relative shrink-0">
                <div class="w-10 h-10 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center shadow-md">
                    <i data-lucide="${ticket.status === 'open' ? 'life-buoy' : 'lock'}" class="w-5 h-5 ${iconColor}"></i>
                </div>
                <div class="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-[3px] border-[#18181b] ${statusColor}"></div>
            </div>
            <div class="flex-1 min-w-0 flex flex-col justify-center">
                <div class="flex justify-between items-center w-full">
                    <h4 class="text-sm font-bold text-gray-200 truncate group-hover:text-yellow-500 transition-colors w-24">Ticket #${ticket.id}</h4>
                    <span class="text-[9px] text-zinc-600 font-mono">${dateStr}</span>
                </div>
                <p class="text-[10px] text-zinc-500 font-medium truncate">${ticket.subject}</p>
            </div>
            ${badgeHtml}
        `;
        fragment.appendChild(div);
    });

    list.appendChild(fragment);
    if (window.lucide) window.lucide.createIcons();
}

els.chatForm.onsubmit = (e) => {
    e.preventDefault();
    const text = els.chatInput.value.trim();
    if (!text) return;

    const myNick = socket.auth?.nick || JSON.parse(localStorage.getItem("chat_identity") || "{}").nick;

    if (text.toLowerCase().startsWith('chatstaff:')) {
        const message = text.substring(10).trim();
        if (message) {
            socket.emit('chat:staff_send', { text: message }, (resposta) => {
                if (resposta && resposta.error) {
                    showToast("Erro ao enviar: " + resposta.error, "error");
                } else {
                    showToast("Enviado para Staff Chat", "success");
                    const localMsg = { sender: myNick, text: `[STAFF] ${message}`, timestamp: Date.now(), read: true, isStaffChat: true };
                    appendSingleMessage(localMsg, true);
                    scrollToBottom(true);
                }
            });
        }
        els.chatInput.value = "";
        return;
    }

    if (currentSocialTab === 'tickets') {
        if (currentTicketId) {
            const localMsg = {
                sender: myNick, text: text, timestamp: Date.now(),
                read: false, ticketId: currentTicketId
            };

            socket.emit('ticket:send', { ticketId: currentTicketId, text }, (resposta) => {
                if (resposta && resposta.error) {
                    showToast("Erro ao enviar: " + resposta.error, "error");

                } else {
                    fullChatHistory.push(localMsg);
                    appendSingleMessage(localMsg, true);
                    scrollToBottom(true);
                }
            });
        } else {
            showToast("Selecione um ticket primeiro.", "error");
        }
        els.chatInput.value = "";
        els.chatInput.focus();
        return;
    }

    if (!currentChatFriend) return;

    const localFriendMsg = {
        sender: myNick, text: text, timestamp: Date.now(), read: false
    };
    fullChatHistory.push(localFriendMsg);
    appendSingleMessage(localFriendMsg, true);
    scrollToBottom(true);

    isTyping = false;
    clearTimeout(typingTimeout);
    socket.emit('chat:typing', { target: currentChatFriend, state: false });
    socket.emit("chat:send", { targetNick: currentChatFriend, text });

    els.chatInput.value = "";
    els.chatInput.focus();
};

function addUnreadBadgeToTicket(ticketId) {
    const ticketEl = document.getElementById(`ticket-item-${ticketId}`);
    if (ticketEl) {
        let badge = ticketEl.querySelector('.ticket-badge');
        if (!badge) {
            badge = document.createElement('div');
            badge.className = 'ticket-badge absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-[#0a0a0b] animate-pulse shadow-md';
            ticketEl.querySelector('.relative').appendChild(badge);
        }
        ticketEl.parentNode.prepend(ticketEl);
    } else {
        if (socket && socket.connected) socket.emit('ticket:list');
    }
}

function updateChatOptionsContent() {
    const menuDropdown = document.getElementById("menu-chat-dropdown");
    if (!menuDropdown) return;

    menuDropdown.innerHTML = "";

    if (currentSocialTab === 'friends' && currentChatFriend) {
        menuDropdown.innerHTML = `
            <button onclick="actionClearChat()" class="w-full text-left px-3 py-2.5 text-xs font-medium text-zinc-400 hover:bg-white/5 hover:text-white rounded-xl flex items-center gap-3 transition-colors group">
                <i data-lucide="trash-2" class="w-4 h-4 text-zinc-600 group-hover:text-zinc-400"></i> Limpar Histórico
            </button>
            <button onclick="actionRemoveFriend()" class="w-full text-left px-3 py-2.5 text-xs font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 rounded-xl flex items-center gap-3 transition-colors group mt-1">
                <i data-lucide="user-x" class="w-4 h-4 text-rose-500/50 group-hover:text-rose-400"></i> Desfazer Amizade
            </button>
        `;
    }
    else if (currentSocialTab === 'tickets' && currentTicketId) {
        menuDropdown.innerHTML = `
            <button onclick="actionCloseTicket('${currentTicketId}')" class="w-full text-left px-3 py-2.5 text-xs font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 rounded-xl flex items-center gap-3 transition-colors group">
                <i data-lucide="x-circle" class="w-4 h-4 text-rose-500/50 group-hover:text-rose-400"></i> Fechar Ticket
            </button>
        `;
    }
    else {
        menuDropdown.innerHTML = `<div class="px-3 py-2 text-[10px] text-zinc-600 text-center italic">Nenhuma ação disponível</div>`;
    }

    if (window.lucide) window.lucide.createIcons();
}

function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.remove('opacity-0'), 10);
    }
}

window.closeModal = (id) => {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('opacity-0');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
};

window.actionClearChat = () => {
    if (!currentChatFriend) return;

    document.getElementById("menu-chat-dropdown")?.classList.add("hidden");

    const btnConfirm = document.getElementById("btn-confirm-clear-history");
    btnConfirm.onclick = () => {
        fullChatHistory = [];
        els.chatMsgs.innerHTML = "";
        socket.emit("chat:clear_history", currentChatFriend);
        showToast("Histórico limpo.", "success");
        closeModal("modal-clear-history");
    };

    openModal("modal-clear-history");
};

window.actionRemoveFriend = () => {
    if (!currentChatFriend) return;

    document.getElementById("menu-chat-dropdown")?.classList.add("hidden");
    const nameSpan = document.getElementById("modal-friend-name");
    if (nameSpan) nameSpan.innerText = currentChatFriend;

    const btnConfirm = document.getElementById("btn-confirm-remove-friend");
    btnConfirm.onclick = () => {
        socket.emit("friend:remove", currentChatFriend);

        const friendItem = document.getElementById(`friend-item-${currentChatFriend}`);
        if (friendItem) friendItem.remove();

        currentChatFriend = null;
        els.placeholder?.classList.remove("hidden-force");

        showToast("Amigo removido.", "success");
        closeModal("modal-remove-friend");
    };

    openModal("modal-remove-friend");
};

window.actionCloseTicket = (id) => {
    document.getElementById("menu-chat-dropdown")?.classList.add("hidden");

    const btnConfirm = document.getElementById("btn-confirm-close-ticket");
    btnConfirm.onclick = () => {
        socket.emit('ticket:close', id);
        closeModal("modal-close-ticket");
    };

    openModal("modal-close-ticket");
};