lucide.createIcons();

let currentUser = null;
let userSelect = null;
let savedAccounts = JSON.parse(localStorage.getItem('worth_accounts')) || [];

const defaultSettings = { ram: '4G', fullscreen: false, closeLauncher: false, width: 854, height: 480 };
let settings = JSON.parse(localStorage.getItem('worth_settings')) || defaultSettings;

const logConsole = document.getElementById('log-console');
const btnPlay = document.getElementById('btn-play');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const progressContainer = document.getElementById('progress-container');
const accountMenu = document.getElementById('account-menu');
const modalOffline = document.getElementById('modal-offline');
const inputNick = document.getElementById('offline-nick');
const accountsListEl = document.getElementById('accounts-list');
const modalWelcome = document.getElementById('modal-welcome');
const isFirstRun = !localStorage.getItem('setup_complete');

if (isFirstRun) {
    modalWelcome.classList.remove('hidden-force');
}

document.getElementById('btn-finish-setup').addEventListener('click', async () => {
    const btn = document.getElementById('btn-finish-setup');

    btn.innerText = "Configurando...";
    btn.classList.add("opacity-50", "cursor-wait");

    if (createDesktop) {
        await window.api.createShortcut();
    }

    localStorage.setItem('setup_complete', 'true');

    modalWelcome.classList.add('opacity-0', 'pointer-events-none');

    addLog("Configuração inicial concluída.");

    setTimeout(() => {
        modalWelcome.classList.add('hidden-force');
    }, 500);
});

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

