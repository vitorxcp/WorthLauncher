const peq = require('./package.json');
const { autoUpdater } = require('electron-updater');
const sudo = require('sudo-prompt');
const { exec } = require('child_process');
const { app, BrowserWindow, ipcMain, shell, Tray, Menu } = require('electron');
const path = require('path');
const { Client } = require('minecraft-launcher-core');
const { Auth } = require('msmc');
const fs = require('fs-extra');
const https = require('https');
const AdmZip = require('adm-zip');
const os = require("os");
const CLIENT_ID = '1447664037440782418';
const DiscordRPC = require('discord-rpc');
const firstRunFile = path.join(app.getPath('appData'), '.worthlauncher', '.first_run');
const date = new Date();
const dateNow = Date.now();
const Seven = require('node-7z');
const axios = require('axios');
const sevenBin = require('7zip-bin');

autoUpdater.autoDownload = false;
autoUpdater.allowPrerelease = true;
autoUpdater.logger = require("electron-log");
autoUpdater.logger.transports.file.level = "info";

autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'vitorxcp',
    repo: 'WorthLauncher'
});

let isInstallerLaunch = false;
let { settings, saveDataSettings } = require('./plugins/settingsRegister.js');
let { updateDiscordActivity } = require('./plugins/RichPresencePlugin.js');
let gamePID = null;

if (fs.existsSync(firstRunFile)) {
    isInstallerLaunch = true;
    console.log("[SYSTEM] Instalação detectada (Flag encontrada).");

    try {
        fs.unlinkSync(firstRunFile);
    } catch (e) {
        console.error("[SYSTEM] Erro ao limpar flag de instalação:", e);
    }
} else {
    console.log("[SYSTEM] Inicialização normal.");
}

let logger = null;
try {
    logger = require('./plugins/logRegister.js');
    console.log = logger.log;
} catch (e) {
    console.error("Logger error:", e);
}

let rpc;
let nickname = "Jogador";

app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-renderer-backgrounding');

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            if (!mainWindow.isVisible()) mainWindow.show();
            mainWindow.focus();
        }
    });
}

const launcher = new Client();
let mainWindow;
let tray = null;
let configApp = {};
let mclcAuthorization = null;
let isQuitting = false;

const FORGE_VERSION = "1.8.9-11.15.1.2318-1.8.9";
const FORGE_URL = `https://maven.minecraftforge.net/net/minecraftforge/forge/${FORGE_VERSION}/forge-${FORGE_VERSION}-universal.jar`;
const JAVA_URL_WIN = "https://github.com/adoptium/temurin8-binaries/releases/download/jdk8u392-b08/OpenJDK8U-jre_x64_windows_hotspot_8u392b08.zip";

function getLauncherRoot() {
    return path.resolve(app.getPath('appData'), '.worthlauncher');
}

function getForgePath() {
    return path.join(getLauncherRoot(), `forge-${FORGE_VERSION}.jar`);
}

function getInternalModsPath() {
    if (app.isPackaged) {
        return path.join(process.resourcesPath, 'mods');
    }
    return path.join(__dirname, 'mods');
}

function getTokenPath() {
    return path.join(app.getPath('userData'), 'ms_refresh_token.json');
}

function downloadFile(url, dest, sendLog) {
    return new Promise((resolve, reject) => {
        sendLog(`[NETWORK] Conectando: ${url}`);

        const request = https.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                if (response.headers.location) {
                    return downloadFile(response.headers.location, dest, sendLog)
                        .then(resolve)
                        .catch(reject);
                }
            }

            if (response.statusCode !== 200) {
                return reject(new Error(`Erro HTTP: ${response.statusCode}`));
            }

            sendLog(`[NETWORK] Baixando: ${path.basename(dest)}...`);
            fs.ensureDirSync(path.dirname(dest));
            const file = fs.createWriteStream(dest);

            response.pipe(file);
            file.on('finish', () => {
                file.close(() => resolve());
            });
        });

        request.on('error', (err) => {
            if (fs.existsSync(dest)) fs.unlink(dest, () => { });
            reject(err);
        });
    });
}

