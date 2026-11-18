/* =========================================================
   Đỗ Trường & Nguyễn Duyên — invitation clone
   Local rebuild of chungdoi.com/i/batruong-thiduyen-cherish
   ========================================================= */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---------------------------------------------------------
     Config
     --------------------------------------------------------- */
  var CONFIG = {
    weddingDate: new Date('2026-11-27T16:00:00+07:00'),
    musicStart: 31,
    musicEnd: 341,
    autoplayGallery: true,
    galleryInterval: 4000
  };

  /* ---------------------------------------------------------
     Google Apps Script bridge (guestbook + RSVP)
     --------------------------------------------------------- */
  var APP_SCRIPT_URL = String((window.WEDDING_CONFIG || {}).appScriptUrl || '').trim();
  var IS_LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  var WISH_CACHE_KEY = 'td-wishes-v1';

  function endpointMissing() {
    return !APP_SCRIPT_URL && !IS_LOCAL_HOST;
  }

  function postToAppScript(payload) {
    var body = new URLSearchParams();
    Object.keys(payload).forEach(function (key) {
      if (payload[key] !== undefined && payload[key] !== null) body.append(key, payload[key]);
    });
    return fetch(APP_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    });
  }

  function readWishCache() {
    try { return JSON.parse(localStorage.getItem(WISH_CACHE_KEY) || '[]'); } catch (e) { return []; }
  }

  function writeWishCache(list) {
    try { localStorage.setItem(WISH_CACHE_KEY, JSON.stringify((list || []).slice(0, 100))); } catch (e) {}
  }

  function loadAppScriptWishes() {
    return new Promise(function (resolve, reject) {
      if (!APP_SCRIPT_URL) { reject(new Error('no endpoint')); return; }
      var callback = 'tdWishes' + Date.now() + Math.floor(Math.random() * 1000);
      var script = document.createElement('script');
      var done = false;
      var timer = setTimeout(function () { finish(); reject(new Error('timeout')); }, 8000);
      function finish() {
        if (done) return;
        done = true;
        clearTimeout(timer);
        script.remove();
        try { delete window[callback]; } catch (e) { window[callback] = undefined; }
      }
      window[callback] = function (payload) {
        var list = (payload && payload.wishes) || [];
        finish();
        resolve(list.map(function (wish) {
          var time = Number(wish.time) || Date.now();
          return { name: wish.name, message: wish.wish, createdAt: new Date(time).toISOString() };
        }));
      };
      script.onerror = function () { finish(); reject(new Error('network')); };
      script.src = APP_SCRIPT_URL + (APP_SCRIPT_URL.indexOf('?') === -1 ? '?' : '&') + 'action=wishes&callback=' + callback;
      document.body.appendChild(script);
    });
  }

  function mergeWishes(remote, local) {
    var seen = {};
    var merged = [];
    (remote || []).concat(local || []).forEach(function (item) {
      if (!item || !item.name || !item.message) return;
      var key = item.name + '|' + item.message;
      if (seen[key]) return;
      seen[key] = 1;
      merged.push(item);
    });
    return merged.sort(function (a, b) {
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    }).slice(0, 100);
  }

  /* ---------------------------------------------------------
     Toast
     --------------------------------------------------------- */
  var toastHost;
  function toast(message, type) {
    if (!toastHost) {
      toastHost = document.createElement('div');
      toastHost.setAttribute('data-toast-host', '');
      toastHost.style.cssText = 'position:fixed;left:16px;right:16px;bottom:24px;z-index:100000;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none';
      document.body.appendChild(toastHost);
    }
    var el = document.createElement('div');
    el.textContent = message;
    el.style.cssText = 'max-width:420px;width:auto;padding:10px 18px;border-radius:999px;font-size:13px;line-height:1.35;color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.22);opacity:0;transform:translateY(8px);transition:opacity .25s ease,transform .25s ease;background:' + (type === 'error' ? '#8a1f1f' : '#800000');
    toastHost.appendChild(el);
    requestAnimationFrame(function () { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; });
    setTimeout(function () {
      el.style.opacity = '0'; el.style.transform = 'translateY(8px)';
      setTimeout(function () { el.remove(); }, 300);
    }, 3200);
  }

  /* ---------------------------------------------------------
     Music
     --------------------------------------------------------- */
  var audio = document.getElementById('bg-music');
  var musicBtn = $('button[aria-label*="nhạc"]');
  var musicPlaying = false;

  function syncMusicButton() {
    if (!musicBtn) return;
    musicBtn.setAttribute('aria-label', musicPlaying ? 'Tạm dừng nhạc' : 'Phát nhạc');
    var disc = musicBtn.querySelector('.animate-spin-cd');
    if (disc) disc.style.animationPlayState = musicPlaying ? 'running' : 'paused';
    var bars = $$('.animate-dance-1,.animate-dance-2,.animate-dance-3,.animate-dance-4', musicBtn);
    bars.forEach(function (b) { b.style.animationPlayState = musicPlaying ? 'running' : 'paused'; });
  }

  function playMusic() {
    if (!audio) return;
    try {
      if (!audio.currentTime || audio.currentTime < CONFIG.musicStart) {
        audio.currentTime = CONFIG.musicStart;
      }
      audio.volume = 0.5;
      var p = audio.play();
      if (p && p.catch) p.catch(function () {});
    } catch (e) { /* autoplay blocked */ }
  }

  if (audio) {
    audio.addEventListener('timeupdate', function () {
      if (audio.currentTime >= CONFIG.musicEnd) audio.currentTime = CONFIG.musicStart;
    });
    audio.addEventListener('play', function () { musicPlaying = true; syncMusicButton(); });
    audio.addEventListener('pause', function () { musicPlaying = false; syncMusicButton(); });
  }

  if (musicBtn) {
    musicBtn.addEventListener('click', function () {
      if (!audio) return;
      if (audio.paused) { playMusic(); } else { audio.pause(); }
    });
  }

  /* ---------------------------------------------------------
     Confetti (double happiness particle burst)
     --------------------------------------------------------- */
  function burstParticles(host) {
    var colors = ['#FFD700', '#FFE066', '#FFC107', '#FF6B6B', '#ffeed2'];
    var layer = document.createElement('div');
    layer.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:60;overflow:hidden';
    host.appendChild(layer);
    for (var i = 0; i < 52; i++) {
      var el = document.createElement('span');
      el.className = 'cd-particle';
      el.textContent = '囍';
      var size = 12 + Math.random() * 24;
      var angle = Math.random() * Math.PI * 2;
      var dist = 90 + Math.random() * Math.max(window.innerWidth, window.innerHeight) * 0.55;
      el.style.fontSize = size + 'px';
      el.style.color = colors[i % colors.length];
      el.style.setProperty('--dx', (Math.cos(angle) * dist).toFixed(1) + 'px');
      el.style.setProperty('--dy', (Math.sin(angle) * dist - 40).toFixed(1) + 'px');
      el.style.setProperty('--rot-start', (Math.random() * 120 - 60).toFixed(0) + 'deg');
      el.style.setProperty('--rot-end', (Math.random() * 720 - 360).toFixed(0) + 'deg');
      el.style.animationDelay = (Math.random() * 120).toFixed(0) + 'ms';
      layer.appendChild(el);
    }
    setTimeout(function () { layer.remove(); }, 1600);
  }

  /* ---------------------------------------------------------
     Envelope
     --------------------------------------------------------- */
  var envelope = document.getElementById('invite-envelope');
  var opened = false;

  function openInvitation() {
    if (opened) return;
    opened = true;
    if (envelope) {
      burstParticles(envelope);
      // break the wax seal, then let the card fly away
      var seal = envelope.querySelector('.rounded-full');
      if (seal) {
        seal.style.animation = 'seal-break 520ms cubic-bezier(.4,0,.2,1) forwards';
      }
      var card = envelope.querySelector('.relative.rounded-lg');
      if (card) card.classList.add('cd-envelope-card');
      envelope.classList.add('is-leaving');
      setTimeout(function () {
        envelope.style.display = 'none';
        document.body.classList.remove('invite-locked');
        window.scrollTo(0, 0);
      }, 900);
    } else {
      document.body.classList.remove('invite-locked');
    }
    playMusic();
    try { localStorage.setItem('cd_invitation_opened', '1'); } catch (e) {}
  }

  if (envelope) {
    var openTrigger = envelope.querySelector('.relative.rounded-lg');
    if (openTrigger) openTrigger.addEventListener('click', function (e) { e.preventDefault(); openInvitation(); });
  } else {
    document.body.classList.remove('invite-locked');
  }

  // Allow deep-linking straight into the invitation (?open=1)
  try {
    var qs = new URLSearchParams(location.search);
    if (qs.get('open') === '1' || qs.get('opened') === '1') {
      if (envelope) { envelope.style.display = 'none'; }
      document.body.classList.remove('invite-locked');
      opened = true;
      setTimeout(playMusic, 300);
    }
  } catch (e) {}

  /* ---------------------------------------------------------
     Countdown
     --------------------------------------------------------- */
  var countdownEl = null;
  (function () {
    var heading = $$('h2').find(function (h) { return /đếm/i.test(h.textContent); });
    if (heading) countdownEl = heading.parentElement.querySelector('p');
    if (!countdownEl) return;
    var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
    function tick() {
      var diff = CONFIG.weddingDate.getTime() - Date.now();
      if (diff < 0) diff = 0;
      var s = Math.floor(diff / 1000);
      var d = Math.floor(s / 86400); s -= d * 86400;
      var h = Math.floor(s / 3600); s -= h * 3600;
      var m = Math.floor(s / 60); s -= m * 60;
      countdownEl.textContent = d + ' ngày ' + pad(h) + ' giờ ' + pad(m) + ' phút ' + pad(s) + ' giây';
    }
    tick();
    setInterval(tick, 1000);
  })();

  /* ---------------------------------------------------------
     Photo carousel + lightbox
     --------------------------------------------------------- */
  var galleryRoot = $('.touch-pan-y');
  var galleryStage = galleryRoot ? (galleryRoot.querySelector('[style*="perspective"]') || galleryRoot) : null;
  var cards = galleryStage ? $$(':scope > div.absolute', galleryStage).filter(function (c) { return c.querySelector('img'); }) : [];
  var counterEl = null;
  if (galleryRoot) {
    var counterSpan = $('.tabular-nums', galleryRoot.parentElement);
    counterEl = counterSpan;
  }

  function cardTransform(d) {
    var abs = Math.abs(d);
    var tx = d * 60;
    var tz = -150 * abs;
    var ry = d * 45;
    var scale = abs === 0 ? 1 : (abs === 1 ? 0.85 : 0.7);
    var opacity = abs === 0 ? 1 : (abs === 1 ? 0.75 : (abs === 2 ? 0.5 : 0.3));
    var z = 100 - abs;
    return { transform: 'translateX(' + tx + '%) translateZ(' + tz + 'px) rotateY(' + ry + 'deg) scale(' + scale + ')', opacity: opacity, zIndex: z };
  }

  var galleryIndex = 0;
  function renderGallery() {
    var n = cards.length;
    if (!n) return;
    for (var i = 0; i < n; i++) {
      var raw = i - galleryIndex;
      // shortest path around the ring
      var d = raw;
      if (d > n / 2) d -= n;
      if (d < -n / 2) d += n;
      var t = cardTransform(d);
      var card = cards[i];
      card.style.transitionDuration = '1100ms';
      card.style.transform = t.transform;
      card.style.opacity = String(t.opacity);
      card.style.zIndex = String(t.zIndex);
      if (Math.abs(d) === 0) card.classList.add('ring-2', 'ring-white/30');
      else card.classList.remove('ring-2', 'ring-white/30');
      card.dataset.index = String(i);
    }
    if (counterEl) counterEl.textContent = (galleryIndex + 1) + ' / ' + n;
  }

  function gotoPhoto(i) {
    var n = cards.length;
    if (!n) return;
    galleryIndex = ((i % n) + n) % n;
    renderGallery();
  }

  if (cards.length) {
    renderGallery();

    // clicks on any card (center card opens the lightbox at that photo)
    cards.forEach(function (card) {
      card.addEventListener('click', function () {
        var idx = Number(card.dataset.index || 0);
        var abs = Math.abs(((idx - galleryIndex + cards.length) % cards.length + cards.length / 2) % cards.length - cards.length / 2);
        if (idx === galleryIndex) openLightbox(idx);
        else gotoPhoto(idx);
      });
    });

    var prevBtn = $('button[aria-label="Previous photo"]');
    var nextBtn = $('button[aria-label="Next photo"]');
    if (prevBtn) prevBtn.addEventListener('click', function () { gotoPhoto(galleryIndex - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { gotoPhoto(galleryIndex + 1); });

    // swipe
    var sx = 0, sy = 0, swiping = false;
    galleryRoot.addEventListener('touchstart', function (e) {
      var t = e.touches[0]; sx = t.clientX; sy = t.clientY; swiping = true;
    }, { passive: true });
    galleryRoot.addEventListener('touchend', function (e) {
      if (!swiping) return;
      swiping = false;
      var t = e.changedTouches[0];
      var dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) gotoPhoto(galleryIndex + (dx < 0 ? 1 : -1));
    }, { passive: true });

    // auto advance while the gallery is on screen
    if (CONFIG.autoplayGallery) {
      var timer = null;
      var start = function () {
        if (timer) return;
        timer = setInterval(function () { gotoPhoto(galleryIndex + 1); }, CONFIG.galleryInterval);
      };
      var stop = function () { clearInterval(timer); timer = null; };
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) start(); else stop();
          });
        }, { threshold: 0.35 }).observe(galleryRoot);
      } else {
        start();
      }
    }
  }

  /* ---------------------------------------------------------
     Lightbox
     --------------------------------------------------------- */
  var lightbox = $('dialog.modal:has([aria-label="Close lightbox"])') || $('dialog.modal');
  var lbIndex = 0;
  var lbImg, lbCounter, lbThumbs;
  var openLightbox = function () {};

  if (lightbox) {
    lbImg = $('img[alt^="Ảnh cưới"]', lightbox);
    lbCounter = $$('div', lightbox).find(function (d) { return /^\s*\d+\s*\/\s*\d+\s*$/.test(d.textContent) && d.children.length === 0; });
    lbThumbs = $$('button[aria-label^="View image"]', lightbox);

    function renderLightbox() {
      if (lbImg) {
        var src = cards[lbIndex] && cards[lbIndex].querySelector('img');
        if (src) lbImg.src = src.getAttribute('src');
        lbImg.alt = 'Ảnh cưới ' + (lbIndex + 1);
      }
      if (lbCounter) lbCounter.textContent = (lbIndex + 1) + ' / ' + cards.length;
      lbThumbs.forEach(function (b, i) {
        var active = i === lbIndex;
        b.setAttribute('aria-current', active ? 'true' : 'false');
        b.style.outline = active ? '2px solid rgb(128, 0, 0)' : 'none';
        b.style.outlineOffset = active ? '2px' : '0';
        b.style.opacity = active ? '1' : '0.6';
        b.classList.toggle('scale-105', active);
        b.classList.toggle('shadow-lg', active);
      });
      var activeThumb = lbThumbs[lbIndex];
      if (activeThumb && activeThumb.scrollIntoView) {
        activeThumb.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
      }
    }

    function doOpenLightbox(i) {
      lbIndex = i;
      renderLightbox();
      if (typeof lightbox.showModal === 'function') lightbox.showModal();
      else lightbox.setAttribute('open', '');
    }
    openLightbox = doOpenLightbox;

    $$('button[aria-label="Previous image"]', lightbox).forEach(function (b) {
      b.addEventListener('click', function (e) { e.stopPropagation(); lbIndex = (lbIndex - 1 + cards.length) % cards.length; renderLightbox(); });
    });
    $$('button[aria-label="Next image"]', lightbox).forEach(function (b) {
      b.addEventListener('click', function (e) { e.stopPropagation(); lbIndex = (lbIndex + 1) % cards.length; renderLightbox(); });
    });
    lbThumbs.forEach(function (b, i) {
      b.addEventListener('click', function () { lbIndex = i; renderLightbox(); });
    });
    lightbox.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { lbIndex = (lbIndex - 1 + cards.length) % cards.length; renderLightbox(); }
      if (e.key === 'ArrowRight') { lbIndex = (lbIndex + 1) % cards.length; renderLightbox(); }
    });

    // swipe + drag on the lightbox image
    var lbSx = 0, lbDragging = false, lbStartX = 0, lbOffset = 0;
    var lbStage = lbImg ? lbImg.parentElement : null;
    if (lbStage) {
      lbStage.addEventListener('touchstart', function (e) { lbSx = e.touches[0].clientX; }, { passive: true });
      lbStage.addEventListener('touchend', function (e) {
        var dx = e.changedTouches[0].clientX - lbSx;
        if (Math.abs(dx) > 50) { lbIndex = (lbIndex + (dx < 0 ? 1 : -1) + cards.length) % cards.length; renderLightbox(); }
      }, { passive: true });
      lbStage.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        lbDragging = true; lbStartX = e.clientX; lbOffset = 0;
        if (lbImg) lbImg.style.transition = 'none';
      });
      lbStage.addEventListener('pointermove', function (e) {
        if (!lbDragging || !lbImg) return;
        lbOffset = e.clientX - lbStartX;
        lbImg.style.transform = 'translate(' + lbOffset + 'px, 0) scale(' + (1 - Math.min(Math.abs(lbOffset) / 1600, 0.08)) + ')';
      });
      var endDrag = function () {
        if (!lbDragging) return;
        lbDragging = false;
        if (lbImg) {
          lbImg.style.transition = 'transform .25s ease-out';
          lbImg.style.transform = 'translate(0px, 0px) scale(1)';
        }
        if (Math.abs(lbOffset) > 80) {
          lbIndex = (lbIndex + (lbOffset < 0 ? 1 : -1) + cards.length) % cards.length;
          renderLightbox();
        }
        lbOffset = 0;
      };
      lbStage.addEventListener('pointerup', endDrag);
      lbStage.addEventListener('pointercancel', endDrag);
      lbStage.addEventListener('pointerleave', endDrag);
    }
  }

  /* ---------------------------------------------------------
     Gift box
     --------------------------------------------------------- */
  var giftBtn = $('button[aria-label="Mở hộp mừng cưới"]');
  var giftDialog = null;
  if (giftBtn) {
    giftDialog = giftBtn.parentElement.querySelector('dialog.modal');
    giftBtn.addEventListener('click', function () {
      if (!giftDialog) return;
      if (typeof giftDialog.showModal === 'function') giftDialog.showModal();
      else giftDialog.setAttribute('open', '');
    });
    $$('button', giftDialog).forEach(function (b) {
      if (!/Lưu QR/.test(b.textContent)) return;
      b.addEventListener('click', function () {
        var img = b.closest('div').querySelector('img');
        if (!img) return;
        fetch(img.src)
          .then(function (r) { return r.blob(); })
          .then(function (blob) {
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = (img.alt || 'qr').replace(/[^\w\-]+/g, '-') + '.png';
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
            toast('Đã lưu mã QR');
          })
          .catch(function () { toast('Không lưu được mã QR', 'error'); });
      });
    });
  }

  /* ---------------------------------------------------------
     RSVP
     --------------------------------------------------------- */
  var rsvpTrigger = $$('button').find(function (b) { return /XÁC NHẬN THAM DỰ/i.test(b.textContent); });
  var rsvpTemplate = document.getElementById('rsvp-template');
  var rsvpOverlay = null;

  function closeRsvp() {
    if (!rsvpOverlay) return;
    var box = rsvpOverlay.firstElementChild;
    if (box) { box.style.opacity = '0'; box.style.transform = 'scale(.96)'; }
    rsvpOverlay.style.opacity = '0';
    var el = rsvpOverlay;
    rsvpOverlay = null;
    setTimeout(function () { el.remove(); }, 220);
    document.body.style.overflow = '';
  }

  function mountRsvp() {
    if (rsvpOverlay || !rsvpTemplate) return;
    var node = rsvpTemplate.content.cloneNode(true);
    var overlay = node.firstElementChild;
    document.body.appendChild(node);
    rsvpOverlay = overlay;
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeRsvp(); });
    var closeBtn = $('button[aria-label="Đóng"]', overlay);
    if (closeBtn) closeBtn.addEventListener('click', closeRsvp);
    document.addEventListener('keydown', function onEsc(e) {
      if (e.key === 'Escape' && rsvpOverlay) { closeRsvp(); document.removeEventListener('keydown', onEsc); }
    });

    var form = $('form', overlay);
    var nameInput = $('input[type="text"]', overlay);
    var radios = $$('input[type="radio"]', overlay);
    var submit = $('button[type="submit"]', overlay);
    var labels = radios.map(function (r) { return r.closest('label'); });

    var countWrap = document.createElement('div');
    countWrap.style.display = 'none';
    countWrap.innerHTML = '<label class="block text-sm font-medium text-gray-700 mb-1.5"><span dir="auto">Số người tham dự</span></label>'
      + '<input type="number" min="1" max="20" value="1" inputmode="numeric" placeholder="Số người tham dự" class="w-full px-4 py-3 border border-gray-200 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-shadow placeholder:text-gray-400 bg-white text-gray-900">';
    var countInput = countWrap.querySelector('input');
    nameInput.closest('div').after(countWrap);

    function refresh() {
      var picked = radios.some(function (r) { return r.checked; });
      var attendingYes = (radios.find(function (r) { return r.checked; }) || {}).value === 'yes';
      countWrap.style.display = attendingYes ? '' : 'none';
      submit.disabled = !picked || !nameInput.value.trim();
      labels.forEach(function (label, i) {
        var radio = radios[i];
        var circle = label.querySelector('div');
        if (radio.checked) {
          label.style.borderColor = '#800000';
          label.style.background = 'rgba(128,0,0,.05)';
          if (circle) { circle.style.background = '#800000'; }
          var svg = circle && circle.querySelector('svg');
          if (svg) svg.style.color = '#fff';
        } else {
          label.style.borderColor = '';
          label.style.background = '';
          if (circle) { circle.style.background = ''; }
          var svg2 = circle && circle.querySelector('svg');
          if (svg2) svg2.style.color = '';
        }
      });
    }
    radios.forEach(function (r) { r.addEventListener('change', refresh); });
    nameInput.addEventListener('input', refresh);
    refresh();

    function showRsvpSuccess(attending) {
      var box = overlay.querySelector('.px-6.pb-6');
      if (!box) return;
      box.innerHTML = '<div style="text-align:center;padding:8px 0 12px">'
        + '<div style="width:56px;height:56px;border-radius:999px;background:rgba(128,0,0,.08);display:flex;align-items:center;justify-content:center;margin:0 auto 14px">'
        + '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#800000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></div>'
        + '<h2 style="font-size:18px;font-weight:600;color:#111;margin:0 0 6px">Cảm ơn bạn!</h2>'
        + '<p style="font-size:14px;color:#6b7280;margin:0">' + (attending === 'yes' ? 'Hẹn gặp bạn trong ngày vui của chúng tôi.' : 'Cảm ơn bạn đã hồi đáp.') + '</p>'
        + '</div>';
    }

    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var attending = (radios.find(function (r) { return r.checked; }) || {}).value;
        var count = attending === 'yes' ? Math.min(20, Math.max(1, parseInt(countInput.value, 10) || 1)) : 0;
        var name = nameInput.value.trim();
        submit.disabled = true;
        var prevLabel = submit.textContent;
        submit.textContent = 'Đang gửi...';

        var request = APP_SCRIPT_URL
          ? postToAppScript({ action: 'rsvp', name: name, attend: attending, count: count })
          : fetch('/api/rsvp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name, attending: attending, count: count })
          }).then(function (r) {
            if (!r.ok) throw new Error('http ' + r.status);
            return r.json();
          });

        request.then(function () {
          showRsvpSuccess(attending);
        }).catch(function () {
          submit.disabled = false;
          submit.textContent = prevLabel;
          toast(endpointMissing() ? 'Chưa cấu hình Google Sheet (js/config.js).' : 'Không gửi được xác nhận. Vui lòng thử lại.', 'error');
        });
      });
    }
  }

  if (rsvpTrigger) rsvpTrigger.addEventListener('click', mountRsvp);

  /* ---------------------------------------------------------
     Guestbook
     --------------------------------------------------------- */
  var gbForm = $('form.mt-6.mx-auto');
  var gbList = gbForm ? gbForm.parentElement.querySelector('.mt-8.w-full.space-y-3') : null;

  function timeAgo(iso) {
    var t = new Date(iso).getTime();
    if (!t) return '';
    var diff = Math.max(0, Date.now() - t) / 1000;
    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return Math.floor(diff / 60) + ' phút trước';
    if (diff < 86400) return Math.floor(diff / 3600) + ' giờ trước';
    if (diff < 2592000) return Math.floor(diff / 86400) + ' ngày trước';
    var d = new Date(t);
    return d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();
  }

  function renderComments(list) {
    if (!gbList) return;
    if (!list.length) {
      gbList.innerHTML = '<p class="text-center text-sm opacity-70 flex flex-col items-center"><span dir="auto">Chưa có lời chúc nào. Hãy là người đầu tiên!</span></p>';
      return;
    }
    gbList.innerHTML = list.map(function (c) {
      var initial = (c.name || '?').trim().charAt(0).toUpperCase();
      return '<div class="bg-white rounded-lg p-4 shadow border border-gray-200 text-left">'
        + '<div class="flex items-start gap-3">'
        + '<div class="w-9 h-9 shrink-0 rounded-full flex items-center justify-center font-semibold" style="background:rgba(128,0,0,.1);color:#800000">' + escapeHtml(initial) + '</div>'
        + '<div class="min-w-0 flex-1">'
        + '<div class="flex items-baseline justify-between gap-2">'
        + '<span class="font-semibold text-sm truncate" style="color:#800000">' + escapeHtml(c.name || '') + '</span>'
        + '<span class="text-[11px] text-gray-400 shrink-0">' + timeAgo(c.createdAt) + '</span>'
        + '</div>'
        + '<p class="mt-1 text-sm text-gray-700 whitespace-pre-line break-words">' + escapeHtml(c.message || '') + '</p>'
        + '</div></div></div>';
    }).join('');
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function loadComments() {
    if (!gbList) return;
    if (!APP_SCRIPT_URL) {
      if (endpointMissing()) {
        gbList.innerHTML = '<p class="text-center text-sm opacity-70 flex flex-col items-center"><span dir="auto">Sổ lưu bút chưa được cấu hình Google Sheet.</span></p>';
        return;
      }
      fetch('/api/comments').then(function (r) { return r.json(); }).then(function (data) {
        renderComments((data && data.comments) || []);
      }).catch(function () { renderComments([]); });
      return;
    }
    var cached = readWishCache();
    if (cached.length) renderComments(cached);
    loadAppScriptWishes().then(function (remote) {
      var merged = mergeWishes(remote, cached);
      writeWishCache(merged);
      renderComments(merged);
    }).catch(function () {
      if (!cached.length) renderComments([]);
    });
  }
  loadComments();
  if (APP_SCRIPT_URL) setInterval(loadComments, 45000);

  if (gbForm) {
    var gbName = $('input[placeholder="Nhập tên*"]', gbForm);
    var gbMessage = $('textarea[placeholder="Nhập lời chúc*"]', gbForm);
    var gbSubmit = $('button[type="submit"]', gbForm);
    var gbWand = $$('button', gbForm).find(function (b) { return /AI/.test(b.getAttribute('title') || ''); });

    var wishes = [
      'Chúc hai bạn trăm năm hạnh phúc, vạn sự như ý!',
      'Chúc mừng hạnh phúc! Mong hai bạn luôn yêu thương và đồng hành cùng nhau.',
      'Chúc anh chị một đời bình an, một nhà vui vẻ, một lòng chung thủy.',
      'Mừng ngày trọng đại! Chúc hai bạn sớm có em bé đáng yêu.'
    ];
    if (gbWand) {
      gbWand.addEventListener('click', function () {
        gbMessage.value = wishes[Math.floor(Math.random() * wishes.length)];
      });
    }

    gbForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = gbName.value.trim();
      var message = gbMessage.value.trim();
      if (!name || !message) { toast('Vui lòng nhập tên và lời chúc', 'error'); return; }
      gbSubmit.disabled = true;

      if (APP_SCRIPT_URL) {
        var entry = { name: name, message: message, createdAt: new Date().toISOString() };
        writeWishCache(mergeWishes([entry], readWishCache()));
        renderComments(readWishCache());
        gbName.value = '';
        gbMessage.value = '';
        postToAppScript({ action: 'wish', name: name, wish: message }).then(function () {
          toast('Đã gửi lời chúc, cảm ơn bạn!');
          setTimeout(loadComments, 1500);
        }).catch(function () {
          toast('Đã lưu trên thiết bị này, sẽ đồng bộ khi có mạng.', 'error');
        }).finally(function () {
          gbSubmit.disabled = false;
        });
        return;
      }

      fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, message: message })
      }).then(function (r) {
        if (!r.ok) throw new Error('http ' + r.status);
        return r.json();
      }).then(function (data) {
        gbName.value = '';
        gbMessage.value = '';
        toast('Đã gửi lời chúc, cảm ơn bạn!');
        loadComments();
      }).catch(function () {
        toast(endpointMissing() ? 'Chưa cấu hình Google Sheet (js/config.js).' : 'Không gửi được lời chúc. Vui lòng thử lại.', 'error');
      }).finally(function () {
        gbSubmit.disabled = false;
      });
    });
  }
})();
