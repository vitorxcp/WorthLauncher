const { contextBridge, ipcRenderer } = require('electron');
const package = require("../package.json");

var version = package.version;

contextBridge.exposeInMainWorld('api', {
    version,

    // Auth
    loginMicrosoft: () => ipcRenderer.invoke('auth:microsoft'),
    loginOffline: (nick) => ipcRenderer.invoke('auth:offline', nick),

    // Game Logic
    launchGame: (authPayload, config) => ipcRenderer.invoke('game:launch', authPayload, config),
    abortGame: () => ipcRenderer.invoke('game:abort'),

    // Window Management
    createShortcut: () => ipcRenderer.invoke('system:create-shortcut'),
    minimize: () => ipcRenderer.send('window:minimize'),
    close: () => ipcRenderer.send('window:close'),

    // Texture Pack System
    checkInstalledTextures: () => ipcRenderer.invoke('texture:check-all'),
    installTexture: (packId) => ipcRenderer.invoke('texture:install', packId),
    uninstallTexture: (packId) => ipcRenderer.invoke('texture:uninstall', packId),
    uninstallLocalTexture: (fileName) => ipcRenderer.invoke('texture:uninstall-local', fileName),

    //heartbeat:
    onHeartbeat: (callback) => ipcRenderer.on('app:heartbeat', callback),
    sendHeartbeatAck: () => ipcRenderer.send('app:heartbeat-ack'),
    onErrorNotification: (callback) => ipcRenderer.on('app:error-notification', (event, msg) => callback(msg)),

    // Event Listeners
    onGameStarted: (cb) => {
        const listener = () => cb();
        ipcRenderer.on('game:started', listener);
        return () => ipcRenderer.removeListener('game:started', listener);
    },
    onPercentDownloadTxT: (cb) => {
        const listener = (event, data) => cb(data);
        ipcRenderer.on('outputPercentDownloadTxT', listener);
        return () => ipcRenderer.removeListener('outputPercentDownloadTxT', listener);
    },
    onGameStartedExtra: (cb) => {
        const listener = () => cb();
        ipcRenderer.on('game:startedextra', listener);
        return () => ipcRenderer.removeListener('game:startedextra', listener);
    },
    onLog: (cb) => {
        const listener = (ev, msg) => cb(msg);
        ipcRenderer.on('log', listener);
        return () => ipcRenderer.removeListener('log', listener);
    },
    onProgress: (cb) => {
        const listener = (ev, data) => cb(data);
        ipcRenderer.on('progress', listener);
        return () => ipcRenderer.removeListener('progress', listener);
    },
    onGameClosed: (cb) => {
        const listener = () => cb();
        ipcRenderer.on('game:closed', listener);
        return () => ipcRenderer.removeListener('game:closed', listener);
    },

    // App & User Updates
    isInstallerLaunch: () => ipcRenderer.invoke('app:check-installer-launch'),
    updateLauncher: () => ipcRenderer.send('updateVersionApp'),
    updateNickName: (nick) => ipcRenderer.invoke('user:update-nick', nick),
    updateSettings: (settings) => {
        ipcRenderer.invoke('settings:update', settings);
    },
});