function selectAccount(acc) {
    currentUser = acc;
    localStorage.setItem('worth_last_user', JSON.stringify(acc));
    updateUserUI(acc.user, acc.type);
    toggleAccountMenu(false);
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
                <button class="text-gray-600 hover:text-red-500 p-2 rounded-lg hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition btn-remove-acc no-drag">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            `;

        div.addEventListener('click', (e) => {
            if (!e.target.closest('.btn-remove-acc')) selectAccount(acc);
        });

        div.querySelector('.btn-remove-acc').addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`Remover conta ${acc.user}?`)) removeAccount(idx);
        });

        accountsListEl.appendChild(div);
    });
    lucide.createIcons();
}

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
        addAccount({ user: res.user, type: 'offline', uuid: 'offline-uuid' });
        addLog(`Conta offline criada: ${res.user}`);
    }
});

document.getElementById('btn-ms-login').addEventListener('click', async () => {
    toggleAccountMenu(false);
    addLog("Autenticando Microsoft...");
    const res = await window.api.loginMicrosoft();
    if (res.success) {
        addAccount({ user: res.user, type: 'microsoft', uuid: res.uuid });
        addLog(`Bem-vindo, ${res.user}`);
    } else {
        addLog(`Erro: ${res.error}`);
    }
});

function updateSettingsUI() {
    document.getElementById('ram-slider').value = parseInt(settings.ram);
    document.getElementById('ram-display').innerText = settings.ram;
    document.getElementById('res-width').value = settings.width || 854;
    document.getElementById('res-height').value = settings.height || 480;
    updateToggleUI('fullscreen', settings.fullscreen);
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
    updateToggleUI(key, settings[key]);
}

function saveSettings() {
    settings.width = document.getElementById('res-width').value;
    settings.height = document.getElementById('res-height').value;
    localStorage.setItem('worth_settings', JSON.stringify(settings));

    const t = document.getElementById('toast');
    t.style.opacity = '1';
    setTimeout(() => t.style.opacity = '0', 2000);
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
    ['home', 'social', 'settings', 'store'].forEach(v => {
        const el = document.getElementById('view-' + v);
        const btn = document.getElementById('tab-' + v);
        if (v === tabName) {
            el.classList.remove('hidden-force');
            setTimeout(() => el.classList.add('fade-enter-active'), 10);
            btn.classList.add('active');
        } else {
            el.classList.add('hidden-force');
            el.classList.remove('fade-enter-active');
            btn.classList.remove('active');
        }
    });
}

btnPlay.addEventListener('click', async () => {
    if (!currentUser) {
        toggleAccountMenu(true);
        return;
    }

    btnPlay.disabled = true;
    btnPlay.innerHTML = `<span class="animate-spin h-5 w-5 border-2 border-black border-t-transparent rounded-full"></span>`;
    progressContainer.style.opacity = "1";

    if (btnPlay.as3cd) {
        addLog("Fechando sessão de jogo...");
        btnPlay.disabled = true;
        btnPlay.as3cd = false;
        btnPlay.innerHTML = `<i data-lucide="shield-alert" class="fill-black w-6 h-6"></i> FECHANDO JOGO`;
        lucide.createIcons();
        progressContainer.style.opacity = "0";
        const res = await window.api.abortGame();
        if (res.success) {
            addLog("Sessão de jogo fechada.");
            btnPlay.disabled = false;
            btnPlay.as3cd = false;
            btnPlay.innerHTML = `<i data-lucide="play" class="fill-black w-6 h-6"></i> JOGAR`;
            lucide.createIcons();
            progressContainer.style.opacity = "0";
        } else {
            addLog("Sessão de jogo Iniciada");
            btnPlay.disabled = false;
            btnPlay.as3cd = true;
            btnPlay.innerHTML = `<i data-lucide="pause" class="fill-black w-6 h-6"></i> SAIR DO JOGO`;
            lucide.createIcons();
            progressContainer.style.opacity = "0";
            progressBar.style.width = '0%';
        }
        return;
    }

    const res = await window.api.launchGame(
        { type: currentUser.type, user: currentUser.user, uuid: currentUser.uuid },
        settings
    );

    userSelect = { type: currentUser.type, user: currentUser.user, uuid: currentUser.uuid };

    if (!res.success) {
        addLog(`ERRO FATAL: ${res.error}`);
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
        addLog("MCLC: Processo do jogo iniciado.");
        if (settings.closeLauncher) setTimeout(() => window.api.close(), 5000);
    }
});

function addLog(msg) {
    const d = document.createElement('div');

    d.className = "text-[10px] text-gray-400 border-b border-white/5 pb-1 mb-1 font-mono hover:text-white transition break-all whitespace-pre-wrap";

    const time = new Date().toLocaleTimeString().split(' ')[0];
    d.innerHTML = `<span class="text-yellow-600 font-bold">[${time}]</span> ${msg}`;
    logConsole.prepend(d);
}

window.api.onLog(addLog);
window.api.onProgress((data) => {
    let pct = 0;
    if (data.task && data.total) pct = (data.task / data.total) * 100;
    progressBar.style.width = pct + '%';
    progressText.innerText = data.type ? `BAIXANDO ${data.type.toUpperCase()}` : "PREPARANDO...";
});

window.api.onGameClosed(() => {
    addLog("Sessão de jogo finalizada.");
    btnPlay.disabled = false;
    btnPlay.as3cd = false;
    btnPlay.innerHTML = `<i data-lucide="play" class="fill-black w-6 h-6"></i> JOGAR`;
    lucide.createIcons();
    progressContainer.style.opacity = "0";
    progressBar.style.width = '0%';
});

window.api.onGameStarted(() => {
    addLog("Sessão de jogo Iniciada");
    btnPlay.disabled = false;
    btnPlay.as3cd = true;
    btnPlay.innerHTML = `<i data-lucide="pause" class="fill-black w-6 h-6"></i> SAIR DO JOGO`;
    lucide.createIcons();
    progressContainer.style.opacity = "0";
    progressBar.style.width = '0%';
});

window.api.onGameStartedExtra(() => {
    addLog("Sessão de jogo Iniciada");
    btnPlay.disabled = false;
    btnPlay.as3cd = true;
    btnPlay.innerHTML = `<i data-lucide="loader" class="fill-black w-6 h-6"></i> INICIANDO JOGO`;
    lucide.createIcons();
    progressContainer.style.opacity = "0";
    progressBar.style.width = '0%';
});

document.getElementById('min-btn').addEventListener('click', window.api.minimize);
document.getElementById('close-btn').addEventListener('click', window.api.close);

updateSettingsUI();
const lastUser = JSON.parse(localStorage.getItem('worth_last_user'));
if (lastUser) selectAccount(lastUser);

addLog("WorthClient iniciado com sucesso.");

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
                statusEl.classList.remove("bg-yellow-500/10", "border-yellow-500/20");
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
})

const checkFirstRun = async () => {
    const fromInstaller = window.api.isInstallerLaunch ? await window.api.isInstallerLaunch() : false;

    if (fromInstaller) {
        document.getElementById('modal-step-1').classList.remove('hidden-force');
    }
};
checkFirstRun();

document.getElementById('btn-goto-step2').addEventListener('click', () => {
    const step1 = document.getElementById('modal-step-1');

    step1.classList.add('opacity-0');
    setTimeout(() => {
        step1.classList.add('hidden-force');
    }, 300);
});