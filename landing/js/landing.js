/* 落地页交互（原生 JS，零依赖）：
   复刻官方 Radix 组件的吸顶导航 / 终端 Tab / 复制命令 / FAQ 手风琴 /
   安装下拉菜单 / 移动端菜单，以及视差与页脚显现效果。 */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 吸顶导航 ---------- */
  var pinned = document.querySelector("nav[aria-label='Hermes Agent（吸顶导航）']");
  var pinnedWrap = pinned && pinned.closest("div.fixed");
  if (pinnedWrap) {
    var onScroll = function () {
      pinnedWrap.classList.toggle("is-pinned", window.scrollY > 120);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- 终端安装 Tab ---------- */
  var tablist = document.querySelector(".landing-terminal-tabs");
  if (tablist) {
    var tabs = Array.prototype.slice.call(tablist.querySelectorAll("[role='tab']"));
    var panels = Array.prototype.slice.call(
      document.querySelectorAll(".landing-terminal-panel")
    );
    var select = function (tab) {
      tabs.forEach(function (t) {
        var active = t === tab;
        t.setAttribute("data-state", active ? "active" : "inactive");
        t.setAttribute("aria-selected", active ? "true" : "false");
      });
      panels.forEach(function (p) {
        var active = p.id === tab.getAttribute("aria-controls");
        p.setAttribute("data-state", active ? "active" : "inactive");
        if (active) p.removeAttribute("hidden");
        else p.setAttribute("hidden", "");
      });
    };
    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () {
        select(tab);
        tab.focus();
      });
      tab.addEventListener("keydown", function (e) {
        var dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!dir) return;
        e.preventDefault();
        var next = tabs[(i + dir + tabs.length) % tabs.length];
        select(next);
        next.focus();
      });
    });
  }

  /* ---------- 复制安装命令 ---------- */
  document.querySelectorAll(".landing-terminal-copy").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var panel = btn.closest(".landing-terminal-panel");
      var code = panel && panel.querySelector("code");
      if (!code) return;
      var done = function () {
        btn.classList.add("hw-copied");
        setTimeout(function () {
          btn.classList.remove("hw-copied");
        }, 1400);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code.textContent).then(done, done);
      } else {
        var ta = document.createElement("textarea");
        ta.value = code.textContent;
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand("copy");
        } catch (e) {}
        document.body.removeChild(ta);
        done();
      }
    });
  });

  /* ---------- FAQ 手风琴 ---------- */
  document.querySelectorAll("[data-faq-answer]").forEach(function (panel) {
    var item = panel.closest("[data-orientation='vertical'][data-state]");
    var btn = item && item.querySelector("button[aria-expanded]");
    if (!btn) return;
    var setState = function (open) {
      item.setAttribute("data-state", open ? "open" : "closed");
      btn.setAttribute("data-state", open ? "open" : "closed");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      panel.setAttribute("data-state", open ? "open" : "closed");
      panel.setAttribute("aria-hidden", open ? "false" : "true");
      if (reduceMotion) {
        panel.style.height = open ? "auto" : "0px";
        return;
      }
      panel.style.height = open ? panel.scrollHeight + "px" : "0px";
    };
    panel.style.height = "0px";
    btn.addEventListener("click", function () {
      setState(btn.getAttribute("aria-expanded") !== "true");
    });
  });

  /* ---------- 导航「安装」下拉菜单 ---------- */
  var installBtn = document.querySelector("[data-pro-nav-action] button[aria-haspopup='menu']");
  if (installBtn) {
    var menu = document.createElement("div");
    menu.className = "hw-install-menu";
    menu.setAttribute("role", "menu");
    menu.innerHTML =
      '<div class="hw-install-menu-label">安装 Hermes</div>' +
      '<a role="menuitem" href="https://hermes-assets.nousresearch.com/Hermes-Setup.dmg?build=4d55ca91656a" target="_blank" rel="noopener noreferrer">macOS 桌面应用</a>' +
      '<a role="menuitem" href="https://hermes-assets.nousresearch.com/Hermes-Setup.exe?build=4d55ca91656a" target="_blank" rel="noopener noreferrer">Windows 桌面应用</a>' +
      '<a role="menuitem" href="#install">Linux 终端安装</a>';
    var holder = installBtn.parentElement;
    holder.appendChild(menu);
    var close = function () {
      menu.classList.remove("is-open");
      installBtn.setAttribute("aria-expanded", "false");
    };
    installBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = menu.classList.toggle("is-open");
      installBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("click", function (e) {
      if (!menu.contains(e.target)) close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
  }

  /* ---------- 移动端菜单 ---------- */
  var burger = document.querySelector("button[aria-label='打开菜单']");
  if (burger) {
    var overlay = document.createElement("div");
    overlay.className = "hw-mobile-menu";
    overlay.innerHTML =
      '<div class="hw-mobile-menu-top">' +
      '<span class="hw-teams-gothic" style="text-transform:uppercase">Hermes<br/>Agent</span>' +
      '<button class="hw-mobile-menu-close" aria-label="关闭菜单">' +
      '<svg width="28" height="28" viewBox="0 0 20 20" fill="none" aria-hidden="true">' +
      '<path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.6" stroke-linecap="square"/></svg>' +
      "</button></div>" +
      "<nav>" +
      '<a href="https://nousresearch.com" target="_blank" rel="noopener noreferrer">Nous</a>' +
      '<a href="/">Hermes</a>' +
      '<a href="/docs/">文档</a>' +
      '<a href="https://discord.gg/nousresearch" target="_blank" rel="noopener noreferrer">社区</a>' +
      '<a href="https://portal.nousresearch.com" target="_blank" rel="noopener noreferrer">Portal</a>' +
      "</nav>" +
      '<div class="hw-mobile-menu-foot">开源 · MIT 许可证</div>';
    document.body.appendChild(overlay);
    var closeMenu = function () {
      overlay.classList.remove("is-open");
      document.body.style.overflow = "";
    };
    burger.addEventListener("click", function () {
      overlay.classList.add("is-open");
      document.body.style.overflow = "hidden";
    });
    overlay.querySelector(".hw-mobile-menu-close").addEventListener("click", closeMenu);
    overlay.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", closeMenu);
    });
  }

  /* ---------- 大字 ghost 适配宽度（fit-text） ---------- */
  document.querySelectorAll(".fit-text").forEach(function (p) {
    var line = p.querySelector("span > span") || p.querySelector("span");
    if (!line) return;
    var fit = function () {
      var w = p.clientWidth;
      if (!w) return;
      p.style.fontSize = "100px";
      var w100 = line.getBoundingClientRect().width || 1;
      var max = parseFloat(getComputedStyle(p).getPropertyValue("--fit-max")) || w;
      var size = Math.max(12, (100 * Math.min(w, max)) / w100);
      p.style.fontSize = size + "px";
    };
    fit();
    window.addEventListener("resize", fit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  });

  /* ---------- 滚动效果：页脚显现 ---------- */
  /* 注：官方对 .hw-noise>img 的定位由 CSS 按 variants 精确指定，
     这里不做图片视差，避免覆盖基准 transform；仅复刻页脚显现。 */
  if (!reduceMotion) {
    var footerReveal = document.querySelector(".hw-footer-reveal");
    var footerWord = footerReveal && footerReveal.querySelector(".hw-ghost");
    var ticking = false;
    var update = function () {
      ticking = false;
      var vh = window.innerHeight;
      if (footerReveal && footerWord) {
        var fr = footerReveal.getBoundingClientRect();
        var visible = Math.min(Math.max((vh - fr.top) / vh, 0), 1);
        footerReveal.style.setProperty("--hw-footer-opacity", visible.toFixed(3));
        footerWord.style.translate =
          "0 calc(32% + " + ((1 - visible) * 45).toFixed(1) + "%)";
        footerWord.style.opacity = visible.toFixed(3);
      }
    };
    window.addEventListener("scroll", function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });
    update();
  }
})();
