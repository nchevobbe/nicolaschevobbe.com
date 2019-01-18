---
layout: post
title: "Firefox DevTools WebConsole 2018 retrospective"
date: 2019-01-17
---

<style>
  h2 {
    font-family: 'Abril Fatface', cursive;
    padding-left: 0;
    text-shadow: 2px 0 5px #2F3748;
  }

  h2::after {
    content: "";
    width: 100%;
    display: block;
    height: 30px;
    background-color: currentColor;
    transform: translateY(-50%);
    z-index: -1;
    position: relative;
  }

  h2#winter::after {
    background-image: linear-gradient(45deg, #E0F9FB, #63DCD3);
  }

  h2#spring::after {
    background-image: linear-gradient(45deg, #64D774, #5BCCDA);
  }

  h2#summer::after {
    background-image: linear-gradient(45deg, #4AB0F8, #5984F6);
  }

  h2#autumn::after {
    background-image: linear-gradient(45deg, #7376F6, #B54AEF);
  }

  video {
    max-width: 100%;
  }

  figure {
    border: none;
  }

  hr {
    width: 100%;
    border-top: 1px solid rgba(255, 255, 255, 0.2);
  }
</style>

In 2017, we rewrote and shipped the WebConsole frontend using React. But our work wasn't done, it was only the stepping stone for where we wanted the WebConsole to be: close the gap with Chrome and ship unique features that would make users more productive.

<video src="/images/posts_assets/2019-01-17/2018.mp4" alt="Screencast of 2018 ASCII art appearing in the console" autoplay=true muted=true loop=true/>

So join me for a tour of what happened in the console in 2018, and
what to expect in 2019.

## Winter