async function ensureJava(sendLog) {
    const runtimeDir = path.join(getLauncherRoot(), 'runtime');
    const javaLocalDir = path.join(runtimeDir, 'java-runtime-gamma');

    const execName = process.platform === 'win32' ? 'javaw.exe' : 'java';
    const localJavaPath = path.join(javaLocalDir, 'bin', execName);

    if (fs.existsSync(localJavaPath)) {
        sendLog("[JAVA] Usando Java portátil (Sem Console).");
        return localJavaPath;
    }

    sendLog("[JAVA] Java portátil não encontrado. Iniciando instalação...");
    const zipPath = path.join(runtimeDir, 'java_installer.zip');

    try {
        fs.ensureDirSync(runtimeDir);

        await downloadFile(JAVA_URL_WIN, zipPath, sendLog);

        sendLog("[JAVA] Extraindo arquivos...");
        const zip = new AdmZip(zipPath);
        zip.extractAllTo(runtimeDir, true);

        const folders = fs.readdirSync(runtimeDir).filter(f => fs.statSync(path.join(runtimeDir, f)).isDirectory());
        const extractedFolder = folders.find(f => f.includes("jdk") || f.includes("jre"));

        if (extractedFolder) {
            const oldPath = path.join(runtimeDir, extractedFolder);
            if (fs.existsSync(javaLocalDir)) fs.removeSync(javaLocalDir);
            fs.renameSync(oldPath, javaLocalDir);
        }

        fs.unlinkSync(zipPath);
        sendLog("[JAVA] Instalação concluída com sucesso!");

        if (fs.existsSync(localJavaPath)) return localJavaPath;
        throw new Error("Executável não encontrado após extração.");

    } catch (err) {
        sendLog(`[ERRO] Falha crítica no Java: ${err.message}`);
        return 'java';
    }
}

function startRPC() {
    if (rpc) {
        try {
            rpc.destroy();
        } catch (e) {
            console.error("[DEBUG] Erro ao limpar instância antiga:", e);
        }
    }

    rpc = new DiscordRPC.Client({ transport: 'ipc' });

    rpc.on('ready', () => {
        console.log("[DEBUG] - RPC Discord iniciado com sucesso.");

        updateDiscordActivity("Navegando no Launcher", "Ocioso", rpc, nickname);
    });

    rpc.on('disconnected', () => {
        console.log('[DEBUG] - RPC Discord desconectado! Tentando reconectar em 5s...');
        retryConnection();
    });

    rpc.login({ clientId: CLIENT_ID }).catch(err => {
        console.log("[DEBUG] - Não foi possível conectar ao Discord (fechado?). Tentando novamente em 5s...");
        retryConnection();
    });
}

function retryConnection() {
    if (global.rpcTimeout) clearTimeout(global.rpcTimeout);

    global.rpcTimeout = setTimeout(() => {
        startRPC();
    }, 5000);
}

function createTray() {
    if (tray) {
        try {
            tray.destroy();
        } catch (e) { }
    }

    let iconPath = path.join(__dirname, 'build/assets/icon.png');
    if (!fs.existsSync(iconPath)) {
        iconPath = path.join(process.resourcesPath, 'build/assets/icon.png');
    }

    if (fs.existsSync(iconPath)) {
        tray = new Tray(iconPath);
        const contextMenu = Menu.buildFromTemplate([
            {
                label: 'Abrir Launcher',
                click: () => {
                    if (mainWindow) mainWindow.show();
                }
            },
            { type: 'separator' },
            {
                label: 'Sair Completamente',
                click: () => {
                    isQuitting = true;
                    app.quit();
                }
            }
        ]);
        tray.setToolTip('WorthLauncher');
        tray.setContextMenu(contextMenu);
        tray.on('double-click', () => {
            if (mainWindow) mainWindow.show();
        });
    }
}

function createWindow() {
    if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
        return;
    }

    mainWindow = new BrowserWindow({
        width: 1100,
        height: 700,
        minWidth: 1000,
        minHeight: 650,
        frame: false,
        backgroundColor: '#00000000',
        icon: path.join(__dirname, 'build/assets/icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'build', 'preload.js'),
            contextIsolation: true,
            nodeIntegration: true,
            devTools: true
        }
    });

    const isDev = !app.isPackaged;


    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        startRPC();
    });

    mainWindow.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault();
            mainWindow.hide();
            return false;
        }
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
}

