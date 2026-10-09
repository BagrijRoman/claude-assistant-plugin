/*
 * The flow player.
 *
 * A flow page holds one <div class="flow" data-flow> with its steps as <li class="flow__step"
 * data-step data-title="…"> in order. The player shows one step at a time with "Step 2 of 7", the
 * step's title, previous / next, an "All steps" view that lays them out in order, and a full-screen
 * mode with the same controls. The ← → keys step; Escape leaves full screen. #step-3 in the
 * address opens that step, and a link inside a screen with data-go="step-3" jumps to it, so a
 * button on a screen can lead to the next one. The title in the bar is read from the step's head
 * (.flow__step-title), which i18n.js translates, and read again when the language changes.
 *
 * What the user acts on in a step — a field, a button, a row — carries data-flow-target="1", "2", …
 * in the order of acting. site.css rings and numbers it while its step is on show; here the
 * emphasis walks from one to the next, so a viewer reads the order as a sequence of actions. It stays
 * still under reduced motion, and the Hints button in the bar turns rings and numbers off (for a clean
 * screenshot); that choice is kept for the site, like the theme.
 *
 * Nothing here is drawn late: the steps are in the page; the player only decides which is visible.
 */
(function () {
  var script = document.currentScript;
  var HINTS_KEY = 'showcase:flowHints:' + (script ? new URL('..', script.src).pathname : '/');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  // How long the emphasis stays on one control: two beats of the pulse in site.css
  var WALK = 1600;

  function hintsWanted() {
    try {
      return localStorage.getItem(HINTS_KEY) !== 'off';
    } catch (error) {
      return true;
    }
  }

  function rememberHints(on) {
    try {
      if (on) localStorage.removeItem(HINTS_KEY);
      else localStorage.setItem(HINTS_KEY, 'off');
    } catch (error) {
      console.warn('The choice could not be saved: ' + error.message);
    }
  }

  function setup(flow) {
    if (flow.getAttribute('data-flow-ready') === '1') return;
    flow.setAttribute('data-flow-ready', '1');

    var steps = Array.prototype.slice.call(flow.querySelectorAll('[data-step]'));
    if (steps.length === 0) return;
    var indexNode = flow.querySelector('[data-flow-index]');
    var countNode = flow.querySelector('[data-flow-count]');
    var titleNode = flow.querySelector('[data-flow-step-title]');
    var prev = flow.querySelector('[data-flow-prev]');
    var next = flow.querySelector('[data-flow-next]');
    var all = flow.querySelector('[data-flow-all]');
    var full = flow.querySelector('[data-flow-full]');
    var hints = flow.querySelector('[data-flow-hints]');
    var walkTimer = 0;
    var at = 0;

    steps.forEach(function (step, index) {
      if (!step.id) step.id = 'step-' + (index + 1);
    });

    function fromAddress() {
      var match = /#step-(\d+)$/.exec(location.hash);
      if (!match) return 0;
      var index = parseInt(match[1], 10) - 1;
      return index >= 0 && index < steps.length ? index : 0;
    }

    function titleOf(step) {
      var head = step.querySelector('.flow__step-title');
      return head ? head.textContent : step.getAttribute('data-title') || '';
    }

    function render() {
      steps.forEach(function (step, index) {
        step.classList.toggle('is-current', index === at);
        step.setAttribute('aria-hidden', String(index !== at && !flow.classList.contains('flow--all')));
      });
      if (indexNode) indexNode.textContent = String(at + 1);
      if (countNode) countNode.textContent = String(steps.length);
      if (titleNode) titleNode.textContent = titleOf(steps[at]);
      if (prev) prev.disabled = at === 0;
      if (next) next.disabled = at === steps.length - 1;
      var address = location.pathname + (at === 0 ? '' : '#step-' + (at + 1));
      if (location.pathname + location.hash !== address) history.replaceState(history.state, '', address);
      walk();
    }

    // The controls of a step in the order of acting: by their number, then as they stand in the page
    function targetsOf(step) {
      return Array.prototype.slice.call(step.querySelectorAll('[data-flow-target]'))
        .map(function (node, index) { return { node: node, order: parseFloat(node.getAttribute('data-flow-target')), index: index }; })
        .sort(function (a, b) {
          var byNumber = (isNaN(a.order) ? Infinity : a.order) - (isNaN(b.order) ? Infinity : b.order);
          return byNumber || a.index - b.index;
        })
        .map(function (entry) { return entry.node; });
    }

    // The emphasis on the step on show: one control after another, then a beat with none, so the walk
    // is seen to start again; a single control keeps it
    function walk() {
      clearInterval(walkTimer);
      flow.querySelectorAll('.is-flow-now').forEach(function (node) { node.classList.remove('is-flow-now'); });
      var targets = targetsOf(steps[at]);
      if (targets.length === 0 || reduceMotion.matches || flow.classList.contains('flow--plain')) return;
      var turn = 0;
      var beats = targets.length > 1 ? targets.length + 1 : 1;
      function step() {
        if (!document.body.contains(flow)) {
          clearInterval(walkTimer);
          return;
        }
        targets.forEach(function (node, index) { node.classList.toggle('is-flow-now', index === turn); });
        turn = (turn + 1) % beats;
      }
      step();
      walkTimer = setInterval(step, WALK);
    }

    function setHints(on) {
      flow.classList.toggle('flow--plain', !on);
      if (hints) hints.setAttribute('aria-pressed', String(on));
      walk();
    }

    function go(index) {
      if (index < 0 || index >= steps.length) return;
      at = index;
      render();
      if (flow.classList.contains('flow--all')) steps[at].scrollIntoView({ block: 'start', behavior: 'smooth' });
    }

    function setAll(on) {
      flow.classList.toggle('flow--all', on);
      if (all) all.setAttribute('aria-pressed', String(on));
      render();
    }

    // Full screen through the browser where it exists; a fixed overlay where it does not (iOS)
    function setFull(on) {
      if (on && flow.requestFullscreen) {
        flow.requestFullscreen().catch(function () { flow.classList.add('flow--full'); });
      } else if (!on && document.fullscreenElement === flow && document.exitFullscreen) {
        document.exitFullscreen();
      } else {
        flow.classList.toggle('flow--full', on);
      }
      if (full) full.setAttribute('aria-pressed', String(on));
    }

    function isFull() {
      return document.fullscreenElement === flow || flow.classList.contains('flow--full');
    }

    document.addEventListener('fullscreenchange', function () {
      var on = document.fullscreenElement === flow;
      flow.classList.toggle('flow--fullscreen', on);
      if (full) full.setAttribute('aria-pressed', String(isFull()));
    });

    // The step heads were just translated: the bar takes the title again
    document.addEventListener('langchange', function () {
      if (document.body.contains(flow) && titleNode) titleNode.textContent = titleOf(steps[at]);
    });

    flow.addEventListener('click', function (event) {
      var target = event.target.closest('[data-flow-prev], [data-flow-next], [data-flow-all], [data-flow-full], [data-flow-hints], [data-go]');
      if (!target) return;
      if (target.hasAttribute('data-flow-prev')) go(at - 1);
      else if (target.hasAttribute('data-flow-next')) go(at + 1);
      else if (target.hasAttribute('data-flow-all')) setAll(!flow.classList.contains('flow--all'));
      else if (target.hasAttribute('data-flow-full')) setFull(!isFull());
      else if (target.hasAttribute('data-flow-hints')) {
        var on = flow.classList.contains('flow--plain');
        rememberHints(on);
        setHints(on);
      } else {
        // A control on a screen that leads to another step: "step-3", or "end" for a screen not drawn yet
        var to = target.getAttribute('data-go');
        event.preventDefault();
        if (to === 'end') {
          flow.classList.add('flow--end');
          setTimeout(function () { flow.classList.remove('flow--end'); }, 1600);
          return;
        }
        var match = /^step-(\d+)$/.exec(to);
        if (match) go(parseInt(match[1], 10) - 1);
      }
    });

    // The ← → keys belong to the flow while one is on the page; nav.js sees the event only if the
    // player lets it through (capture phase, stopped), so a flow page does not also turn the page
    document.addEventListener('keydown', function (event) {
      if (!document.body.contains(flow)) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      var tag = (event.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        event.stopPropagation();
        go(event.key === 'ArrowRight' ? at + 1 : at - 1);
      } else if (event.key === 'Escape' && flow.classList.contains('flow--full')) {
        event.stopPropagation();
        setFull(false);
      }
    }, true);

    // The reader turned reduced motion on or off while the page is open
    reduceMotion.addEventListener('change', function () {
      if (document.body.contains(flow)) walk();
    });

    at = fromAddress();
    flow.classList.toggle('flow--plain', !hintsWanted());
    if (hints) hints.setAttribute('aria-pressed', String(hintsWanted()));
    render();
  }

  function setupAll() {
    document.querySelectorAll('[data-flow]').forEach(setup);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupAll);
  else setupAll();
  document.addEventListener('pageswap', setupAll);
})();
