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

let isInstallerLaunch = false;
let { settings, saveDataSettings } = require('./plugins/settingsRegister.js');

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
        sendLog(`[NETWORK] Baixando: ${path.basename(dest)}...`);
        fs.ensureDirSync(path.dirname(dest));
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                return reject(new Error(`Erro HTTP: ${response.statusCode}`));
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close(() => resolve());
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => { });
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
        sendLog("[JAVA] Usando Java portátil instalado.");
        return localJavaPath;
    }

    try {
        const check = spawnSync('java', ['-version']);
        if (check.error) throw new Error("Java não global");
        sendLog("[JAVA] Java global detectado, mas baixaremos a versão otimizada (Java 8).");
    } catch (e) {
        sendLog("[JAVA] Java não encontrado no sistema.");
    }

    sendLog("[JAVA] Iniciando instalação do Java Runtime...");
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

        sendLog("[JAVA] Instalação do Java concluída!");

        if (fs.existsSync(localJavaPath)) return localJavaPath;
        throw new Error("Executável do Java não encontrado após extração.");

    } catch (err) {
        sendLog(`[ERRO] Falha ao instalar Java: ${err.message}`);
        return process.platform === 'win32' ? 'javaw' : 'java';
    }
}

let rpcInterval = null;

function updateDiscordActivity(details, state) {
    if (!rpc) return;
    if (!settings.discordRichPresence) {
        rpc.clearActivity().catch((err) => {
            console.error("[RPC] Erro ao limpar atividade:", err);
        });

        return;
    };

    if (rpcInterval) clearInterval(rpcInterval);

    const activityUpdater = () => {
        if (!rpc) return;
        if (!settings.discordRichPresence) {
            rpc.clearActivity().catch((err) => {
                console.error("[RPC] Erro ao limpar atividade:", err);
            });

            return;
        };

        rpc.setActivity({
            details: details,
            state: state,
            largeImageKey: 'large_image',
            largeImageText: 'WorthLauncher',
            smallImageKey: `https://mc-heads.net/avatar/${nickname}/128`,
            smallImageText: nickname,
            instance: false,
            startTimestamp: dateNow
        }).catch((err) => {
            console.error("[RPC] Erro ao atualizar:", err);
        });
    };

    activityUpdater();

    rpcInterval = setInterval(activityUpdater, 1000);
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

        updateDiscordActivity("Navegando no Launcher", "Ocioso");
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
    mainWindow = new BrowserWindow({
        width: 1100,
        height: 700,
        minWidth: 1000,
        minHeight: 650,
        frame: false,
        transparent: true,
        show: false,
        backgroundColor: '#00000000',
        icon: path.join(__dirname, 'build/assets/icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            devTools: true
        }
    });

    mainWindow.loadFile('index.html');

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

app.whenReady().then(async () => {
    fs.ensureDirSync(getLauncherRoot());

    await loadSessionFromCache();

    const modsPath = getInternalModsPath();
    if (!fs.existsSync(modsPath)) {
        fs.ensureDirSync(modsPath);
        console.log(`[SISTEMA] Pasta de mods criada em: ${modsPath}`);
    }

    createTray();
    createWindow();
});

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
        return { success: false, error: "Erro crítico ao configurar Java: " + e.message };
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

    updateDiscordActivity("Iniciando o Client...", "Carregando");

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

    let hasStarted = false;

    launcher.on("debug", (e) => sendLog(`[DEBUG] ${e}`));

    launcher.on("data", (e) => {
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
                updateDiscordActivity(`Jogando em ${servername}`, "No jogo");
            } else {
                updateDiscordActivity("Jogando em Servidor Privado", "Jogando Minecraft");
            }
        }

        if (!hasStarted && e) {
            if (String(e).includes("LWJGL") || String(e).includes("OpenAL") || String(e).includes("Setting user") || String(e).includes("[Client thread/INFO]")) {
                hasStarted = true;
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send("game:started");

                    updateDiscordActivity("No jogo", `Jogando como ${nickname}`);

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
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.show();
            mainWindow.focus();
            mainWindow.webContents.send("game:closed");
        }
        sendLog("[SYSTEM] Jogo Fechado. Restaurando launcher.");
        updateDiscordActivity("Navegando no Launcher", "Ocioso");
    });

    try {
        sendLog(`[SYSTEM] Iniciando JVM...`);
        await launcher.launch(opts);
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle("game:abort", async () => {
    try {
        if (!launcher || !launcher.child) {
            return { success: false, error: "Nenhum processo de jogo encontrado." };
        }

        const pid = launcher.child.pid;
        console.log(`[SYSTEM] Iniciando encerramento forçado do PID: ${pid}`);

        if (process.platform === 'win32') {
            exec(`taskkill /F /PID ${pid} /T`, (error) => {
                if (error) console.log(`[SYSTEM] Aviso ao matar processo: ${error.message}`);
                else console.log("[SYSTEM] Processo Windows eliminado.");
            });
        } else {
            try {
                process.kill(pid, 'SIGKILL');
            } catch (e) {
                console.log("[SYSTEM] Erro ao matar processo Linux/Mac (já fechado?):", e.message);
            }
        }

        launcher.removeAllListeners();
        launcher.child = null;

        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.show();
            mainWindow.focus();

            mainWindow.webContents.send("game:closed");

            if (typeof updateDiscordActivity === 'function') {
                updateDiscordActivity("Navegando no Launcher", "Ocioso");
            }
        }

        return { success: true };

    } catch (err) {
        console.error("[ERRO FATAL] Falha ao abortar jogo:", err);
        return { success: false, error: err.message };
    }
});

ipcMain.on("window:close", () => {
    isQuitting = true;
    app.quit();
});

ipcMain.on("window:minimize", () => mainWindow?.minimize());