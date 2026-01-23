function appLanguage(trs) {
    tr = window.api.translate(trs);

    document.querySelector('button#btn-skip.text-xs.font-medium.text-zinc-500.hover\\:text-white.transition-colors.uppercase.tracking-wider').textContent = tr["modals"]["welcomeModal"]["btn-skip"];
    document.querySelector('h1.text-4xl.font-black.text-white.mb-3.tracking-tight').innerHTML = `${tr["modals"]["welcomeModal"]["slides"][0]["title"]} <span class="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">WorthClient</span>`;
    document.querySelector('p.text-zinc-500.text-sm.font-medium.max-w-sm.mb-10.leading-relaxed').textContent = tr["modals"]["welcomeModal"]["slides"][0]["description"];
    document.querySelector('span.text-\\[10px\\].text-zinc-500.font-bold.uppercase.tracking-wider').textContent = tr["modals"]["welcomeModal"]["slides"][0]["inputs"][0]["title"];
    document.querySelector('h2.text-2xl.font-bold.text-white.mb-3').textContent = tr["modals"]["welcomeModal"]["slides"][1]["title"];
    document.querySelector('p.text-zinc-400.text-sm.max-w-sm.leading-relaxed').textContent = tr["modals"]["welcomeModal"]["slides"][1]["description"];
    document.querySelector('span.px-3.py-1.rounded-full.bg-yellow-500\\/10.border.border-yellow-500\\/20.text-yellow-500.text-xs.font-bold').textContent = tr["modals"]["welcomeModal"]["slides"][1]["divs"][0].content;
    document.querySelector('span.px-3.py-1.rounded-full.bg-zinc-800.border.border-white\\/5.text-zinc-400.text-xs').textContent = tr["modals"]["welcomeModal"]["slides"][1]["divs"][1].content;
    document.querySelector('h2.text-2xl.font-bold.text-white.mb-3.a2').textContent = tr["modals"]["welcomeModal"]["slides"][2]["title"];
    document.querySelector('p.text-zinc-400.text-sm.max-w-sm.leading-relaxed.a2').textContent = tr["modals"]["welcomeModal"]["slides"][2]["description"];
    document.querySelector('h2.text-2xl.font-bold.text-white.mb-3.a3').textContent = tr["modals"]["welcomeModal"]["slides"][3]["title"];
    document.querySelector('p.text-zinc-400.text-sm.max-w-sm.leading-relaxed.a3').textContent = tr["modals"]["welcomeModal"]["slides"][3]["description"];
    document.querySelector('h2.text-2xl.font-bold.text-white.mb-3.a4').textContent = tr["modals"]["welcomeModal"]["slides"][4]["title"];
    document.querySelector('p.text-zinc-400.text-sm.max-w-sm.leading-relaxed.a4').textContent = tr["modals"]["welcomeModal"]["slides"][4]["description"];
    document.querySelector('h2.text-2xl.font-bold.text-white.mb-3.a5').textContent = tr["modals"]["welcomeModal"]["slides"][5]["title"];
    document.querySelector('p.text-zinc-400.text-sm.max-w-sm.leading-relaxed.a5').textContent = tr["modals"]["welcomeModal"]["slides"][5]["description"];
    document.querySelector('h2.text-2xl.font-bold.text-white.mb-3.a6').textContent = tr["modals"]["welcomeModal"]["slides"][6]["title"];
    document.querySelector('p.text-zinc-400.text-sm.max-w-sm.leading-relaxed.a6').textContent = tr["modals"]["welcomeModal"]["slides"][6]["description"];
    document.querySelector('h2.text-2xl.font-bold.text-white.mb-3.a7').textContent = tr["modals"]["welcomeModal"]["slides"][7]["title"];
    document.querySelector('p.text-zinc-400.text-sm.max-w-sm.leading-relaxed.a7').textContent = tr["modals"]["welcomeModal"]["slides"][7]["description"];
    document.querySelector('span.px-3.py-1.rounded-full.bg-green-500\\/10.border.border-green-500\\/20.text-green-500.text-xs.font-bold').textContent = tr["modals"]["welcomeModal"]["slides"][7]["divs"][0].content;
    document.querySelector('span.px-3.py-1.rounded-full.bg-red-500\\/10.border.border-red-500\\/20.text-red-500.text-xs.font-bold').textContent = tr["modals"]["welcomeModal"]["slides"][7]["divs"][1].content;
    document.querySelector('h2.text-3xl.font-black.text-white.mb-2').textContent = tr["modals"]["welcomeModal"]["slides"][8]["title"];
    document.querySelector('p.text-zinc-400.text-sm.mb-8.a1').textContent = tr["modals"]["welcomeModal"]["slides"][8]["description"];
    document.querySelector('span.relative.z-10.flex.items-center.justify-center.gap-2.group-hover\\:text-white.transition-colors').innerHTML = `${tr["modals"]["welcomeModal"]["slides"][8]["buttons"][0].content} <i data-lucide="arrow-right" class="w-5 h-5"></i>`;
    document.querySelector('h3.text-2xl.font-black.text-white.mb-2.tracking-tight.autgf').textContent = tr["modals"]["authErrorModal"]["title"];
    document.querySelector('p.text-xs.font-bold.text-red-400.uppercase.tracking-widest.mb-4.border.border-red-500\\/20.px-2.py-1.rounded.bg-red-500\\/5').textContent = tr["modals"]["authErrorModal"]["descriptions"][0];
    document.querySelector('p#auth-error-msg.text-sm.text-zinc-400.mb-8.leading-relaxed.font-medium').textContent = tr["modals"]["authErrorModal"]["descriptions"][0];
    document.querySelector('#close-modal-login-eror').textContent = tr["modals"]["authErrorModal"]["buttons"][0].content;
    document.querySelector('[data-tr="vdefr234t"]').textContent = tr["modals"]["clearHistoryModal"]["title"];
    document.querySelector('[data-tr="vdefr234fsdt"]').innerHTML = `${tr["modals"]["clearHistoryModal"]["descriptions"][0]} <b class="text-red-400">${tr["modals"]["clearHistoryModal"]["descriptions"][1]}</b>.`;
    document.querySelector('[data-tr="vdefr23dsf12344t"]').textContent = tr["modals"]["clearHistoryModal"]["buttons"][0].content;
    document.querySelector('[data-tr="vdefr2defr434t"]').innerHTML = `<i data-lucide="eraser" class="w-4 h-4"></i> ${tr["modals"]["clearHistoryModal"]["buttons"][1].content}`;
    document.querySelector('[data-tr="vdefrefg4g234t"]').textContent = tr["modals"]["closeTicketModal"]["title"];
    document.querySelector('[data-tr="vdefr2ewd12334t"]').innerHTML = tr["modals"]["closeTicketModal"]["description"];
    document.querySelector('[data-tr="vdefradsfdsfdf234t"]').textContent = tr["modals"]["closeTicketModal"]["buttons"][0].content;
    document.querySelector('[data-tr="vdefraS2234t"]').innerHTML = `<i data-lucide="check-circle" class="w-4 h-4"></i> ${tr["modals"]["closeTicketModal"]["buttons"][1].content}`;
    document.querySelector('[data-tr="vdefdfsvefr234t"]').textContent = tr["modals"]["deleteAccountModal"]["title"];
    document.querySelector('[data-tr="vdeff43frr234t"]').innerHTML = `${tr["modals"]["deleteAccountModal"]["descriptions"][0]} <br>
                <span id="delete-target-name" class="text-white font-bold bg-white/5 px-2 py-0.5 rounded text-xs mx-1">...</span> ?
                <br><span class="text-xs text-red-400/80 mt-1 block">${tr["modals"]["deleteAccountModal"]["descriptions"][1]}</span>`;
    document.querySelector('[data-tr="vdeffgh45y34yr234t"]').textContent = tr["modals"]["deleteAccountModal"]["buttons"][0].content;
    document.querySelector('[data-tr="vdefdfg34fr234t"]').innerHTML = `<i data-lucide="trash" class="w-3.5 h-3.5"></i> ${tr["modals"]["deleteAccountModal"]["buttons"][1].content}`;
    document.querySelector('[data-tr="vdefr34dewfegty234t"]').textContent = tr["modals"]["discordModal"][0]["title"];
    document.querySelector('[data-tr="vdefr2dsfrgr34t"]').textContent = tr["modals"]["discordModal"][0]["description"];
    document.querySelector('[data-tr="vdefr23bfgnh4t"]').textContent = tr["modals"]["discordModal"][0]["label"];
    document.querySelector('[data-tr="vdefr2asd3234t"]').textContent = tr["modals"]["discordModal"][0]["content"];
    document.querySelector('[data-tr="ferwf34t"]').textContent = tr["modals"]["discordModal"][0]["divs"][0].title;
    document.querySelector('[data-tr="r3ger34t43t"]').textContent = tr["modals"]["discordModal"][0]["divs"][0].description;
    document.querySelector('[data-tr="defsgy45yg"]').innerHTML = `<i data-lucide="external-link" class="w-3 h-3"></i> ${tr["modals"]["discordModal"][0]["divs"][0]["button"].content}`;
    document.querySelector('[data-tr="dfg345ggrthfgrtjfg"]').innerHTML = `<span class="text-gray-300 font-bold" >${tr["modals"]["discordModal"][0]["divs"][1]["title"]}</span><br>
                    ${tr["modals"]["discordModal"][0]["divs"][1]["descriptions"][0]} <span class="text-white">${tr["modals"]["discordModal"][0]["divs"][1]["descriptions"][1]}</span> ${tr["modals"]["discordModal"][0]["divs"][1]["descriptions"][2]}`;
    document.querySelector('[data-tr="ce2df4hfghdfghg"]').innerHTML = tr["modals"]["discordModal"][0]["buttons"][0].content;
    document.querySelector('[data-tr="dsfer34gr5h"]').innerHTML = `<span>${tr["modals"]["discordModal"][0]["buttons"][1].content}</span>
                    <i data-lucide="arrow-right" class="w-3 h-3 group-hover/btn:translate-x-1 transition-transform"></i>`;
    document.querySelector('[data-tr="grhjhkuykjuy"]').textContent = tr["modals"]["discordModal"][1]["title"];
    document.querySelector('[data-tr="adesew3r23f"]').innerHTML = `${tr["modals"]["discordModal"][1]["descriptions"][0]}<br>${tr["modals"]["discordModal"][1]["descriptions"][1]}`;
    document.querySelector('[data-tr="f435y56bgghdfghjr"]').textContent = tr["modals"]["discordModal"][1]["divs"][0]["title"];
    document.querySelector('[data-tr="dsf43cdfv"]').textContent = tr["modals"]["discordModal"][1]["buttons"][0].content;
    document.querySelector('[data-tr="dfsgrhr45terwghyfgt"]').innerHTML = `<i data-lucide="check-circle-2" class="w-3 h-3"></i> ${tr["modals"]["discordModal"][1]["buttons"][1].content}`;
    document.querySelector('[data-tr="gfdgergr35tv"]').textContent = tr["modals"]["discordModal"][2]["title"];
    document.querySelector('[data-tr="dfsf43rrf"]').textContent = tr["modals"]["discordModal"][2]["description"];
    document.querySelector('[data-tr="sdfewf342th"]').textContent = tr["modals"]["discordModal"][2]["divs"][0]["title"];
    document.querySelector('[data-tr="sdfewf323442th"]').textContent = tr["modals"]["discordModal"][2]["divs"][0]["span"];
    document.querySelector('[data-tr="sdfewf342adsth"]').textContent = tr["modals"]["discordModal"][2]["buttons"][0]["content"];

    lucide.createIcons();
}