const createSplashWindow = () => {
    splashWindow = new BrowserWindow({
        width: 350,
        height: 450,
        frame: false,
        backgroundColor: '#00000000',
        icon: path.join(__dirname, 'build/assets/icon.png'),
        alwaysOnTop: false,
        resizable: false,
        webPreferences: {
            contextIsolation: false,
            nodeIntegration: true,
            devTools: true
        },
    });
    splashWindow.loadFile('ui/splash.html');
    splashWindow.setTitle("WorthLauncher");
};

function restartApp() {
    app.relaunch();
    app.exit(0);
}

const initializeApp = () => {
    console.log("[DEBUG_LOG] - Inicializando aplicação...");
    createSplashWindow();
    splashWindow.show()
};

app.whenReady().then(async () => {
    fs.ensureDirSync(getLauncherRoot());

    await loadSessionFromCache();

    const modsPath = getInternalModsPath();
    if (!fs.existsSync(modsPath)) {
        fs.ensureDirSync(modsPath);
        console.log(`[SISTEMA] Pasta de mods criada em: ${modsPath}`);
    }

    initializeApp();
})

app.on('window-all-closed', () => { });

app.on('before-quit', () => {
    isQuitting = true;
});

async function syncMods(sendLog) {
    const internalMods = getInternalModsPath();
    const gameMods = path.join(getLauncherRoot(), 'mods');

    try {
        fs.ensureDirSync(gameMods);
        if (!fs.existsSync(internalMods)) return;

        const files = fs.readdirSync(internalMods);
        if (files.length === 0) return;

        sendLog(`[MODS] Sincronizando ${files.length} mods...`);
        await fs.copy(internalMods, gameMods, { overwrite: true });
        sendLog("[MODS] Sincronização concluída.");
    } catch (err) {
        sendLog(`[MODS] Erro na cópia: ${err.message}`);
    }
}

async function loadSessionFromCache() {
    const tokenPath = getTokenPath();
    if (!fs.existsSync(tokenPath)) return false;

    try {
        const data = await fs.readJson(tokenPath);
        if (!data || !data.refresh_token) throw new Error("Token inválido.");

        console.log("[AUTH] Validando token salvo...");
        const authManager = new Auth("select_account");

        const xbox = await authManager.refresh(data.refresh_token);
        const mc = await xbox.getMinecraft();

        if (!mc || !mc.mclc) throw new Error("Falha no perfil.");

        await fs.writeJson(tokenPath, {
            refresh_token: xbox.msToken.refresh_token,
            name: mc.profile.name
        });

        mclcAuthorization = mc.mclc();
        console.log(`[AUTH] Login restaurado: ${mc.profile.name}`);
        return true;

    } catch (e) {
        console.error(`[AUTH] Sessão expirada: ${e.message}`);
        try { await fs.unlink(tokenPath); } catch { }
        return false;
    }
}

ipcMain.handle('app:check-installer-launch', () => {
    return isInstallerLaunch;
});

ipcMain.handle('user:update-nick', (event, nick) => {
    nickname = nick;
    updateDiscordActivity(null, null, rpc, nickname)
});

ipcMain.handle('settings:update', (event, receivedSettings) => {
    try {
        const updates = typeof receivedSettings === "string"
            ? JSON.parse(receivedSettings)
            : receivedSettings;

        settings = receivedSettings;

        saveDataSettings(settings);
        return true;

    } catch (e) {
        console.error("ERRO FATAL:", e.message || e);
        return false;
    }
});

ipcMain.handle('auth:microsoft', async () => {
    try {
        if (mclcAuthorization) { }

        const authManager = new Auth("select_account");
        const xbox = await authManager.launch("electron");
        const mc = await xbox.getMinecraft();

        if (!mc || !mc.mclc) {
            return { success: false, error: "Conta sem Minecraft Java." };
        }

        await fs.writeJson(getTokenPath(), {
            refresh_token: xbox.msToken.refresh_token,
            name: mc.profile.name
        });

        mclcAuthorization = mc.mclc();

        return {
            success: true,
            user: mc.profile.name,
            uuid: mc.profile.id,
            type: "microsoft"
        };

    } catch (err) {
        console.error(err);
        return { success: false, error: err.message || "Erro Login Microsoft" };
    }
});

ipcMain.handle("auth:offline", async (event, username) => {
    return {
        success: true,
        user: username,
        uuid: "00000000-0000-0000-0000-000000000000",
        type: "offline"
    };
});

