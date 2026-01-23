lucide.createIcons();

const defaultSettings = { ram: '4G', fullscreen: true, closeLauncher: true, width: 950, height: 600, discordRichPresence: true };
let settings = JSON.parse(localStorage.getItem('worth_settings')) || defaultSettings;
let isLangOpen = false;
let currentUser = null;
let userSelect = null;
let savedAccounts = JSON.parse(localStorage.getItem('worth_accounts')) || [];
let donwoadversionapp = "";
let updateModalAc = false;

try {
    const logConsole = document.getElementById('log-console');
    const btnPlay = document.getElementById('btn-play');
    const progressBar = document.getElementById('progress-bar');
    const processPercentText = document.getElementById("progress-percent");
    const progressText = document.getElementById('progress-text');
    const progressContainer = document.getElementById('progress-container');
    const accountMenu = document.getElementById('account-menu');
    const modalOffline = document.getElementById('modal-offline');
    const inputNick = document.getElementById('offline-nick');
    const accountsListEl = document.getElementById('accounts-list');


    const getTimestamp = () => {
        const now = new Date();
        return now.toLocaleTimeString('pt-BR', { hour12: false });
    };

    const MC_COLORS = {
        '0': '#000000', '1': '#0000AA', '2': '#00AA00', '3': '#00AAAA',
        '4': '#AA0000', '5': '#AA00AA', '6': '#FFAA00', '7': '#AAAAAA',
        '8': '#555555', '9': '#5555FF', 'a': '#55FF55', 'b': '#55FFFF',
        'c': '#FF5555', 'd': '#FF55FF', 'e': '#FFFF55', 'f': '#FFFFFF'
    };

    const MC_STYLES = {
        'l': 'font-weight: bold;',
        'm': 'text-decoration: line-through;',
        'n': 'text-decoration: underline;',
        'o': 'font-style: italic;'
    };

    function parseMinecraftText(text) {
        if (!text) return "";

        let clean = text.replace(/[&<>"']/g, (m) => ({
            '&': '&amp;', '': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[m]);

        clean = clean.replace(/&amp;([0-9a-fk-or])/gi, '&$1');

        let formatted = '<span>' + clean.replace(/[&§]([0-9a-fk-or])/gi, (match, code) => {
            code = code.toLowerCase();

            if (MC_COLORS[code]) {
                return `</span><span style="color: ${MC_COLORS[code]}">`;
            }
            else if (MC_STYLES[code]) {
                return `<span style="${MC_STYLES[code]}">`;
            }
            else if (code === 'r') {
                return `</span><span class="reset-style">`;
            }
            return '';
        }) + '</span>';

        return formatted;
    }

    const MAX_LOG_LINES = 1000;
    const MINECRAFT_COLOR_REGEX = /[&§][0-9a-fk-or]/gi;

    const STRICT_LEVEL_REGEX = /\[[^\]]+\/(INFO|WARN|ERROR|FATAL|DEBUG|TRACE)\]/i;
    const LOOSE_LEVEL_REGEX = /\b(FATAL|ERROR|WARN|DEBUG|TRACE|INFO)\b/i;

    const LOG_STYLES = {
        'fatal': { bg: 'bg-red-900/30', text: 'text-red-600 font-bold', icon: 'FATAL', iconColor: 'text-red-500' },
        'error': { bg: 'hover:bg-red-500/10', text: 'text-red-600', icon: 'ERR', iconColor: 'text-red-500' },
        'warn': { bg: 'hover:bg-yellow-500/10', text: 'text-[#ebe605]', icon: 'WARN', iconColor: 'text-yellow-500' },
        'info': { bg: 'hover:bg-white/5', text: 'text-gray-300', icon: 'INFO', iconColor: 'text-gray-500' },
        'debug': { bg: 'hover:bg-purple-500/5', text: 'text-[#e99573]', icon: 'DBG', iconColor: 'text-[#cd3a00]' },
        'trace': { bg: 'hover:bg-white/5', text: 'text-gray-500 italic', icon: 'TRC', iconColor: 'text-gray-600' },
        'success': { bg: 'hover:bg-green-500/10', text: 'text-green-400', icon: 'OK', iconColor: 'text-green-500' },
        'system': { bg: 'hover:bg-cyan-500/10', text: 'text-[#00e1ff]', icon: 'SYS', iconColor: 'text-cyan-500' },
        'chat': { bg: 'hover:bg-blue-600/10', text: 'text-white', icon: 'CHAT', iconColor: 'text-blue-400' },
        'mods': { bg: 'hover:bg-fuchsia-500/10', text: 'text-fuchsia-300', icon: 'MODS', iconColor: 'text-fuchsia-500' },
        'config': { bg: 'hover:bg-indigo-500/10', text: 'text-[#6460f9]', icon: 'CFG', iconColor: 'text-indigo-500' },
        'java': { bg: 'hover:bg-orange-500/10', text: 'text-orange-300', icon: 'JAVA', iconColor: 'text-orange-500' }
    };

    function detectLogType(cleanText) {
        const lower = cleanText.toLowerCase();

        if (cleanText.startsWith('[MODS]')) return 'mods';
        if (cleanText.startsWith('[CONFIG]')) return 'config';
        if (cleanText.startsWith('[JAVA]')) return 'java';
        if (cleanText.startsWith('[SYSTEM]')) return 'system';
        const strictMatch = cleanText.match(STRICT_LEVEL_REGEX);
        if (strictMatch && strictMatch[1]) {
            return strictMatch[1].toLowerCase();
        }

        if (cleanText.startsWith('[GAME]')) {
            const looseMatch = cleanText.match(LOOSE_LEVEL_REGEX);
            if (looseMatch && looseMatch[1]) {
                return looseMatch[1].toLowerCase();
            }
            if (lower.includes('exception') || lower.includes('error') || lower.includes('fatal')) return 'error';
            if (lower.includes('warn')) return 'warn';
            if (lower.includes('worthclient') || lower.startsWith('[sys]')) {
                return 'system';
            }

            return 'info';
        }
        if (/^\s*at\s+([a-zA-Z0-9_$.]+)/.test(cleanText)) return 'trace';
        if (lower.includes('exception') || lower.includes('fatal') || lower.includes('crash')) return 'error';
        if (lower.includes('[chat]')) return 'chat';
        if (lower.includes('success') || lower.includes('concluído')) return 'success';

        if (lower.includes('worthclient') || lower.startsWith('[sys]')) {
            return 'system';
        }

        return 'info';
    }

    let logBuffer = [];
    let isProcessingLogs = false;
    let lastScrollTime = 0;
    let currentLogFilter = 'all';

    function setupLogFilters() {
        const filters = {
            'all': document.getElementById('btn-filter-all'),
            'info': document.getElementById('btn-filter-info'),
            'warn': document.getElementById('btn-filter-warn'),
            'error': document.getElementById('btn-filter-error')
        };

        window.applyLogFilter = (filterType) => {
            currentLogFilter = filterType;
            const container = document.getElementById('log-console');
            if (!container) return;

            Object.keys(filters).forEach(key => {
                const btn = filters[key];
                if (!btn) return;

                if (key === filterType) {
                    btn.classList.add('bg-white/10', 'text-white');
                    btn.classList.remove('text-zinc-400', 'text-blue-400/70', 'text-yellow-400/70', 'text-red-400/70');
                } else {
                    btn.classList.remove('bg-white/10', 'text-white');
                    if (key === 'info') btn.classList.add('text-blue-400/70');
                    else if (key === 'warn') btn.classList.add('text-yellow-400/70');
                    else if (key === 'error') btn.classList.add('text-red-400/70');
                    else btn.classList.add('text-zinc-400');
                }
            });

            const lines = container.children;
            for (let line of lines) {
                const type = line.dataset.type;

                let show = false;
                if (filterType === 'all') show = true;
                else if (filterType === filterType) show = (type === filterType);

                if (filterType === 'error' && (type === 'fatal' || type === 'error')) show = true;

                if (show) line.classList.remove('hidden');
                else line.classList.add('hidden');
            }

            container.scrollTop = container.scrollHeight;
        };

        if (filters.all) filters.all.onclick = () => window.applyLogFilter('all');
        if (filters.info) filters.info.onclick = () => window.applyLogFilter('info');
        if (filters.warn) filters.warn.onclick = () => window.applyLogFilter('warn');
        if (filters.error) filters.error.onclick = () => window.applyLogFilter('error');
    }

    function addLogToUI(msg, forceType = null) {
        if (!logConsole || !msg) return;

        logBuffer.push({ msg, forceType });

        if (!isProcessingLogs) {
            requestAnimationFrame(processLogBuffer);
            isProcessingLogs = true;
        }
    }

    function processLogBuffer() {
        if (logBuffer.length === 0) {
            isProcessingLogs = false;
            return;
        }

        const logsToRender = [...logBuffer];
        logBuffer = [];

        const fragment = document.createDocumentFragment();
        const now = new Date();
        const timeString = now.toLocaleTimeString('pt-BR', { hour12: false });
        const activeFilter = (typeof currentLogFilter !== 'undefined') ? currentLogFilter : 'all';

        logsToRender.forEach(({ msg, forceType }) => {
            const rawText = typeof msg === 'object' ? JSON.stringify(msg) : String(msg);
            const hasColors = rawText.includes('&') || rawText.includes('§');
            const cleanText = hasColors ? rawText.replace(MINECRAFT_COLOR_REGEX, '') : rawText;
            const type = forceType || detectLogType(cleanText);
            const style = LOG_STYLES[type] || LOG_STYLES['info'];
            const line = document.createElement("div");

            line.dataset.type = type;

            if (activeFilter !== 'all') {
                let shouldShow = (type === activeFilter);

                if (activeFilter === 'error' && (type === 'fatal' || type === 'error')) {
                    shouldShow = true;
                }

                if (!shouldShow) {
                    line.classList.add('hidden');
                }
            }

            line.className = `flex gap-2 px-2 py-0.5 rounded ${style.bg} transition-colors text-xs font-mono border-l-2 border-transparent hover:border-white/20 items-start group contain-content`;

            const processedMessage = hasColors && typeof parseMinecraftText === 'function' ? parseMinecraftText(rawText) : rawText;
            const isStacktrace = type === 'trace' && cleanText.trim().startsWith('at ');
            const messageClass = isStacktrace ? 'text-[11px] opacity-75' : 'text-xs';

            line.innerHTML = `
            <span class="text-gray-600 select-none opacity-50 shrink-0 text-[10px] pt-[2px] w-[50px] text-right mr-1 group-hover:opacity-100 transition-opacity">
                ${timeString}
            </span>
            
            <span class="${style.iconColor} font-bold select-none w-11 text-center opacity-90 text-[10px] pt-[2px] shrink-0 bg-black/10 rounded px-1">
                ${style.icon}
            </span>
            
            <span class="${style.text} ${messageClass} flex-1 break-all leading-tight pt-[1px]">
                ${processedMessage}
            </span>
            `;

            fragment.appendChild(line);
        });

        logConsole.appendChild(fragment);

        if (logConsole.childElementCount > MAX_LOG_LINES) {
            while (logConsole.childElementCount > MAX_LOG_LINES) {
                logConsole.removeChild(logConsole.firstChild);
            }
        }

        const currentTime = Date.now();
        if (currentTime - lastScrollTime > 100) {
            const isNearBottom = logConsole.scrollTop + logConsole.clientHeight >= logConsole.scrollHeight - 200;
            if (isNearBottom) {
                logConsole.scrollTop = logConsole.scrollHeight;
            }
            lastScrollTime = currentTime;
        }

        if (logBuffer.length > 0) {
            requestAnimationFrame(processLogBuffer);
        } else {
            isProcessingLogs = false;
        }
    }

    function addLog(msg) {
        addLogToUI(msg, null);
    }

    function addSystemLog(msg) {
        addLogToUI(`[SYS] ${msg}`, 'system');
    }

    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args) => {
        originalLog(...args);
    };
    console.error = (...args) => {
        originalError(...args);
        addLogToUI(args.join(' '), 'error');
    };
    console.warn = (...args) => {
        originalWarn(...args);
        addLogToUI(args.join(' '), 'warn');
    };

    window.clearConsoleLogs = () => {
        if (logConsole) logConsole.innerHTML = `
        <div class="text-gray-500 italic border-b border-white/5 pb-1 mb-2 text-[10px]">Terminal limpo pelo usuário.</div>
    `;
    };

    window.copyConsoleLogs = () => {
        if (!logConsole) return;

        const visibleLogs = Array.from(logConsole.children)
            .filter(line => !line.classList.contains('hidden'))
            .map(line => line.innerText)
            .join('\n');

        if (!visibleLogs) {
            showGenericToast("Nenhum log visível para copiar.");
            return;
        }

        navigator.clipboard.writeText(visibleLogs).then(() => {
            showGenericToast("Logs copiados para a área de transferência!");

            const btn = document.querySelector('button[onclick="copyConsoleLogs()"] i');
            if (btn) {
                const originalIcon = btn.getAttribute('data-lucide');
                btn.setAttribute('data-lucide', 'check');
                btn.classList.add('text-green-400');
                lucide.createIcons();

                setTimeout(() => {
                    btn.setAttribute('data-lucide', originalIcon || 'copy');
                    btn.classList.remove('text-green-400');
                    lucide.createIcons();
                }, 2000);
            }
        }).catch(err => {
            console.error("Falha ao copiar logs", err);
            showGenericToast("Erro ao copiar logs.");
        });
    };
    function showGenericToast(msg, type = 'info') {
        let t = document.getElementById('toast');

        if (!t) {
            t = document.createElement('div');
            t.id = 'toast';
            t.className = "fixed bottom-10 left-1/2 -translate-x-1/2 bg-[#0a0a0a]/90 text-white px-5 py-2.5 rounded-full text-xs font-bold border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-all duration-300 opacity-0 translate-y-8 pointer-events-none z-[99999] flex items-center gap-2 transform will-change-transform";
            document.body.appendChild(t);
        }

        if (t.timeoutId) clearTimeout(t.timeoutId);

        let iconColor = "text-amber-400";
        let iconName = "info";

        if (type === 'success') { iconColor = "text-green-400"; iconName = "check-circle"; }
        if (type === 'error') { iconColor = "text-red-400"; iconName = "alert-circle"; }

        t.innerHTML = `<i data-lucide="${iconName}" class="w-4 h-4 ${iconColor}"></i> <span>${msg}</span>`;

        if (window.lucide) window.lucide.createIcons();

        requestAnimationFrame(() => {
            t.classList.remove('opacity-0', 'translate-y-8');
            t.classList.add('opacity-100', 'translate-y-0');
        });

        t.timeoutId = setTimeout(() => {
            t.classList.remove('opacity-100', 'translate-y-0');
            t.classList.add('opacity-0', 'translate-y-8');
        }, 3000);
    }

    function saveAccountsToStorage() {
        localStorage.setItem('worth_accounts', JSON.stringify(savedAccounts));
        renderAccountsList();
    }

    function addAccount(acc) {
        const existing = savedAccounts.find(a => a.user === acc.user && a.type === acc.type);
        if (!existing) {
            savedAccounts.push(acc);
            saveAccountsToStorage();
        }
        selectAccount(acc);
    }

    function removeAccount(index) {
        if (savedAccounts[index].user === currentUser?.user) {
            currentUser = null;
            updateUserUI('Convidado', 'none');
        }
        savedAccounts.splice(index, 1);
        saveAccountsToStorage();
    }

    function selectAccount(acc, a) {
        if (currentUser) {
            if (!a) closeConnectionSocket();
        }
        currentUser = acc;
        localStorage.setItem('worth_last_user', JSON.stringify(acc));
        updateUserUI(acc.user, acc.type);
        toggleAccountMenu(false);
        if (currentUser) {
            setTimeout(() => {
                if (!a) openConnectionSocket();
            }, 500);
        }
    }

    function updateUserUI(user, type) {
        document.getElementById('user-display').innerText = user;
        document.getElementById('user-type').innerText = type === 'microsoft' ? 'MICROSOFT' : (type === 'none' ? 'OFFLINE' : 'OFFLINE');
        const avatarUrl = type === 'none'
            ? 'https://mc-heads.net/avatar/Steve'
            : `https://mc-heads.net/avatar/${user}`;

        document.getElementById('user-avatar').style.backgroundImage = `url('${avatarUrl}')`;

        const ind = document.getElementById('status-indicator');
        if (type !== 'none') ind.classList.replace('bg-red-500', 'bg-green-500');
        else ind.classList.replace('bg-green-500', 'bg-red-500');
    }

    function renderAccountsList() {
        accountsListEl.innerHTML = '';

        if (savedAccounts.length === 0) {
            accountsListEl.innerHTML = '<div class="text-xs text-gray-600 text-center py-4 font-mono">Sem contas salvas</div>';
            return;
        }

        savedAccounts.forEach((acc, idx) => {
            const div = document.createElement('div');
            const isActive = (currentUser && currentUser.user === acc.user);

            const activeClasses = isActive
                ? "bg-white/10 border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.1)]"
                : "bg-white/5 hover:bg-white/10 border-transparent hover:border-white/10";

            div.className = `flex items-center gap-3 p-3 rounded-xl transition group cursor-pointer border mb-2 ${activeClasses}`;

            const statusIndicator = isActive
                ? `<div class="text-[9px] text-green-400 font-bold uppercase tracking-wider flex items-center gap-1"><i data-lucide="check" class="w-3 h-3"></i> Ativo</div>`
                : `<div class="text-[9px] text-gray-500 uppercase font-bold mt-1">${acc.type}</div>`;

            div.innerHTML = `
            <img src="https://mc-heads.net/avatar/${acc.user}" class="w-8 h-8 rounded-lg bg-black/50 shadow-sm">
            <div class="flex-1 overflow-hidden">
                <div class="text-sm font-bold text-white truncate leading-none ${isActive ? 'text-green-50' : ''}">${acc.user}</div>
                ${statusIndicator}
            </div>
            <button title-app="Remover Conta" class="text-gray-600 hover:text-red-500 p-2 rounded-lg hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition btn-remove-acc no-drag">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
        `;

            div.addEventListener('click', (e) => {
                if (!e.target.closest('.btn-remove-acc')) {
                    selectAccount(acc);

                    currentUser = acc;

                    renderAccountsList();
                }
            });

            div.querySelector('.btn-remove-acc').addEventListener('click', (e) => {
                e.stopPropagation();
                openDeleteModal(idx, acc.user);
            });

            accountsListEl.appendChild(div);
        });

        lucide.createIcons();
    }

    let pendingDeleteIndex = null;

    const modalDelete = document.getElementById('modal-delete-account');
    const modalDeleteContent = document.getElementById('modal-delete-content');


    function openDeleteModal(idx, username) {
        const targetNameSpan = document.querySelector('#delete-target-name');

        pendingDeleteIndex = idx;
        targetNameSpan.innerText = username;

        modalDelete.classList.remove('hidden');
        requestAnimationFrame(() => {
            modalDelete.classList.remove('opacity-0');
            modalDeleteContent.classList.remove('scale-95');
            modalDeleteContent.classList.add('scale-100');
        });
    }

    function closeDeleteModal() {
        pendingDeleteIndex = null;

        modalDelete.classList.add('opacity-0');
        modalDeleteContent.classList.remove('scale-100');
        modalDeleteContent.classList.add('scale-95');

        setTimeout(() => {
            modalDelete.classList.add('hidden');
        }, 300);
    }

    document.getElementById('btn-cancel-delete').addEventListener('click', closeDeleteModal);
    document.getElementById('btn-confirm-delete').addEventListener('click', () => {
        if (pendingDeleteIndex !== null) {
            removeAccount(pendingDeleteIndex);
            closeDeleteModal();
        }
    });

    modalDelete.addEventListener('click', (e) => {
        if (e.target === modalDelete) closeDeleteModal();
    });

    function toggleAccountMenu(show) {
        if (show) {
            accountMenu.setAttribute('data-open', 'true');
            accountMenu.classList.add('dropdown-active');
            renderAccountsList();
        } else {
            accountMenu.setAttribute('data-open', 'false');
            accountMenu.classList.remove('dropdown-active');
        }
    }

    function toggleModal(show) {
        if (show) {
            modalOffline.classList.remove('hidden-force');
            setTimeout(() => {
                modalOffline.classList.remove('opacity-0');
                inputNick.focus();
            }, 10);
        } else {
            modalOffline.classList.add('opacity-0');
            setTimeout(() => modalOffline.classList.add('hidden-force'), 300);
        }
    }

    document.getElementById('btn-toggle-accounts').addEventListener('click', () => {
        const accountMenu = document.getElementById('account-menu');
        const isActive = accountMenu.classList.contains('dropdown-active');
        toggleAccountMenu(!isActive);
    });

    document.getElementById('btn-close-accounts').addEventListener('click', () => {
        const accountMenu = document.getElementById('account-menu');
        accountMenu.setAttribute('data-open', 'false');
        toggleAccountMenu(false)
    });

    document.getElementById('btn-off-login').addEventListener('click', () => {
        const accountMenu = document.getElementById('account-menu');
        accountMenu.setAttribute('data-open', 'false');
        toggleAccountMenu(false);
        toggleModal(true);
    });

    document.getElementById('btn-cancel-offline').addEventListener('click', () => toggleModal(false));

    document.getElementById('btn-confirm-offline').addEventListener('click', async () => {
        const nick = inputNick.value.trim();
        if (!nick) return;
        toggleModal(false);
        const res = await window.api.loginOffline(nick);
        if (res.success) {
            addAccount({ user: res.user, type: 'offline', uuid: '00000000-0000-0000-0000-000000000000' });
            addLog(`Conta offline criada: ${res.user}`);
        }
    });

    document.getElementById('btn-ms-login').addEventListener('click', async () => {
        toggleAccountMenu(false);
        addLog("Iniciando fluxo de autenticação Microsoft...");
        const res = await window.api.loginMicrosoft();
        if (res.success) {
            addAccount({ user: res.user, type: 'microsoft', uuid: res.uuid });
            addLog(`Autenticado com sucesso. Bem-vindo, ${res.user}`);
        } else {
            console.error(`Falha no login Microsoft: ${res.error}`);
        }
    });

    window.selectLanguage = function (val, flag, name) {
        currentFlag.innerText = flag;
        currentText.innerText = name;
        hiddenInput.value = val;

        document.querySelectorAll('.check-icon').forEach(icon => {
            if (icon.getAttribute('data-val') === val) {
                icon.classList.remove('opacity-0');
            } else {
                icon.classList.add('opacity-0');
            }
        });

        localStorage.setItem("appLanguage", val);
        appLanguage(val)
        isLangOpen = false;
        toggleLangMenu();
    };

    function updateSettingsUI() {
        document.getElementById('ram-slider').value = parseInt(settings.ram);
        document.getElementById('ram-display').innerText = settings.ram;
        document.getElementById('res-width').value = settings.width || 854;
        document.getElementById('res-height').value = settings.height || 480;
        updateToggleUI('fullscreen', settings.fullscreen);
        updateToggleUI('discord-rich', settings.discordRichPresence);
        updateToggleUI('closeLauncher', settings.closeLauncher);
    }

    function updateToggleUI(key, active) {
        const el = document.getElementById('toggle-' + key);
        const dot = el.querySelector('.dot');
        if (active) {
            el.classList.replace('bg-gray-700', 'bg-yellow-500');
            dot.classList.add('translate-x-5');
        } else {
            el.classList.replace('bg-yellow-500', 'bg-gray-700');
            dot.classList.remove('translate-x-5');
        }
    }

    window.toggleSetting = (key) => {
        settings[key] = !settings[key];
        saveSettings();
        window.api.updateSettings(settings);
        updateSettingsUI();
    }

    function saveSettings() {
        settings.width = document.getElementById('res-width').value;
        settings.height = document.getElementById('res-height').value;
        localStorage.setItem('worth_settings', JSON.stringify(settings));

        showGenericToast("Configurações salvas");
    }

    document.getElementById('ram-slider').addEventListener('input', (e) => {
        settings.ram = e.target.value + 'G';
        document.getElementById('ram-display').innerText = settings.ram;
        saveSettings();
    });

    ['res-width', 'res-height'].forEach(id => {
        document.getElementById(id).addEventListener('change', saveSettings);
    });

    document.getElementById('btn-reset-settings').addEventListener('click', () => {
        settings = { ...defaultSettings };
        localStorage.setItem('worth_settings', JSON.stringify(settings));
        updateSettingsUI();
    });

    window.switchTab = (tabName) => {
        ['home', 'social', 'settings', 'store', "console", "resoucepacks"].forEach(v => {
            const el = document.getElementById('view-' + v);
            const btn = document.getElementById('tab-' + v);

            if (el && btn) {
                if (v === tabName) {
                    el.classList.remove('hidden-force');
                    setTimeout(() => el.classList.add('fade-enter-active'), 10);
                    btn.classList.add('active');
                } else {
                    el.classList.add('hidden-force');
                    el.classList.remove('fade-enter-active');
                    btn.classList.remove('active');
                }
            }
        });
    }

    btnPlay.addEventListener('click', async () => {
        if (!currentUser) {
            toggleAccountMenu(true);
            return;
        }

        if (btnPlay.as3cd) {
            await handleStopClick();
            btnPlay.innerHTML = `<i data-lucide="loader" class="fill-current w-7 h-7 drop-shadow-md"></i> FINALIZANDO...`;
            return;
        }

        if (logConsole) logConsole.innerHTML = `
        <div class="text-gray-500 italic border-b border-white/5 pb-1 mb-2 text-[10px]">Terminal limpo pelo Sistema (novo client iniciando).</div>
    `;

        btnPlay.disabled = true;
        btnPlay.innerHTML = `<span class="animate-spin border-2 border-white border-t-transparent rounded-full fill-current w-7 h-7 drop-shadow-md"></span>`;
        progressContainer.style.opacity = "1";

        const res = await window.api.launchGame(
            { type: currentUser.type, user: currentUser.user, uuid: currentUser.uuid },
            settings
        );

        userSelect = { type: currentUser.type, user: currentUser.user, uuid: currentUser.uuid };

        if (!res.success) {
            console.error(`ERRO DE LANÇAMENTO: ${res.error}`);
            btnPlay.disabled = false;
            btnPlay.as3cd = false;
            btnPlay.innerHTML = `<i data-lucide="play" class="fill-current w-7 h-7 drop-shadow-md"></i> JOGAR`;
            lucide.createIcons();
            progressContainer.style.opacity = "0";
            if (res.error.includes("expirada")) {
                alert("Login expirado. Reconecte sua conta.");
                removeAccount(savedAccounts.findIndex(a => a.user === currentUser.user));
            }
        } else {
            addLog("Processo do jogo iniciado com PID: " + (res.pid || 'N/A'), 'success');
        }
    });

    window.api.onLog((msg) => {
        addLogToUI(msg);
    });

    window.api.onProgress((data) => {
        let pct = 0;
        if (data.task && data.total) pct = (data.task / data.total) * 100;
        progressBar.style.width = pct + '%';
        processPercentText.textContent = Number(pct).toFixed() + "%"

        progressText.innerText = data.type ? `BAIXANDO ${data.type.toUpperCase()}` : "PREPARANDO...";
    });

    window.api.onPercentDownloadTxT((data) => {
        document.getElementById(`btn-${data.id}-p`).textContent = `Baixando ${data.percent}%...`;;
    });

    window.api.onGameClosed(() => {
        closeConnectionSocket();
        addLog("Sessão de jogo finalizada (Exit Code 0).", 'success');
        sendSocketLauncherEvent("close:client");
        btnPlay.disabled = false;
        btnPlay.as3cd = false;
        btnPlay.innerHTML = `<i data-lucide="play" class="fill-current w-7 h-7 drop-shadow-md"></i> JOGAR`;
        lucide.createIcons();
        progressContainer.style.opacity = "0";
        progressBar.style.width = '0%';
        processPercentText.textContent = "0%"

        localStorage.setItem('worth_last_user', JSON.stringify(currentUser));
        updateUserUI(currentUser.user, currentUser.type);
        toggleAccountMenu(false);
        setTimeout(() => {
            openConnectionSocket();
        }, 10);
    });

    window.api.onGameStarted(() => {
        addLog("Minecraft iniciado e janela detectada.", 'success');
        sendSocketLauncherEvent("open:client");
        btnPlay.disabled = false;
        btnPlay.as3cd = true;
        btnPlay.innerHTML = `<i data-lucide="pause" class="fill-current w-7 h-7 drop-shadow-md"></i> JOGANDO`;
        lucide.createIcons();
        progressContainer.style.opacity = "0";
        progressBar.style.width = '0%';
        processPercentText.textContent = "0%"
    });

    window.api.onGameStartedExtra(() => {
        addLog("Inicializando JVM e Assets...", 'info');
        btnPlay.disabled = true;
        btnPlay.as3cd = true;
        btnPlay.innerHTML = `<i data-lucide="loader" class="fill-current w-7 h-7 drop-shadow-md"></i> INICIANDO JOGO`;
        lucide.createIcons();
        progressContainer.style.opacity = "0";
        processPercentText.textContent = "0%"
        progressBar.style.width = '0%';
    });

    document.getElementById('min-btn').addEventListener('click', window.api.minimize);
    document.getElementById('close-btn').addEventListener('click', window.api.close);

    updateSettingsUI();
    const lastUser = JSON.parse(localStorage.getItem('worth_last_user'));
    if (lastUser) selectAccount(lastUser, "a");

    window.addEventListener("load", () => {
        setupLogFilters();

        setTimeout(() => document.getElementById("view-home").classList.add('fade-enter-active'), 10);

        const statusPing = () => {
            const statusEl = document.getElementById('status-pingserver');

            fetch("https://api.mcstatus.io/v2/status/java/redeworth.com")
                .then(async a => await a.json())
                .then(async res => {
                    let state = {
                        color: "text-red-500",
                        dot: "bg-red-500",
                        ping: "bg-red-400",
                        asa: ["bg-red-500/10", "border-red-500/20"],
                        text: "Rede Worth está Offline"
                    };

                    if (res.online) {
                        const motdClean = res.motd && res.motd.clean ? res.motd.clean.toLowerCase() : "";

                        if (motdClean.includes("manutenção")) {
                            state = {
                                color: "text-yellow-500",
                                dot: "bg-yellow-500",
                                ping: "bg-yellow-400",
                                asa: ["bg-yellow-500/10", "border-yellow-500/20"],
                                text: "Rede Worth em Manutenção"
                            };
                        } else {
                            state = {
                                color: "text-green-400",
                                dot: "bg-green-500",
                                ping: "bg-green-400",
                                asa: ["bg-green-500/10", "border-green-500/20"],
                                text: `${res.players.online} jogadores em Rede Worth`
                            };
                        }
                    }
                    statusEl.classList.remove("bg-yellow-500/10", "border-yellow-500/20", "bg-red-500/10", "border-red-500/20");
                    statusEl.classList.add(state.asa[0], state.asa[1]);
                    statusEl.innerHTML = `
                    <span class="relative flex h-2.5 w-2.5">
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full ${state.ping} opacity-75"></span>
                        <span class="relative inline-flex rounded-full h-2.5 w-2.5 ${state.dot}"></span>
                    </span>
                    <span class="${state.color}">
                         ${state.text}.
                    </span>
            `;

                    if (window.lucide) lucide.createIcons();
                })
                .catch(() => {
                    statusEl.innerHTML = `<span class="text-xs font-bold text-red-500">Erro ao Conectar.</span>`;
                });
        }

        statusPing();
        setInterval(statusPing, 30000);

        const tooltip = document.getElementById('custom-tooltip');
        let activeElement = null;

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'title-app') {
                    const newText = activeElement.getAttribute('title-app');
                    if (newText) {
                        tooltip.innerHTML = newText;
                    } else {
                        killTooltip();
                    }
                }
            }
        });

        const moveTooltip = (e) => {
            if (tooltip.classList.contains('hidden-force')) return;
            tooltip.classList.remove('opacity-0', 'scale-95', 'translate-y-2');
            const winWidth = window.innerWidth;
            const winHeight = window.innerHeight;
            const tipWidth = tooltip.offsetWidth;
            const tipHeight = tooltip.offsetHeight;
            const offset = 15;

            let newLeft = e.clientX + offset;
            let newTop = e.clientY + offset;

            if (newLeft + tipWidth > winWidth - 10) newLeft = e.clientX - offset - tipWidth;
            if (newTop + tipHeight > winHeight - 10) newTop = e.clientY - offset - tipHeight;

            tooltip.style.left = newLeft + 'px';
            tooltip.style.top = newTop + 'px';
        };

        const killTooltip = () => {
            observer.disconnect();

            activeElement = null;
            tooltip.classList.add('opacity-0', 'scale-95', 'translate-y-2');

            tooltip.classList.add('hidden-force');
            tooltip.classList.remove('tooltip-visible');
        };

        document.addEventListener('mousemove', (e) => {
            if (!activeElement) {
                const target = e.target.closest('[title-app]');
                if (target) {
                    activateTooltip(target, e);
                }
                return;
            }

            if (!activeElement.contains(e.target)) {
                killTooltip();

                const newTarget = e.target.closest('[title-app]');
                if (newTarget) {
                    activateTooltip(newTarget, e);
                }
                return;
            }

            moveTooltip(e);
        });

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const buildString = `build-${year}.${month}.${day}-rc1-${window.api.version}`;

        document.getElementById("versiona12").textContent = `v${window.api.version}`;
        document.getElementById("version-app-normal").textContent = `v${window.api.version}`;
        document.getElementById("version-app-build").onclick = () => {
            navigator.clipboard.writeText(buildString)
        };
        document.getElementById("version-app-build").innerHTML = `
    <span class="text-gray-300 font-mono text-xs">${buildString}</span> 
                    <i data-lucide="copy" class="w-3 h-3 text-gray-600 group-hover:text-white transition"></i>
    `

        function activateTooltip(target, e) {
            const text = target.getAttribute('title-app');
            if (!text) return;

            activeElement = target;
            tooltip.innerHTML = text;
            tooltip.classList.remove('hidden-force');

            moveTooltip(e);
            requestAnimationFrame(() => tooltip.classList.add('tooltip-visible'));

            observer.disconnect();
            observer.observe(target, {
                attributes: true,
                attributeFilter: ['title-app']
            });
        }

        document.addEventListener('mousedown', () => {
            killTooltip();
        });

        document.addEventListener('mouseleave', killTooltip);
        document.addEventListener('wheel', killTooltip, { passive: true });

        document.addEventListener('mouseover', (e) => {
            const target = e.target.closest('[title-app]');

            if (target && target !== activeElement) {
                if (activeElement) observer.disconnect();
                activateTooltip(target, e);
            }
        });

        verificarAtualizarVersao();

        document.getElementById("f43fd").onclick = () => {
            updateModalAc = false;
            showUpdateModal(donwoadversionapp);
        }

        setInterval(async () => {
            await verificarAtualizarVersao();
        }, 300000)

        var transfdv34 = localStorage.getItem("appLanguage") || "pt";
        appLanguage(transfdv34)
    })

    const modalUpdate = document.getElementById('modal-update');
    const modalUpdateContent = document.getElementById('modal-update-content');
    const versionTag = document.getElementById('update-version-tag');

    function showUpdateModal(versionName) {
        if (updateModalAc) return;
        if (versionTag) versionTag.innerText = versionName;

        modalUpdate.classList.remove('hidden');

        requestAnimationFrame(() => {
            modalUpdate.classList.remove('opacity-0');
            modalUpdateContent.classList.remove('scale-95');
            modalUpdateContent.classList.add('scale-100');
        });

        if (window.lucide) window.lucide.createIcons();
    }

    function closeUpdateModal() {
        modalUpdate.classList.add('opacity-0');
        modalUpdateContent.classList.remove('scale-100');
        modalUpdateContent.classList.add('scale-95');

        setTimeout(() => {
            modalUpdate.classList.add('hidden');
        }, 300);
    }

    document.getElementById('btn-update-later').addEventListener('click', () => {
        updateModalAc = true;
        closeUpdateModal();
    });

    document.getElementById('btn-update-now').addEventListener('click', () => {
        const btn = document.getElementById('btn-update-now');

        const oldHtml = btn.innerHTML;
        btn.innerHTML = `<span class="animate-spin h-4 w-4 border-2 border-black border-t-transparent rounded-full mr-2"></span> Iniciando...`;
        btn.disabled = true;
        btn.classList.add('opacity-80', 'cursor-not-allowed');

        window.api.updateLauncher();
    });

    async function verificarAtualizarVersao() {
        try {
            const response = await fetch('https://api.github.com/repos/vitorxcp/WorthLauncherProject/releases/latest');
            if (!response.ok) return;

            const data = await response.json();
            if (!data.tag_name) return;

            const versaoMaisRecente = data.tag_name;
            const versaoLocal = `v${window.api.version}`;

            if (versaoLocal !== versaoMaisRecente) {
                if ((Number(String(versaoLocal).replaceAll(".", "").replace("v", "").replace("-alpha", "")) - Number(String(versaoMaisRecente).replaceAll(".", "").replace("v", "").replace("-alpha", ""))) <= 3) {
                    if ((Number(String(versaoLocal).replaceAll(".", "").replace("v", "").replace("-alpha", "")) - Number(String(versaoMaisRecente).replaceAll(".", "").replace("v", "").replace("-alpha", ""))) === 0) return;
                    document.getElementById("f43fd").classList.remove('hidden-force');
                    donwoadversionapp = data.tag_name;
                    showUpdateModal(donwoadversionapp);
                } else {
                    donwoadversionapp = data.tag_name;
                    document.getElementById("f43fd").classList.remove('hidden-force');
                    showUpdateModal(donwoadversionapp);
                }
            }
        } catch (error) { }
    }

    const checkFirstRun = async () => {
        const fromInstaller = window.api.isInstallerLaunch ? await window.api.isInstallerLaunch() : false;
        if (fromInstaller) {
            document.getElementById('modal-step-1').classList.remove('hidden-force');
        }
    };
    checkFirstRun();

    const CONFIG = {
        url: 'http://elgae-sp1-b001.elgaehost.com.br:10379/admin/painel/blog',
        checkInterval: 5000,
        timeout: 5000
    };

    let isCheckingStatus = false;

    async function checkWebStatus() {
        if (isCheckingStatus) return;
        isCheckingStatus = true;

        const errorPage = document.getElementById('error-popup');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout);

        try {
            const response = await fetch(CONFIG.url, {
                method: 'HEAD',
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                if (!errorPage.className.includes("hidden-force")) {
                    loadBlogFeed();
                }
                errorPage.classList.add('hidden-force');
            } else {
                throw new Error(`Server returned ${response.status}`);
            }
        } catch (error) {
            if (error.name !== 'AbortError' && error.name !== 'DOMException') {
                console.warn("Status Check Failed:", error.message);
            }
            errorPage.classList.remove('hidden-force');
        } finally {
            isCheckingStatus = false;
        }
    }

    function scheduleNextCheck() {
        setTimeout(async () => {
            await checkWebStatus();
            scheduleNextCheck();
        }, CONFIG.checkInterval);
    }

    checkWebStatus().then(scheduleNextCheck);

    document.getElementById('btn-goto-step2').addEventListener('click', () => {
        const step1 = document.getElementById('modal-step-1');
        step1.classList.add('opacity-0');
        setTimeout(() => {
            step1.classList.add('hidden-force');
        }, 300);
    });

    let lastUpdatedUser = null;
    setInterval(() => {
        if (currentUser && currentUser.user && currentUser.user !== lastUpdatedUser) {
            window.api.updateNickName(currentUser.user);
            lastUpdatedUser = currentUser.user;
        }
    }, 2000);

    addLog("WorthLauncher carregado e pronto.");
} catch (e) {
    console.log(e);
    window.onerror = function (message, source, lineno, colno, error) {
        showCrashPopup(message, source, lineno);
        console.warn("CRASH DETECTADO:", message);
    };

    window.addEventListener('unhandledrejection', function (event) {
        console.error("PROMISE REJEITADA:", event.reason);
        showCrashPopup(event.reason ? event.reason.toString() : "Erro desconhecido em Promise", null, null);
    });

    window.copyErrorLog = () => {
        const text = document.getElementById('crash-log-text').innerText;
        navigator.clipboard.writeText(text);
        const icon = document.querySelector('#crash-card .lucide-copy');
        if (icon) icon.style.color = '#4ade80';
    };
}

