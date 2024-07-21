---
layout: post
title: "Theme-aware styled console logs"
date: 2024-07-21
---

<style>
    .console-output {
        --l: 50%;
        --dark-l: 90%;

        --comp-light: oklch(var(--l) 0.15 100);
        --comp-dark:  oklch(var(--dark-l) 0.15 100);

        --console-dark-bg: #232327;

        color:  light-dark(rgb(12 12 13), rgb(240 240 239));
        background-color: light-dark(rgb(255 255 255), var(--console-dark-bg));

        padding: 0.5em 1em;
        border: 2px solid rgb(from var(--accent-color) r g b / 0.5);

        &.light {
            color-scheme: light;
        }
        &.dark {
            color-scheme: dark;
        }

        .comp {
            color: var(--comp-dark);
        }
        
        &.solution-1 .comp {
            background-color: var(--console-dark-bg);
        }
        &.solution-2 .comp {
            color: light-dark(var(--comp-light), var(--comp-dark));
        }
    }
</style>

Did you know that you can style console logs ? Using `%c` and some CSS so you can make some logs pop out more than others, or highlight specific parts of it:
<pre>
<code>
console.log(
    "%c[MyComponent]%c Hello",
    "color: oklch(90% 0.15 100)",
    "",
)
</code>
</pre>

The snippet above will display a console messages like the one below: 

<p class="console-output dark"><span class="comp">[MyComponent]</span> Hello</p>

<aside>Learn more about styling console logs on <a href="https://developer.mozilla.org/en-US/docs/Web/API/console#styling_console_output">MDN</a></aside>

The colors that I picked here are working great against a dark background. But here's what it looks like if my DevTools are using a light theme:

<p class="console-output light"><span class="comp">[MyComponent]</span> Hello</p>

The text is barely visible and definitely not accessible.

## A naive fix

On top of the custom color we set, we could also set a background color so the text will always be legible:

<pre>
<code>
console.log(
    "%c[MyComponent]%c Hello",
    `color: oklch(90% 0.15 100); 
     background-color: #232327;`,
    "",
)
</code>
</pre>

This does fix the contrast issue, but that's not really the look I was looking for

<p class="console-output solution-1 light"><span class="comp">[MyComponent]</span> Hello</p>

<hr>

This was basically the issue that Tooru Fujisawa (aka Arai), a colleague of mine at Mozilla, asked me about a few days back. They wanted to get some nice looking logs that would adapt to both light and dark background, but couldn't find a way to do so. I already got the same question in the past, and I used to tell people that such thing was't possible. But since the last time I had to think about it, something new was added to the platform that is making this an easy fix.

## A better solution

`light-dark()` was added at the end of last year in Firefox (120), and a couple months ago in Chrome (123) and Safari (17.5), so it's now available in the latest version of all major browser engines. 

This function takes two color parameters, and return the first one for light color scheme, and the second one for dark color scheme. For example, if we have `color: light-dark(blue, red)`, the color will be blue in light mode, and red in dark mode (this is a bit simplified, you can read more about it on [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark)).

Back to our styled console messages, we can use `light-dark()` as a way to adapt to the console theme:

<pre>
<code>
console.log(
    "%c[MyComponent]%c Hello",
    `color: light-dark(
        /* for light theme */
        oklch(50% 0.15 100), 
        /* for dark theme */
        oklch(90% 0.15 100)
    )`,
    "",
)
</code>
</pre>

Now it looks great in both dark and light theme:

<p class="console-output solution-2 dark"><span class="comp">[MyComponent]</span> Hello</p>
<p class="console-output solution-2"><span class="comp">[MyComponent]</span> Hello</p>

And this works nicely across all browsers and can even be used in [Custom Formatters](https://firefox-source-docs.mozilla.org/devtools-user/custom_formatters/index.html).

<figure>
<img src="/images/posts_assets/2024-07-21/light-dark.png" alt="Firefox, Chrome  and Safari consoles, on both light and dark mode arranged in a grid, showing a single log: 'MyComponent Hello'. MyComponent has a yellow-ish color which is lighter in dark mode and keep a good contrast">
<figcaption>From top to bottom: Firefox, Chrome, Safari</figcaption>
</figure>

## Final note on `light-dark()`

You may have noticed that in my example, only the lightness of the color changes between the light (50%) and the dark one (90%). So it felt like we could do something like this instead: `oklch(light-dark(50%, 90%) 0.15 100))`, so we don't have to repeat all the values.
Unfortunately this doesn't work, as `light-dark()`can only return a color. [Bramus wrote a blog post](https://www.bram.us/2023/10/09/the-future-of-css-easy-light-dark-mode-color-switching-with-light-dark/#schemed-value) explaning why the function was designed that way and what we coud have in the future.