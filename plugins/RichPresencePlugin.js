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

            const buttons = [
                { label: "Baixar Cliente", url: "https://worthclient.com" },
                { label: "Discord", url: "https://discord.gg/seu-link" }
            ];

            rpc.setActivity({
                details: details,
                state: state,
                largeImageKey: 'large_image',
                largeImageText: 'Worth Client 1.8.9',
                smallImageKey: `https://mc-heads.net/avatar/${nickname}/128`,
                smallImageText: nickname,
                instance: false,
                startTimestamp: dateNow,
                buttons: buttons
            }).catch((err) => {
                console.error("[RPC] Erro ao atualizar:", err);
            });
        };

        activityUpdater();

        rpcInterval = setInterval(activityUpdater, 5000);
    }
}