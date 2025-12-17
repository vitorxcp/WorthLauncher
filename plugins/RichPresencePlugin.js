const { settings } = require("./settingsRegister");

const date = new Date();
const dateNow = Date.now();

let rpcInterval = null;
let rpc = null;
let nickname = null;
let details = null;
let state = null;

module.exports.updateDiscordActivity = (detailsa, statea, rpca, nick) => {
    if (rpca) {
        rpc = rpca
        nickname = nick;

        if (detailsa) details = detailsa;
        if (statea) state = statea;

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

        rpcInterval = setInterval(activityUpdater, 5000);
    }
}