function showCrashPopup(errorMessage, url, line) {
    const popup = document.getElementById('crash-popup');
    const logText = document.getElementById('crash-log-text');

    if (popup && logText) {
        const cleanMsg = errorMessage.replace('Uncaught ', '');
        logText.innerText = `[ERRO] ${cleanMsg}\n[LINHA] ${line || '?'}`;

        popup.classList.remove('hidden-force');

        if (window.lucide) window.lucide.createIcons();
    }
}

const loadingScreen = document.getElementById('modal-loadPage');
const curtainLeft = document.getElementById('curtain-left');
const curtainRight = document.getElementById('curtain-right');
const loadingContent = document.getElementById('loading-content');

document.addEventListener("DOMContentLoaded", () => {
    const video = document.getElementById('intro-video');

    if (video) {
        video.muted = true;
        video.playsInline = true;

        video.addEventListener('loadedmetadata', () => {
            if (video.currentTime < 3) video.currentTime = 3;
        });

        const attemptPlay = async () => {
            try {
                await video.play();
                video.classList.remove('opacity-0');
            } catch (error) {
                console.warn("Autoplay pausado (economia de energia):", error);
                video.classList.remove('opacity-0');
            }
        };

        attemptPlay();

        video.addEventListener('ended', () => {
            video.currentTime = 3;
            attemptPlay();
        });
    }
});

