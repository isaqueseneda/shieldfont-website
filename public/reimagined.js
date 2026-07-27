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

    /* The DOM already holds the ENCODED manifesto — app/page.tsx wraps the plain
       English in <Shield>, which substitutes at build time. So WORDS is the
       decoy text, and it is the text BOTH layers render. Only the font differs:
       the read layer draws it through the shielded face, whose ligatures map
       each decoy back to the original word's shape, and the code layer draws it
       plainly so the spotlight shows what a scraper actually gets. */
    var srcP = readLayer.querySelectorAll('.src-p');
    var PARAS = srcP.length
      ? Array.prototype.map.call(srcP, function(p){ return p.textContent.trim().split(/\s+/); })
      : [readLayer.textContent.trim().split(/\s+/)];
    var WORDS = [], PARA_START = [];
    PARAS.forEach(function(arr){ PARA_START.push(WORDS.length); arr.forEach(function(w){ WORDS.push(w); }); });
    /* Which words the dictionary replaced, so the x-ray can badge them. It is a
       list of INDICES, not words: the original text does not exist anywhere in
       this document and must not be reconstructible from it. */
    var SWAP_IDX = {};
    if(srcP.length){
      var swapBase = 0;
      Array.prototype.forEach.call(srcP, function(p, pi){
        (p.getAttribute('data-swapped') || '').split(',').forEach(function(n){
          n = parseInt(n, 10);
          if(!isNaN(n)) SWAP_IDX[swapBase + n] = true;
        });
        swapBase += PARAS[pi].length;
      });
    }
    /* No data-swapped means the markup is not the shielded manifesto (an older
       snapshot, or some other block reusing .hero-text), so fall back to the
       invented same-length decoys below rather than rendering nothing. */
    var HAS_REAL = Object.keys(SWAP_IDX).length > 0;
    var cv = document.createElement('canvas'), ctx = cv.getContext('2d');
    /* Spotlight size. radiusMul is the single knob — the mask radius (--eye-r),
       the visible green circle and the caption offset all derive from heroR.
       1.8 = the old 1.5 plus 20%, i.e. radius 81px -> 97px.

       Note heroBaseR below intends to track the type size (avg word width * 0.42)
       but in practice always lands on its 54px floor, because avg word width
       never gets near 129px. So the spotlight is a FIXED 194px circle at every
       viewport, not a proportional one: 13% of a 1440 screen but 61% of a 320
       phone. Raise the 0.42 or drop the floor if you want it to actually scale. */
    var LH = 1.18, LS = -0.02, PARA_GAP = 0.85, heroR = 120, heroBaseR = 120, radiusMul = 1.8;
    /* Measure in the SHIELDED font at 500, because that is exactly what the read
       layer draws (.hero-layer.read .hero-text in app/reimagined.css) and the
       read layer is the one that has to fit the viewport. Canvas runs the same
       shaper as layout, so measureText applies the ligature: an encoded word
       comes back at the ORIGINAL word's width, not the decoy's. Measuring in
       plain Optik instead laid every line out far too narrow and the two layers
       drifted apart.

       The 500 has to be a real cut or this silently degrades — see the six
       @font-face rules in app/reimagined.css. */
    function setFont(fs){ ctx.font = '500 '+fs+'px "ShieldFont Optik", Optik, "Helvetica Neue", Arial, sans-serif'; try{ ctx.letterSpacing = (LS*fs)+'px'; }catch(e){} }
    /* The code layer, which gets NO shielded font — it spells the decoys out,
       and that is the point of the x-ray. Same context, different face. */
    function setFontCode(fs){ ctx.font = '500 '+fs+'px Optik, "Helvetica Neue", Arial, sans-serif'; try{ ctx.letterSpacing = (LS*fs)+'px'; }catch(e){} }

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
      if(HAS_REAL){
        /* The source IS the encoding: identical text on both layers, different
           font. Nothing to compute here beyond which indices got substituted. */
        ENC = WORDS.slice();
        SWAPPED = WORDS.map(function(_w, k){ return !!SWAP_IDX[k]; });
        return;
      }
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

    /* ---- PER-WORD WIDTHS IN BOTH FONTS ----
       The two layers hold the same string and draw it with different tables, so
       neither one is reliably the wider. A decoy resolves to a composite as wide
       as the ORIGINAL word, and the dictionary does not pair by length: "walled"
       draws as "developed" and runs 66px WIDER than the code layer's spelt-out
       "walled", while "complain" draws as the shorter "protect" and runs 22px
       NARROWER. Box only one side and every word of the other kind escapes its
       box, which is what pushed the layers ~20% apart.

       So measure both and box both to the max. Canvas is exact here — spot-
       checked against getBoundingClientRect across 17 swapped words at the live
       hero size, worst error 0.1px — so these numbers are the rendered widths,
       not an estimate to be corrected later. */
    var W_READ = [], W_CODE = [], W_BOX = [], W_SPACE = 0;

    function measureWords(fs){
      setFont(fs);
      W_SPACE = ctx.measureText(' ').width;
      W_READ = WORDS.map(function(w){ return ctx.measureText(w).width; });
      setFontCode(fs);
      /* Glyph widths only. The green .sw badge deliberately takes no layout
         width (its margin cancels its padding in reimagined.css), so there is
         nothing to add here — and nothing the read layer has to make room for. */
      W_CODE = ENC.map(function(w){ return ctx.measureText(w).width; });
      /* EVERY word gets a box, not just the swapped ones. An unswapped word is
         the same string on both layers, but it is not the same width: the
         shielded face gives up some of Optik's kerning, so "unauthorized" comes
         out ~3% wider there than in the code layer's plain Optik. Small, but it
         accumulates along a line, and centred lines turn the leftover into drift
         on every word. Boxing to the max costs the read layer nothing — it is
         the wider side almost every time, so its box is its own width — and the
         code layer takes up the slack. */
      W_BOX = WORDS.map(function(_w, j){ return Math.max(W_READ[j], W_CODE[j]); });
      setFont(fs);   /* leave the shielded face selected: it is what fit() reads */
    }

    /* Line width once every word sits in its shared box. Summing boxes rather
       than measuring the joined string is what keeps this honest: the boxes are
       what the browser will actually lay out. */
    function lineWidth(idx){
      var w = 0;
      for(var i=0;i<idx.length;i++) w += W_BOX[idx[i]];
      return w + W_SPACE * Math.max(0, idx.length - 1);
    }

    function wrap(fs, maxW){
      buildDecoys();
      measureWords(fs);
      var lines=[];
      PARAS.forEach(function(arr, pi){
        var cur=[], start=PARA_START[pi];
        for(var i=0;i<arr.length;i++){
          var gi=start+i;
          if(cur.length===0 || lineWidth(cur.concat(gi)) <= maxW){ cur.push(gi); }
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
        /* Real words from the encoded manifesto, so the probe exercises the
           ligature path the rest of the layer goes through. A probe of plain
           English would resolve to the DECOY shapes here (the dictionary is an
           involution) and hand back a calibration for text that isn't on screen. */
        var probeStr = 'ShieldFont was walled to complain messy writing unauthorized';
        probe.textContent = probeStr;
        /* font-family is deliberately NOT set: it must inherit whatever the read
           layer actually renders in, or this measures one font against another
           and the ratio is noise. */
        probe.style.cssText = 'position:absolute; left:-99999px; top:0; visibility:hidden; white-space:nowrap; font-weight:500; letter-spacing:-.02em; font-size:64px;';
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
      /* Re-measure at `best`. The binary search leaves W_BOX holding whatever
         size it probed last, which is not necessarily the one we are about to
         render at, and a box computed for the wrong size is a box that does not
         match the glyphs inside it. */
      buildDecoys();
      measureWords(best);
      var ws = W_READ.slice();
      var avg = ws.reduce(function(a,b){ return a+b; },0)/ws.length;
      heroBaseR = Math.round(Math.max(54, Math.min(170, avg*0.42)));
      heroR = Math.round(heroBaseR * radiusMul);
      if(eyeCursor){ eyeCursor.style.width=eyeCursor.style.height=(heroR*2)+'px'; eyeCursor.style.margin=(-heroR)+'px 0 0 '+(-heroR)+'px'; }
      function renderLines(code){
        var prev=-1;
        return bestLines.map(function(l){
          var cls='hl'+((l.para!==prev && prev!==-1)?' pstart':''); prev=l.para;
          var inner = l.words.map(function(j){
            /* REGISTRATION. Every word gets the SAME box on both sides —
               max(read, code), from W_BOX — so the reveal lands exactly on the
               word it replaces. Box one side only and whichever layer is wider
               that time hangs out of its box, and because the lines are centred
               the excess compounds along the line: that was 211px of drift at
               1440. Measured after this change: 0.02px, top to bottom. */
            var box = 'display:inline-block; min-width:'+W_BOX[j].toFixed(2)+'px;';
            var cw = 'cword' + (SWAPPED[j] ? ' sw' : '');
            return code
              ? '<span style="'+box+'"><span class="'+cw+'" data-i="'+j+'">'+ENC[j]+'</span></span>'
              : '<span style="'+box+'">'+WORDS[j]+'</span>';
          }).join(' ');
          return '<span class="'+cls+'">'+inner+'</span>';
        }).join('');
      }
      /* Paint at a given size. The box widths are baked into the markup, so a
         size change means a re-measure AND a re-render — set --hero-fs alone and
         the glyphs shrink inside boxes that stay put, which both wastes the
         space the shrink was trying to reclaim and stops the loop converging. */
      function paint(fs){
        hero.style.setProperty('--hero-fs', fs.toFixed(2)+'px');
        measureWords(fs);
        readLayer.innerHTML = renderLines(false);
        codeLayer.innerHTML = renderLines(true);
        cwords = codeLayer.querySelectorAll('.cword');
      }
      paint(best);

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
        paint(fs);
        widest = widestHL();
        passes++;
      }
    }
    fit();
    if(document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ buildDecoys(); fit(); });
    setTimeout(fit, 350);
    var rt; window.addEventListener('resize', function(){ clearTimeout(rt); rt=setTimeout(fit, 140); });

    /* ---- optically center the ⠿ grab glyph ----
       Optik carries no braille, so the pill's glyph renders from whatever
       symbols font the device falls back to — and those cells pack lopsided
       side bearings (and top-heavy ink: dots 123456 leave the bottom row
       empty). Grid centering only centers the em box, so measure the real
       ink with canvas TextMetrics and nudge the glyph onto the pill's
       optical center. Runs only where the pill is displayed (touch). */
    (function(){
      var glyphEl = eyeCursor ? eyeCursor.querySelector('.eye-grab-glyph') : null;
      if(!glyphEl) return;
      function centerInk(){
        var grabEl = glyphEl.parentNode;
        if(!grabEl || getComputedStyle(grabEl).display === 'none') return;
        var ctx = document.createElement('canvas').getContext('2d');
        if(!ctx || !ctx.measureText) return;
        var cs = getComputedStyle(glyphEl);
        ctx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
        var m = ctx.measureText('⠿');
        if(m.actualBoundingBoxLeft === undefined) return;  /* old engine: leave the em box */
        glyphEl.style.transform = 'none';                  /* measure from the uncorrected spot */
        var box = glyphEl.getBoundingClientRect();
        if(!box.width) return;
        /* baseline probe: a zero-size inline-block sits its bottom on the baseline */
        var probe = document.createElement('span');
        probe.style.cssText = 'display:inline-block;width:0;height:0;';
        glyphEl.appendChild(probe);
        var baseline = probe.getBoundingClientRect().top;
        probe.remove();
        /* ink spans [left - aBBL, left + aBBR] x [baseline - aBBA, baseline + aBBD] */
        var inkCx = box.left + (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2;
        var inkCy = baseline + (m.actualBoundingBoxDescent - m.actualBoundingBoxAscent) / 2;
        var dx = (box.left + box.width / 2) - inkCx;
        var dy = (box.top + box.height / 2) - inkCy;
        glyphEl.style.transform = 'translate(' + dx.toFixed(2) + 'px,' + dy.toFixed(2) + 'px)';
      }
      centerInk();
      /* re-measure once real fonts are in, in case the fallback shifts */
      if(document.fonts && document.fonts.ready) document.fonts.ready.then(centerInk);
    })();

    /* ---- reveal circle: slow auto-drift; hover follows; drag-the-torch pins ----
       State machine: driftOn (idle Lissajous) → hover follow (desktop
       pointermove) → dragging (pointer capture on the lens/handle, any
       screen) → pinned (released: hole + caption hold where dropped and ride
       with the text on scroll). Hover movement releases a pin back to the
       baseline; on touch a pin stays until the next grab. */
    if(xray && readWrap && eyeCursor && !reduce){
      function setHole(cx, cy){
        holeX = cx; holeY = cy;
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
        /* keep placing even while dismissed, so the caption reappears
           already in the right spot instead of jumping */
        if(caption){ if(!captionHidden) caption.classList.add('on'); placeCaption(cx, cy); }
      }
      function inView(){ var r=hero.getBoundingClientRect(); return r.bottom>80 && r.top<window.innerHeight; }
      var canHover = matchMedia('(hover:hover) and (pointer:fine)').matches;
      var driftOn = true, lastMove = 0;
      /* drag-the-torch state: `dragging` while a grab is live; `pinned` after
         a release — the hole and caption hold where dropped. holeX/holeY is
         the last hole centre (viewport px); pinDX/pinDY the pinned spot in
         hero-text space, so a pin rides with the text on scroll. */
      var pinned = false, dragging = false;
      var holeX = 0, holeY = 0, grabDX = 0, grabDY = 0, pinDX = 0, pinDY = 0;
      /* caption dismissal. A press that travels under TAP_SLOP px and
         releases inside TAP_MS is a click/tap, never a drag: on desktop a
         click toggles the caption; on touch a tap hides it and the next
         real drag of the lens brings it back. Drags never toggle. */
      var TAP_SLOP = 6, TAP_MS = 400;
      var captionHidden = false;
      var downX = 0, downY = 0, downT = 0, downMoved = true;
      function pressStart(e){ downX = e.clientX; downY = e.clientY; downT = performance.now(); downMoved = false; }
      function pressMoved(e){
        if(Math.abs(e.clientX - downX) > TAP_SLOP || Math.abs(e.clientY - downY) > TAP_SLOP) downMoved = true;
      }
      function wasTap(){ return !downMoved && (performance.now() - downT) < TAP_MS; }
      function hideCaption(){ captionHidden = true; if(caption) caption.classList.remove('on'); }
      function showCaption(){
        captionHidden = false;
        if(caption && eyeCursor.classList.contains('on')){ caption.classList.add('on'); placeCaption(holeX, holeY); }
      }
      function clampToHero(x, y){
        var r = readWrap.getBoundingClientRect();
        return [Math.max(r.left+8, Math.min(r.right-8, x)), Math.max(r.top+8, Math.min(r.bottom-8, y))];
      }
      function beginDrag(surface, e, keepOffset){
        dragging = true; pinned = false; driftOn = false; lastMove = performance.now();
        pressStart(e);                         /* arm the click/tap-vs-drag call */
        /* keep the grab offset so the lens doesn't jump under the finger */
        if(keepOffset && eyeCursor.classList.contains('on')){ grabDX = holeX - e.clientX; grabDY = holeY - e.clientY; }
        else { grabDX = 0; grabDY = 0; }
        eyeCursor.classList.add('held');       /* the pulse hint dies for good */
        eyeCursor.classList.add('dragging');
        try{ surface.setPointerCapture(e.pointerId); }catch(_){}
        var p = clampToHero(e.clientX + grabDX, e.clientY + grabDY);
        setHole(p[0], p[1]);
        if(e.cancelable) e.preventDefault();   /* keeps text selection out of the drag */
      }
      function moveDrag(e){
        if(!dragging) return;
        lastMove = performance.now();
        pressMoved(e);
        /* on touch, a real drag of the lens is the "I'm engaging again"
           signal — a tap-dismissed caption comes back and rides along */
        if(downMoved && !canHover && captionHidden) showCaption();
        var p = clampToHero(e.clientX + grabDX, e.clientY + grabDY);
        setHole(p[0], p[1]);
      }
      function endDrag(e){
        if(!dragging) return;
        dragging = false; pinned = true;       /* stays where dropped — drift does not resume */
        eyeCursor.classList.remove('dragging');
        var r = readWrap.getBoundingClientRect();
        pinDX = holeX - r.left; pinDY = holeY - r.top;
        /* desktop only: a clean release with no real travel = click, which
           toggles the caption (pointercancel never counts). Touch taps are
           handled by the document-level tracker below, on purpose — they
           must not depend on this drag machinery. */
        if(canHover && e && e.type === 'pointerup' && wasTap()){
          if(captionHidden) showCaption(); else hideCaption();
        }
      }
      function drift(now){
        if(dragging){
          /* pointer capture drives the hole */
        } else if(pinned){
          if(inView()){
            var rp = readWrap.getBoundingClientRect();
            setHole(rp.left + pinDX, rp.top + pinDY);   /* pinned to the TEXT, not the screen */
          } else { eyeCursor.classList.remove('on'); if(caption) caption.classList.remove('on'); }
        } else if(driftOn){
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
      /* touch grab surface: the lens circle and its handle pill (the pill is
         touch-only in the CSS). On desktop the lens takes no pointer events,
         so these never fire there and hover reaches the hero underneath. */
      eyeCursor.addEventListener('pointerdown', function(e){
        if(e.button !== undefined && e.button !== 0) return;
        beginDrag(eyeCursor, e, true);
      });
      eyeCursor.addEventListener('pointermove', moveDrag);
      eyeCursor.addEventListener('pointerup', endDrag);
      eyeCursor.addEventListener('pointercancel', endDrag);
      if(canHover){
        /* hover = baseline: follow the cursor; plain movement releases a pin.
           The lens rides under the cursor here, so pressing the text IS
           grabbing the lens — press-drag-release pins it where dropped. */
        hero.addEventListener('pointermove', function(e){
          if(dragging){ moveDrag(e); return; }
          pinned = false; driftOn = false; lastMove = performance.now();
          setHole(e.clientX, e.clientY);
        });
        hero.addEventListener('pointerleave', function(){ if(!dragging && !pinned) driftOn = true; });
        hero.addEventListener('pointerdown', function(e){
          if(e.button !== 0) return;
          if(e.target.closest('a,button')) return;   /* hero links/buttons keep their clicks */
          beginDrag(hero, e, false);
        });
        hero.addEventListener('pointerup', endDrag);
        hero.addEventListener('pointercancel', endDrag);
      } else {
        /* touch: ANY tap — on the lens or anywhere over the hero band —
           dismisses the caption. Tracked at document level, capture phase,
           with its own press state so the drag machinery can never
           interfere (pointer capture retargets moves to the lens, but they
           still pass through document capture). Nothing is prevented, so
           the page scrolls as ever; a scroll or drag travels past TAP_SLOP
           and stops reading as a tap. The caption returns on the next real
           drag of the lens (see moveDrag). */
        var tapX = 0, tapY = 0, tapT = 0, tapLive = false;
        document.addEventListener('pointerdown', function(e){
          tapLive = false;
          if(e.target.closest && e.target.closest('a,button')) return;  /* links/buttons keep their taps */
          var r = hero.getBoundingClientRect();
          var overHero = e.clientY >= r.top && e.clientY <= r.bottom;
          if(!overHero && !eyeCursor.contains(e.target)) return;
          tapX = e.clientX; tapY = e.clientY; tapT = performance.now(); tapLive = true;
        }, true);
        document.addEventListener('pointermove', function(e){
          if(tapLive && (Math.abs(e.clientX - tapX) > TAP_SLOP || Math.abs(e.clientY - tapY) > TAP_SLOP)) tapLive = false;
        }, true);
        document.addEventListener('pointerup', function(){
          if(tapLive && (performance.now() - tapT) < TAP_MS) hideCaption();
          tapLive = false;
        }, true);
        document.addEventListener('pointercancel', function(){ tapLive = false; }, true);
      }
    }
  })();

  /* ---------- live encoder ---------- */
  /* The real alpha (v18) mapping — fetched below. Starts empty so the first
     paint is instant; upgrades to the full dictionary once loaded. */
  var DICT = {};
  var input = document.getElementById('enc-input');
  var output = document.getElementById('enc-output');
  var marks = document.getElementById('enc-marks');
  function escHtml(t){ return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  /* LINE REGISTRATION (words, not widths): the input mirror wraps
     naturally; we then measure how many words landed on each of its lines
     and force the output to break after the same word counts, so both
     panes always show the same words per line. */
  var meta = document.getElementById('enc-meta');
  var count = document.getElementById('enc-count');
  var DEFAULT = "Authors publish essays, poems, and ideas every morning.";
  function encode(){
    var raw = input.value;
    if(!raw.trim()){
      output.innerHTML = '<span class="ph">Your protected text appears here\u2026</span>';
      if(marks) marks.innerHTML = '';
      meta.innerHTML=''; count.textContent='0 / 0 TOKENS SWAPPED'; return;
    }
    var tokens = raw.split(/(\s+)/);
    var swaps = [], swapCount = 0, total = 0, marksHtml = '';
    var words = [];   /* [{dec:decoy-or-null, tk, lead, core, trail}] in order */
    tokens.forEach(function(tk){
      if(/^\s+$/.test(tk)){ marksHtml += tk; words.push(null); return; }
      var lead = (tk.match(/^[^A-Za-z]*/)||[''])[0];
      var trail = (tk.match(/[^A-Za-z]*$/)||[''])[0];
      var core = tk.slice(lead.length, tk.length-trail.length);
      if(!core){ marksHtml += escHtml(tk); words.push(null); return; }
      total++;
      var key = core.toLowerCase();
      var dec = DICT[key];
      if(dec){
        if(core.length>1 && core===core.toUpperCase()) dec = dec.toUpperCase();
        else if(core[0]===core[0].toUpperCase()) dec = dec[0].toUpperCase()+dec.slice(1);
        swapCount++;
        if(swaps.length<5) swaps.push([core,dec]);
        marksHtml += escHtml(lead)+'<span class="enc-w enc-mark">'+escHtml(core)+'</span>'+escHtml(trail);
        words.push({dec:dec, lead:lead, trail:trail});
      } else {
        marksHtml += escHtml(lead)+'<span class="enc-w">'+escHtml(core)+'</span>'+escHtml(trail);
        words.push({dec:null, tk:tk});
      }
    });
    if(marks) marks.innerHTML = marksHtml + '\n';
    /* measure the mirror's natural wrap: words per line */
    var perLine = [];
    if(marks){
      var ws = marks.querySelectorAll('.enc-w');
      var lastTop = null, runCount = 0;
      Array.prototype.forEach.call(ws, function(w){
        var t = Math.round(w.getBoundingClientRect().top);
        if(lastTop === null || Math.abs(t - lastTop) < 4){ runCount++; }
        else { perLine.push(runCount); runCount = 1; }
        lastTop = t;
      });
      if(runCount) perLine.push(runCount);
    }
    /* rebuild the output as unbreakable lines carrying the same word
       counts; if a line of longer decoys overflows the pane, step the
       output type down a little until every forced line fits */
    var htmlLines = [], cur = '', line = 0, inLine = 0;
    words.forEach(function(w, idx){
      var tk = tokens[idx];
      if(w === null){
        if(/^\s+$/.test(tk)){ if(cur !== '') cur += tk; }
        else cur += escHtml(tk);
        return;
      }
      if(w.dec !== null){
        cur += w.lead+'<span class="swap">'+w.dec+'</span>'+w.trail;
      } else {
        cur += escHtml(w.tk);
      }
      inLine++;
      if(perLine.length && line < perLine.length - 1 && inLine >= perLine[line]){
        htmlLines.push(cur.replace(/\s+$/,''));
        cur = ''; line++; inLine = 0;
      }
    });
    if(cur.replace(/\s+$/,'')) htmlLines.push(cur.replace(/\s+$/,''));
    output.style.fontSize = '';
    output.innerHTML = htmlLines.map(function(l){
      return '<span class="enc-line">'+l+'</span>';
    }).join('<br>');
    var fs = 24;
    while(output.scrollWidth > output.clientWidth + 1 && fs > 18){
      fs--; output.style.fontSize = fs+'px';
    }
    count.textContent = swapCount+' / '+total+' TOKENS SWAPPED';
    meta.innerHTML = swaps.map(function(s){
      return '<span class="swap-pill"><span class="sp-from">'+s[0].toUpperCase()+'</span><span class="sp-arr">\u203a</span><span class="sp-to">'+s[1].toUpperCase()+'</span></span>';
    }).join('');
  }
  if(input){
    input.value = DEFAULT;
    input.addEventListener('input', encode);
    if(marks) input.addEventListener('scroll', function(){ marks.scrollTop = input.scrollTop; });
    encode();
    /* Load the real alpha mapping, then re-encode with it. */
    fetch('/shieldfont-alpha-map.json').then(function(r){ return r.json(); })
      .then(function(m){ DICT = m; encode(); }).catch(function(){});
    /* wrap depends on the face and the pane width: re-run when they settle */
    if(document.fonts && document.fonts.ready && document.fonts.ready.then){
      document.fonts.ready.then(function(){ encode(); });
    }
    window.addEventListener('resize', encode);
    var publishBtn = document.getElementById('enc-publish');
    if(publishBtn) publishBtn.addEventListener('click', function(){
      /* Carry the typed text into the full editor. WriterEncoder reads this
         localStorage key on load, so the <a href="/encoder"> nav picks it up. */
      try{ localStorage.setItem('shieldfont-encoder-text', input.value || ''); }catch(e){}
    });
  }

  /* ---------- rotating use-case selector: arc on desktop, scroll-driven wheel on mobile ---------- */
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
        /* The arc used to be driven by writing left and top on every item on
           every frame. Those are layout properties: each pair of writes dirtied
           layout for the whole list, so a section that only ever moves type
           around was costing a relayout per frame. The same placement now rides
           the transform the item already had, which the compositor can handle
           on its own. The CSS pins left/top at 0 so this is the only thing
           positioning them. */
        it.style.opacity = op.toFixed(3);
        it.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) ' +
          'translate(0,-50%) rotate('+rot.toFixed(2)+'deg) scale('+sc.toFixed(3)+')'; // …extending outward
        it.style.zIndex = String(Math.round(100 - ad*20));
        it.classList.toggle('active', (Math.round(sel)%N+N)%N === i);
      }
    }
    function progress(){
      var rect = selectorSec.getBoundingClientRect();
      var total = rect.height - window.innerHeight;
      return Math.min(1, Math.max(0, -rect.top/total));
    }
    /* Both loops below used to run for the life of the page, reading the
       section's rect and rewriting every item on every frame no matter where
       the reader was. They now park whenever the section is nowhere near the
       viewport, and the observer starts them again on the way back in.
       Visibility comes from an observer rather than a rect read so the check
       itself never forces a layout. */
    var secVisible = true;
    var lastY = -1, rafOn = false;
    function tick(){
      if(!rafOn) return;
      if(!secVisible){ rafOn = false; return; }
      if(window.scrollY !== lastY){ lastY = window.scrollY; layout(progress()*(N-1)); }
      requestAnimationFrame(tick);
    }
    /* Mobile: a 3D momentum wheel driven by the same scroll progress as the
       arc. The wheel chases progress()*(N-1) with light exponential smoothing,
       so its speed tracks scroll velocity and fast flicks whip through items.
       The list is pushed back by -R so the centre word renders at its exact
       CSS size (no perspective magnification) and the lead:item ratio holds. */
    var WHEEL = {
      angle: 16,       // deg between adjacent words on the cylinder (tighter = denser)
      radiusK: 0.6,    // cylinder radius = clock height × radiusK
      minRadius: 110,  // px floor for the radius
      visible: 2.7,    // items drawn either side of centre
      smooth: 12.5,    // 1/s — how tightly the wheel chases scroll (lower = more inertia)
      zoom: 0.10,      // extra centre scale-up on the active word (peaks at |d|=0)
      zoomSpan: 0.6,   // |d| range over which the zoom bump fades out
      snapVel: 0.5,    // items/s — scroll speed under which we count as "settling"
      snapDelay: 200,  // ms of settling before the magnet engages
      snapSmooth: 8    // 1/s — eased magnetise rate toward the nearest item
    };
    var wr = 0, wOn = false, wPrevTs = null, wPainted = null, wActive = -1, wReduceAi = -1;
    var wPrevTarget = null, wStillMs = 0;
    function layoutWheel(){
      var H = clock.clientHeight || 1;
      var R = Math.max(WHEEL.minRadius, H*WHEEL.radiusK);
      clockList.style.transform = 'translateZ(' + (-R).toFixed(0) + 'px)';
      for(var i=0;i<N;i++){
        var d = i - wr, ad = Math.abs(d), it = items[i];
        if(ad > WHEEL.visible){ it.style.opacity='0'; it.style.visibility='hidden'; continue; }
        it.style.visibility='visible';
        var sc = 0.64 + 0.36*Math.max(0, 1 - ad/1.9)      // active 1 → 0.64, like the arc…
               + WHEEL.zoom*Math.max(0, 1 - ad/WHEEL.zoomSpan); // …plus a centre zoom pop
        it.style.opacity = Math.max(0, 1 - 0.38*ad).toFixed(3);
        it.style.transform = 'translate(-50%,-50%) rotateX(' + (-d*WHEEL.angle).toFixed(2) +
          'deg) translateZ(' + R.toFixed(0) + 'px) scale(' + sc.toFixed(3) + ')';
      }
      var ai = Math.max(0, Math.min(N-1, Math.round(wr)));
      if(ai !== wActive){
        if(wActive >= 0 && items[wActive]) items[wActive].classList.remove('active');
        items[ai].classList.add('active');
        wActive = ai;
      }
    }
    function layoutReduceMobile(){
      var ai = Math.max(0, Math.min(N-1, Math.round(progress()*(N-1))));
      if(ai === wReduceAi) return;
      wReduceAi = ai;
      clockList.style.transform = '';
      for(var i=0;i<N;i++){
        var it = items[i];
        it.style.visibility = 'visible';
        it.style.transform = 'translate(-50%,-50%)';
        it.style.opacity = (i===ai) ? '1' : '0';
        it.classList.toggle('active', i===ai);
      }
    }
    function wheelTick(ts){
      if(!wOn) return;
      if(!secVisible){ wOn = false; return; }
      if(reduce){ layoutReduceMobile(); requestAnimationFrame(wheelTick); return; }
      var dt = (wPrevTs===null) ? 0.016 : Math.min(0.05, (ts-wPrevTs)/1000);
      wPrevTs = ts;
      var target = progress()*(N-1);
      /* magnetic snap: while scrolling, chase the live target; once scroll
         velocity stays under snapVel for snapDelay ms, ease toward the
         nearest whole item so the wheel never rests between two words. */
      var tv = (wPrevTarget===null) ? 0 : (target - wPrevTarget)/dt;
      wPrevTarget = target;
      if(Math.abs(tv) < WHEEL.snapVel){ wStillMs += dt*1000; } else { wStillMs = 0; }
      var snapping = wStillMs >= WHEEL.snapDelay;
      var desired = snapping ? Math.max(0, Math.min(N-1, Math.round(target))) : target;
      var rate = snapping ? WHEEL.snapSmooth : WHEEL.smooth;
      wr += (desired - wr)*Math.min(1, rate*dt);
      if(Math.abs(desired - wr) < 0.0005) wr = desired;
      if(wPainted === null || Math.abs(wr - wPainted) > 0.0004){ layoutWheel(); wPainted = wr; }
      requestAnimationFrame(wheelTick);
    }
    function startMobile(){
      items.forEach(function(it){ it.style.cssText=''; it.classList.remove('active'); });
      wActive = -1; wReduceAi = -1; wPrevTs = null; wPainted = null;
      wPrevTarget = null; wStillMs = 0;
      wr = progress()*(N-1);
      if(!wOn){ wOn = true; requestAnimationFrame(wheelTick); }
    }
    function stopMobile(){
      wOn = false; wActive = -1; wReduceAi = -1;
      clockList.style.transform = '';
      items.forEach(function(it){ it.style.cssText=''; it.classList.remove('active'); });
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
    if(window.IntersectionObserver){
      new IntersectionObserver(function(es){
        secVisible = es[0].isIntersecting;
        if(!secVisible) return;
        if(mqMobile.matches){ if(!wOn) startMobile(); }
        else if(!rafOn){ rafOn = true; lastY = -1; requestAnimationFrame(tick); }
      }, {rootMargin:'200px'}).observe(selectorSec);
    }
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

  /* ---------- topbar shadow on scroll ----------
     This used to write an inline box-shadow straight out of the scroll handler,
     on every event, whether or not the value had changed. That is a style write
     on the one element that is fixed and composited above everything else on the
     page, repeated for the whole length of every scroll. It is now a class,
     toggled inside a requestAnimationFrame batch and only when the state
     actually flips, so scrolling past the threshold costs nothing after the
     first frame. */
  (function(){
    var topbar = document.querySelector('.topbar');
    if(!topbar) return;
    var shadowed = null, queued = false;
    function apply(){
      queued = false;
      var next = window.scrollY > 10;
      if(next === shadowed) return;
      shadowed = next;
      topbar.classList.toggle('scrolled', next);
    }
    apply();
    window.addEventListener('scroll', function(){
      if(!queued){ queued = true; requestAnimationFrame(apply); }
    }, {passive:true});
  })();

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

  /* ---------- classic hero: 3D doc stack (glass over matte) ----------
     Scroll gate: while the page sits at the very top, the first scroll is
     spent parting the two sheets instead of scrolling the page. It is one
     milestone, taken whole — any amount of scroll triggers the full split
     animation — and the page scrolls on the next motion. Arriving back at
     the top and continuing upward runs it in reverse. The page itself never
     moves during the gate, so the sections below keep their layout.
     Leader lines ("You read" / "AI reads") fade in as the sheets part.
     Desktop also gets a gentle lerped pointer parallax. */
  (function(){
    var rig = document.getElementById('stackRig');
    if(!rig) return;
    var mm = window.matchMedia ? window.matchMedia.bind(window) : null;
    var reduced = mm ? mm('(prefers-reduced-motion: reduce)') : null;
    var fine = mm ? mm('(hover: hover) and (pointer: fine)') : null;
    if(reduced && reduced.matches) return;   /* CSS pins --sp:1 */

    /* Milestone gate: the split is a checkpoint, not a drag. The first scrap
       of scroll intent at the top — a nudge or a slam, it makes no difference
       — commits the WHOLE split and plays it as a fixed animation, so a weak
       scroll can never strand the sheets half-open and leave you scrolling
       again to finish the job. The rest of that gesture, momentum tail
       included, is swallowed; the next fresh motion scrolls the page
       straight away. Reversing at the very top merges the sheets the same
       way. */
    var SPLIT_MS = 560;       /* how long a committed split takes to play */
    var GATE_MS = 360;        /* how long the milestone owns the input after */
    var GAP = 260;            /* ms of quiet that ends a wheel gesture */
    var MIN_TOUCH = 5;        /* px of finger travel that reads as intent */
    var P = 0;                /* split target: 0 merged, 1 fully parted */
    var from = 0, at = -1e9, animating = false;
    function atTop(){ return window.scrollY <= 0; }

    /* Take the whole milestone, whatever the input was, and animate to it
       from wherever the sheets currently sit. */
    function commit(to){
      from = cur; P = to; at = performance.now(); animating = true;
      kick();   /* the paint loop has work again */
    }
    /* The beat a fresh commit keeps for itself, so the split is unmistakably
       under way before the page can move. Deliberately measured off the clock
       rather than off `animating`: input decisions must not depend on whether
       the paint loop got its frames — a backgrounded tab stops firing rAF
       entirely, and a gate waiting on that would never reopen. It ends a
       little before the animation does, so a quick second scroll gets the
       page moving while the sheets finish parting. */
    function held(now){ return (now - at) < GATE_MS; }

    var lastT = 0, lastAbs = 0;
    function onWheel(e){
      if(!atTop()){ lastAbs = 0; return; }
      var abs = Math.abs(e.deltaY);
      /* A sideways gesture is somebody else's; anything with vertical intent
         is ours, down to the last pixel. There is deliberately no minimum:
         a floor here would let the dying scraps of a flick — the 2px events
         a momentum tail ends on — fall through and creep the page off zero,
         which unbinds the gate and strands the hero unsplit. */
      if(!e.deltaY || Math.abs(e.deltaX) > abs) return;
      var now = performance.now();
      /* a delta suddenly RISING against a decaying momentum tail is a new
         deliberate motion, even with no quiet gap between them */
      var fresh = (now - lastT) >= GAP || abs > lastAbs * 2 + 8;
      lastT = now; lastAbs = abs;
      var to = e.deltaY > 0 ? 1 : 0;
      if(P !== to){
        e.preventDefault();
        commit(to);
      } else if(held(now) || !fresh){
        e.preventDefault();      /* the milestone's beat, then its momentum tail */
      }
      /* else: milestone reached and this is a genuinely new motion — scroll */
    }
    var startY = null, tCommitted = false;
    window.addEventListener('touchstart', function(e){
      startY = e.touches.length === 1 ? e.touches[0].clientY : null;
      tCommitted = false;
    }, {passive:true});
    function onTouchMove(e){
      if(startY === null || !atTop()) return;
      /* Direction comes from the whole drag so far, not the last frame's
         jitter. The threshold sits inside the browser's own touch slop, so
         the commit lands before the page has begun to move and
         preventDefault still counts. */
      var travel = startY - e.touches[0].clientY;   /* >0 = finger up = scroll down */
      if(Math.abs(travel) < MIN_TOUCH) return;
      var to = travel > 0 ? 1 : 0;
      if(!tCommitted && P !== to){
        tCommitted = true;
        e.preventDefault();
        commit(to);
      } else if(tCommitted || held(performance.now())){
        e.preventDefault();      /* rest of the committing drag, or the beat */
      }
    }
    window.addEventListener('touchend', function(){ startY = null; tCommitted = false; });

    /* The gate has to be able to call preventDefault, so its wheel and
       touchmove listeners cannot be passive. A non-passive wheel listener on
       window takes the whole page off the compositor's fast scrolling path:
       every wheel event, anywhere on the page, has to wait for this handler
       before the page is allowed to move. The gate only ever does anything
       while the page sits at the very top, so it is now bound only there and
       unbound the moment the page scrolls away. Everything below the hero gets
       ordinary compositor-driven scrolling back. */
    var gateBound = false;
    function bindGate(){
      if(gateBound) return;
      gateBound = true;
      window.addEventListener('wheel', onWheel, {passive:false});
      window.addEventListener('touchmove', onTouchMove, {passive:false});
    }
    function unbindGate(){
      if(!gateBound) return;
      gateBound = false;
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchmove', onTouchMove);
      lastAbs = 0; tCommitted = false;
    }
    if(atTop()) bindGate();
    window.addEventListener('scroll', function(){
      if(atTop()) bindGate(); else unbindGate();
    }, {passive:true});

    var MAX = 2.5, cur = 0;
    var tx = 0, ty = 0, cx = 0, cy = 0;
    var hasPointer = !!(fine && fine.matches);

    /* Whether the stack is anywhere near the viewport. An observer answers this
       without any handler ever reading layout, so nothing here can force a
       synchronous layout mid-scroll. */
    var onScreen = true;
    if(window.IntersectionObserver){
      new IntersectionObserver(function(es){
        onScreen = es[0].isIntersecting;
        if(onScreen) kick();
      }, {rootMargin:'160px'}).observe(rig);
    }

    if(hasPointer){
      window.addEventListener('pointermove', function(e){
        if(!onScreen) return;   /* no parallax to compute once it is scrolled past */
        var nx = (e.clientX / window.innerWidth) * 2 - 1;
        var ny = (e.clientY / window.innerHeight) * 2 - 1;
        tx = nx * MAX; ty = -ny * MAX;
        kick();
      }, {passive:true});
      document.addEventListener('pointerleave', function(){ tx = 0; ty = 0; kick(); });
      window.addEventListener('blur', function(){ tx = 0; ty = 0; kick(); });
    }

    /* This loop used to run for the life of the page. Every frame, forever, it
       rewrote --sp on the rig whether or not the value had changed, and a custom
       property on the rig dirties the style of all 110 elements under it, one of
       which is the frosted sheet carrying a 23px backdrop-filter. Measured in
       Chrome that write plus its style recalculation costs 0.27ms per frame, or
       about a sixth of a 60fps budget, spent at every scroll position on the
       page including the one where the video sits. Safari pays more, because an
       invalidated backdrop-filter is a backdrop-filter it has to sample again.

       Now the loop runs only while something is actually moving, writes a
       property only when the value it would write differs from the last one it
       wrote, and parks itself when everything has settled. Any input that can
       change the target calls kick() to start it again. */
    var running = false, wSp = null, wRy = null, wRx = null;
    function paint(){
      var sp = cur.toFixed(4);
      if(sp !== wSp){ rig.style.setProperty('--sp', sp); wSp = sp; }
      if(hasPointer){
        var ry = cx.toFixed(3) + 'deg';
        var rx = cy.toFixed(3) + 'deg';
        if(ry !== wRy){ rig.style.setProperty('--pry', ry); wRy = ry; }
        if(rx !== wRx){ rig.style.setProperty('--prx', rx); wRx = rx; }
      }
    }
    function tick(ts){
      var moving = false;
      /* The split is a committed animation on its own clock, not a lerp
         chasing a dragged value: every split takes SPLIT_MS and lands the
         same way whether the scroll that triggered it was a flick or a
         nudge. rAF timestamps share performance.now()'s origin. */
      if(animating){
        var t = ((ts || performance.now()) - at) / SPLIT_MS;
        if(t >= 1){ t = 1; animating = false; }
        var k = 1 - Math.pow(1 - t, 3);   /* ease-out cubic: quick, then settles */
        cur = from + (P - from) * k;
        moving = true;
      } else if(cur !== P){ cur = P; moving = true; }
      if(hasPointer && onScreen){
        if(Math.abs(tx - cx) >= 0.002 || Math.abs(ty - cy) >= 0.002){
          cx += (tx - cx) * 0.055; cy += (ty - cy) * 0.055; moving = true;
        } else if(cx !== tx || cy !== ty){ cx = tx; cy = ty; moving = true; }
      }
      paint();
      if(moving) window.requestAnimationFrame(tick);
      else running = false;
    }
    function kick(){
      if(running) return;
      running = true;
      window.requestAnimationFrame(tick);
    }
    kick();
  })();
})();

/* ============================================================
   TUTORIAL VIDEO — poster + custom play button, then hand over
   to native controls once playback starts.
   ============================================================ */
(function(){
  "use strict";
  var card = document.querySelector('[data-video-card]');
  if(!card) return;
  var video = card.querySelector('video');
  var btn = card.querySelector('.play');
  if(!video) return;
  function start(){
    if(card.classList.contains('playing')) return;
    card.classList.add('playing');
    video.setAttribute('controls','');
    var p = video.play();
    if(p && typeof p.catch === 'function') p.catch(function(){});
  }
  if(btn) btn.addEventListener('click', start);
  /* The poster frame is clickable too. start() no-ops once playback has
     begun, so this never fights the native controls' own click handling. */
  video.addEventListener('click', start);
  video.addEventListener('play', function(){ card.classList.add('playing'); });
})();