ipcMain.handle("game:launch", async (event, authDetails, config) => {
    configApp = config;
    gamePID = null;

    const sendLog = (msg) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("log", msg);
        }
    };

    const ROOT = getLauncherRoot();
    const FORGE_PATH = getForgePath();

    let javaExecutable;
    try {
        javaExecutable = await ensureJava(sendLog);
    } catch (e) {
        return { success: false, error: "Erro Java: " + e.message };
    }

    let authorization;

    if (authDetails.type === "microsoft") {
        if (!mclcAuthorization) {
            sendLog("[AUTH] Recuperando sessão Microsoft...");
            const restored = await loadSessionFromCache();
            if (restored) {
                sendLog("[AUTH] Sessão recuperada.");
                authorization = mclcAuthorization;
            } else {
                return { success: false, error: "Sessão expirada. Logue novamente." };
            }
        } else {
            authorization = mclcAuthorization;
        }
    } else {
        authorization = {
            access_token: "null",
            client_token: "null",
            uuid: "00000000-0000-0000-0000-000000000000",
            name: authDetails.user,
            user_properties: {},
            meta: { type: "mojang", demo: false }
        };
    }

    try {
        if (!fs.existsSync(FORGE_PATH)) {
            await downloadFile(FORGE_URL, FORGE_PATH, sendLog);
        }
        await syncMods(sendLog);
    } catch (err) {
        return { success: false, error: err.message };
    }

    updateDiscordActivity("Iniciando o Client...", "Carregando", rpc, nickname);

    nickname = authDetails.user;

    const isFullscreen = (config.fullscreen === true || String(config.fullscreen) === 'true');

    try {
        const optionsPath = path.join(ROOT, 'options.txt');
        let optionsContent = "";

        if (fs.existsSync(optionsPath)) {
            optionsContent = fs.readFileSync(optionsPath, 'utf8');
        }

        if (optionsContent.includes("fullscreen:")) {
            optionsContent = optionsContent.replace(/fullscreen:(true|false)/g, `fullscreen:${isFullscreen}`);
        } else {
            optionsContent += `\nfullscreen:${isFullscreen}`;
        }

        fs.writeFileSync(optionsPath, optionsContent);
        sendLog(`[CONFIG] options.txt atualizado -> Fullscreen: ${isFullscreen}`);

    } catch (e) {
        console.error("[CONFIG] Erro ao editar options.txt:", e);
    }

    sendLog(`[CONFIG] Fullscreen: ${isFullscreen ? 'ATIVADO' : 'DESATIVADO'} | Res: ${config.width}x${config.height} | RAM: ${config.ram}`);

    const opts = {
        clientPackage: null,
        authorization: authorization,
        root: ROOT,
        version: {
            number: "1.8.9",
            type: "release"
        },
        forge: FORGE_PATH,
        memory: {
            max: config.ram || "4G",
            min: "2G"
        },
        javaPath: javaExecutable,
        window: {
            fullscreen: isFullscreen,
            width: parseInt(config.width) || 854,
            height: parseInt(config.height) || 480
        },
    };

    launcher.removeAllListeners();

    launcher.launcher?.on("spawn", (child) => {
        if (child && child.pid) {
            gamePID = child.pid;
            console.log(`[SYSTEM] PID CAPTURADO (SPAWN REAL): ${gamePID}`);
        }
    });

    let hasStarted = false;

    const checkPID = () => {
        if (!gamePID && launcher.child && launcher.child.pid) {
            gamePID = launcher.child.pid;
            console.log(`[SYSTEM] PID Capturado: ${gamePID}`);
        }
    };

    launcher.on("debug", (msg) => {
        if (typeof msg === "string" && msg.includes("Spawned child process with pid")) {
            const pid = parseInt(msg.split("pid")[1].trim());
            if (!isNaN(pid)) {
                gamePID = pid;
                console.log(`[SYSTEM] PID CAPTURADO (DEBUG): ${gamePID}`);
            }
        }
    });

    launcher.on("data", (e) => {
        checkPID();
        sendLog(`[GAME] ${e}`);

        var servername = null;

        if (String(e).toLowerCase().includes("connecting to")) {
            if (String(e).toLowerCase().includes("redeworth.com") || String(e).toLowerCase().includes("redesky.net")) {
                servername = "Rede Worth";
            } else if (String(e).toLowerCase().includes("hypixel.net")) {
                servername = "Hypixel";
            } else if (String(e).toLowerCase().includes("mush.com.br")) {
                servername = "Mush";
            }

            if (servername) {
                updateDiscordActivity(`Jogando em ${servername}`, "No jogo", rpc, nickname);
            } else {
                updateDiscordActivity("Jogando em Servidor Privado", "Jogando Minecraft", rpc, nickname);
            }
        }

        if (!hasStarted && e) {
            if (String(e).includes("LWJGL") || String(e).includes("OpenAL") || String(e).includes("Setting user") || String(e).includes("[Client thread/INFO]")) {
                hasStarted = true;

                checkPID();
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send("game:started");

                    updateDiscordActivity("No jogo", `Jogando como ${nickname}`, rpc, nickname);

                    if (configApp.closeLauncher) {
                        sendLog("[SYSTEM] Minimizando para bandeja...");
                        mainWindow.hide();
                        if (tray) {
                            try {
                                tray.displayBalloon({
                                    title: 'WorthLauncher',
                                    content: 'Rodando em segundo plano.'
                                });
                            } catch (e) { }
                        }
                    } else {
                        if (tray) {
                            try {
                                tray.displayBalloon({
                                    title: 'WorthLauncher',
                                    content: 'Client iniciado com sucesso.'
                                });
                            } catch (e) { }
                        }
                    }
                }
                sendLog("[SYSTEM] Jogo Iniciado!");
            }
        }
    });

    launcher.on("progress", (e) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("progress", e);
        }
    });

    launcher.on("close", (e) => {
        gamePID = null;
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.show();
            mainWindow.focus();
            mainWindow.webContents.send("game:closed");
        }
        sendLog("[SYSTEM] Jogo Fechado. Restaurando launcher.");
        updateDiscordActivity("Navegando no Launcher", "Ocioso", rpc, nickname);
    });

    try {
        sendLog(`[SYSTEM] Iniciando JVM...`);
        await launcher.launch(opts);
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.on("firstUpdate", (event, data) => {
    createTray();
    createWindow();
    splashWindow.close();
})

ipcMain.on("updateVersionApp", async (event, data) => {
    restartApp();
})

ipcMain.on("updateVerify", () => {
    if (!app.isPackaged) {
        console.log("[DEV] Pulando verificação de update.");
        if (splashWindow) splashWindow.webContents.send("firstUpdate", false);
        return;
    }

    console.log("[UPDATE] Verificando...");
    autoUpdater.checkForUpdates().catch(err => {
        console.error("[UPDATE CRITICAL]", err);
        if (splashWindow && !splashWindow.isDestroyed()) {
            splashWindow.webContents.send("firstUpdate", false);
        }
    });
});

autoUpdater.on('update-available', (info) => {
    console.log("[UPDATE] Encontrado:", info.version);
    if (splashWindow) splashWindow.webContents.send("yepUpdate", true);

    autoUpdater.downloadUpdate();
});

autoUpdater.on('update-not-available', () => {
    if (splashWindow) splashWindow.webContents.send("firstUpdate", false);
});

autoUpdater.on('download-progress', (progressObj) => {
    if (splashWindow) {
        splashWindow.webContents.send("outputPercentUpdate", {
            percent: Math.round(progressObj.percent),
            transferred: progressObj.transferred,
            total: progressObj.total
        });
    }
});

autoUpdater.on('update-downloaded', (info) => {
    console.log("[UPDATE] Download pronto. Preparando instalação...");

    if (splashWindow) {
        splashWindow.webContents.send("updateDonwloadFirst", true);

        let fakeProgress = 0;
        const interval = setInterval(() => {
            fakeProgress += 10;
            if (splashWindow && !splashWindow.isDestroyed()) {
                splashWindow.webContents.send("outputPercentExtractedFiles", fakeProgress);
            }

            if (fakeProgress >= 100) {
                clearInterval(interval);

                splashWindow.webContents.send("firstUpdate", true);

                setTimeout(() => {
                    autoUpdater.quitAndInstall(true, true);
                }, 1000);
            }
        }, 150);
    }
});

autoUpdater.on('error', (err) => {
    console.error("[UPDATE ERROR]", err);
    if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.webContents.send("firstUpdate", false);
    }
});

ipcMain.on("window:close", () => {
    isQuitting = true;
    app.quit();
});

ipcMain.on("window:minimize", () => mainWindow?.minimize());