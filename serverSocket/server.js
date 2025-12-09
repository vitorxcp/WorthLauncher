const { Server } = require("socket.io");
const fs = require('fs');
const path = require('path');
const fileupload = require('express-fileupload');
const cors = require('cors');
const express = require("express");
const session = require("express-session");
const app = express();
const ejs = require("ejs");

const PORT = process.env.SOCKET_PORT || 9099;

const USERS_FILE = path.join(__dirname, 'users.json');
const CHATS_FILE = path.join(__dirname, 'chats.json');
const BLOG_FILE = path.join(__dirname, 'blog.json');
const ADMINS_FILE = path.join(__dirname, 'admins.json');

let blogDB = [];
let usersDB = {};
let chatsDB = {};
let adminsDB = [];

function makeid(length) {
    let result = '';
    const characters = '0123456789abdftghregyjiikjGHFKYUGJNBNBJUY!-';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return result;
}

function loadData() {
    try {
        if (fs.existsSync(USERS_FILE)) usersDB = JSON.parse(fs.readFileSync(USERS_FILE));
        if (fs.existsSync(CHATS_FILE)) chatsDB = JSON.parse(fs.readFileSync(CHATS_FILE));
        if (fs.existsSync(BLOG_FILE)) blogDB = JSON.parse(fs.readFileSync(BLOG_FILE));
        if (fs.existsSync(ADMINS_FILE)) adminsDB = JSON.parse(fs.readFileSync(ADMINS_FILE));
    } catch (e) { console.error("Erro ao carregar DB:", e); }
}

function saveData(type) {
    try {
        if (type === 'users') fs.writeFileSync(USERS_FILE, JSON.stringify(usersDB, null, 2));
        if (type === 'chats') fs.writeFileSync(CHATS_FILE, JSON.stringify(chatsDB, null, 2));
        if (type === 'blog') fs.writeFileSync(BLOG_FILE, JSON.stringify(blogDB, null, 2));
    } catch (e) { console.error("Erro ao salvar DB:", e); }
}

loadData();

app.use(express.json());
app.use(cors({ origin: 'http://localhost' }));
app.enable('trust proxy');
app.engine('html', ejs.renderFile);

app.use(session({
    secret: 'worth_launcher_secret_key_change_this',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

app.use(fileupload({
    useTempFiles: true,
    tempFileDir: '/tmp/',
    limits: { fileSize: 1024 * 1024 * 1024 * 2 }
}));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.json({ limit: '10mb', extended: true }));
app.set('views', `app/web`);
app.use(require("express").static(`app/web`));

const checkAdminAuth = (req, res, next) => {
    if (!req.session.user) {
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(401).json({ success: false, message: "Não autenticado." });
        }
        return res.redirect("/admin/login");
    }

    const isAdmin = adminsDB.some(admin => admin.id === req.session.user.id);

    if (!isAdmin) {
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(403).json({ success: false, message: "Sem permissão." });
        }
        return res.redirect("/error/page/permission");
    }
    next();
};

app.get("/admin/login", (req, res) => {
    if (req.session.user) return res.redirect("/admin/painel/blog");
    res.render("admin/login.html", { error: null });
});

app.post("/admin/login", (req, res) => {
    const { email, password } = req.body;

    const admin = adminsDB.find(user => user.email === email && user.password === password);

    if (admin) {
        req.session.user = {
            id: admin.id,
            nick: admin.nick,
            email: admin.email
        };
        return res.redirect("/admin/painel/blog");
    } else {
        return res.render("admin/login.html", { error: "Credenciais inválidas." });
    }
});

app.get("/admin/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/admin/login");
});

app.get("/error/page/permission", (req, res) => {
    res.render("error/permission.html");
});

app.get("/api/v1/blog/feed", (req, res) => {
    const sortedPosts = [...blogDB].sort((a, b) => b.timestamp - a.timestamp);
    res.json({ success: true, count: sortedPosts.length, posts: sortedPosts });
});

app.get("/admin/painel/blog", checkAdminAuth, (req, res) => {
    const posts = [...blogDB].sort((a, b) => b.timestamp - a.timestamp);
    res.render("admin/blog/index.html", { posts: posts, user: req.session.user });
});

app.get("/admin/painel/blog/new", checkAdminAuth, (req, res) => {
    res.render("admin/blog/new.html", { user: req.session.user });
});

app.get("/admin/painel/blog/:id/edit", checkAdminAuth, (req, res) => {
    const post = blogDB.find(p => p.id === req.params.id);
    if (!post) return res.redirect("/admin/painel/blog");
    res.render("admin/blog/edit.html", { post: post, user: req.session.user });
});

