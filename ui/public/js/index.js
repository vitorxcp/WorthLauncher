lucide.createIcons();

let currentUser = null;
let userSelect = null;
let savedAccounts = JSON.parse(localStorage.getItem('worth_accounts')) || [];
let donwoadversionapp = "";

try {
    const defaultSettings = { ram: '4G', fullscreen: false, closeLauncher: false, width: 900, height: 550, discordRichPresence: true };
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
    const modalWelcome = document.getElementById('modal-welcome');
    const isFirstRun = !localStorage.getItem('setup_complete');

    let settings = JSON.parse(localStorage.getItem('worth_settings')) || defaultSettings;

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
            '&': '&amp;', '�': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
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

    function addLogToUI(msg, forceType = null) {
        if (!logConsole || !msg) return;

        const rawText = typeof msg === 'object' ? JSON.stringify(msg) : String(msg);
        const cleanText = rawText.replace(MINECRAFT_COLOR_REGEX, '');
        const type = forceType || detectLogType(cleanText);
        const style = LOG_STYLES[type] || LOG_STYLES['info'];
        const line = document.createElement("div");
        line.className = `flex gap-2 px-2 py-0.5 rounded ${style.bg} transition-colors text-xs font-mono border-l-2 border-transparent hover:border-white/20 items-start group`;
        const processedMessage = typeof parseMinecraftText === 'function' ? parseMinecraftText(rawText) : rawText;
        const time = typeof getTimestamp === 'function' ? getTimestamp() : new Date().toLocaleTimeString('pt-BR', { hour12: false });
        const isStacktrace = type === 'trace' && cleanText.trim().startsWith('at ');
        const messageClass = isStacktrace ? 'text-[11px] opacity-75' : 'text-xs';

        console.log(msg)

        line.innerHTML = `
        <span class="text-gray-600 select-none opacity-50 shrink-0 text-[10px] pt-[2px] w-[50px] text-right mr-1 group-hover:opacity-100 transition-opacity">
            ${time}
        </span>
        
        <span class="${style.iconColor} font-bold select-none w-11 text-center opacity-90 text-[10px] pt-[2px] shrink-0 bg-black/10 rounded px-1">
            ${style.icon}
        </span>
        
        <span class="${style.text} ${messageClass} flex-1 break-all leading-tight pt-[1px]">
            ${processedMessage}
        </span>
    `;

        logConsole.appendChild(line);

        if (logConsole.childElementCount > MAX_LOG_LINES) {
            logConsole.removeChild(logConsole.firstChild);
        }

        const isNearBottom = logConsole.scrollTop + logConsole.clientHeight >= logConsole.scrollHeight - 100;
        if (isNearBottom) {
            requestAnimationFrame(() => {
                logConsole.scrollTop = logConsole.scrollHeight;
            });
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
        // addLogToUI(args.join(' '), 'info');
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
        const text = logConsole.innerText;
        navigator.clipboard.writeText(text).then(() => {
            showGenericToast("Logs copiados para a área de transferência!");
        }).catch(err => {
            console.error("Falha ao copiar logs");
        });
    };

    function showGenericToast(msg) {
        let t = document.getElementById('toast');
        if (!t) {
            t = document.createElement('div');
            t.id = 'toast';
            t.className = "fixed bottom-10 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-full text-xs border border-white/10 shadow-xl transition-opacity duration-300 opacity-0 pointer-events-none z-50";
            document.body.appendChild(t);
        }
        t.innerText = msg;
        t.style.opacity = '1';
        setTimeout(() => t.style.opacity = '0', 2000);
    }

    if (isFirstRun) {
        modalWelcome.classList.remove('hidden-force');
    }

    document.getElementById('btn-finish-setup').addEventListener('click', async () => {
        const btn = document.getElementById('btn-finish-setup');
        const modal = document.getElementById('modal-welcome');
        const card = document.getElementById('welcome-card');

        btn.innerHTML = `<span class="animate-spin h-5 w-5 border-2 border-black border-t-transparent rounded-full mr-2"></span> INICIANDO...`;
        btn.classList.add('opacity-80', 'cursor-wait');

        setTimeout(() => {
            localStorage.setItem('setup_complete', 'true');
            card.classList.add('scale-90', 'opacity-0');
            modal.classList.add('opacity-0');
            setTimeout(() => {
                modal.classList.add('hidden-force');
                addLog("Setup inicial finalizado.");
            }, 700);
        }, 600);
    });

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
        document.getElementById('user-avatar').src = type === 'none' ? 'https://mc-heads.net/avatar/Steve' : `https://mc-heads.net/avatar/${user}`;

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
            div.className = "flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition group cursor-pointer border border-transparent hover:border-white/10 mb-2";
            div.innerHTML = `
                <img src="https://mc-heads.net/avatar/${acc.user}" class="w-8 h-8 rounded-lg bg-black/50">
                <div class="flex-1 overflow-hidden">
                    <div class="text-sm font-bold text-white truncate leading-none">${acc.user}</div>
                    <div class="text-[9px] text-gray-500 uppercase font-bold mt-1">${acc.type}</div>
                </div>
                <button title-app="Remover Conta" class="text-gray-600 hover:text-red-500 p-2 rounded-lg hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition btn-remove-acc no-drag">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            `;

            div.addEventListener('click', (e) => {
                if (!e.target.closest('.btn-remove-acc')) selectAccount(acc);
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
    const targetNameSpan = document.getElementById('delete-target-name');


    function openDeleteModal(idx, username) {
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
            accountMenu.classList.add('dropdown-active');
            renderAccountsList();
        } else {
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
        const isActive = accountMenu.classList.contains('dropdown-active');
        toggleAccountMenu(!isActive);
    });

    document.getElementById('btn-close-accounts').addEventListener('click', () => toggleAccountMenu(false));

    document.getElementById('btn-off-login').addEventListener('click', () => {
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

        if (logConsole) logConsole.innerHTML = `
        <div class="text-gray-500 italic border-b border-white/5 pb-1 mb-2 text-[10px]">Terminal limpo pelo Sistema (novo client iniciando).</div>
    `;

        btnPlay.disabled = true;
        btnPlay.innerHTML = `<span class="animate-spin h-5 w-5 border-2 border-black border-t-transparent rounded-full"></span>`;
        progressContainer.style.opacity = "1";

        // Desativado para solução de erros:
        // if (btnPlay.as3cd) {
        //     addLog("Solicitando fechamento do jogo...", 'warn');
        //     btnPlay.disabled = true;
        //     btnPlay.as3cd = false;
        //     btnPlay.innerHTML = `<i data-lucide="shield-alert" class="fill-black w-6 h-6"></i> FECHANDO JOGO`;
        //     lucide.createIcons();
        //     progressContainer.style.opacity = "0";
        //     const res = await window.api.abortGame();
        //     if (res.success) {
        //         addLog("Jogo fechado forçadamente.", 'success');
        //         btnPlay.disabled = false;
        //         btnPlay.as3cd = false;
        //         btnPlay.innerHTML = `<i data-lucide="play" class="fill-black w-6 h-6"></i> JOGAR`;
        //         lucide.createIcons();
        //         progressContainer.style.opacity = "0";
        //     } else {
        //         addLog("Falha ao fechar jogo, restaurando estado.", 'error');
        //         btnPlay.disabled = false;
        //         btnPlay.as3cd = true;
        //         btnPlay.innerHTML = `<i data-lucide="pause" class="fill-black w-6 h-6"></i> SAIR DO JOGO`;
        //         lucide.createIcons();
        //         progressContainer.style.opacity = "0";
        //         progressBar.style.width = '0%';
        //     }
        //     return;
        // }

        const res = await window.api.launchGame(
            { type: currentUser.type, user: currentUser.user, uuid: currentUser.uuid },
            settings
        );

        userSelect = { type: currentUser.type, user: currentUser.user, uuid: currentUser.uuid };

        if (!res.success) {
            console.error(`ERRO DE LANÇAMENTO: ${res.error}`);
            btnPlay.disabled = false;
            btnPlay.as3cd = false;
            btnPlay.innerHTML = `<i data-lucide="play" class="fill-black w-6 h-6"></i> JOGAR`;
            lucide.createIcons();
            progressContainer.style.opacity = "0";
            if (res.error.includes("expirada")) {
                alert("Login expirado. Reconecte sua conta.");
                removeAccount(savedAccounts.findIndex(a => a.user === currentUser.user));
            }
        } else {
            addLog("Processo do jogo iniciado com PID: " + (res.pid || 'N/A'), 'success');
            if (settings.closeLauncher) setTimeout(() => window.api.close(), 5000);
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
        btnPlay.innerHTML = `<i data-lucide="play" class="fill-black w-6 h-6"></i> JOGAR`;
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
        btnPlay.disabled = true;
        btnPlay.as3cd = true;
        btnPlay.innerHTML = `JOGANDO`;
        lucide.createIcons();
        progressContainer.style.opacity = "0";
        progressBar.style.width = '0%';
        processPercentText.textContent = "0%"
    });

    window.api.onGameStartedExtra(() => {
        addLog("Inicializando JVM e Assets...", 'info');
        btnPlay.disabled = true;
        btnPlay.as3cd = true;
        btnPlay.innerHTML = `<i data-lucide="loader" class="fill-black w-6 h-6"></i> INICIANDO JOGO`;
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
            tooltip.classList.remove('tooltip-visible');
            tooltip.classList.add('hidden-force');
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
            showUpdateModal(donwoadversionapp);
        }

        setInterval(async () => {
            await verificarAtualizarVersao();
        }, 300000)
    })

    const modalUpdate = document.getElementById('modal-update');
    const modalUpdateContent = document.getElementById('modal-update-content');
    const versionTag = document.getElementById('update-version-tag');

    function showUpdateModal(versionName) {
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
            const response = await fetch('https://api.github.com/repos/vitorxcp/WorthLauncher/releases/latest');
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
        timeout: 3000
    };

    async function checkWebStatus() {
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
                errorPage.classList.remove('hidden-force');
            }
        } catch (error) {
            console.log(error)
            errorPage.classList.remove('hidden-force');
        }
    }

    setInterval(checkWebStatus, CONFIG.checkInterval);
    checkWebStatus();

    document.getElementById('btn-goto-step2').addEventListener('click', () => {
        const step1 = document.getElementById('modal-step-1');
        step1.classList.add('opacity-0');
        setTimeout(() => {
            step1.classList.add('hidden-force');
        }, 300);
    });

    setInterval(() => {
        if (currentUser ? currentUser.user : null) {
            window.api.updateNickName(currentUser.user);
        }
    }, 1000)

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

function hideLoading() {
    loadingScreen.classList.remove('modal-visible');
    loadingScreen.classList.add('modal-hidden');
}

function showLoading() {
    requestAnimationFrame(() => {
        loadingScreen.classList.remove('modal-hidden');
        loadingScreen.classList.add('modal-visible');
    });
}

setTimeout(() => {
    hideLoading();
}, 2000);