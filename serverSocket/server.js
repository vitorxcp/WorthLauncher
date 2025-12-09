const { Server } = require("socket.io");
const fs = require('fs');
const path = require('path');

const PORT = process.env.SOCKET_PORT || 9099;
const USERS_FILE = path.join(__dirname, 'users.json');
const CHATS_FILE = path.join(__dirname, 'chats.json');

let usersDB = {};
let chatsDB = {};

function loadData() {
    try {
        if (fs.existsSync(USERS_FILE)) usersDB = JSON.parse(fs.readFileSync(USERS_FILE));
        if (fs.existsSync(CHATS_FILE)) chatsDB = JSON.parse(fs.readFileSync(CHATS_FILE));
    } catch (e) { console.error("Erro ao carregar DB:", e); }
}

function saveData(type) {
    try {
        if (type === 'users') fs.writeFileSync(USERS_FILE, JSON.stringify(usersDB, null, 2));
        if (type === 'chats') fs.writeFileSync(CHATS_FILE, JSON.stringify(chatsDB, null, 2));
    } catch (e) { console.error("Erro ao salvar DB:", e); }
}

loadData();

const getChatID = (u1, u2) => [u1, u2].sort().join('_');

const io = new Server(PORT, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    path: "/socket.io/"
});

let onlineUsers = {};

function updateOnlineCount() {
    const total = Object.keys(onlineUsers).length;
    io.emit("server:online_count", total);
}

console.log(`[SOCKET] Servidor Social rodando na porta ${PORT}`);

io.on("connection", (socket) => {
    const { nick, uuid, status } = socket.handshake.auth;

    console.log(nick, uuid, status);

    if (!nick) return socket.disconnect();

    if (!usersDB[nick]) {
        usersDB[nick] = { uuid, friends: [], requests: [], status };
        saveData('users');
    } else {
        usersDB[nick].status = status;
    }

    onlineUsers[nick] = socket.id;
    socket.join(nick);

    updateOnlineCount();

    console.log(`[+] ${nick} online (${status}).`);

    const friendsListWithData = usersDB[nick].friends.map(friendNick => {
        const chatID = getChatID(nick, friendNick);
        const history = chatsDB[chatID] || [];

        const hasUnread = history.some(msg => msg.sender === friendNick && !msg.read);

        return {
            nick: friendNick,
            status: usersDB[friendNick]?.status || 'offline',
            hasUnread: hasUnread
        };
    });

    socket.emit("init:data", {
        friends: friendsListWithData,
        requests: usersDB[nick].requests
    });

    usersDB[nick].friends.forEach(friend => {
        if (onlineUsers[friend]) {
            io.to(onlineUsers[friend]).emit("friend:status_update", { nick, status: 'online' });
        }
    });

    socket.on("friend:add", (targetNick) => {
        if (targetNick === nick) return socket.emit("error", "Você não pode se adicionar.");
        if (!usersDB[targetNick]) return socket.emit("error", "Usuário não encontrado.");
        if (usersDB[nick].friends.includes(targetNick)) return socket.emit("error", "Já são amigos.");
        if (usersDB[targetNick].requests.some(r => r.from === nick)) return socket.emit("error", "Convite já enviado.");

        usersDB[targetNick].requests.push({ from: nick, timestamp: Date.now() });
        saveData('users');

        if (onlineUsers[targetNick]) {
            io.to(onlineUsers[targetNick]).emit("friend:request_received", { from: nick });
        }

        socket.emit("success", `Convite enviado para ${targetNick}`);
    });

    socket.on("friend:respond", ({ requesterNick, accept }) => {
        const myData = usersDB[nick];
        myData.requests = myData.requests.filter(r => r.from !== requesterNick);

        if (accept) {
            myData.friends.push(requesterNick);
            usersDB[requesterNick].friends.push(nick);

            socket.emit("friend:new", { nick: requesterNick, status: usersDB[requesterNick].status || 'offline' });

            if (onlineUsers[requesterNick]) {
                io.to(onlineUsers[requesterNick]).emit("friend:new", { nick, status: 'online' });
                io.to(onlineUsers[requesterNick]).emit("success", `${nick} aceitou seu pedido!`);
            }
        }
        saveData('users');
    });

    socket.on("chat:select", (friendNick) => {
        const chatID = getChatID(nick, friendNick);
        const history = chatsDB[chatID] || [];
        socket.emit("chat:history", { friend: friendNick, messages: history });
    });

    socket.on("chat:send", ({ targetNick, text }) => {
        const chatID = getChatID(nick, targetNick);
        if (!chatsDB[chatID]) chatsDB[chatID] = [];

        const msg = { sender: nick, text, timestamp: Date.now(), read: false };
        chatsDB[chatID].push(msg);

        if (chatsDB[chatID].length > 200) chatsDB[chatID].shift();
        saveData('chats');

        socket.emit("chat:receive", msg);

        if (onlineUsers[targetNick]) {
            io.to(onlineUsers[targetNick]).emit("chat:receive", msg);
            io.to(onlineUsers[targetNick]).emit("notification:msg", { from: nick });
        }
    });

    socket.on("status:change", (status) => {
        usersDB[nick].status = status;
        usersDB[nick].friends.forEach(f => {
            if (onlineUsers[f]) io.to(onlineUsers[f]).emit("friend:status_update", { nick, status });
        });
    });

    socket.on("chat:mark_read", (friendNick) => {
        const chatID = getChatID(nick, friendNick);
        if (chatsDB[chatID]) {
            let changed = false;
            chatsDB[chatID].forEach(m => {
                if (m.sender === friendNick && !m.read) {
                    m.read = true;
                    changed = true;
                }
            });
            if (changed) saveData('chats');
        }
    });

    socket.on("disconnect", () => {
        if (usersDB[nick]) usersDB[nick].status = 'offline';
        delete onlineUsers[nick];

        updateOnlineCount();

        if (usersDB[nick]) {
            usersDB[nick].friends.forEach(f => {
                if (onlineUsers[f]) io.to(onlineUsers[f]).emit("friend:status_update", { nick, status: 'offline' });
            });
        }
    });
});