As said in the intro, we rewrote and shipped the new frontend by the end of 2017. But there was still a place where the old frontend was used: [the Browser Console](https://developer.mozilla.org/en-US/docs/Tools/Browser_Console).

The Browser Console gather all the messages spawned by the different tabs of a Firefox instance, WebExtension logs and messages from Firefox code itself (what's called `Chrome`, i.e. everything that is not a content page, not to be confused with the Chrome browser).

As you can imagine, this involves more work than only showing messages from one given place, which is why it didn't land at the same time as the "simple" WebConsole.

The old frontend had a hecka lot of tests that we couldn't simply dismiss. In 2017, we started a journey to evaluate and then remove or migrate all the existing tests in the codebase. This tasks continued in the beginning of 2018 for all the Browser Console tests and was __DONE__ by the end of Winter, with the help of a lot of colleagues from the DevTools team. Success!

With all the test migrated, and the Browser Console using the new frontend, we can now creates the most satisfying patch: delete the whole old-frontend codebase. Farewell!

## Spring

[Logan Smyth](https://twitter.com/loganfsmyth?lang=en), from the debugger team, made it so the console uses the information provided by sourcemaps to rewrite evaluated expression on the fly so they are still properly evaluated by the Javascript engine. Let's look at an example.
Say you have a `hello` variable, but your build/minification step renames it to `a`, you can now still do `console.log(hello)` and see the value of `hello`, even if, from a browser perspective, `hello` does not exist. Under the hood, we transform the expression to `console.log(a)` so you're still getting what you need.

---

Around the same time, [J. Ryan Stinnett](https://twitter.com/jryans?lang=en) is working on emitting CSS warnings only if the user has the CSS filter enabled. Those warnings can be very verbose and could affect the performance of our tools, so it made a lot of sense to only report them if the user wanted them.

---

Late May, we roll-out one of our most visible changes: the console input now has syntax highlighting, using a CodeMirror instance under the hood.

<figure>
  <video src="/images/posts_assets/2019-01-17/syntax_highlighting.mp4" alt="Screencast of syntax highlighting in the console" autoplay=true muted=true loop=true/>
  <figcaption>Jump to function declaration</figcaption>
</figure>

Doing this also required quite some refactoring through the summer, as most of our codebase assumed we were working with a simple HTML `<textarea>`, where we now have to integrate with CodeMirror <abbr>API</abbr>s.

---

On a smaller note, `console.timeLog` is [specced](https://console.spec.whatwg.org/#timelog) and implemented in Firefox. It allows the user to print intermediate measures for a given timer.
```
console.time("hello");
console.timeLog("hello", "1st measure");
console.timeLog("hello", "2nd measure");
console.timeEnd("hello", "final measure");
```

<figure>
  <img src="/images/posts_assets/2019-01-17/console_timeLog.png" alt="console.timeLog examples">
  <figcaption>`console.timeLog` is super handy to get multiple intermediate measures</figcaption>
</figure>

---

Another console API is also implemented, `console.countReset` ([See the spec](https://console.spec.whatwg.org/#countreset)). As indicated by its name, using it resets a given counter created with `console.count`.
```
console.count("cpt"); // cpt: 1
console.count("cpt"); // cpt: 2
console.count("cpt"); // cpt: 3
console.countReset("cpt"); // Resets the "cpt" counter
console.count("cpt"); // cpt: 1
```

<figure>
  <img src="/images/posts_assets/2019-01-17/console_countReset.png" alt="console.countReset example">
  <figcaption>`console.countReset`</figcaption>
</figure>

---

Finally, we add one more interaction with the Debugger. When logging a function, an icon is displayed after it so you can jump to its declaration and check out its content.

<figure>
  <video src="/images/posts_assets/2019-01-17/jump_definition.mp4" alt="Jump to definition screencast"  autoplay=true muted=true loop=true/>
  <figcaption>Jump to function declaration</figcaption>
</figure>

## Summer

The DevTools team wants to remove <abbr title="Graphic Command Line Interface">GCLI</abbr>, which is not used widely and relies on old technologies that will be removed of Firefox in the future (<a href="https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XUL"><abbr title="XML User Interface Language">XUL</abbr></a>). The GCLI exposed commands that user could run. The most used one was the `screenshot` command, which let you grab a part or the full view of a website, and save it to an image file on your disk.
As we did want to keep this feature for users who enjoyed it, we decided to migrate it in the console.
[Yulia Startsev](https://twitter.com/ioctaptceb) did most of the work here to deliver a `:screenshot` command, which you can read about in [this nice article by Eric Meyer](https://meyerweb.com/eric/thoughts/2018/08/24/firefoxs-screenshot-command-2018/).

This was a good opportunity to define what commands could look like in the WebConsole, and how to differentiate them from Javascript expression (hence the `:` at the beginning of those). We used it to create a second command, `:help` (previously existing as a JS `help()` function), that redirects the user to an MDN page listing all the existing helpers in the console.

---

As a follow-up of our syntax highlighting work, [Brian Grinstead](https://twitter.com/bgrins) lands a patch to add it to the expression, when it's displayed in the output.

<figure>
  <img src="/images/posts_assets/2019-01-17/syntax_highlighting.png" alt="Syntax highlighting in console"/>
  <figcaption>🌈🌈🌈🌈</figcaption>
</figure>

---

As we're revamping the console input experience, it makes sense to work on an essential feature of any code editor, the Autocomplete popup. We had a wide range of issues with it and tried our best to fix them all in order to make it less confusing:
  - We aligned its style with the rest of the UI, using the [Photon design system](https://design.firefox.com/photon/).
  - We tried to make it as fast as possible
  - We don't reverse the items anymore.
  - It's case insensitive.
  - It can be triggered with <kbd>[</kbd>.
  - User can force a completion using <kbd>Ctrl+Space</kbd>.
  - There is better heuristics for when to display it or not.
  - It displays javascript keywords (i.e. `var`, `function`, `for`, …).
  - It now works with `$_` and `$0`.

<figure>
  <img src="/images/posts_assets/2019-01-17/autocomplete_popup.png" alt="autocomplete popup in console input">
  <figcaption>Completion on `$0` with an opening bracket</figcaption>
</figure>

---

Last year a [Florens](https://twitter.com/fvsch) started doing awesome contributions to the whole DevTools codebase, with no exception to the console. They identified some visual flaws, misalignments and not-that-ideal colors in the output and came up with a wonderful fix for all those.

<figure>
  <img src="/images/posts_assets/2019-01-17/redesign.png" alt="New design in the console">
  <figcaption>Sharp!</figcaption>
</figure>

Thank you Florens for this terrific job!

---

<abbr title="Cross-origin resource sharing">CORS</abbr> is hard, and errors are legion. We rewrote some CORS error messages and added `Learn More` links next to it that point to MDN pages where you can get your head around what's going on.

<figure>
  <img src="/images/posts_assets/2019-01-17/cors_learn_more.png" alt="Learn More link in CORS error messages">
  <figcaption>Direct access to the infinite knowledge of MDN</figcaption>
</figure>

## Autumn

Well rested from our Summer holidays, we can now full-steam ahead.

One of the biggest complain we had about the Console was that it's input was small and at the very bottom of the screen, even if the output was empty.

<figure>
  <img src="/images/posts_assets/2019-01-17/old_console.png" alt="Screenshot of the console where the input is at the very bottom of the screen, even if there's nothing in the output">
  <figcaption>Wasted space!</figcaption>
</figure>

Sure it was always focused, and entering multiline expressions would make it grow, but maybe it wasn't obvious and made people angrily clicking this tiny target.
To address that, we implemented a terminal-like UI, where the input takes as much height as it can, and shrinks as the output gets filled-in.

<figure>
  <img src="/images/posts_assets/2019-01-17/in-line.png" alt="Screenshot of the console where the input takes the whole available vertical space">
</figure>

We didn't want to go all the way into Chrome direction though. There, the console input is alway _after_ all the messages, meaning that if you scroll up, you can see it anymore (even though it's still focused and a keystroke will get you back to it). Our design make it so the input is always visible, so even if you scrolled way backup to look for an object shape, the input is always at sight for you to interact with it.

<figure>
  <img src="/images/posts_assets/2019-01-17/sticky.png" alt="Screenshot of the console where the input is stuck at the bottom of the screen when the output is scrolled up">
  <figcaption>The input is always visible, and expands if needed</figcaption>
</figure>

---

Since we were going terminal-like, we thought why not implementing one of the most useful feature a terminal can offer: reverse history search. So you can now do F9 or (Ctrl+R on OSX) to display a search field that will look into your commands history. Retrieving that so-cool 1-month-old snippet is now blazingly fast.

<figure>
  <video src="/images/posts_assets/2019-01-17/reverse-search.mp4" alt="Screencast Reverse Search UI in the console" autoplay=true muted=true loop=true/>
  <figcaption>This is something I wanted for ages</figcaption>
</figure>

Finding a good shortcut to trigger the UI was surprisingly hard. Since we wanted the browser shortcut to still work (e.g. on Windows, Ctrl+R reloads the page), we had to look for the leftovers, which left us with F9. We're working on putting a button in the UI to toggle it so it's more discoverable than it is today.

---

Closing the gap with Chrome DevTools meant implementing top-level await expression support. At the moment, `await` expression are only valid in async functions and generators (even if [there's a tc39 proposal to change that](https://github.com/tc39/proposal-top-level-await)). So we had to be creative in order to support it in the console. [Jason Laster](https://twitter.com/jasonlaster11) kick-off and lands a first version, that then motivated me in pushing it other the finish line.

<figure>
  <video src="/images/posts_assets/2019-01-17/await.mp4" alt="Screencast of top-level await expressions being evaluated in the console"  autoplay=true muted=true loop=true/>
  <figcaption>`await` <abbr title="For The Win">FTW</abbr></figcaption>
</figure>

It's a great feature to have in order to quickly prototype in the console.

---

`console.trace` is super useful when you need to know from where a given function was called. But it could be a bit hard to tell at a first glance from where the stacktrace printed on your screen came from. Also, you may need additional information like the value of the parameters or variable, which previously required people to simply drop an additional `console.log` to get those. We made it so that `console.trace` now takes multiple arguments, so you can save the superflous `console.log`.

<figure>
  <img src="/images/posts_assets/2019-01-17/console_trace.png" alt="console.trace calls with multiple arguments">
  <figcaption>No need for an extra console.log now</figcaption>
</figure>

---

In Spring, we had a work week in Paris with [Jason Laster](https://twitter.com/jasonlaster11) and [Patrick Brosset](https://twitter.com/patrickbrosset), and one of the main theme was to evaluate what it would take for the console to re-use the awesome callstack component used in the Debugger. The Debugger community built this callstack where all successive framework/library frames are grouped, and collapsed, so the user has a shorter stack trace to look at, highlighting the app code, not the framework one.

As always, the initial implementation is easy, but the devil's in the detail, and they were many things to think about, mainly because the design of the debugger call stack panel, and what we wanted the console stack trace to look like are quite different. Also, this stacktrace component should be used everywhere we possibly show traces (`console.trace`, exceptions and error objects), and handle sourcemap. This led us to fix one last standing issue we had with them in the console (not using them for logged Error object), which is great because we now honor sourcemap everywhere, and people using build steps should have a better time working with our tools.

<figure>
  <video src="/images/posts_assets/2019-01-17/smart_trace.mp4" alt="Screencast of smart callstack in the console" autoplay=true muted=true loop=true/>
  <figcaption>Focus is on _your_ code</figcaption>
</figure>

---

Getters are widely supported in browsers and heavily used in frameworks like vue.js for computed properties. When inspected in DevTools, getters reference their function, not the return value. This is because we can't evaluate anything on your behalf, since it may cause side-effects on your page/app (for example if you're modifying a state in the getter, or adding a class to a DOM element). But at least, we can provide a way for the user to invoke the getter in order to get the return value.

<figure>
  <video src="/images/posts_assets/2019-01-17/invoke_getter.mp4" alt="Screencast of getter being invoked in the console" autoplay=true muted=true loop=true/>
  <figcaption>At last!</figcaption>
</figure>

## 2019

Pheew, 2018 was quite a ride. I think we are now seeing the result of all of our 2016 & 2017 hard work, which makes us work on features more efficiently.

As we start the new year, we already have 2 feature in mind for the first half of the year.

The first one is grouping warning messages from the same category. We know some warnings can be verbose and clutter the console, making the user **not** pay attention to those. So we are going to identify those messages and group them, while trying to find a way for the user to be notified.

The second one is to revive the old-trusty Firebox Editor mode. Basically, we want the console input to feel more like a playground, with more room to play with it. The editor will probably be on the left side on the screen, with the output on the right, and won't clear on execution so one can quickly iterate writing a code snippet.

There's also other ideas floating around, like how to ease the communication with other tools (and more specifically the debugger), but nothing clear yet.

If you are thinking of a feature that might benefit the console users, please reach us on Twitter ([@FirefoxDevTools](https://twitter.com/FirefoxDevTools)).

Thanks for sticking with me on this lengthy post, and let's all have a great 2019 year :)