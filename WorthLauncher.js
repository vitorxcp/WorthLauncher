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
const localPackCache = new Map();
const API_URL = "http://elgae-sp1-b001.elgaehost.com.br:10379";
const API_TEXTURES = `${API_URL}/api/v1/resoucepack/community`;

let isScanning = false;
let watchdogInterval = null;
let isGameLaunchCancelled = false;

autoUpdater.autoDownload = false;
autoUpdater.allowPrerelease = true;
autoUpdater.logger = require("electron-log");
autoUpdater.logger.transports.file.level = "info";

autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'vitorxcp',
    repo: 'WorthLauncher'
});

const path7za = app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', '7zip-bin', 'win', 'x64', '7za.exe')
    : sevenBin.path7za;

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
let texturePacks = [];

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
    return path.join(getLauncherRoot(), "bin", `forge-${FORGE_VERSION}.jar`);
}

function getInternalModsPath() {
    if (app.isPackaged) {
        return path.join(process.resourcesPath, 'mods');
    }
    return path.join(__dirname, 'mods');
}

function getInternalResourcePacksPath() {
    if (app.isPackaged) {
        return path.join(process.resourcesPath, 'resourcepacks');
    }
    return path.join(__dirname, 'resourcepacks');
}

function getGameResourcePacksPath() {
    return path.join(getLauncherRoot(), 'resourcepacks');
}

function getTokenPath() {
    return path.join(app.getPath('userData'), 'ms_refresh_token.json');
}

function downloadFile(url, dest, sendLog) {
    return new Promise((resolve, reject) => {
        sendLog(`[NETWORK] Conectando: ${url}`);

        if (dest.includes("java") || dest.includes("jdk")) {
            updateDiscordActivity("Baixando Dependências", "Instalando Java...", rpc, nickname);
        }

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

        updateDiscordActivity("No Menu Principal", "Worth Launcher", rpc, nickname);
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

    let iconPath = path.join(__dirname, 'ui/public/assets/icon.png');
    if (!fs.existsSync(iconPath)) {
        iconPath = path.join(process.resourcesPath, 'ui/public/assets/icon.png');
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
        icon: path.join(__dirname, 'ui/public/assets/icon.png'),
        maximizable: false,
        fullscreenable: false,
        webPreferences: {
            preload: path.join(__dirname, 'build', 'preload.js'),
            contextIsolation: true,
            nodeIntegration: true,
            devTools: !app.isPackaged
        }
    });

    const isDev = !app.isPackaged;

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
    } else {
        mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        startRPC();
        startWatchdog(mainWindow);
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

    if (app.isPackaged) {
        mainWindow.webContents.on("devtools-opened", () => {
            mainWindow.webContents.closeDevTools();
        });
    }
}

const createSplashWindow = () => {
    splashWindow = new BrowserWindow({
        width: 360,
        height: 460,
        frame: false,
        transparent: true,
        icon: path.join(__dirname, 'ui/public/assets/icon.png'),
        alwaysOnTop: false,
        resizable: false,
        webPreferences: {
            contextIsolation: false,
            nodeIntegration: true,
            devTools: true
        },
    });
    splashWindow.loadFile('ui/splash.html');
    splashWindow.on('closed', () => {
        splashWindow = null;
    });
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

    await syncApiTextures();
    setInterval(syncApiTextures, 60000);
    await loadSessionFromCache();

    const modsPath = getInternalModsPath();
    if (!fs.existsSync(modsPath)) {
        fs.ensureDirSync(modsPath);
        console.log(`[SISTEMA] Pasta de mods criada em: ${modsPath}`);
    }

    const resourcepacksPath = getInternalResourcePacksPath();
    if (!fs.existsSync(resourcepacksPath)) {
        fs.ensureDirSync(resourcepacksPath);
        console.log(`[SISTEMA] Pasta de resourcepacks criada em: ${resourcepacksPath}`);
    }

    initializeApp();
})

app.on('window-all-closed', () => { });