function hideLoading() {
    if (loadingContent) {
        loadingContent.style.opacity = '0';
        loadingContent.style.transform = 'scale(0.9)';
    }

    if (curtainLeft) curtainLeft.style.transform = 'translateX(-100%)';
    if (curtainRight) curtainRight.style.transform = 'translateX(100%)';

    setTimeout(() => {
        if (loadingScreen) {
            loadingScreen.style.pointerEvents = 'none';
            loadingScreen.style.display = 'none';
        }

        const video = document.getElementById('intro-video');
        if (video) video.pause();

    }, 1200);
}

function showLoading() {
    if (loadingScreen) {
        loadingScreen.style.display = 'flex';
        loadingScreen.style.pointerEvents = 'auto';
    }
    if (loadingContent) {
        loadingContent.style.opacity = '1';
        loadingContent.style.transform = 'scale(1)';
    }
    if (curtainLeft) curtainLeft.style.transform = 'translateX(0)';
    if (curtainRight) curtainRight.style.transform = 'translateX(0)';
}

const tempoAleatorio = Math.floor(Math.random() * (7000 - 2000 + 1)) + 3000;
setTimeout(() => {
    hideLoading();
}, tempoAleatorio);

if (window.api && window.api.onHeartbeat) {
    window.api.onHeartbeat(() => {
        if (window.api.sendHeartbeatAck) {
            window.api.sendHeartbeatAck();
        }
    });
}

