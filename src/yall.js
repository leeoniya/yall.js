const doc = document;
const win = window;

const add = "add";
const rem = "remove";
const attr = "Attribute";
const setAttr = "set" + attr;
const remAttr = rem + attr;
const classList = "classList";
const evListener = "EventListener";
const remEv = rem + evListener;
const addEv = add + evListener;
const tagName = "tagName";
const dataset = "dataset";
const getBoundingClientRect = "getBoundingClientRect";
const _IntersectionObserver = "IntersectionObserver";
const _IntersectionObserverEntry = "IntersectionObserverEntry";
const intersectionRatio = "intersectionRatio";
const _MutationObserver = "MutationObserver";
const _requestIdleCallback = "requestIdleCallback";

const _data = "data-";

const evOpts = {passive: true};

function qsaEach(el, sel, fn) {
  var els = [].slice.call(el.querySelectorAll(sel));

  if (fn != null)
    els.forEach(fn);

  return els;
}

export function yall(userOpts) {
  // This function handles the lazy loading of elements. It's kicked off by the
  // scroll handlers/intersection observers further down.
  let yallLoad = function(element) {
    // Lazy load <img> elements
    if (element[tagName] === "IMG") {
      let parentElement = element.parentNode;

      // Is the parent element a <picture>?
      if (parentElement[tagName] === "PICTURE") {
        qsaEach(parentElement, "source", source => yallFlipDataAttrs(source));
      }

      yallFlipDataAttrs(element);
    }

    // Lazy load <video> elements
    if (element[tagName] === "VIDEO") {
      qsaEach(element, "source", source => yallFlipDataAttrs(source));

      // We didn't need this before, but with the addition of lazy loading
      // `poster` images, we need to run the flip attributes function on the
      // video element itself so we can trigger lazy loading behavior on those.
      yallFlipDataAttrs(element);

      if (element.autoplay) {
        element.load();
      }
    }

    // Lazy load <iframe> elements
    if (element[tagName] === "IFRAME") {
      element.src = element[dataset].src;
      element[remAttr](_data+"src");
    }

    // Lazy load CSS background images
    if (element[classList].contains(opts[lazyBackgroundClass])) {
      element[classList][rem](opts[lazyBackgroundClass]);
      element[classList][add](opts[lazyBackgroundLoaded]);
    }
  };

  // Added because there was a number of patterns like this peppered throughout
  // the code. This just flips all the data- attrs on an element (after checking
  // to make sure the data attr is in a whitelist to avoid changing *all* of them)
  let yallFlipDataAttrs = function(element) {
    for (let dataAttribute in element[dataset]) {
      if (acceptedDataAttributes.indexOf(`data-${dataAttribute}`) !== -1) {
        element[setAttr](dataAttribute, element[dataset][dataAttribute]);
        element[remAttr](`data-${dataAttribute}`);
      }
    }
  };

  // When intersection observer is unavailable, this function is bound to scroll
  // (and other) event handlers to load images the "old" way.
  let yallBack = function() {
    let active = false;

    if (!active && lazyElements.length > 0) {
      active = true;

      setTimeout(() => {
        lazyElements.forEach(lazyElement => {
          if (lazyElement[getBoundingClientRect]().top <= (win.innerHeight + opts[threshold]) && lazyElement[getBoundingClientRect]().bottom >= -(opts[threshold]) && getComputedStyle(lazyElement).display !== "none") {
            if (opts[idlyLoad] && idleCallbackSupport) {
              win[_requestIdleCallback](() => {
                yallLoad(lazyElement);
              }, idleCallbackOpts);
            } else {
              yallLoad(lazyElement);
            }

            lazyElement[classList][rem](opts[lazyClass]);
            lazyElements = lazyElements.filter(element => element !== lazyElement);
          }
        });

        active = false;

        if (lazyElements.length === 0 && !opts[observeChanges]) {
          eventsToBind.forEach(eventPair => eventPair[0][remEv](eventPair[1], yallBack, evOpts));
        }
      }, opts[throttleTime]);
    }
  };

  const intersectionObserverSupport = _IntersectionObserver in win && _IntersectionObserverEntry in win && intersectionRatio in win[_IntersectionObserverEntry].prototype;
  const mutationObserverSupport = _MutationObserver in win;
  const idleCallbackSupport = _requestIdleCallback in win;
  const ignoredImgAttributes = [_data+"src", _data+"sizes", _data+"media", _data+"srcset", "src", "srcset"];
  const acceptedDataAttributes = [_data+"src", _data+"sizes", _data+"media", _data+"srcset", _data+"poster"];
  const eventsToBind = [
    [doc, "scroll"],
    [doc, "touchmove"],
    [win, "resize"],
    [win, "orientationchange"]
  ];

  const lazyClass = "lazyClass";
  const lazyBackgroundClass = "lazyBackgroundClass";
  const lazyBackgroundLoaded = "lazyBackgroundLoaded";
  const throttleTime = "throttleTime";
  const idlyLoad = "idlyLoad";
  const idleLoadTimeout = "idleLoadTimeout";
  const threshold = "threshold";
  const observeChanges = "observeChanges";
  const observeRootSelector = "observeRootSelector";
  const mutationObserverOpts = "mutationObserverOptions";

  const opts = {};

  opts[lazyClass] = "lazy";
  opts[lazyBackgroundClass] = "lazy-bg";
  opts[lazyBackgroundLoaded] = "lazy-bg-loaded";
  opts[throttleTime] = 200;
  opts[idlyLoad] = false;
  opts[idleLoadTimeout] = 100;
  opts[threshold] = 200;
  opts[observeChanges] = false;
  opts[observeRootSelector] = "body";
  opts[mutationObserverOpts] = {
     childList: true
  };

  if (userOpts != null) {
    for (let key in userOpts)
      opts[key] = userOpts[key];
  }

  const selectorString = `img.${opts[lazyClass]},video.${opts[lazyClass]},iframe.${opts[lazyClass]},.${opts[lazyBackgroundClass]}`;
  const idleCallbackOpts = {
    timeout: opts[idleLoadTimeout]
  };

  let lazyElements = qsaEach(doc, selectorString);

  if (intersectionObserverSupport) {
    var intersectionListener = new win[_IntersectionObserver]((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting || entry[intersectionRatio] > 0) {
          let element = entry.target;

          if (opts[idlyLoad] && idleCallbackSupport) {
            win[_requestIdleCallback](() => yallLoad(element), idleCallbackOpts);
          } else {
            yallLoad(element);
          }

          element[classList][rem](opts[lazyClass]);
          observer.unobserve(element);
          lazyElements = lazyElements.filter(lazyElement => lazyElement !== element);
        }
      });
    }, {
      rootMargin: `${opts[threshold]}px 0%`
    });

    lazyElements.forEach(lazyElement => intersectionListener.observe(lazyElement));
  } else {
    eventsToBind.forEach(eventPair => eventPair[0][addEv](eventPair[1], yallBack, evOpts));
    yallBack();
  }

  if (mutationObserverSupport && opts[observeChanges]) {
    new win[_MutationObserver](mutations => mutations.forEach(() => {
      qsaEach(doc, selectorString, newElement => {
        if (lazyElements.indexOf(newElement) === -1) {
          lazyElements.push(newElement);

          if (intersectionObserverSupport) {
            intersectionListener.observe(newElement);
          } else {
            yallBack();
          }
        }
      });
    })).observe(doc.querySelector(opts[observeRootSelector]), opts[mutationObserverOpts]);
  }
}