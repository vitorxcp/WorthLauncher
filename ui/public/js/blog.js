const API_HOST = "http://elgae-sp1-b001.elgaehost.com.br:10379";
const API_URL = `${API_HOST}/api/v1/blog/feed`;
const feedContainer = document.getElementById("blog-feed");
const allNewsGrid = document.getElementById("all-news-grid");
const blogModal = document.getElementById("blog-modal");
const allNewsModal = document.getElementById("all-news-modal");
const modalTitle = document.getElementById("modal-title");
const modalImage = document.getElementById("modal-image");
const modalFallback = document.getElementById("modal-fallback");
const modalTag = document.getElementById("modal-tag");
const modalDate = document.getElementById("modal-date");
const modalAuthor = document.getElementById("modal-author");
const modalContent = document.getElementById("modal-contentads");

try {

    let cachedPosts = [];

    if (typeof marked !== 'undefined') {
        const renderer = new marked.Renderer();
        const linkRenderer = renderer.link;
        renderer.link = (href, title, text) => {
            const html = linkRenderer.call(renderer, href, title, text);
            return html.replace(/^<a /, '<a target="_blank" rel="noopener noreferrer" class="external-link" ');
        };
        marked.setOptions({ renderer });
    }

    function renderCards(posts, container) {
        container.innerHTML = "";

        posts.forEach((post, index) => {
            const card = document.createElement("div");
            card.className = "news-card-base group relative h-60 rounded-2xl overflow-hidden cursor-pointer animate-card shrink-0";
            card.style.animationDelay = `${index * 150}ms`;

            const mainTag = post.tags && post.tags.length > 0 ? post.tags[0] : "INFO";
            const hasImage = post.image && post.image.trim() !== "" && !post.image.includes("default-blog.png");
            const imageUrl = post.image.startsWith('http') ? post.image : `${API_HOST}${post.image}`;

            let backgroundHTML;

            if (hasImage) {
                backgroundHTML = `
                <div class="absolute inset-0 bg-[#111]">
                    <img src="${imageUrl}" 
                        class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-70 group-hover:opacity-50"
                        onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                    <div class="artistic-fallback w-full h-full" style="display: none;">
                        <i data-lucide="image-off" class="watermark-icon"></i>
                    </div>
                </div>
            `;
            } else {
                backgroundHTML = `
                <div class="artistic-fallback absolute inset-0 w-full h-full">
                    <i data-lucide="component" class="watermark-icon"></i>
                </div>
            `;
            }

            card.innerHTML = `
            ${backgroundHTML}
            <div class="absolute inset-0 readability-gradient"></div>
            
            <div class="absolute bottom-0 left-0 w-full p-6 flex flex-col items-start z-10">
                <div class="flex items-center gap-1 mb-2 w-full">
                    ${post.tags[0] ?
                    (
                        post.tags.map(tag => {
                            return `
                                <span class="text-[10px] font-bold text-black bg-yellow-500 px-2 py-0.5 rounded shadow-lg uppercase tracking-wide group-hover:bg-white transition-colors">
                        ${tag}
                    </span>
                                `
                        })
                    )
                    :
                    `
                        <span class="text-[10px] font-bold text-black bg-yellow-500 px-2 py-0.5 rounded shadow-lg uppercase tracking-wide group-hover:bg-white transition-colors">
                        INFO
                    </span>
                        `
                }
                    <span class="text-[10px] text-gray-400 font-mono ml-auto opacity-70">
                        ${post.dateFormatted || 'Hoje'}
                    </span>
                </div>
                <h3 class="font-bold text-white leading-snug text-lg line-clamp-2 mb-1 group-hover:text-yellow-400 transition-colors drop-shadow-md">
                    ${post.title}
                </h3>
                <p class="text-xs text-gray-300 line-clamp-2 opacity-80 group-hover:opacity-100 transition-opacity font-medium">
                    ${post.summary}
                </p>
            </div>
        `;

            card.onclick = () => openBlogModal(post);
            container.appendChild(card);
        });

        if (window.lucide) lucide.createIcons();
    }

    function openBlogModal(post) {
        if (!modalTitle || !blogModal) return;

        modalTitle.innerText = post.title;
        modalTag.innerHTML = post.tags[0] ?
            (
                post.tags.map(tag => {
                    return `
                                <span class="text-[10px] font-bold text-black bg-yellow-500 px-2 py-0.5 rounded shadow-lg uppercase tracking-wide group-hover:bg-white transition-colors">
                        ${tag}
                    </span>
                                `
                })
            )
            :
            `
                        <span class="text-[10px] font-bold text-black bg-yellow-500 px-2 py-0.5 rounded shadow-lg uppercase tracking-wide group-hover:bg-white transition-colors">
                        INFO
                    </span>
                        `

        modalDate.innerText = post.dateFormatted || '';
        modalAuthor.innerText = post.author || 'Equipe';


        if (typeof marked !== 'undefined') {
            modalContent.innerHTML = marked.parse(post.content);
        } else {
            modalContent.innerHTML = post.content;
        }

        const links = modalContent.querySelectorAll('a');
        links.forEach(link => {
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
            link.classList.add('hover:text-yellow-400', 'transition-colors');
        });

        const hasImage = post.image && post.image.trim() !== "" && !post.image.includes("default-blog.png");
        const imageUrl = post.image.startsWith('http') ? post.image : `${API_HOST}${post.image}`;

        if (hasImage) {
            modalImage.style.display = 'block';
            modalFallback.classList.add('hidden');
            modalImage.src = imageUrl;
            modalImage.onerror = () => {
                modalImage.style.display = 'none';
                modalFallback.classList.remove('hidden');
            };
        } else {
            modalImage.style.display = 'none';
            modalFallback.classList.remove('hidden');
            if (modalFallback.innerHTML.trim() === "") {
                modalFallback.innerHTML = `<i data-lucide="layout" class="watermark-icon" style="width: 200px; height: 200px; opacity: 0.05;"></i>`;
                lucide.createIcons();
            }
        }

        const modalContentDiv = blogModal.querySelector('div.relative');
        const modalBg = blogModal.querySelector('div.absolute');

        blogModal.classList.remove("hidden-force");

        modalContentDiv.classList.remove('modal-exit');
        modalBg.classList.remove('bg-exit');

        modalContentDiv.classList.add('modal-enter');
        modalBg.classList.add('bg-enter');
    }

    window.closeBlogModal = () => {
        if (blogModal) {
            const modalContentDiv = blogModal.querySelector('div.relative');
            const modalBg = blogModal.querySelector('div.absolute');

            modalContentDiv.classList.remove('modal-enter');
            modalBg.classList.remove('bg-enter');

            modalContentDiv.classList.add('modal-exit');
            modalBg.classList.add('bg-exit');

            setTimeout(() => {
                blogModal.classList.add("hidden-force");
                modalContentDiv.classList.remove('modal-exit');
            }, 200);
        }
    };

    const btnSeeAll = document.getElementById("btn-see-all");
    if (btnSeeAll) {
        btnSeeAll.addEventListener("click", () => {
            renderCards(cachedPosts, allNewsGrid);
            toggleAllNews(true);
        });
    }

    window.toggleAllNews = (show) => {
        if (allNewsModal) {
            const modalContentDiv = allNewsModal.querySelector('div.relative');
            const modalBg = allNewsModal.querySelector('div.absolute');

            if (show) {
                allNewsModal.classList.remove("hidden-force");
                modalContentDiv.classList.remove('modal-exit');
                modalBg.classList.remove('bg-exit');

                modalContentDiv.classList.add('modal-enter');
                modalBg.classList.add('bg-enter');
            } else {
                modalContentDiv.classList.remove('modal-enter');
                modalBg.classList.remove('bg-enter');

                modalContentDiv.classList.add('modal-exit');
                modalBg.classList.add('bg-exit');

                setTimeout(() => allNewsModal.classList.add("hidden-force"), 200);
            }
        }
    };

    window.addEventListener('load', loadBlogFeed);
} catch (e) {
    let aadsfas = false;
    window.onerror = function (message, source, lineno, colno, error) {
        showCrashPopup(message, source, lineno);
        console.warn("CRASH DETECTADO:", message);
        aadsfas = true;
    };

    window.addEventListener('unhandledrejection', function (event) {
        console.warn("PROMISE REJEITADA:", event.reason);
        showCrashPopup(event.reason ? event.reason.toString() : "Erro desconhecido em Promise", null, null);
    });

    window.addEventListener('rejectionhandled', function (event) {
        console.warn("PROMISE REJEITADA:", event.reason);
        showCrashPopup(event.reason ? event.reason.toString() : "Erro desconhecido em Promise", null, null);
    });

    window.addEventListener('error', function (event) {
        console.warn("PROMISE REJEITADA:", event.reason);
        showCrashPopup(event.reason ? event.reason.toString() : "Erro desconhecido em Promise", null, null);
    });

    window.copyErrorLog = () => {
        const text = document.getElementById('crash-log-text').innerText;
        navigator.clipboard.writeText(text);
        const icon = document.querySelector('#crash-card .lucide-copy');
        if (icon) icon.style.color = '#4ade80';
    };
}

async function loadBlogFeed() {
    try {
        const res = await fetch(API_URL);
        const data = await res.json();

        if (data.success && data.posts.length > 0) {
            cachedPosts = data.posts;
            renderCards(cachedPosts, feedContainer);
        } else {
            feedContainer.innerHTML = `<div class="col-span-3 text-center py-12 text-gray-600 font-mono text-xs border border-dashed border-white/5 rounded-xl animate-card">Nenhuma notícia encontrada.</div>`;
        }
    } catch (err) {
        console.error(err);
        feedContainer.innerHTML = `<div class="text-red-500 text-xs p-4 animate-card">Erro ao conectar com o servidor de notícias.</div>`;
    }
}