if (window.api && window.api.onErrorNotification) {
    window.api.onErrorNotification((msg) => {
        if (typeof showGenericToast === 'function') {
            showGenericToast("⚠️ " + msg);
        } else {
            console.warn(msg);
        }
    });
}

const handleStopClick = async () => {
    console.log("Parando o jogo...");

    const result = await window.api.stopGame();

    if (result.success) {
        console.log("Jogo finalizado com sucesso!");
    }
};

let serverGeneratedCode = "";
let tempUserData = {};

function getElement(id) {
    const el = document.getElementById(id);
    if (!el) console.error(`[ERRO CRÍTICO] Elemento HTML com ID '${id}' não existe na página! Verifique.`);
    return el;
}

function openModal(modalId) {
    const modal = getElement(modalId);
    if (!modal) return;

    modal.classList.remove('hidden');
    void modal.offsetWidth;

    modal.classList.remove('opacity-0');
    const content = modal.querySelector('div.relative');
    if (content) {
        content.classList.remove('scale-95');
        content.classList.add('scale-100');
    }
}

function closeModal(modalId) {
    const modal = getElement(modalId);
    if (!modal) return;

    modal.classList.add('opacity-0');
    const content = modal.querySelector('div.relative');
    if (content) {
        content.classList.add('scale-95');
        content.classList.remove('scale-100');
    }

    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

function sendCode() {
    const idInput = document.getElementById('input-discord-id');
    const btnSend = document.getElementById('btn-send-discord');
    const errorContainer = document.getElementById('discord-id-error');

    if (errorContainer) errorContainer.classList.add('hidden');
    if (idInput) idInput.classList.remove('border-red-500', 'animate-pulse');

    const helpBox = document.getElementById('discord-help-box');
    const infoBox = document.getElementById('discord-info-box');
    if (helpBox) helpBox.classList.add('hidden');
    if (infoBox) infoBox.classList.remove('hidden');

    const id = idInput.value.trim();

    if (!/^\d{17,20}$/.test(id)) {
        showDiscordError("ID inválido. Use apenas números.");
        return;
    }

    const originalBtnContent = btnSend.innerHTML;
    btnSend.disabled = true;
    btnSend.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Enviando...`;
    if (window.lucide) window.lucide.createIcons();

    console.log(`[Socket] Enviando pedido para ID: ${id}`);

    socket.emit("discord:verifyUserId", { id: id }, (response) => {
        console.log("[Socket] Resposta Bruta:", response);

        let data = response;
        if (Array.isArray(response)) {
            data = response[0];
        }

        btnSend.disabled = false;
        btnSend.innerHTML = originalBtnContent;
        if (window.lucide) window.lucide.createIcons();

        if (!data || data.error) {
            console.warn("[Socket] Erro retornado:", data?.error);
            showDiscordError(data?.error || "Erro de conexão.");
            return;
        }

        if (data.success) {
            serverGeneratedCode = data.serverCode;
            tempUserData = { tag: data.tag, avatar: data.avatar };

            closeModal('modal-discord-connect');

            setTimeout(() => {
                const verifyInput = document.getElementById('input-verify-code');
                if (verifyInput) {
                    verifyInput.value = "";
                    verifyInput.classList.remove('border-red-500', 'text-red-400');
                }
                const errorMsg = document.getElementById('verify-error-msg');
                if (errorMsg) errorMsg.classList.add('opacity-0');

                openModal('modal-discord-verify');

                if (verifyInput) setTimeout(() => verifyInput.focus(), 100);
            }, 300);
        }
    });
}

function showDiscordError(msg) {
    console.log(`[UI] Mostrando erro: ${msg}`);
    const idInput = getElement('input-discord-id');
    const errorContainer = getElement('discord-id-error');

    if (idInput) {
        idInput.classList.add('border-red-500');
        idInput.classList.add('animate-pulse');
        setTimeout(() => idInput.classList.remove('animate-pulse'), 500);
    }

    if (errorContainer) {
        errorContainer.classList.remove('hidden');
        const span = errorContainer.querySelector('span');
        if (span) span.innerText = msg;
        else errorContainer.innerText = msg;
    }

    const helpBox = document.getElementById('discord-help-box');
    const infoBox = document.getElementById('discord-info-box');

    if (helpBox && infoBox) {
        infoBox.classList.add('hidden');
        helpBox.classList.remove('hidden');

        if (window.lucide) window.lucide.createIcons();
    }
}

async function verifyCode() {
    const input = getElement('input-verify-code');
    const errorMsg = getElement('verify-error-msg');

    if (!input) return;

    const userCode = input.value.trim();
    const btnConfirm = event.currentTarget;

    if (userCode !== serverGeneratedCode) {
        input.classList.add('border-red-500', 'text-red-400');
        if (errorMsg) errorMsg.classList.remove('opacity-0');
        return;
    }

    const originalText = btnConfirm.innerHTML;
    btnConfirm.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i>`;
    btnConfirm.disabled = true;
    if (window.lucide) window.lucide.createIcons();

    try {
        const discordId = document.getElementById('input-discord-id').value.trim();

        const response = await fetch(`https://japi.rest/discord/v1/user/${discordId}`);
        const json = await response.json();

        let finalData = {};

        if (json && json.data) {
            finalData = json.data;
        } else {
            finalData = {
                id: discordId,
                username: tempUserData.tag,
                avatarURL: tempUserData.avatar
            };
        }

        settings.discordData = finalData;
        saveSettings();

        if (socket && socket.connected) {
            socket.emit("client:discord_link", finalData);
        }

        updateDiscordSettingsUI();

        closeModal('modal-discord-verify');

        const usernameEl = document.getElementById('connected-username');
        const avatarEl = document.getElementById('connected-avatar');

        if (usernameEl) usernameEl.innerText = finalData.username || tempUserData.tag;
        if (avatarEl) avatarEl.src = finalData.avatarURL || tempUserData.avatar;

        setTimeout(() => {
            openModal('modal-discord-success');
        }, 300);

    } catch (err) {
        console.error("Erro ao finalizar vínculo:", err);
        showGenericToast("Erro ao salvar dados, mas verificado com sucesso.", "error");
        closeModal('modal-discord-verify');
    } finally {
        btnConfirm.disabled = false;
        btnConfirm.innerHTML = originalText;
    }
}

function updateDiscordSettingsUI() {
    const wrapper = document.getElementById('discord-settings-wrapper');
    if (!wrapper) return;

    const discordData = settings.discordData;

    if (!discordData) {
        wrapper.innerHTML = `
            <div class="flex items-center justify-between bg-[#5865F2]/5 p-4 rounded-xl border border-[#5865F2]/20 cursor-pointer hover:bg-[#5865F2]/10 hover:border-[#5865F2]/40 transition no-drag group"
                onclick="openModal('modal-discord-connect')">
                <div class="flex items-center gap-3">
                    <div class="p-2 rounded-lg bg-[#5865F2]/10 group-hover:bg-[#5865F2]/20 transition">
                        <i data-lucide="link" class="text-[#5865F2] w-5 h-5 transition"></i>
                    </div>
                    <div>
                        <span class="text-sm font-bold text-gray-200 block group-hover:text-white transition">Vincular Conta</span>
                        <span class="text-[10px] text-[#5865F2]/70 group-hover:text-[#5865F2] transition">Clique para definir seu ID</span>
                    </div>
                </div>
                <i data-lucide="chevron-right" class="w-4 h-4 text-gray-600 group-hover:text-[#5865F2] transition"></i>
            </div>
        `;
    } else {
        const avatarUrl = discordData.avatarURL || `https://cdn.discordapp.com/avatars/${discordData.id}/${discordData.avatar}.png`;

        wrapper.innerHTML = `
            <div class="bg-[#5865F2]/10 p-4 rounded-xl border border-[#5865F2]/30 relative overflow-hidden group">
                <div class="flex items-center justify-between relative z-10">
                    <div class="flex items-center gap-3">
                        <div class="relative">
                            <img src="${avatarUrl}" class="w-10 h-10 rounded-full border-2 border-[#5865F2] shadow-sm">
                            <div class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#1e1f22] rounded-full"></div>
                        </div>
                        <div>
                            <span class="text-xs text-[#5865F2] font-bold uppercase tracking-widest block mb-0.5">Conectado como</span>
                            <span class="text-sm font-bold text-white block leading-none">${discordData.username || 'Usuário'}</span>
                        </div>
                    </div>
                    
                    <button onclick="unlinkDiscord()" 
                        class="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/20 transition hover:shadow-red-500/20 shadow-lg" 
                        title-app="Desconectar">
                        <i data-lucide="log-out" class="w-4 h-4"></i>
                    </button>
                </div>
                <div class="absolute -right-4 -bottom-6 text-[#5865F2]/5 transform rotate-12 pointer-events-none">
                    <i data-lucide="webhook" class="w-24 h-24"></i>
                </div>
            </div>
        `;
    }

    if (window.lucide) window.lucide.createIcons();
}

window.unlinkDiscord = () => {
    openModal('modal-discord-unlink');
};

document.getElementById('btn-cancel-unlink').addEventListener('click', () => {
    closeModal('modal-discord-unlink');
});

document.getElementById('btn-confirm-unlink').addEventListener('click', () => {
    closeModal('modal-discord-unlink');

    if (socket && socket.connected) {
        socket.emit("client:discord_unlink");
    }

    delete settings.discordData;
    saveSettings();

    updateDiscordSettingsUI();

    showGenericToast("Conta desconectada com sucesso.", "success");
    addLog("Discord desvinculado pelo usuário.");
});

updateDiscordSettingsUI();

function backToStep1() {
    closeModal('modal-discord-verify');

    setTimeout(() => {
        const idInput = document.getElementById('input-discord-id');
        const errorContainer = document.getElementById('discord-id-error');
        const helpBox = document.getElementById('discord-help-box');
        const infoBox = document.getElementById('discord-info-box');

        if (idInput) idInput.classList.remove('border-red-500', 'animate-pulse');
        if (errorContainer) errorContainer.classList.add('hidden');

        if (helpBox) helpBox.classList.add('hidden');
        if (infoBox) infoBox.classList.remove('hidden');

        openModal('modal-discord-connect');
    }, 300);
}