app.on('before-quit', () => {
    isQuitting = true;
});

async function syncMods(sendLog) {
    const internalMods = getInternalModsPath();
    const internalResourcePacks = getInternalResourcePacksPath();
    const gameMods = path.join(getLauncherRoot(), 'mods');
    const gameResourcePacks = path.join(getLauncherRoot(), 'resourcepacks');

    try {
        fs.ensureDirSync(gameMods);
        fs.ensureDirSync(gameResourcePacks);

        if (fs.existsSync(internalMods)) {
            const filesM = fs.readdirSync(internalMods);
            sendLog(`[MODS] Sincronizando ${filesM.length} mods...`);
            await fs.copy(internalMods, gameMods, { overwrite: true });
        }

        if (fs.existsSync(internalResourcePacks)) {
            const fileS = fs.readdirSync(internalResourcePacks);
            sendLog(`[MODS] Sincronizando ${fileS.length} resourcepacks...`);
            await fs.copy(internalResourcePacks, gameResourcePacks, { overwrite: true });
        }

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

ipcMain.handle('texture:check-all', async () => {
    if (isScanning) return { installed: [], locals: [], loading: true };
    isScanning = true;

    try {
        const installedIDs = [];
        const localPacks = [];
        const packsDir = getGameResourcePacksPath();

        await fs.ensureDir(packsDir);

        await Promise.all(texturePacks.map(async (pack) => {
            const folderPath = path.join(packsDir, pack.nameFile);
            const zipPath = path.join(packsDir, `${pack.nameFile}.zip`);

            const [folderExists, zipExists] = await Promise.all([
                fs.pathExists(folderPath),
                fs.pathExists(zipPath)
            ]);

            if (folderExists || zipExists) {
                installedIDs.push(pack.id);
            }
        }));

        const allFoundFiles = await getAllPotentialPacksAsync(packsDir);

        for (const fileData of allFoundFiles) {
            const { fullPath, stats } = fileData;
            const filename = path.basename(fullPath);
            const mtimeMs = stats.mtimeMs;

            if (localPackCache.has(fullPath)) {
                const cached = localPackCache.get(fullPath);
                if (cached.mtimeMs === mtimeMs) {
                    if (cached.data.isOfficial) {
                        if (!installedIDs.includes(cached.data.id)) installedIDs.push(cached.data.id);
                    } else {
                        localPacks.push(cached.data);
                    }
                    continue;
                }
            }

            const isZip = filename.endsWith('.zip');
            const nameRaw = isZip ? filename.replace('.zip', '') : filename;
            const nameClean = stripColors(nameRaw);

            const officialMatch = texturePacks.find(p => stripColors(p.nameFile) === nameClean);

            if (officialMatch) {
                if (!installedIDs.includes(officialMatch.id)) installedIDs.push(officialMatch.id);

                localPackCache.set(fullPath, {
                    mtimeMs,
                    data: { isOfficial: true, id: officialMatch.id }
                });
                continue;
            }

            const imageBase64 = await getPackImageAsync(fullPath, isZip);
            const size = (stats.size / (1024 * 1024)).toFixed(1) + ' MB';
            const parentFolder = path.basename(path.dirname(fullPath));
            const categoryTag = parentFolder === 'resourcepacks' ? 'Raiz' : parentFolder;

            const packData = {
                name: nameRaw,
                author: categoryTag !== 'Raiz' ? categoryTag : "Desconhecido",
                res: "?",
                size: size,
                categories: ["Local", categoryTag],
                image: imageBase64,
                description: `Localizado em: .../${categoryTag}/${filename}`,
                id: `local-${nameClean.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '')}`,
                isLocal: true,
                fileName: path.relative(packsDir, fullPath),
                isOfficial: false
            };

            localPacks.push(packData);

            localPackCache.set(fullPath, {
                mtimeMs,
                data: packData
            });
        }

        for (const cachedPath of localPackCache.keys()) {
            const stillExists = allFoundFiles.some(f => f.fullPath === cachedPath);
            if (!stillExists) {
                localPackCache.delete(cachedPath);
            }
        }

        return {
            installed: installedIDs,
            locals: localPacks
        };

    } catch (error) {
        console.error("[TEXTURE CHECK] Erro:", error);
        return { installed: [], locals: [] };
    } finally {
        isScanning = false;
    }
});

async function getAllPotentialPacksAsync(dirPath, fileList = [], depth = 0) {
    if (depth > 3) return fileList;

    try {
        const files = await fs.readdir(dirPath);

        for (const file of files) {
            if (file === '.DS_Store' || file === 'thumbs.db' || file === '__MACOSX') continue;

            const fullPath = path.join(dirPath, file);
            let stats;
            try { stats = await fs.stat(fullPath); } catch { continue; }

            if (stats.isDirectory()) {
                const mcmetaPath = path.join(fullPath, 'pack.mcmeta');
                if (await fs.pathExists(mcmetaPath)) {
                    fileList.push({ fullPath, stats });
                } else {
                    await new Promise(r => setImmediate(r));
                    await getAllPotentialPacksAsync(fullPath, fileList, depth + 1);
                }
            } else if (file.endsWith('.zip')) {
                fileList.push({ fullPath, stats });
            }
        }
    } catch (e) {
        console.error("Erro ao ler diretório:", dirPath, e);
    }
    return fileList;
}

async function getPackImageAsync(filePath, isZip) {
    try {
        if (isZip) {
            const zip = new AdmZip(filePath);
            const zipEntries = zip.getEntries();
            const entry = zipEntries.find(e => e.entryName.toLowerCase() === "pack.png");

            if (entry) {
                return `data:image/png;base64,${entry.getData().toString('base64')}`;
            }
        } else {
            const imgPath = path.join(filePath, 'pack.png');
            if (await fs.pathExists(imgPath)) {
                const buffer = await fs.readFile(imgPath);
                return `data:image/png;base64,${buffer.toString('base64')}`;
            }
        }
    } catch (e) { }
    return null;
}

ipcMain.handle('texture:install', async (event, packId) => {
    const pack = texturePacks.find(p => p.id === packId);

    if (!pack) {
        return { success: false, error: "Textura não encontrada no registro." };
    }

    updateDiscordActivity("Baixando Recurso", `Instalando: ${pack.name}`, rpc, nickname)

    const packsDir = getGameResourcePacksPath();
    const tempDir = app.getPath('temp');
    const tempZipName = `temp_${Date.now()}_${pack.id}.zip`;
    const tempZipPath = path.join(tempDir, tempZipName);
    const tempExtractPath = path.join(tempDir, `ext_${Date.now()}_${pack.id}`);
    const name = pack.nameFile;
    const finalDestPath = path.join(packsDir, name);

    const logToWindow = (msg) => {
        console.log(msg);
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("log", msg);
        }
    };

    try {
        logToWindow(`[TEXTURE] Iniciando download: ${pack.name}`);
        await downloadFile2(pack.urlDownload, tempZipPath, logToWindow);

        logToWindow(`[TEXTURE] Descompactando para análise...`);
        await extractZip(pack.id, tempZipPath, tempExtractPath, logToWindow, event);

        const files = fs.readdirSync(tempExtractPath);
        let sourcePath = tempExtractPath;

        if (files.length === 1) {
            const innerPath = path.join(tempExtractPath, files[0]);
            if (fs.statSync(innerPath).isDirectory()) {
                logToWindow(`[TEXTURE] Pasta aninhada detectada (${files[0]}). Ajustando...`);
                sourcePath = innerPath;
            }
        }

        await fs.remove(finalDestPath);
        await fs.move(sourcePath, finalDestPath);

        try {
            if (fs.existsSync(tempZipPath)) fs.unlinkSync(tempZipPath);
            if (fs.existsSync(tempExtractPath)) fs.removeSync(tempExtractPath);
        } catch (e) { console.error("Erro ao limpar temp:", e); }

        logToWindow(`[TEXTURE] Instalação concluída: ${name}`);

        updateDiscordActivity("No Menu Principal", "Worth Launcher", rpc, nickname);

        return { success: true };

    } catch (err) {
        console.error(err);
        try {
            if (fs.existsSync(tempZipPath)) fs.unlinkSync(tempZipPath);
            if (fs.existsSync(tempExtractPath)) fs.removeSync(tempExtractPath);
        } catch (e) { }

        updateDiscordActivity("No Menu Principal", "Worth Launcher", rpc, nickname);

        return { success: false, error: err.message };
    }
});

ipcMain.handle('texture:uninstall', async (event, packId) => {
    const pack = texturePacks.find(p => p.id === packId);

    if (!pack) {
        return { success: false, error: "Textura não encontrada no registro." };
    }

    const packsDir = getGameResourcePacksPath();
    const possiblePaths = [
        path.join(packsDir, pack.nameFile),
        path.join(packsDir, `${pack.nameFile}.zip`)
    ];

    try {
        let removed = false;
        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                await fs.remove(p);
                removed = true;
            }
        }

        if (removed) {
            console.log(`[TEXTURE] Removido: ${pack.name}`);
            return { success: true };
        } else {
            return { success: false, error: "Arquivos não encontrados para deletar." };
        }

    } catch (err) {
        console.error(err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('texture:uninstall-local', async (event, relativePath) => {
    const packsDir = getGameResourcePacksPath();
    const filePath = path.join(packsDir, relativePath);

    try {
        if (fs.existsSync(filePath)) {
            await fs.remove(filePath);
            return { success: true };
        }
        return { success: false, error: "Arquivo não encontrado." };
    } catch (e) {
        return { success: false, error: e.message };
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
    isGameLaunchCancelled = false;

    configApp = config;
    gamePID = null;

    const sendLog = (msg) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("log", msg);
        }
    };

    updateDiscordActivity("Iniciando Minecraft", "Verificando arquivos...", rpc, nickname)

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

    try {
        const configDir = path.join(ROOT, 'config');
        const splashPath = path.join(configDir, 'splash.properties');

        fs.ensureDirSync(configDir);

        let splashContent = "enabled=false";

        if (fs.existsSync(splashPath)) {
            let content = fs.readFileSync(splashPath, 'utf8');
            if (content.includes("enabled=true")) {
                content = content.replace("enabled=true", "enabled=false");
                fs.writeFileSync(splashPath, content);
                sendLog("[CONFIG] Splash do Forge foi desativado (Update).");
            }
        } else {
            fs.writeFileSync(splashPath, splashContent);
            sendLog("[CONFIG] Splash do Forge criado como desativado.");
        }

    } catch (e) {
        console.error("[CONFIG] Erro ao desativar splash do Forge:", e);
    }

    sendLog(`[CONFIG] Fullscreen: ${isFullscreen ? 'ATIVADO' : 'DESATIVADO'} | Res: ${config.width}x${config.height} | RAM: ${config.ram}`);

    const opts = {
        clientPackage: null,
        authorization: authorization,
        root: ROOT,
        version: {
            number: "1.8.9",
            type: "release",
            custom: "worthclient-1.8.9"
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
        overrides: {
            detached: false
        }
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

        if (!gamePID && launcher.child && launcher.child.pid) {
            gamePID = launcher.child.pid;
            console.log(`[SYSTEM] PID Recuperado via LOGS: ${gamePID}`);
        }

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

        if (String(e).toLowerCase().includes("desconectado do servidor")) {
            updateDiscordActivity("No jogo", `Jogando como ${nickname}`, rpc, nickname);
        }

        if (!hasStarted && e) {
            if (String(e).includes("LWJGL") || String(e).includes("OpenAL") || String(e).includes("Setting user") || String(e).includes("[Client thread/INFO]")) {
                if (!String(e).includes("MinecraftForge v11.15.1.2318 Initialized")) return;
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
        if (isGameLaunchCancelled) {
            console.log("[LAUNCH] Cancelado pelo usuário antes de iniciar o Java.");
            return { success: false };
        }

        sendLog(`[SYSTEM] Iniciando JVM...`);
        await launcher.launch(opts);
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.on("firstUpdate", (event, data) => {
    createWindow();
    createTray();

    if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
    }
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

ipcMain.handle('game:stop', async () => {
    isGameLaunchCancelled = true;
    console.log("[SYSTEM] Solicitado encerramento forçado do jogo...");
    let killed = false;

    if (!gamePID) {
        if (launcher && launcher.child && launcher.child.pid) {
            gamePID = launcher.child.pid;
            console.log(`[KILL] PID encontrado no objeto launcher: ${gamePID}`);
        }
    }

    if (gamePID) {
        console.log(`[KILL] Matando processo específico: ${gamePID}`);
        try {
            process.kill(gamePID);
            killed = true;
        } catch (e) {
            console.log("[KILL] Erro kill node:", e.message);
        }

        if (process.platform === 'win32') {
            try {
                exec(`taskkill /F /PID ${gamePID} /T`, (err) => {
                    if (!err) console.log("[KILL] Taskkill por PID sucesso.");
                });
                killed = true;
            } catch (e) { }
        }
    }
    else {
        console.log("[KILL] PID não encontrado (NULL). Iniciando protocolo de emergência (Matar javaw.exe).");
        if (process.platform === 'win32') {
            try {
                exec(`taskkill /F /IM javaw.exe /T`, (err) => {
                    if (!err) console.log("[KILL] Todos os processos javaw.exe foram encerrados.");
                });
                killed = true;
            } catch (e) {
                console.error("[KILL] Falha ao matar javaw.exe:", e);
            }
        }
    }

    if (launcher) {
        if (launcher.child) {
            try { launcher.child.kill(); } catch (e) { }
        }
        try { launcher.kill(); } catch (e) { }
    }

    gamePID = null;

    try {
        updateDiscordActivity("No Menu Principal", "Worth Launcher", rpc, nickname);
    } catch (e) { }

    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("game:closed");
    }

    return { success: true };
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

async function downloadFile2(url, dest, sendLog) {
    sendLog(`[NETWORK] Conectando: ${url}`);

    try {
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream',
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const contentType = response.headers['content-type'];
        if (contentType && (contentType.includes('text/html') || contentType.includes('application/json'))) {
            throw new Error(`O link retornou um site/texto em vez de um arquivo ZIP. (Content-Type: ${contentType})`);
        }

        fs.ensureDirSync(path.dirname(dest));
        const writer = fs.createWriteStream(dest);

        return new Promise((resolve, reject) => {

            response.data.pipe(writer);

            writer.on('finish', () => {
                sendLog(`[NETWORK] Download concluído: ${path.basename(dest)}`);
                resolve();
            });

            writer.on('error', (err) => {
                fs.unlink(dest, () => { });
                reject(err);
            });
        });

    } catch (error) {
        throw new Error(`Falha no download: ${error.message}`);
    }
}

function extractZip(id, zipPath, destPath, sendLog, event) {
    return new Promise((resolve, reject) => {
        fs.ensureDirSync(destPath);

        const stream = Seven.extractFull(zipPath, destPath, {
            $bin: path7za,
            $progress: true,
            recursive: true,
            overwrite: 'a'
        });

        let lastPercent = 0;

        stream.on('progress', (progress) => {
            const percentage = Math.round(progress.percent);

            if (percentage > lastPercent) {
                lastPercent = percentage;

                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send("outputPercentDownloadTxT", {
                        id: id,
                        percent: percentage
                    });
                }
            }
        });

        stream.on('end', () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send("outputPercentDownloadTxT", {
                    id: id,
                    percent: 100
                });
            }
            resolve();
        });

        stream.on('error', (err) => {
            reject(err);
        });
    });
}

function getFolderSize(dirPath) {
    let size = 0;
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) {
            size += getFolderSize(filePath);
        } else {
            size += stats.size;
        }
    }
    return size;
}

function getFileSize(filePath) {
    try {
        const stats = fs.statSync(filePath);
        let sizeInBytes = stats.size;

        if (stats.isDirectory()) {
            sizeInBytes = getFolderSize(filePath);
        }

        return (sizeInBytes / (1024 * 1024)).toFixed(1) + ' MB';
    } catch (e) {
        return "Unknown";
    }
}

function getPackImage(filePath, isZip) {
    try {
        let buffer = null;

        if (isZip) {
            const zip = new AdmZip(filePath);
            const zipEntries = zip.getEntries();
            const entry = zipEntries.find(e => e.entryName.toLowerCase() === "pack.png");
            if (entry) {
                buffer = entry.getData();
            }
        } else {
            const imgPath = path.join(filePath, 'pack.png');
            if (fs.existsSync(imgPath)) {
                buffer = fs.readFileSync(imgPath);
            }
        }

        if (buffer) {
            return `data:image/png;base64,${buffer.toString('base64')}`;
        }
    } catch (e) {
        console.error("Erro ao ler imagem do pack:", e);
    }
    return null;
}

function stripColors(text) {
    return text.replace(/(?:§|&)[0-9a-fA-Fk-rK-R]/g, "");
}

function getAllPotentialPacks(dirPath, fileList = []) {
    try {
        const files = fs.readdirSync(dirPath);

        for (const file of files) {
            if (file === '.DS_Store' || file === 'thumbs.db' || file === '__MACOSX') continue;

            const fullPath = path.join(dirPath, file);
            const stats = fs.statSync(fullPath);

            if (stats.isDirectory()) {
                if (fs.existsSync(path.join(fullPath, 'pack.mcmeta'))) {
                    fileList.push(fullPath);
                } else {
                    getAllPotentialPacks(fullPath, fileList);
                }
            } else {
                if (file.endsWith('.zip')) {
                    fileList.push(fullPath);
                }
            }
        }
    } catch (e) {
        console.error("Erro ao escanear pasta:", dirPath, e);
    }
    return fileList;
}

let lastHeartbeat = Date.now();

function startWatchdog(win) {
    if (watchdogInterval) clearInterval(watchdogInterval);

    watchdogInterval = setInterval(() => {
        if (!win || win.isDestroyed()) return;

        win.webContents.send('app:heartbeat');

        if (Date.now() - lastHeartbeat > 30000 && !gamePID) {
            console.warn("[WATCHDOG] Interface não responde. Recarregando...");
            win.reload();
            lastHeartbeat = Date.now();
        }
    }, 15000);
}

ipcMain.on('app:heartbeat-ack', () => {
    lastHeartbeat = Date.now();
});

process.on('uncaughtException', (error) => {
    console.error("[CRITICAL ERROR]", error);
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('app:error-notification', "Ocorreu um erro interno. O sistema tentou se recuperar.");
    }
});

process.on('unhandledRejection', (reason) => {
    console.error("[UNHANDLED PROMISE]", reason);
});

async function syncApiTextures() {
    try {
        const response = await axios.get(API_TEXTURES, { timeout: 10000 });

        if (response.data && response.data.success) {
            const remotePacks = response.data.textures.map(pack => ({
                ...pack,
                image: pack.image.startsWith('http') ? pack.image : `${API_URL}${pack.image}`
            }));

            texturePacks = remotePacks;

            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send("texture:registry-updated", texturePacks);
            }
        }
    } catch (error) {
        console.error("[API] Erro ao sincronizar texturas:", error.message);
    }
}

process.on('uncaughtException', (error) => {
    console.error(error);
    if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.webContents.send('app:error-notification', "Erro Crítico: " + error.message);
    }
});

autoUpdater.on('error', (err) => {
    if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.webContents.send('app:error-notification', "Erro no Update: " + err.message);
    }
});