const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const userDataPath = app.getPath('userData');
const SETTINGS_FILE = path.join(userDataPath, 'settingsLauncher.json');

let settings = { ram: '4G', fullscreen: false, closeLauncher: false, width: 854, height: 480 , discordRichPresence: true};

if (fs.existsSync(SETTINGS_FILE)) settings = JSON.parse(fs.readFileSync(SETTINGS_FILE));

module.exports.settings = settings;
module.exports.saveDataSettings = (receivedSettings) => {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(receivedSettings, null, 2))
}