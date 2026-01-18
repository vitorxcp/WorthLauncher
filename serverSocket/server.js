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
const TICKETS_FILE = path.join(__dirname, 'tickets.json');
const RESOURCEPSCKS_FILE = path.join(__dirname, 'resourcepacks.json');
const COSMETICS_DB_FILE = path.join(__dirname, 'cosmetics.json');
const SYSTEM_ROLES = [
    { id: "owner_client", name: "Owner - WorthClient", color: "#ff0000" },
    { id: "colead_client", name: "Co-Lead - WorthClient", color: "#ff5555" },
    { id: "staff_client", name: "Staff - WorthClient", color: "#ffff55" },
    { id: "partner", name: "Parceiro", color: "#55ff55" },
    { id: "master_rede", name: "Master - RedeWorth", color: "#aa0000" },
    { id: "gerente_rede", name: "Gerente - RedeWorth", color: "#aa00aa" },
    { id: "dev_rede", name: "Developer - RedeWorth", color: "#00aaaa" },
    { id: "admin_rede", name: "Admin - RedeWorth", color: "#ff5555" },
    { id: "mod_rede", name: "Moderador - RedeWorth", color: "#55ff55" },
    { id: "ajud_rede", name: "Ajudante - RedeWorth", color: "#ffff55" },
    { id: "jhbruno", name: "JH_BRUNO", color: "#aa00aa" },
    { id: "worthmais", name: "Worth+", color: "#ffaa00" }
];

let blogDB = [];
let usersDB = {};
let chatsDB = {};
let adminsDB = []
let ticketsDB = [];
let texturePacks = [];
let cosmeticsListDB = [];

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
        if (fs.existsSync(TICKETS_FILE)) ticketsDB = JSON.parse(fs.readFileSync(TICKETS_FILE));
        if (fs.existsSync(RESOURCEPSCKS_FILE)) texturePacks = JSON.parse(fs.readFileSync(RESOURCEPSCKS_FILE));
        if (fs.existsSync(COSMETICS_DB_FILE)) cosmeticsListDB = JSON.parse(fs.readFileSync(COSMETICS_DB_FILE));
    } catch (e) { console.error("Erro ao carregar DB:", e); }
}

function saveData(type) {
    try {
        if (type === 'users') fs.writeFileSync(USERS_FILE, JSON.stringify(usersDB, null, 2));
        if (type === 'chats') fs.writeFileSync(CHATS_FILE, JSON.stringify(chatsDB, null, 2));
        if (type === 'blog') fs.writeFileSync(BLOG_FILE, JSON.stringify(blogDB, null, 2));
        if (type === 'tickets') fs.writeFileSync(TICKETS_FILE, JSON.stringify(ticketsDB, null, 2));
        if (type === 'packs') fs.writeFileSync(RESOURCEPSCKS_FILE, JSON.stringify(texturePacks, null, 2));
        if (type === 'cosmetics') fs.writeFileSync(COSMETICS_DB_FILE, JSON.stringify(cosmeticsListDB, null, 2));
    } catch (e) { console.error("Erro ao salvar DB:", e); }
}

function isUserStaff(nick) {
    return adminsDB.some(admin => admin.nick === nick);
}

const ARCHIVE_DIR = path.join(__dirname, 'historicos-removed');

if (!fs.existsSync(ARCHIVE_DIR)) {
    fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
}

loadData();

app.use(express.json());
app.use(cors());
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
        req.session.returnTo = req.originalUrl;
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

        const redirectTo = req.session.returnTo || "/admin/painel/blog";
        delete req.session.returnTo;

        return res.redirect(redirectTo);
    } else {
        return res.render("admin/login.html", { error: "Credenciais inválidas." });
    }
});

app.get("/api/v1/resoucepack/community", (req, res) => {
    try {
        const { category } = req.query;
        let filteredTextures = [...texturePacks];

        if (category) {
            filteredTextures = filteredTextures.filter(p =>
                p.categories && p.categories.some(c => c.toLowerCase() === category.toLowerCase())
            );
        }

        res.json({
            success: true,
            count: filteredTextures.length,
            textures: filteredTextures
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erro ao buscar texturas." });
    }
});

app.get("/admin/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/admin/login");
});

app.get("/error/page/permission", (req, res) => {
    res.render("error/permission.html");
});

app.get("/admin/painel/textures", checkAdminAuth, (req, res) => {
    res.render("admin/textures/index.html", { textures: texturePacks, user: req.session.user });
});

app.get("/admin/painel/textures/new", checkAdminAuth, (req, res) => {
    res.render("admin/textures/new.html", { user: req.session.user });
});

