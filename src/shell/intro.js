// The intro (decision I1, as settled in chat on 12 Oct 2026). Inlined into the
// page's <head> by the build and run before the first paint: on the first page of a
// session it marks the document `is-intro`, and index.css brings the wordmark, the
// date and the controls in around a Moon and phase name that are there from the
// first frame. Up to 1.2 s; any press, key or wheel skips it; none under reduced
// motion. That it has played is kept for the session only.
//
// The build inlines it with Function.prototype.toString, so it has to stay
// self-contained: no imports, nothing referenced from outside its own body, and
// syntax that Safari 15.4 parses.
export function startIntro(win, doc) {
  var root = doc.documentElement;
  try {
    if (win.sessionStorage.getItem('luna_intro') || win.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    win.sessionStorage.setItem('luna_intro', 'played');
  } catch {
    return false;
  }
  root.classList.add('is-intro');
  // When it started, for the app to carry on from (App.jsx)
  win.__lunaIntro = win.performance.now();

  var inputs = ['pointerdown', 'keydown', 'wheel'];
  var end = function () {
    root.classList.remove('is-intro');
    inputs.forEach(function (type) {
      win.removeEventListener(type, end, true);
    });
  };
  inputs.forEach(function (type) {
    win.addEventListener(type, end, true);
  });

  // Ends when its last animation does: an element that arrived late with a slow
  // page finishes its entrance rather than jumping to the end
  win.setTimeout(function () {
    var running = doc.getAnimations ? doc.getAnimations().filter(function (animation) {
      return /^intro-/.test(animation.animationName || '');
    }) : [];
    Promise.all(running.map(function (animation) {
      return animation.finished;
    })).then(end, end);
  }, 1200);
  return true;
}