app.post("/admin/painel/blog/new/post", checkAdminAuth, (req, res) => {
    try {
        const { title, summary, content, bannerUrl, tags } = req.body;

        if (!title || !content) {
            return res.json({ success: false, message: "Título e conteúdo são obrigatórios." });
        }

        const newPost = {
            id: makeid(10),
            title: title.trim(),
            summary: summary || title.substring(0, 100) + "...",
            content: content,
            image: bannerUrl || "/assets/default-blog.png",
            author: req.session.user.nick, // Usa o nick da sessão
            author_id: req.session.user.id,
            timestamp: Date.now(),
            dateFormatted: new Date().toLocaleDateString("pt-BR"),
            tags: tags ? tags.split(',').map(t => t.trim()) : []
        };

        blogDB.push(newPost);
        saveData('blog');

        res.json({ success: true, message: "Post criado com sucesso!", redirect: "/admin/painel/blog" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Erro interno." });
    }
});

app.post("/admin/painel/blog/:id/update", checkAdminAuth, (req, res) => {
    const { title, summary, content, bannerUrl, tags } = req.body;
    const postIndex = blogDB.findIndex(p => p.id === req.params.id);

    if (postIndex === -1) return res.json({ success: false, message: "Post não encontrado." });

    blogDB[postIndex].title = title || blogDB[postIndex].title;
    blogDB[postIndex].summary = summary || blogDB[postIndex].summary;
    blogDB[postIndex].content = content || blogDB[postIndex].content;
    
    if (bannerUrl) blogDB[postIndex].image = bannerUrl;
    if (tags) blogDB[postIndex].tags = tags.split(',').map(t => t.trim());
    
    blogDB[postIndex].updatedAt = Date.now();
    saveData('blog');
    res.json({ success: true, message: "Post atualizado!", redirect: "/admin/painel/blog" });
});

app.post("/admin/painel/blog/:id/remove", checkAdminAuth, (req, res) => {
    const initialLength = blogDB.length;
    blogDB = blogDB.filter(p => p.id !== req.params.id);
    if (blogDB.length === initialLength) return res.json({ success: false, message: "Post não encontrado." });
    saveData('blog');
    res.json({ success: true, message: "Post removido com sucesso." });
});

app.get("/upload/:type/:filename", (req, res) => {
    const { type, filename } = req.params;
    const allowedTypes = ["images", "videos", "repositories", "others"];
    if (!allowedTypes.includes(type)) return res.status(400).json({ status: "error", message: "Inválido" });

    const filePath = path.join(__dirname, "app/web/upload", type, filename);
    res.sendFile(filePath, (err) => {
        if (err && !res.headersSent) res.status(404).json({ status: "error", message: "Não encontrado" });
    });
});

app.post("/api/v1/files/upload", async (req, res) => {

    if (!req.files || !req.files.myFile) {
        return res.status(400).json({ status: 'error', message: 'Nenhum arquivo enviado' });
    }

    const file = req.files.myFile;
    const extension = file.name.split('.').pop().toLowerCase();

    let folder = "others";
    if (file.mimetype.startsWith("image/")) folder = "images";
    if (file.mimetype.startsWith("video/")) folder = "videos";

    const uploadDir = path.join(__dirname, `app/web/upload/${folder}`);

    if (!fs.existsSync(uploadDir)){
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    const newFileName = makeid(16) + "." + extension;
    const savePath = path.join(uploadDir, newFileName);

    file.mv(savePath, (error) => {
        if (error) {
            console.error("Erro ao salvar arquivo:", error);
            return res.status(500).json({ status: 'error', message: error });
        }
        
        return res.status(200).json({ 
            status: 'success', 
            path: `/upload/${folder}/${newFileName}` 
        });
    });
});

app.listen(10379, () => {
    console.log("Servidor Web/API iniciado na porta 10379");
});

const getChatID = (u1, u2) => [u1, u2].sort().join('_');
const io = new Server(PORT, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    path: "/socket.io/"
});

let onlineUsers = {};
function updateOnlineCount() {
    io.emit("server:online_count", Object.keys(onlineUsers).length);
}

console.log(`[SOCKET] Servidor Social rodando na porta ${PORT}`);

io.on("connection", (socket) => {
    const { nick, uuid, status } = socket.handshake.auth;
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

    socket.emit("init:data", { friends: friendsListWithData, requests: usersDB[nick].requests });

    usersDB[nick].friends.forEach(friend => {
        if (onlineUsers[friend]) io.to(onlineUsers[friend]).emit("friend:status_update", { nick, status });
    });

    socket.on("friend:add", (targetNick) => {
        if (targetNick === nick) return socket.emit("error", "Você não pode se adicionar.");
        if (!usersDB[targetNick]) return socket.emit("error", "Usuário não encontrado.");
        if (usersDB[nick].friends.includes(targetNick)) return socket.emit("error", "Já são amigos.");
        if (usersDB[targetNick].requests.some(r => r.from === nick)) return socket.emit("error", "Convite já enviado.");

        usersDB[targetNick].requests.push({ from: nick, timestamp: Date.now() });
        saveData('users');

        if (onlineUsers[targetNick]) io.to(onlineUsers[targetNick]).emit("friend:request_received", { from: nick });
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