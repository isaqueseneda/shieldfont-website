/* ============================================================
   SHIELDFONT reimagined — interactions
   ============================================================ */
(function(){
  "use strict";
  var reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
  var mqMobile = matchMedia('(max-width:880px)');

  /* ---------- reveal on scroll ---------- */
  var io = new IntersectionObserver(function(es){
    es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  }, {rootMargin:'0px 0px -8% 0px', threshold:0.08});
  document.querySelectorAll('.reveal').forEach(function(el){ io.observe(el); });

  /* ---------- HERO: full-bleed mask · encoded back-layer · fit-to-viewport sizing ---------- */
  (function(){
    var hero = document.querySelector('.hero');
    var xray = document.getElementById('heroXray');
    var readWrap = document.querySelector('.hero-layer.read');
    var codeWrap = document.querySelector('.hero-layer.code');
    var readLayer = document.getElementById('readLayer');
    var codeLayer = document.getElementById('codeLayer');
    var heroUI = document.querySelector('.hero-ui');
    var eyeCursor = document.querySelector('.eye-cursor');
    var caption = document.getElementById('heroCaption');
    var cwords = null;
    if(!hero || !readLayer || !codeLayer) return;

    // NOTE: These paragraphs and words are hard-coded demo exceptions,
    // should not be replaced, and should not use the <Shield> tag or .shield class here.
    var srcP = readLayer.querySelectorAll('.src-p');
    var PARAS = srcP.length
      ? Array.prototype.map.call(srcP, function(p){ return p.textContent.trim().split(/\s+/); })
      : [readLayer.textContent.trim().split(/\s+/)];
    var WORDS = [], PARA_START = [];
    PARAS.forEach(function(arr){ PARA_START.push(WORDS.length); arr.forEach(function(w){ WORDS.push(w); }); });
    var cv = document.createElement('canvas'), ctx = cv.getContext('2d');
    var LH = 1.18, LS = -0.02, PARA_GAP = 0.85, heroR = 120, heroBaseR = 120, radiusMul = 1.5;
    function setFont(fs){ ctx.font = '500 '+fs+'px Optik, "Helvetica Neue", Arial, sans-serif'; try{ ctx.letterSpacing = (LS*fs)+'px'; }catch(e){} }

    /* whole-WORD decoys: swap each word for a real word of the SAME length whose
       per-letter widths most closely match the original (so e.g. a wide 'w' maps to a
       wide letter, a narrow 'i' to a narrow one). Picks among the closest few for variety. */
    var WORDLIST = ("or of an in on at it to by we us is as me my up "
      + "our one its any few raw ink web new key art you use may era owe run set big low sum air "
      + "with upon into when this each your text idea word read page work fact them here type line true mind code data talk font real tone note seen form view ours "
      + "novel prose words essay ideas paper pages write voice style draft texts terms quote lines theme books fonts serif print scrap model token craft image sense title vowel "
      + "author humans scrape models corpus source mining output hidden public glyphs layout letter quotes phrase system reader column format nuance digits "
      + "reading thought meaning letters authors content chapter passage quality machine scraper grammar imagine believe decoded writers formats samples sources indexed crawled kerning visuals context article "
      + "sentence language promotes produces projects provides research scraping archives datasets magazine abstract keyboard original authored document creators evidence machines encoding phrasing emphasis ligature scribble "
      + "narrative paragraph knowledge documents languages rendering publisher copyright templates typefaces metadata? "
      + "intellectual consequences institutions conversation particularly transparency preservation reproduction civilization connectivity productivity relationship"
    ).replace(/\?/g,'').split(/\s+/).filter(Boolean);
    function caseLike(src, rep){
      if(src.length>1 && src===src.toUpperCase()) return rep.toUpperCase();
      if(src[0]===src[0].toUpperCase()) return rep[0].toUpperCase()+rep.slice(1);
      return rep;
    }
    function widthSig(word){ var a=[]; for(var i=0;i<word.length;i++) a.push(ctx.measureText(word[i]).width); return a; }
    function sigDist(a,b){ var s=0; for(var i=0;i<a.length;i++) s+=Math.abs(a[i]-b[i]); return s; }
    /* Only the listed keywords get corrupted — everything else reads clean ("Unchanged").
       Each decoy is an obviously-random real word of the SAME length whose per-letter
       widths most closely match the original, so it occupies the same footprint. */
    var TARGETS = {protect:1, writing:1, humans:1, ownership:1, code:1, training:1, protected:1, unauthorized:1, authorization:1, learns:1, changes:1, behind:1, text:1, read:1, protecting:1, work:1, hands:1, takes:1, makes:1};
    var RANDOM_POOL = (
      "frog sock moon lamp drum kite pear corn raft clam wolf bead taco sled jazz fern mint pond rock bark lark dove wren " +
      "apple grape peach melon lemon berry flame river cloud stone brook cedar maple birch raven heron " +
      "cactus walnut pickle donkey kettle pencil violin turnip beaver jigsaw anchor basket candle helmet lizard mitten noodle peanut rabbit saddle teapot wombat muffin forest meadow canyon breeze harbor " +
      "pretzel popcorn gorilla giraffe dolphin hamster pelican raccoon biscuit cabbage leopard mustang pumpkin sardine terrier custard peacock rooster seagull opossum tadpole catfish muffins sunrise redwood glacier panther compass " +
      "starfish kangaroo elephant flamingo dinosaur squirrel mandrill anteater hedgehog mongoose mackerel broccoli eggplant lavender doughnut omelette sandwich dumpling tortilla scallops cucumber zucchini mountain waterfall seashore " +
      "crocodile butterfly artichoke asparagus jellyfish porcupine centipede albatross marmalade milkshake pineapple tangerine saxophone harmonica accordion sanctuary chameleon rainforest " +
      "strawberry blackberry cantaloupe watermelon peppermint woodpecker caterpillar chimpanzee polarbear lighthouse meadowlark bluebonnet " +
      "hummingbird pomegranate marshmallow cauliflower wheelbarrow skateboard microscopes salamanders " +
      "cheeseburger hippopotamus strawberries kaleidoscope thoroughbred thunderstorm caterpillars grasshoppers " +
      "constellation metamorphosis rhododendron chrysanthemum mountaineering hummingbirds " +
      "photosynthesis microorganisms crystallization"
    ).split(/\s+/).filter(Boolean);
    var ENC = WORDS.slice();
    var SWAPPED = WORDS.map(function(){ return false; });
    function bestMatch(core){
      var L=core.length, lc=core.toLowerCase();
      var cands=RANDOM_POOL.filter(function(w){ return w.length===L && w!==lc; });
      if(!cands.length) cands=RANDOM_POOL.filter(function(w){ return Math.abs(w.length-L)<=1 && w!==lc; });
      if(!cands.length) return null;
      var targetW = ctx.measureText(lc).width;
      cands.sort(function(a,b){ return Math.abs(ctx.measureText(a).width - targetW) - Math.abs(ctx.measureText(b).width - targetW); });
      return cands[0];
    }
    function buildDecoys(){
      ENC = WORDS.map(function(word, k){
        var lead=(word.match(/^[^A-Za-z]+/)||[''])[0];
        var trail=(word.match(/[^A-Za-z]+$/)||[''])[0];
        var core=word.slice(lead.length, word.length-trail.length);
        if(TARGETS[core.toLowerCase()]){
          var dec=bestMatch(core);
          if(dec){ SWAPPED[k]=true; return lead + caseLike(core, dec) + trail; }
        }
        SWAPPED[k]=false; return word;
      });
    }
    buildDecoys();
    /* wrap using max(plain, encoded) width */
    function wrap(fs, maxW){
      setFont(fs);
      buildDecoys();
      var lines=[];
      PARAS.forEach(function(arr, pi){
        var cur=[], start=PARA_START[pi];
        for(var i=0;i<arr.length;i++){
          var gi=start+i, idx=cur.concat(gi);
          var wPlain = ctx.measureText(idx.map(function(j){return WORDS[j];}).join(' ')).width;
          var wEnc   = ctx.measureText(idx.map(function(j){return ENC[j];}).join(' ')).width;
          if(Math.max(wPlain,wEnc) <= maxW || cur.length===0){ cur.push(gi); }
          else { lines.push({words:cur,para:pi}); cur=[gi]; }
        }
        if(cur.length) lines.push({words:cur,para:pi});
      });
      return lines;
    }
    function fit(){
      var uiH = heroUI ? heroUI.offsetHeight : 0;
      hero.style.setProperty('--hero-pb', (uiH + 26) + 'px');
      var cs = getComputedStyle(readWrap);
      var heroTextEl = readWrap.querySelector('.hero-text');
      var layerW = readWrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      var textW = heroTextEl ? heroTextEl.clientWidth : layerW;

      /* Calibrate canvas → DOM width ratio. Canvas measureText with the
         Optik font stack often underestimates the real rendered width
         (Optik may not be the font canvas resolves to, ctx.letterSpacing
         isn't honored on Safari, hinting/sub-pixel rounding differ).
         Measure a fixed string in the DOM with the exact .hero-text font
         spec, measure the same string on canvas, take the ratio. Any
         canvas line whose width exceeds (target / calib) will overflow. */
      var calib = 1;
      if(heroTextEl){
        var probe = document.createElement('span');
        var probeStr = 'Shield Font writing protected authorization ownership training';
        probe.textContent = probeStr;
        probe.style.cssText = 'position:absolute; left:-99999px; top:0; visibility:hidden; white-space:nowrap; font-family:var(--display); font-weight:500; letter-spacing:-.02em; font-size:64px;';
        heroTextEl.appendChild(probe);
        var domW = probe.getBoundingClientRect().width;
        heroTextEl.removeChild(probe);
        setFont(64);
        var cvW = ctx.measureText(probeStr).width;
        if(cvW > 0 && domW > 0){
          var r = domW / cvW;
          if(r > 0.85 && r < 1.40) calib = r;
        }
      }

      /* Tiny hard reserve. The calibration above corrects for the
         canvas-vs-DOM width drift; the shrink loop below absorbs any
         residual sub-pixel rounding. A smaller reserve here means the
         text reaches closer to the right edge of the container, which
         was the missing "padding to the right" the user was seeing on
         Chrome. */
      var targetW = Math.min(layerW, textW) - 2;
      var availW = targetW / calib;
      var availH = readWrap.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      if(availW < 40 || availH < 40) return;
      var nGaps = PARAS.length - 1;
      var lo=12, hi=200, best=12, bestLines=wrap(12, availW);
      for(var i=0;i<26;i++){
        var mid=(lo+hi)/2, lines=wrap(mid, availW), h=lines.length*mid*LH + nGaps*mid*PARA_GAP;
        if(h <= availH){ best=mid; bestLines=lines; lo=mid; } else { hi=mid; }
      }
      hero.style.setProperty('--hero-fs', best.toFixed(1)+'px');
      setFont(best);
      buildDecoys();
      var ws = WORDS.map(function(w){ return ctx.measureText(w).width; });
      var avg = ws.reduce(function(a,b){ return a+b; },0)/ws.length;
      heroBaseR = Math.round(Math.max(54, Math.min(170, avg*0.42)));
      heroR = Math.round(heroBaseR * radiusMul);
      if(eyeCursor){ eyeCursor.style.width=eyeCursor.style.height=(heroR*2)+'px'; eyeCursor.style.margin=(-heroR)+'px 0 0 '+(-heroR)+'px'; }
      function renderLines(code){
        var prev=-1;
        return bestLines.map(function(l){
          var cls='hl'+((l.para!==prev && prev!==-1)?' pstart':''); prev=l.para;
          var inner = l.words.map(function(j){
            if(SWAPPED[j]){
              var wPlain = ctx.measureText(WORDS[j]).width;
              var wEnc = ctx.measureText(ENC[j]).width;
              var wMax = Math.max(wPlain, wEnc);
              return code
                ? '<span style="display: inline-block; min-width: '+wMax.toFixed(2)+'px;"><span class="cword sw" data-i="'+j+'">'+ENC[j]+'</span></span>'
                : '<span style="display: inline-block; min-width: '+wMax.toFixed(2)+'px;">'+WORDS[j]+'</span>';
            }
            return code
              ? '<span class="cword" data-i="'+j+'">'+ENC[j]+'</span>'
              : WORDS[j];
          }).join(' ');
          return '<span class="'+cls+'">'+inner+'</span>';
        }).join('');
      }
      readLayer.innerHTML = renderLines(false);
      codeLayer.innerHTML = renderLines(true);
      cwords = codeLayer.querySelectorAll('.cword');

      /* DOM-measured shrink. Final safety net: walk the real DOM and
         shrink --hero-fs until no .hl on either layer exceeds the target.
         Converges with a near-exact ratio (only a tiny 0.3% extra to
         absorb sub-pixel rounding); multiple passes handle any residual.
         The previous 0.98 factor over-shot by ~3% per pass, which read
         on Chrome as a big empty band on the right of the manifesto. */
      var shrinkLimitW = targetW;
      function widestHL(){
        var max = 0;
        var hls = readLayer.querySelectorAll('.hl');
        for(var i=0;i<hls.length;i++) if(hls[i].scrollWidth > max) max = hls[i].scrollWidth;
        var hls2 = codeLayer.querySelectorAll('.hl');
        for(var j=0;j<hls2.length;j++) if(hls2[j].scrollWidth > max) max = hls2[j].scrollWidth;
        return max;
      }
      var fs = best, passes = 0, widest = widestHL();
      while(widest > shrinkLimitW && passes < 20){
        var ratio = shrinkLimitW / widest;
        fs = fs * ratio * 0.997;
        hero.style.setProperty('--hero-fs', fs.toFixed(2)+'px');
        widest = widestHL();
        passes++;
      }
    }
    fit();
    if(document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ buildDecoys(); fit(); });
    setTimeout(fit, 350);
    var rt; window.addEventListener('resize', function(){ clearTimeout(rt); rt=setTimeout(fit, 140); });

    /* TEMP — spotlight radius slider */
    (function(){
      var spot=document.getElementById('spotRange'), spotOut=document.getElementById('spotVal');
      if(!spot) return;
      spot.addEventListener('input', function(){
        radiusMul = parseFloat(spot.value);
        if(spotOut) spotOut.textContent = radiusMul.toFixed(1)+'\u00d7';
        heroR = Math.round(heroBaseR * radiusMul);
        if(eyeCursor){ eyeCursor.style.width=eyeCursor.style.height=(heroR*2)+'px'; eyeCursor.style.margin=(-heroR)+'px 0 0 '+(-heroR)+'px'; }
        if(readWrap) readWrap.style.setProperty('--eye-r', heroR+'px');
      });
    })();

    /* ---- reveal circle: continuous slow auto-drift (mobile + desktop); hover overrides ---- */
    if(xray && readWrap && eyeCursor && !reduce){
      function setHole(cx, cy){
        var rect = readWrap.getBoundingClientRect();
        readWrap.style.setProperty('--eye-x', (cx-rect.left)+'px');
        readWrap.style.setProperty('--eye-y', (cy-rect.top)+'px');
        readWrap.style.setProperty('--eye-r', heroR+'px');
        eyeCursor.style.transform = 'translate('+cx+'px,'+cy+'px)';
        eyeCursor.classList.add('on');
        updateSelection(cx, cy);
      }
      function placeCaption(cx, cy){
        if(!caption) return;
        var below = cy + heroR + 18;
        if(below + 46 > window.innerHeight){
          caption.style.top = (cy - heroR - 18) + 'px'; caption.classList.add('flip');
        } else {
          caption.style.top = below + 'px'; caption.classList.remove('flip');
        }
        var halfW = (caption.offsetWidth/2) || 0;
        var minX = halfW + 14, maxX = window.innerWidth - halfW - 14;
        caption.style.left = Math.max(minX, Math.min(maxX, cx)) + 'px';
      }
      function updateSelection(cx, cy){
        if(caption){ caption.classList.add('on'); placeCaption(cx, cy); }
      }
      function inView(){ var r=hero.getBoundingClientRect(); return r.bottom>80 && r.top<window.innerHeight; }
      var canHover = matchMedia('(hover:hover) and (pointer:fine)').matches;
      var driftOn = true, lastMove = 0;
      function drift(now){
        if(driftOn){
          if(inView()){
            var rect = readWrap.getBoundingClientRect();
            // very slow Lissajous drift across the text band — gentle, never overwhelming
            var x = rect.left + rect.width  * (0.30 + 0.42*(Math.sin(now/9000)*0.5+0.5));
            var y = rect.top  + rect.height * (0.30 + 0.40*(Math.sin(now/13000 + 1.3)*0.5+0.5));
            setHole(x, y);
          } else { eyeCursor.classList.remove('on'); if(caption) caption.classList.remove('on'); }
        } else if(now - lastMove > 2600){ driftOn = true; }
        requestAnimationFrame(drift);
      }
      requestAnimationFrame(drift);
      if(canHover){
        hero.addEventListener('pointermove', function(e){ driftOn=false; lastMove=performance.now(); setHole(e.clientX, e.clientY); });
        hero.addEventListener('pointerleave', function(){ driftOn=true; });
      }
    }
  })();

  /* ---------- live encoder ---------- */
  /* The real alpha (v18) mapping — fetched below. Starts empty so the first
     paint is instant; upgrades to the full dictionary once loaded. */
  var DICT = {};
  var input = document.getElementById('enc-input');
  var output = document.getElementById('enc-output');
  var meta = document.getElementById('enc-meta');
  var count = document.getElementById('enc-count');
  var DEFAULT = "Authors publish essays, poems, and ideas every morning.";
  function encode(){
    var raw = input.value;
    if(!raw.trim()){
      output.innerHTML = '<span class="ph">Your protected text appears here\u2026</span>';
      meta.innerHTML=''; count.textContent='0 / 0 TOKENS SWAPPED'; return;
    }
    var tokens = raw.split(/(\s+)/);
    var swaps = [], swapCount = 0, total = 0, html = '';
    tokens.forEach(function(tk){
      if(/^\s+$/.test(tk)){ html += tk; return; }
      var lead = (tk.match(/^[^A-Za-z]*/)||[''])[0];
      var trail = (tk.match(/[^A-Za-z]*$/)||[''])[0];
      var core = tk.slice(lead.length, tk.length-trail.length);
      if(!core){ html += tk; return; }
      total++;
      var key = core.toLowerCase();
      var dec = DICT[key];
      if(dec){
        if(core.length>1 && core===core.toUpperCase()) dec = dec.toUpperCase();
        else if(core[0]===core[0].toUpperCase()) dec = dec[0].toUpperCase()+dec.slice(1);
        swapCount++;
        if(swaps.length<5) swaps.push([core,dec]);
        html += lead+'<span class="swap">'+dec+'</span>'+trail;
      } else { html += tk; }
    });
    output.innerHTML = html;
    count.textContent = swapCount+' / '+total+' TOKENS SWAPPED';
    meta.innerHTML = swaps.map(function(s){
      return '<span class="swap-pill"><span class="sp-from">'+s[0].toUpperCase()+'</span><span class="sp-arr">\u203a</span><span class="sp-to">'+s[1].toUpperCase()+'</span></span>';
    }).join('');
  }
  if(input){
    input.value = DEFAULT;
    input.addEventListener('input', encode);
    encode();
    /* Load the real alpha mapping, then re-encode with it. */
    fetch('/shieldfont-alpha-map.json').then(function(r){ return r.json(); })
      .then(function(m){ DICT = m; encode(); }).catch(function(){});
    var publishBtn = document.getElementById('enc-publish');
    if(publishBtn) publishBtn.addEventListener('click', function(){
      /* Carry the typed text into the full editor. WriterEncoder reads this
         localStorage key on load, so the <a href="/encoder"> nav picks it up. */
      try{ localStorage.setItem('shieldfont-encoder-text', input.value || ''); }catch(e){}
    });
  }

  /* ---------- rotating use-case selector: arc on desktop, auto-cycle on mobile ---------- */
  var clock = document.getElementById('clock');
  var clockList = document.getElementById('clockList');
  var selectorSec = document.getElementById('selector');
  if(clock && clockList && selectorSec){
    var lead = selectorSec.querySelector('.selector-lead');
    var items = Array.prototype.slice.call(clockList.querySelectorAll('.clock-item'));
    var N = items.length;
    var STEP = 4.6 * Math.PI/180;        // wider angular gap → rounder arc
    var ax, ay, RAD, cx, cy;             // anchor = end of phrase; RAD = circle radius
    function measure(){
      var crect = clock.getBoundingClientRect();
      var W = clock.clientWidth;
      RAD = W*0.40;                                   // smaller radius → more visible curvature
      lead.style.transform = '';                      // measure natural position first
      var lrect = lead.getBoundingClientRect();
      ay = (lrect.top + lrect.height/2) - crect.top;  // vertically centred on the phrase line
      var naturalLeft  = lrect.left  - crect.left;
      var naturalRight = lrect.right - crect.left;
      var targetPivot  = W*0.46;                      // aim pivot near page centre
      var desiredDx = (targetPivot - 16) - naturalRight;
      var minLeft = 28;                               // …but never push the phrase off the left edge
      var dx = Math.max(minLeft - naturalLeft, desiredDx);
      lead.style.transform = 'translateX(' + dx.toFixed(1) + 'px)';
      ax = naturalRight + dx + 16;                    // actual pivot = phrase end
      cx = ax - RAD;                                  // virtual centre, to the left of the pivot
      cy = ay;
    }
    function layout(sel){
      for(var i=0;i<N;i++){
        var ang = (i - sel)*STEP;          // 0 = active (horizontal, at the phrase end)
        var ad = Math.abs(ang);
        var rot = ang*180/Math.PI;
        var x = cx + RAD*Math.cos(ang);    // left edge sits on the circle…
        var y = cy + RAD*Math.sin(ang);
        var op = Math.max(0.05, 1 - ad/1.05);
        var sc = 0.64 + 0.36*Math.max(0, 1 - ad/0.85);
        var it = items[i];
        it.style.left = x.toFixed(1)+'px';
        it.style.top = y.toFixed(1)+'px';
        it.style.opacity = op.toFixed(3);
        it.style.transform = 'translate(0,-50%) rotate('+rot.toFixed(2)+'deg) scale('+sc.toFixed(3)+')'; // …extending outward
        it.style.zIndex = String(Math.round(100 - ad*20));
        it.classList.toggle('active', (Math.round(sel)%N+N)%N === i);
      }
    }
    function progress(){
      var rect = selectorSec.getBoundingClientRect();
      var total = rect.height - window.innerHeight;
      return Math.min(1, Math.max(0, -rect.top/total));
    }
    var lastY = -1, rafOn = false;
    function tick(){
      if(!rafOn) return;
      if(window.scrollY !== lastY){ lastY = window.scrollY; layout(progress()*(N-1)); }
      requestAnimationFrame(tick);
    }
    var cycleTimer = null, ci = 0, prevR = [];
    function layoutMobile(){
      var step = Math.max(46, clock.clientHeight*0.42);   // vertical spacing of the wheel
      for(var i=0;i<N;i++){
        var r = i - ci;
        if(r >  N/2) r -= N;                               // shortest wrap
        if(r < -N/2) r += N;
        var it = items[i];
        if(prevR[i] !== undefined && Math.abs(r - prevR[i]) > 1){
          it.style.transition = 'none';                    // jumped across the wrap → reposition silently
          void it.offsetHeight;                            // force reflow
        } else {
          it.style.transition = '';
        }
        it.style.transform = 'translate(-50%,-50%) translateY(' + (r*step).toFixed(1) + 'px)';
        it.style.opacity = (r===0) ? '1' : (Math.abs(r)===1 ? '0.32' : (Math.abs(r)===2 ? '0.12' : '0'));
        it.classList.toggle('active', r===0);
        prevR[i] = r;
      }
    }
    function startMobile(){
      items.forEach(function(it){ it.style.cssText=''; it.classList.remove('active'); });
      prevR = [];
      ci = ci % N;
      layoutMobile();
      if(cycleTimer) return;
      cycleTimer = setInterval(function(){ ci = (ci+1)%N; layoutMobile(); }, 1700);
    }
    function stopMobile(){
      if(cycleTimer){ clearInterval(cycleTimer); cycleTimer=null; }
      items.forEach(function(it){ it.style.transition=''; });
      prevR = [];
    }
    function init(){
      if(mqMobile.matches){
        rafOn = false; stopMobile(); startMobile(); return;
      }
      stopMobile(); items.forEach(function(it){ it.classList.remove('active'); });
      measure(); layout(progress()*(N-1));
      if(!rafOn){ rafOn = true; requestAnimationFrame(tick); }
    }
    init();
    window.addEventListener('resize', function(){ init(); });
  }

  /* ---------- specimen size / spacing sliders ---------- */
  var specCards = document.getElementById('specCards');
  var specSize = document.getElementById('specSize');
  var specSpace = document.getElementById('specSpace');
  if(specCards && specSize && specSpace){
    var sizeV = document.getElementById('specSizeV');
    var spaceV = document.getElementById('specSpaceV');
    function syncSpec(){
      specCards.style.setProperty('--spec-size', specSize.value+'px');
      specCards.style.setProperty('--spec-spacing', specSpace.value);
      if(sizeV) sizeV.textContent = specSize.value;
      if(spaceV) spaceV.textContent = specSpace.value;
    }
    specSize.addEventListener('input', syncSpec);
    specSpace.addEventListener('input', syncSpec);
    syncSpec();
  }

  /* ---------- three ways: folder tabs ---------- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.wtab'));
  var panels = {};
  document.querySelectorAll('[data-panel]').forEach(function(p){ panels[p.getAttribute('data-panel')]=p; });
  function selectTab(name){
    tabs.forEach(function(t){ t.setAttribute('aria-selected', String(t.dataset.tab===name)); });
    Object.keys(panels).forEach(function(k){ panels[k].hidden = (k!==name); });
  }
  tabs.forEach(function(t){ t.addEventListener('click', function(){ selectTab(t.dataset.tab); }); });

  /* ---------- menu overlay ---------- */
  var menuBtn = document.getElementById('menuBtn');
  var menuOverlay = document.getElementById('menuOverlay');
  if(menuBtn && menuOverlay){
    function setMenu(open){
      document.body.classList.toggle('menu-open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      menuOverlay.setAttribute('aria-hidden', String(!open));
    }
    menuBtn.addEventListener('click', function(){ setMenu(!document.body.classList.contains('menu-open')); });
    menuOverlay.addEventListener('click', function(e){ if(e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function(e){ if(e.key==='Escape') setMenu(false); });
  }

  /* ---------- specimen carousel: native scroll + click-drag + momentum ---------- */
  var carousel = document.getElementById('specCards');
  if(carousel){
    var down=false, startX=0, startScroll=0, moved=0, vx=0, lastX=0, lastT=0, raf=null;
    carousel.addEventListener('pointerdown', function(e){
      if(e.button!==undefined && e.button!==0) return;
      down=true; moved=0; startX=e.clientX; startScroll=carousel.scrollLeft; lastX=e.clientX; lastT=performance.now(); vx=0;
      try{ carousel.setPointerCapture(e.pointerId); }catch(_){}
      if(raf){ cancelAnimationFrame(raf); raf=null; }
    });
    carousel.addEventListener('pointermove', function(e){
      if(!down) return;
      var dx=e.clientX-startX;
      if(Math.abs(dx)>4) carousel.classList.add('dragging');
      carousel.scrollLeft = startScroll - dx; moved=Math.abs(dx);
      var now=performance.now(), dt=now-lastT;
      if(dt>0){ vx=(e.clientX-lastX)/dt; lastX=e.clientX; lastT=now; }
    });
    function endDrag(){
      if(!down) return; down=false;
      carousel.classList.remove('dragging');
      var v = -vx*16;
      (function glide(){ if(Math.abs(v)<0.4){ raf=null; return; } carousel.scrollLeft += v; v*=0.94; raf=requestAnimationFrame(glide); })();
    }
    carousel.addEventListener('pointerup', endDrag);
    carousel.addEventListener('pointercancel', endDrag);
    carousel.addEventListener('click', function(e){ if(moved>6){ e.preventDefault(); e.stopPropagation(); } }, true);
    carousel.addEventListener('dragstart', function(e){ e.preventDefault(); });
  }

  /* ---------- topbar shadow on scroll ---------- */
  var topbar = document.querySelector('.topbar');
  window.addEventListener('scroll', function(){
    if(topbar) topbar.style.boxShadow = window.scrollY>10 ? '0 1px 20px rgba(13,13,13,.06)' : 'none';
  }, {passive:true});

  /* ---------- nav wordmark: eye-only at top, text reveals once the hero wordmark scrolls away ---------- */
  (function(){
    var bar = document.querySelector('.topbar');
    var heroMark = document.querySelector('.hwordmark');
    if(!bar || !heroMark) return;
    var ticking = false;
    function update(){
      ticking = false;
      // text is collapsed by default (base CSS); reveal it once the hero wordmark scrolls past the nav
      var revealed = heroMark.getBoundingClientRect().bottom <= 72;
      bar.classList.toggle('wm-open', revealed);
    }
    function onScroll(){ if(!ticking){ ticking = true; requestAnimationFrame(update); } }
    update();
    window.addEventListener('scroll', onScroll, {passive:true});
    window.addEventListener('resize', onScroll);
  })();

  /* ---------- classic hero: You-read ⇄ AI-reads swap window ----------
     Click handlers only — no auto-cycle. The toggle stays in whatever
     state the user picks; nothing flips it on its own. */
  (function(){
    var dw = document.getElementById('docwin');
    var toggles = Array.prototype.slice.call(document.querySelectorAll('.audience-toggle'));
    if(!dw || !toggles.length) return;
    var targets = Array.prototype.slice.call(dw.querySelectorAll('.dw'));

    /* Reserve each swap slot at the width of its WIDER state (You vs AI, including the
       AI badge padding) so flipping the toggle never reflows the line — the same
       "match the footprint" trick the spotlight uses. Recomputed on font-load and
       resize because the doc-window font-size is fluid (clamp). */
    function reserveWidths(){
      targets.forEach(function(t){
        var cs = getComputedStyle(t);
        var fs = parseFloat(cs.fontSize) || 24;
        var probe = document.createElement('span');
        probe.style.cssText = 'position:absolute;left:-9999px;top:-9999px;visibility:hidden;white-space:nowrap;';
        probe.style.fontFamily = cs.fontFamily; probe.style.fontWeight = cs.fontWeight;
        probe.style.fontSize = cs.fontSize; probe.style.fontStyle = cs.fontStyle;
        probe.style.letterSpacing = cs.letterSpacing;
        document.body.appendChild(probe);
        probe.textContent = t.getAttribute('data-real') || t.textContent;
        var wReal = probe.getBoundingClientRect().width;
        probe.textContent = t.getAttribute('data-dec') || t.textContent;
        var wDec = probe.getBoundingClientRect().width;
        document.body.removeChild(probe);
        // You state pads .02em/side; the AI badge pads .2em/side (see .docwin .dw / .dw-swap).
        var reserved = Math.max(wReal + 0.04 * fs, wDec + 0.40 * fs);
        t.style.minWidth = Math.ceil(reserved) + 'px';
      });
    }
    reserveWidths();
    if(document.fonts && document.fonts.ready) document.fonts.ready.then(reserveWidths);
    var rwT; window.addEventListener('resize', function(){ clearTimeout(rwT); rwT = setTimeout(reserveWidths, 120); });

    function setState(state){
      toggles.forEach(function(toggle){
        toggle.setAttribute('data-state', state);
        var opts = toggle.querySelectorAll('.audience-opt');
        opts.forEach(function(o){ var on=o.getAttribute('data-aud')===state; o.classList.toggle('active',on); o.setAttribute('aria-checked',String(on)); });
      });
      var ai = state==='ai';
      dw.classList.toggle('is-ai', ai);
      targets.forEach(function(t){
        t.textContent = ai ? t.getAttribute('data-dec') : t.getAttribute('data-real');
        t.classList.toggle('dw-swap', ai);
      });
    }
    toggles.forEach(function(toggle){
      toggle.querySelectorAll('.audience-opt').forEach(function(o){
        o.addEventListener('click', function(){ setState(o.getAttribute('data-aud')); });
      });
    });
  })();
})();
