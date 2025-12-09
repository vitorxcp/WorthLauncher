const fs = require('fs');
const path = require('path');
const { app } = require('electron');

function removeColorCodes(text) {
    if (typeof text !== 'string') return String(text);
    const colorRegex = /\x1B\[[0-?]*[ -/]*[@-~]/g;
    return text.replace(colorRegex, '');
}

let logsDir;
try {
    const userDataPath = app.getPath('userData');
    logsDir = path.join(userDataPath, 'logs');
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }
} catch (e) {
    const os = require('os');
    logsDir = path.join(os.tmpdir(), 'worthlauncher-logs');
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }
}

const baseLogFile = path.join(logsDir, 'system_log.log');
const timestamp = new Date().toISOString().replace(/:/g, '-').replace('T', '_').split('.')[0];
const uniqueLogFile = path.join(logsDir, `${timestamp}-system.log`);

function writeLog(filePath, message) {
    fs.appendFile(filePath, removeColorCodes(message) + '\n', (err) => {
    });
}

function logMessage(level = 'LOG', tagInput = 'GENERAL', ...args) {
    let tag = tagInput;
    let messageArgs = args;

    if (typeof tag !== 'string') {
        messageArgs = [tag, ...args];
        tag = 'SYSTEM';
    }

    const now = new Date().toISOString();
    const safeTag = String(tag).toUpperCase();
    
    const formattedTag = (`[${safeTag}]`);
    const prefix = `${(`[${now}]`)} ${formattedTag}`;
    
    const message = messageArgs.map(arg => {
        if (typeof arg === 'object') {
            try {
                return JSON.stringify(arg, null, 2);
            } catch {
                return String(arg);
            }
        }
        return String(arg);
    }).join(' ');

    const fullMessage = `${prefix} ${message}`;

    try {
        if(process.stdout) process.stdout.write(fullMessage + '\n');
    } catch (e) {}

    writeLog(baseLogFile, fullMessage);
    writeLog(uniqueLogFile, fullMessage);
}

const originalLog = console.log;

console.log = (...args) => logMessage('LOG', 'SYSTEM', ...args);
console.info = (...args) => logMessage('INFO', 'INFO', ...args);
console.warn = (...args) => logMessage('WARN', 'WARNING', ...args);
console.error = (...args) => logMessage('ERROR', 'ERROR', ...args);
console.debug = (...args) => logMessage('DEBUG', 'DEBUG', ...args);
console.success = (...args) => logMessage('SUCCESS', 'SUCCESS', ...args);

module.exports = {
    init: () => { console.log("Sistema de logs iniciado."); },
    
    log: (tag, ...args) => logMessage('LOG', tag, ...args),
    info: (tag, ...args) => logMessage('INFO', tag, ...args),
    warn: (tag, ...args) => logMessage('WARN', tag, ...args),
    error: (tag, ...args) => logMessage('ERROR', tag, ...args),
    debug: (tag, ...args) => logMessage('DEBUG', tag, ...args),
    success: (tag, ...args) => logMessage('SUCCESS', tag, ...args)
};