/**
 * yall.js (v2.2.0)
 * Yet Another Lazy loader
 * https://github.com/malchata/yall.js
 **/

(function (exports) {
  'use strict';

  var doc = document;
  var win = window;

  var add = "add";
  var rem = "remove";
  var attr = "Attribute";
  var setAttr = "set" + attr;
  var remAttr = rem + attr;
  var classList = "classList";
  var evListener = "EventListener";
  var remEv = rem + evListener;
  var addEv = add + evListener;

  var evOpts = {passive: true};

  function qsaEach(el, sel, fn) {
  	var els = [].slice.call(el.querySelectorAll(sel));

  	if (fn != null)
  		{ els.forEach(fn); }

  	return els;
  }

  function yall(userOptions) {
    // This function handles the lazy loading of elements. It's kicked off by the
    // scroll handlers/intersection observers further down.
    var yallLoad = function(element) {
      // Lazy load <img> elements
      if (element.tagName === "IMG") {
        var parentElement = element.parentNode;

        // Is the parent element a <picture>?
        if (parentElement.tagName === "PICTURE") {
          qsaEach(parentElement, "source", function (source) { return yallFlipDataAttrs(source); });
        }

        yallFlipDataAttrs(element);
      }

      // Lazy load <video> elements
      if (element.tagName === "VIDEO") {
        qsaEach(element, "source", function (source) { return yallFlipDataAttrs(source); });

        // We didn't need this before, but with the addition of lazy loading
        // `poster` images, we need to run the flip attributes function on the
        // video element itself so we can trigger lazy loading behavior on those.
        yallFlipDataAttrs(element);

        if (element.autoplay === true) {
          element.load();
        }
      }

      // Lazy load <iframe> elements
      if (element.tagName === "IFRAME") {
        element.src = element.dataset.src;
        element[remAttr]("data-src");
      }

      // Lazy load CSS background images
      if (element[classList].contains(options.lazyBackgroundClass)) {
        element[classList][rem](options.lazyBackgroundClass);
        element[classList][add](options.lazyBackgroundLoaded);
      }
    };

    // Added because there was a number of patterns like this peppered throughout
    // the code. This just flips all the data- attrs on an element (after checking
    // to make sure the data attr is in a whitelist to avoid changing *all* of them)
    var yallFlipDataAttrs = function(element) {
      for (var dataAttribute in element.dataset) {
        if (acceptedDataAttributes.indexOf(("data-" + dataAttribute)) !== -1) {
          element[setAttr](dataAttribute, element.dataset[dataAttribute]);
          element[remAttr](("data-" + dataAttribute));
        }
      }
    };

    // When intersection observer is unavailable, this function is bound to scroll
    // (and other) event handlers to load images the "old" way.
    var yallBack = function() {
      var active = false;

      if (active === false && lazyElements.length > 0) {
        active = true;

        setTimeout(function () {
          lazyElements.forEach(function (lazyElement) {
            if (lazyElement.getBoundingClientRect().top <= (win.innerHeight + options.threshold) && lazyElement.getBoundingClientRect().bottom >= -(options.threshold) && getComputedStyle(lazyElement).display !== "none") {
              if (options.idlyLoad === true && idleCallbackSupport === true) {
                requestIdleCallback(function () {
                  yallLoad(lazyElement);
                }, idleCallbackOptions);
              } else {
                yallLoad(lazyElement);
              }

              lazyElement[classList][rem](options.lazyClass);
              lazyElements = lazyElements.filter(function (element) { return element !== lazyElement; });
            }
          });

          active = false;

          if (lazyElements.length === 0 && options.observeChanges === false) {
            eventsToBind.forEach(function (eventPair) { return eventPair[0][remEv](eventPair[1], yallBack, evOpts); });
          }
        }, options.throttleTime);
      }
    };

    var intersectionObserverSupport = "IntersectionObserver" in win && "IntersectionObserverEntry" in win && "intersectionRatio" in win.IntersectionObserverEntry.prototype;
    var mutationObserverSupport = "MutationObserver" in win;
    var idleCallbackSupport = "requestIdleCallback" in win;
    var acceptedDataAttributes = ["data-src", "data-sizes", "data-media", "data-srcset", "data-poster"];
    var eventsToBind = [
      [doc, "scroll"],
      [doc, "touchmove"],
      [win, "resize"],
      [win, "orientationchange"]
    ];

    var options = {
      lazyClass: "lazy",
      lazyBackgroundClass: "lazy-bg",
      lazyBackgroundLoaded: "lazy-bg-loaded",
      throttleTime: 200,
      idlyLoad: false,
      idleLoadTimeout: 100,
      threshold: 200,
      observeChanges: false,
      observeRootSelector: "body",
      mutationObserverOptions: {
        childList: true
      },
    };

    if (userOptions != null) {
      for (var key in userOptions)
        { options[key] = userOptions[key]; }
    }

    var selectorString = "img." + (options.lazyClass) + ",video." + (options.lazyClass) + ",iframe." + (options.lazyClass) + ",." + (options.lazyBackgroundClass);
    var idleCallbackOptions = {
      timeout: options.idleLoadTimeout
    };

    var lazyElements = qsaEach(doc, selectorString);

    if (intersectionObserverSupport === true) {
      var intersectionListener = new IntersectionObserver(function (entries, observer) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting === true || entry.intersectionRatio > 0) {
            var element = entry.target;

            if (options.idlyLoad === true && idleCallbackSupport === true) {
              requestIdleCallback(function () { return yallLoad(element); }, idleCallbackOptions);
            } else {
              yallLoad(element);
            }

            element[classList][rem](options.lazyClass);
            observer.unobserve(element);
            lazyElements = lazyElements.filter(function (lazyElement) { return lazyElement !== element; });
          }
        });
      }, {
        rootMargin: ((options.threshold) + "px 0%")
      });

      lazyElements.forEach(function (lazyElement) { return intersectionListener.observe(lazyElement); });
    } else {
      eventsToBind.forEach(function (eventPair) { return eventPair[0][addEv](eventPair[1], yallBack, evOpts); });
      yallBack();
    }

    if (mutationObserverSupport === true && options.observeChanges === true) {
      new MutationObserver(function (mutations) { return mutations.forEach(function () {
        qsaEach(doc, selectorString, function (newElement) {
          if (lazyElements.indexOf(newElement) === -1) {
            lazyElements.push(newElement);

            if (intersectionObserverSupport === true) {
              intersectionListener.observe(newElement);
            } else {
              yallBack();
            }
          }
        });
      }); }).observe(doc.querySelector(options.observeRootSelector), options.mutationObserverOptions);
    }
  }

  exports.yall = yall;

}((this.window = this.window || {})));