app.get("/admin/painel/textures/:id/edit", checkAdminAuth, (req, res) => {
    const txt = texturePacks.find(p => p.id === req.params.id);
    if (!txt) return res.redirect("/admin/painel/textures");
    res.render("admin/textures/edit.html", { texture: txt, user: req.session.user });
});

app.post("/admin/painel/textures/new/post", checkAdminAuth, (req, res) => {
    try {
        const { name, nameFile, author, image, description, urlDownload, res: resolution, categories } = req.body;
        const id = makeid(12);

        const newTxt = {
            name,
            nameFile,
            author,
            res: resolution || "+16x",
            image,
            description,
            urlDownload,
            id,
            categories: categories ? categories.split(',').map(c => c.trim()) : []
        };

        texturePacks.push(newTxt);
        saveData('packs');
        res.json({ success: true, message: "Textura adicionada!", redirect: "/admin/painel/textures" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erro interno." });
    }
});

app.post("/admin/painel/textures/:id/update", checkAdminAuth, (req, res) => {
    const index = texturePacks.findIndex(p => p.id === req.params.id);
    if (index === -1) return res.json({ success: false, message: "Textura não encontrada." });

    const { name, nameFile, author, image, description, urlDownload, res: resolution, categories } = req.body;

    texturePacks[index] = {
        ...texturePacks[index],
        name: name || texturePacks[index].name,
        nameFile: nameFile || texturePacks[index].nameFile,
        author: author || texturePacks[index].author,
        image: image || texturePacks[index].image,
        description: description || texturePacks[index].description,
        urlDownload: urlDownload || texturePacks[index].urlDownload,
        res: resolution || texturePacks[index].res,
        categories: categories ? categories.split(',').map(c => c.trim()) : texturePacks[index].categories || []
    };

    saveData('packs');
    res.json({ success: true, message: "Textura atualizada!", redirect: "/admin/painel/textures" });
});

app.post("/admin/painel/textures/:id/remove", checkAdminAuth, (req, res) => {
    const initialLength = texturePacks.length;
    texturePacks = texturePacks.filter(p => p.id !== req.params.id);

    if (texturePacks.length === initialLength) return res.json({ success: false, message: "Não encontrada." });

    saveData('packs');
    res.json({ success: true, message: "Textura removida com sucesso." });
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
            author: req.session.user.nick,
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

    if (!fs.existsSync(uploadDir)) {
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

app.get("/teste/capas", (req, res) => {
    res.render("teste_capas.html");
});


app.get("/admin/painel/cosmetics", checkAdminAuth, (req, res) => {
    res.render("admin/cosmetics/index.html", { cosmetics: cosmeticsListDB, user: req.session.user });
});

app.get("/admin/painel/cosmetics/new", checkAdminAuth, (req, res) => {
    res.render("admin/cosmetics/new.html", {
        user: req.session.user,
        roles: SYSTEM_ROLES
    });
});

app.post("/admin/painel/cosmetics/new/post", checkAdminAuth, async (req, res) => {
    try {
        const { name, type, rarity, price, description, customId, tagsAccess } = req.body;

        if (!req.files || !req.files.storeImage) {
            return res.json({ success: false, message: "A imagem da loja é obrigatória." });
        }

        if (customId) {
            const exists = cosmeticsListDB.some(c => c.id === customId);
            if (exists) {
                return res.json({ success: false, message: "Este ID já está em uso por outro cosmético." });
            }
        }

        const imageFile = req.files.storeImage;
        const ext = imageFile.name.split('.').pop();
        const imageFileName = `store_${makeid(10)}.${ext}`;

        const uploadPath = path.join(__dirname, "app/web/upload/images", imageFileName);

        if (!fs.existsSync(path.dirname(uploadPath))) {
            fs.mkdirSync(path.dirname(uploadPath), { recursive: true });
        }

        await imageFile.mv(uploadPath);

        const finalId = customId ? customId.trim() : `${type.toLowerCase()}_${makeid(6)}`;

        let accessList = [];
        let isGlobalFree = false;

        if (tagsAccess) {
            const rawTags = Array.isArray(tagsAccess) ? tagsAccess : [tagsAccess];

            if (rawTags.includes("global")) {
                isGlobalFree = true;
                accessList = ["global"];
            } else {
                accessList = rawTags;
            }
        }

        const newCosmetic = {
            id: finalId,
            name: name,
            description: description,
            type: type,
            rarity: rarity,
            price: parseFloat(price) || 0,
            currency: "BRL",
            image: `http://elgae-sp1-b001.elgaehost.com.br:10379/upload/images/${imageFileName}`,
            author: req.session.user.nick,
            isFree: isGlobalFree,
            freeForTags: accessList
        };

        cosmeticsListDB.push(newCosmetic);
        saveData('cosmetics');

        res.json({ success: true, message: "Cosmético criado com sucesso!", redirect: "/admin/painel/cosmetics" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Erro interno ao salvar." });
    }
});

app.post("/admin/painel/cosmetics/:id/remove", checkAdminAuth, (req, res) => {
    const initialLen = cosmeticsListDB.length;
    cosmeticsListDB = cosmeticsListDB.filter(c => c.id !== req.params.id);

    if (cosmeticsListDB.length === initialLen) return res.json({ success: false, message: "Item não encontrado." });

    saveData('cosmetics');
    res.json({ success: true, message: "Item removido." });
});

app.get("/admin/painel/users/roles", checkAdminAuth, (req, res) => {
    res.render("admin/users/roles.html", {
        user: req.session.user,
        roles: SYSTEM_ROLES
    });
});

app.get("/api/admin/users/search", checkAdminAuth, (req, res) => {
    try {
        const query = req.query.q ? req.query.q.toLowerCase().trim() : "";

        const foundUsers = Object.keys(usersDB)
            .filter(nick => {
                const u = usersDB[nick];
                return nick.toLowerCase().includes(query) || (u.uuid && u.uuid.includes(query));
            })
            .map(nick => {
                const u = usersDB[nick];
                return {
                    nick: nick,
                    uuid: u.uuid,
                    tags: u.tags || [],
                    lastLogin: u.lastLogin
                };
            })
            .slice(0, 10);

        res.json({ success: true, users: foundUsers });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Erro ao buscar." });
    }
});

app.post("/api/admin/users/update_tags", checkAdminAuth, (req, res) => {
    try {
        const { nick, tags } = req.body;

        if (!usersDB[nick]) {
            return res.status(404).json({ success: false, message: "Usuário não encontrado." });
        }

        if (!Array.isArray(tags)) {
            return res.status(400).json({ success: false, message: "Formato de tags inválido." });
        }

        const validTagIds = SYSTEM_ROLES.map(r => r.id);
        const filteredTags = tags.filter(t => validTagIds.includes(t));

        usersDB[nick].tags = filteredTags;
        saveData('users');

        console.log(`[Admin] ${req.session.user.nick} alterou as tags de ${nick} para: [${filteredTags.join(', ')}]`);

        const socketId = onlineUsers[nick];
        if (socketId) {
            io.to(socketId).emit("client:tags_updated", filteredTags);
            const userCosmetics = usersDB[nick].cosmetics || {};
            const activeList = Object.keys(userCosmetics).filter(k => userCosmetics[k] === true);
        }

        res.json({ success: true, message: "Cargos atualizados com sucesso!", tags: filteredTags });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Erro ao salvar tags." });
    }
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
let playingUsers = [];
let usersSessionGames = {};

function updateOnlineCount() {
    const allNicks = Object.keys(onlineUsers);

    const realPlayers = allNicks.filter(nick => nick !== "WorthClient");

    const launchCount = Object.keys(usersSessionGames).length;
    const totalCount = realPlayers.length;
    const usersCount = totalCount - launchCount;

    io.emit("server:online_count", {
        users: usersCount,
        usersLaunch: launchCount,
        total: totalCount
    });

    const playingData = Object.keys(usersSessionGames).map(playerNick => {
        const userCosmetics = usersDB[playerNick]?.cosmetics || {};
        const activeCosmetics = Object.keys(userCosmetics).filter(id => userCosmetics[id] === true);

        return {
            nick: playerNick,
            cosmetics: activeCosmetics
        };
    });

    io.emit("client:users_playing", playingData);
}

console.log(`[SOCKET] Servidor Social rodando na porta ${PORT}`);

function isSocketInRoom(socketId, roomId) {
    const room = io.sockets.adapter.rooms.get(roomId);
    return room && room.has(socketId);
}

io.on("connection", (socket) => {
    let nick = socket.handshake.auth.nick || socket.handshake.query.nick;
    let uuid = socket.handshake.auth.uuid || socket.handshake.query.uuid;
    let status = socket.handshake.auth.status || socket.handshake.query.status;

    if (!nick || !uuid) {
        socket.emit("error", "Nick e UUID são obrigatórios.");
        return socket.disconnect();
    }

    if (!status) status = usersDB[nick].status;

    nick = nick.trim();

    if (usersDB[nick]) {
        if (usersDB[nick].uuid !== uuid) {
            socket.emit("auth_error", { message: "Este Nick pertence a outra pessoa." });
            return socket.disconnect();
        }
        usersDB[nick].status = status;
        usersDB[nick].lastLogin = Date.now();
    } else {
        usersDB[nick] = {
            uuid,
            friends: [],
            requests: [],
            status,
            cosmetics: {},
            tags: [],
            ownedCosmetics: [],
            registeredAt: Date.now(),
            lastLogin: Date.now()
        };
        saveData('users');
    }

    if (!usersDB[nick].cosmetics) {
        usersDB[nick].cosmetics = {};
        saveData('users');
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

    socket.on("launcher:cosmetic:player:add", (cosmeticId) => {
        const itemInfo = cosmeticsListDB.find(c => c.id === cosmeticId);

        if (!itemInfo) {
            return socket.emit("error", "Cosmético não encontrado no sistema.");
        }

        const userData = usersDB[nick];
        const userOwned = userData.ownedCosmetics || [];
        const userTags = userData.tags || [];

        let hasAccess = false;

        if (itemInfo.isFree) hasAccess = true;

        if (userOwned.includes(cosmeticId)) hasAccess = true;

        if (itemInfo.freeForTags && Array.isArray(itemInfo.freeForTags)) {
            const tagMatch = itemInfo.freeForTags.some(tagId => userTags.includes(tagId));
            if (tagMatch) hasAccess = true;
        }

        if (!hasAccess) {
            return socket.emit("error", "Você precisa comprar este item ou ter o cargo necessário.");
        }

        const userActiveCosmetics = usersDB[nick].cosmetics || {};
        const equippedIds = Object.keys(userActiveCosmetics).filter(k => userActiveCosmetics[k] === true);

        for (const equippedId of equippedIds) {
            const equippedItemInfo = cosmeticsListDB.find(c => c.id === equippedId);
            if (equippedItemInfo && equippedItemInfo.category === itemInfo.category) {
                if (equippedId === cosmeticId) return;

                return socket.emit("error", `Remova ${equippedItemInfo.name} antes de equipar este item de mesma categoria.`);
            }
        }

        const userActive = usersDB[nick].cosmetics || {};
        Object.keys(userActive).forEach(key => {
            if (userActive[key] === true) {
                const equippedItem = cosmeticsListDB.find(c => c.id === key);
                if (equippedItem && equippedItem.type === itemInfo.type) {
                    usersDB[nick].cosmetics[key] = false;
                }
            }
        });

        usersDB[nick].cosmetics[cosmeticId] = true;
        saveData('users');
        socket.emit("success", `${itemInfo.name} equipado!`);
        console.log("[Cosmetics] Atualizando jogadores online...");
        updateOnlineCount();
        socket.emit("launcher:cosmetics:player", true, { name: cosmeticId });

    });

    socket.on("launcher:cosmetic:player:remove", (cosmeticId) => {
        if (!usersDB[nick].cosmetics) return;

        if (usersDB[nick].cosmetics[cosmeticId]) {
            usersDB[nick].cosmetics[cosmeticId] = false;
            saveData('users');

            const itemInfo = cosmeticsListDB.find(c => c.id === cosmeticId);
            socket.emit("success", `${itemInfo ? itemInfo.name : cosmeticId} removido.`);
            socket.emit("launcher:cosmetic:player:removed_success", cosmeticId);
            updateOnlineCount();
        }
    });

    socket.on("player:set:cosmetic", ({ id, state }) => {
        console.log(`[Cosmetics] Alterando ${id} para ${state} no usuário ${nick}`);

        if (!usersDB[nick]) usersDB[nick] = {};
        if (!usersDB[nick].cosmetics) usersDB[nick].cosmetics = {};

        if (state === true && id.includes("cape")) {
            Object.keys(usersDB[nick].cosmetics).forEach(key => {
                if (key.includes("cape") && key !== id) {
                    usersDB[nick].cosmetics[key] = false;
                }
            });
        }

        usersDB[nick].cosmetics[id] = state;
        saveData('users');
        console.log("[Cosmetics] Salvo com sucesso!");
        socket.emit("success", `Cosmético ${state ? 'ativado' : 'desativado'}!`);
        console.log("[Cosmetics] Atualizando jogadores online...");
        updateOnlineCount();
    });

    const userCosmetics = usersDB[nick].cosmetics || {};

    const activeCosmeticsList = Object.keys(userCosmetics)
        .filter(key => userCosmetics[key] === true)
        .map(key => ({ name: key }));

    socket.emit("launcher:cosmetics:player", true, ...activeCosmeticsList);

    socket.emit("init:data", { friends: friendsListWithData, requests: usersDB[nick].requests });

    usersDB[nick].friends.forEach(friend => {
        if (onlineUsers[friend]) io.to(onlineUsers[friend]).emit("friend:status_update", { nick, status });
    });

    socket.on("chat:history_cleared", (friendNick) => {
        if (currentChatFriend === friendNick) {
            fullChatHistory = [];
            const msgsContainer = document.getElementById("chat-messages");
            if (msgsContainer) msgsContainer.innerHTML = "";

            const notice = document.createElement("div");
            notice.className = "text-center text-xs text-zinc-600 italic mt-4 mb-4";
            notice.innerText = "Este histórico foi arquivado e limpo.";
            msgsContainer.appendChild(notice);
        }
    });

    socket.on('ticket:list', () => {
        const isStaff = isUserStaff(nick);
        let myTickets;

        if (isStaff) {
            myTickets = [...ticketsDB];
        } else {
            myTickets = ticketsDB.filter(t => t.author === nick);
        }

        myTickets.sort((a, b) => {
            if (a.status === b.status) {
                return b.timestamp - a.timestamp;
            }
            return a.status === 'open' ? -1 : 1;
        });

        socket.emit('ticket:list_update', myTickets);
    });

    socket.on('ticket:join', (ticketId) => {
        const ticket = ticketsDB.find(t => t.id === ticketId);

        if (!ticket) {
            return socket.emit('error', 'Ticket não encontrado.');
        }

        if (ticket.author !== nick && !isUserStaff(nick)) {
            return socket.emit('error', 'Sem permissão para este ticket.');
        }

        socket.join(`ticket_${ticketId}`);

        socket.emit('chat:history', {
            friend: `Ticket #${ticketId}`,
            messages: ticket.messages || []
        });
    });

    socket.on('ticket:create', ({ subject }) => {
        const ticket = {
            id: makeid(6),
            author: nick,
            subject: subject,
            status: 'open',
            messages: [],
            timestamp: Date.now()
        };

        ticketsDB.push(ticket);
        saveData('tickets');

        socket.emit('ticket:list_update', ticketsDB.filter(t => t.author === nick));

        Object.keys(onlineUsers).forEach(onlineNick => {
            if (isUserStaff(onlineNick)) {
                io.to(onlineUsers[onlineNick]).emit('ticket:list_update', ticketsDB);
                io.to(onlineUsers[onlineNick]).emit('success', `Novo ticket de ${nick}: ${subject}`);
            }
        });
    });

    socket.on('ticket:send', ({ ticketId, text }, callback) => {
        const ticket = ticketsDB.find(t => t.id === ticketId);
        if (!ticket) return;
        if (ticket.status === 'closed') return callback({ 'error': 'Este ticket está fechado.' });

        const isSenderStaff = isUserStaff(nick);

        if (!isSenderStaff) {
            if (ticket.author !== nick) return callback({ "error": "Você não é dono desse Ticket!" });
        }

        callback({ "sucess": "Foi!" })

        const msg = {
            sender: nick,
            text,
            timestamp: Date.now(),
            read: false,
            isStaff: isSenderStaff,
            ticketId: ticketId
        };

        ticket.messages.push(msg);
        saveData('tickets');

        const roomName = `ticket_${ticketId}`;

        io.to(roomName).emit('ticket:receive', msg);

        if (isSenderStaff) {
            let authorSocketID = onlineUsers[ticket.author];

            if (!authorSocketID) {
                const targetAuthorLower = ticket.author.toLowerCase().trim();
                const foundKey = Object.keys(onlineUsers).find(k => k.toLowerCase().trim() === targetAuthorLower);
                if (foundKey) {
                    authorSocketID = onlineUsers[foundKey];
                }
            }

            if (authorSocketID) {
                if (!isSocketInRoom(authorSocketID, roomName)) {
                    io.to(authorSocketID).emit('ticket:receive', msg);
                }
            }
        } else {
            Object.keys(onlineUsers).forEach(onlineNick => {
                if (isUserStaff(onlineNick) && onlineNick !== nick) {
                    const staffSocketID = onlineUsers[onlineNick];

                    if (!isSocketInRoom(staffSocketID, roomName)) {
                        io.to(staffSocketID).emit('ticket:receive', msg);
                    }
                }
            });
        }
    });

    socket.on('ticket:close', (ticketId) => {
        const ticket = ticketsDB.find(t => t.id === ticketId);
        if (!ticket) return;

        if (ticket.author !== nick && !isUserStaff(nick)) return;

        ticket.status = 'closed';
        saveData('tickets');

        io.to(`ticket_${ticketId}`).emit('success', 'Este ticket foi encerrado.');

        const isStaff = isUserStaff(nick);
        socket.emit('ticket:list_update', isStaff ? ticketsDB : ticketsDB.filter(t => t.author === nick));
    });

    socket.on("discord:verifyUserId", ({ id }, callback) => {
        const botSocketId = onlineUsers["WorthClient"];

        if (!botSocketId) {
            return callback({ error: "O sistema de verificação está offline no momento." });
        }

        io.to(botSocketId).timeout(5000).emit("bot:verifyId", id, (err, responseFromBot) => {

            if (err) {
                return callback({ error: "O bot demorou muito para responder." });
            }

            callback(responseFromBot);
        });
    });

    socket.on("client:discord_link", (discordData) => {
        if (!usersDB[nick]) return;

        usersDB[nick].discord = {
            id: discordData.id,
            username: discordData.username,
            linkedAt: Date.now()
        };

        saveData('users');

        socket.emit("success", "Conta do Discord vinculada e salva no servidor!");

        const botSocketId = onlineUsers["WorthClient"];
        if (botSocketId) {
            io.to(botSocketId).emit("bot:player_linked", { nick, discordId: discordData.id });
        }
    });

    socket.on("client:discord_unlink", () => {
        if (!usersDB[nick]) return;

        if (usersDB[nick].discord) {
            discordData = usersDB[nick].discord;

            delete usersDB[nick].discord;
            saveData('users');

            socket.emit("success", "Conta do Discord desconectada.");

            const botSocketId = onlineUsers["WorthClient"];
            if (botSocketId) {
                io.to(botSocketId).emit("bot:player_unlinked", { nick, discordId: discordData.id });
            }
        }
    });

    socket.on('chat:staff_send', ({ text }, callback) => {
        if (!isUserStaff(nick)) {
            return callback({ 'error': 'Comando desconhecido ou sem permissão.' });
        }

        const msg = {
            sender: nick,
            text: text,
            timestamp: Date.now(),
            isStaffChat: true
        };

        Object.keys(onlineUsers).forEach(onlineNick => {
            if (isUserStaff(onlineNick)) {
                io.to(onlineUsers[onlineNick]).emit('chat:staff_broadcast', msg);
            }
        });

        callback({ "sucess": "Foi!" })
    });

    socket.on("friend:remove", (targetNick) => {
        usersDB[nick].friends = usersDB[nick].friends.filter(f => f !== targetNick);

        if (usersDB[targetNick]) {
            usersDB[targetNick].friends = usersDB[targetNick].friends.filter(f => f !== nick);
        }

        saveData('users');

        if (onlineUsers[targetNick]) {
            io.to(onlineUsers[targetNick]).emit("friend:removed", nick);
        }
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

    socket.on("game:launch", () => {
        usersSessionGames[nick] = socket.id;
        const userCosmetics = usersDB[nick].cosmetics || {};

        const activeCosmeticsList = Object.keys(userCosmetics)
            .filter(key => userCosmetics[key] === true)
            .map(key => ({ name: key }));

        socket.emit("client:cosmetics:player", true, ...activeCosmeticsList);

        updateOnlineCount();
    });

    socket.on("game:close", () => {
        delete usersSessionGames[nick];
        updateOnlineCount();
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

    socket.on("chat:clear_history", (targetNick) => {
        const chatID = getChatID(nick, targetNick);

        if (!chatsDB[chatID] || chatsDB[chatID].length === 0) {
            return socket.emit("error", "Não há histórico para limpar.");
        }

        try {
            const filename = `${chatID}_${Date.now()}.json`;
            const filePath = path.join(ARCHIVE_DIR, filename);

            fs.writeFileSync(filePath, JSON.stringify(chatsDB[chatID], null, 2));
            console.log(`[BACKUP] Histórico salvo em: ${filename}`);

            chatsDB[chatID] = [];
            saveData('chats');

            socket.emit("success", "Histórico arquivado e limpo!");

            socket.emit("chat:history_cleared", targetNick);

            if (onlineUsers[targetNick]) {
                io.to(onlineUsers[targetNick]).emit("chat:history_cleared", nick);
                io.to(onlineUsers[targetNick]).emit("notification:msg", { from: "Sistema", text: "O histórico foi limpo." });
            }

        } catch (error) {
            console.error("Erro ao arquivar chat:", error);
            socket.emit("error", "Erro ao tentar salvar o backup.");
        }
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

            if (changed) {
                saveData('chats');

                if (onlineUsers[friendNick]) {
                    io.to(onlineUsers[friendNick]).emit("chat:read_confirm", { by: nick });
                }
            }
        }
    });

    socket.on("ticket:mark_read", (ticketId) => {
        const ticket = ticketsDB.find(t => t.id === ticketId);
        if (ticket) {
            let changed = false;
            ticket.messages.forEach(m => {
                if (m.sender !== nick && !m.read) {
                    m.read = true;
                    changed = true;
                }
            });

            if (changed) {
                saveData('tickets');
                io.to(`ticket_${ticketId}`).emit("chat:read_confirm", { by: nick, ticketId });
            }
        }
    });

    socket.on("chat:typing", ({ target, state, isTicket }) => {
        if (isTicket) {
            socket.to(target).emit("chat:typing_update", {
                from: nick,
                state: state,
                isTicket: true,
                ticketId: target.replace('ticket_', '')
            });
        } else {
            if (usersDB[nick] && usersDB[nick].friends) {
                usersDB[nick].friends.forEach(friendNick => {
                    if (onlineUsers[friendNick]) {
                        io.to(onlineUsers[friendNick]).emit("chat:typing_update", {
                            from: nick,
                            state: state
                        });
                    }
                });
            }
        }
    });

    socket.on("chat:typing", ({ state }) => {
        if (usersDB[nick] && usersDB[nick].friends) {
            usersDB[nick].friends.forEach(friendNick => {
                if (onlineUsers[friendNick]) {
                    io.to(onlineUsers[friendNick]).emit("chat:typing_update", {
                        from: nick,
                        state: state
                    });
                }
            });
        }
    });

    socket.on("store:get_data", () => {
        const userTags = usersDB[nick].tags || [];
        const userOwned = usersDB[nick].ownedCosmetics || [];
        const isAdminRole = userTags.includes("owner_client") || userTags.includes("colead_client");
        const filteredCatalog = cosmeticsListDB.filter(item => {
            if (isAdminRole) return true;
            if (item.price > 0 || item.isFree) return true;
            if (item.freeForTags && Array.isArray(item.freeForTags) && item.freeForTags.length > 0) {
                return item.freeForTags.some(tagId => userTags.includes(tagId));
            }
            return false;
        });

        let effectiveOwned;

        if (isAdminRole) {
            effectiveOwned = cosmeticsListDB.map(c => c.id);
        } else {
            effectiveOwned = [...userOwned];

            cosmeticsListDB.forEach(item => {
                if (effectiveOwned.includes(item.id)) return;

                if (item.isFree) {
                    effectiveOwned.push(item.id);
                    return;
                }

                if (item.freeForTags && item.freeForTags.length > 0) {
                    if (item.freeForTags.some(tagId => userTags.includes(tagId))) {
                        effectiveOwned.push(item.id);
                    }
                }
            });
        }

        socket.emit("store:catalog", filteredCatalog);
        socket.emit("store:owned_list", effectiveOwned);

        const active = usersDB[nick].cosmetics || {};
        const activeList = Object.keys(active).filter(k => active[k] === true);
        socket.emit("launcher:cosmetic:player", true, activeList.map(id => ({ name: id })));
    });

    socket.on("launcher:cosmetic:player:add", (cosmeticId) => {
        const itemInfo = cosmeticsListDB.find(c => c.id === cosmeticId);

        if (!itemInfo) return socket.emit("error", "Item não existe.");

        const userData = usersDB[nick];
        const userOwned = userData.ownedCosmetics || [];
        const userTags = userData.tags || [];
        const isAdminRole = userTags.includes("owner_client") || userTags.includes("colead_client");

        let hasAccess = false;

        if (isAdminRole) {
            hasAccess = true;
        }
        else if (itemInfo.isFree) {
            hasAccess = true;
        }
        else if (userOwned.includes(cosmeticId)) {
            hasAccess = true;
        }
        else if (itemInfo.freeForTags && Array.isArray(itemInfo.freeForTags)) {
            const tagMatch = itemInfo.freeForTags.some(tagId => userTags.includes(tagId));
            if (tagMatch) hasAccess = true;
        }

        if (!hasAccess) {
            return socket.emit("error", "Você precisa comprar este item ou ter o cargo necessário.");
        }

        const userActiveCosmetics = usersDB[nick].cosmetics || {};
        const equippedIds = Object.keys(userActiveCosmetics).filter(k => userActiveCosmetics[k] === true);

        for (const equippedId of equippedIds) {
            const equippedItemInfo = cosmeticsListDB.find(c => c.id === equippedId);
            if (equippedItemInfo && equippedItemInfo.category === itemInfo.category) {
                if (equippedId === cosmeticId) return;
                usersDB[nick].cosmetics[equippedId] = false;
            }
        }

        usersDB[nick].cosmetics[cosmeticId] = true;
        saveData('users');

        socket.emit("success", `${itemInfo.name} equipado!`);
        updateOnlineCount();

        const activeList = Object.keys(usersDB[nick].cosmetics).filter(k => usersDB[nick].cosmetics[k] === true);
        socket.emit("launcher:cosmetic:player", true, activeList.map(id => ({ name: id })));
    });

    socket.on("disconnect", () => {
        if (usersSessionGames[nick]) {
            delete usersSessionGames[nick];
            updateOnlineCount();
        }
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

const app2 = express();
const port2 = 9075;

app2.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Content-Length', 'X-Requested-With'],
    credentials: true
}));
app2.disable('x-powered-by');
app2.disable('etag');
app2.options('*', (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', '*');
    res.sendStatus(204);
});

app2.get('/api/intel', async (req, res) => {
    try {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 3000);

        const r = await fetch('http://ip-api.com/json/?fields=status,countryCode,regionName,city,isp,query,as,org,lat,lon,timezone', { signal: controller.signal });

        if (!r.ok) throw new Error('API Error');
        const d = await r.json();
        res.json(d);
    } catch (e) {
        res.json({
            status: 'fail',
            isp: 'Rede Local / Privada',
            query: '127.0.0.1',
            city: 'Desconhecido',
            regionName: 'Localhost',
            as: 'AS-N/A',
            lat: 0,
            lon: 0,
            timezone: 'UTC'
        });
    }
});

app2.get('/ping', (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.send('pong');
});

app2.post('/upload', (req, res) => {
    req.on('data', () => { });
    req.on('end', () => {
        res.send('ok');
    });
});;

const downloadBuffer = Buffer.allocUnsafe(4 * 1024 * 1024);
app2.get('/download', (req, res) => {
    const size = (parseInt(req.query.size) || 50) * 1024 * 1024;
    res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': size,
        'Cache-Control': 'no-store'
    });

    let sent = 0;
    const send = () => {
        while (sent < size) {
            const chunkSize = Math.min(downloadBuffer.length, size - sent);
            if (!res.write(downloadBuffer.slice(0, chunkSize))) {
                res.once('drain', send);
                return;
            }
            sent += chunkSize;
        }
        res.end();
    };
    send();
});

app2.listen(port2, () => console.log(`🚀 SpeedTestVX Server ON: http://localhost:${port2}`));

app.get("/api/v1/server/stats", (req, res) => {
    try {
        const os = require("os");
        const totalMem = os.totalmem() / (1024 * 1024 * 1024);
        const freeMem = os.freemem() / (1024 * 1024 * 1024);
        const usedMem = totalMem - freeMem;

        const onlineCount = Object.keys(onlineUsers).filter(n => n !== "WorthClient").length;
        const playingCount = Object.keys(usersSessionGames).length;
        const registeredCount = Object.keys(usersDB).length;

        const lastPost = blogDB.length > 0 ? blogDB[blogDB.length - 1] : null;

        res.json({
            success: true,
            status: "online",
            network: {
                online: onlineCount,
                playing: playingCount,
                registered: registeredCount,
            },
            content: {
                tickets: ticketsDB.length,
                texturePacks: texturePacks.length,
                lastUpdate: lastPost ? lastPost.dateFormatted : "N/A"
            },
            host: {
                uptime: process.uptime(),
                ramUsage: `${usedMem.toFixed(2)}GB / ${totalMem.toFixed(2)}GB`,
                cpuLoad: os.loadavg()[0]
            }
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Erro ao gerar métricas." });
    }
});

app.get("/api/v1/player/:nick", (req, res) => {
    try {
        const targetNick = req.params.nick;

        const realNick = Object.keys(usersDB).find(k => k.toLowerCase() === targetNick.toLowerCase());

        if (!realNick) {
            return res.status(404).json({ success: false, message: "Jogador não encontrado." });
        }

        const userData = usersDB[realNick];
        const isOnline = !!onlineUsers[realNick];
        const isPlaying = !!usersSessionGames[realNick];

        const activeCosmetics = [];
        if (userData.cosmetics) {
            for (const [cosmeticId, isActive] of Object.entries(userData.cosmetics)) {
                if (isActive) {
                    const cosmeticInfo = cosmeticsListDB.find(c => c.id === cosmeticId);
                    activeCosmetics.push(cosmeticInfo ? { id: cosmeticId, name: cosmeticInfo.name, type: cosmeticInfo.category } : { id: cosmeticId });
                }
            }
        }

        const responseData = {
            success: true,
            nick: realNick,
            uuid: userData.uuid || null,
            status: isOnline ? (isPlaying ? "playing" : "online") : "offline",
            social: {
                discord: userData.discord ? {
                    username: userData.discord.username,
                    linkedAt: userData.discord.linkedAt
                } : null
            },
            game: {
                cosmetics: activeCosmetics,
                friendsCount: userData.friends ? userData.friends.length : 0
            },
            meta: {
                registeredAt: userData.registeredAt || null,
                lastLogin: userData.lastLogin || null
            }
        };

        res.json(responseData);

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Erro interno ao buscar jogador." });
    }
});