const { contextBridge, ipcRenderer } = require('electron');
const package = require("../package.json");

var version = package.version;

contextBridge.exposeInMainWorld('api', {
    version,
    loginMicrosoft: () => ipcRenderer.invoke('auth:microsoft'),
    loginOffline: (nick) => ipcRenderer.invoke('auth:offline', nick),
    launchGame: (authPayload, config) => ipcRenderer.invoke('game:launch', authPayload, config),
    createShortcut: () => ipcRenderer.invoke('system:create-shortcut'),
    minimize: () => ipcRenderer.send('window:minimize'),
    close: () => ipcRenderer.send('window:close'),
    abortGame: () => ipcRenderer.invoke('game:abort'),
    onGameStarted: (cb) => {
        const listener = () => cb();
        ipcRenderer.on('game:started', listener);
        return () => ipcRenderer.removeListener('game:started', listener);
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
    isInstallerLaunch: () => ipcRenderer.invoke('app:check-installer-launch'),
    updateLauncher: () => ipcRenderer.send('updateVersionApp'),
    updateNickName: (nick) => ipcRenderer.invoke('user:update-nick', nick),
    updateSettings: (settings) => {
        ipcRenderer.invoke('settings:update', settings);
    },
});