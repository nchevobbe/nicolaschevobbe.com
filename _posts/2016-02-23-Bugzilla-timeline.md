---
layout: post
title: "Bugzilla Timeline"
date: 2016-02-23
---
Today I'm introducing <a href="http://nchevobbe.github.io/bugzilla-timeline/">Bugzilla Timeline</a> :

<figure>
<img src="http://nicolaschevobbe.com/images/bz-timeline.gif" alt="Bugzilla Timeline">
<figcaption>Bugzilla Timeline</figcaption>
</figure>

If you follow me, you know that I challenged myself to fix one bug a week on the Firefox devtools for the whole 2016 year. To keep an eye of how this was going, I built a little dashboard, showing my assigned bugs and if they're resolved or pending.<br>

<p data-height="268" data-theme-id="12994" data-slug-hash="yebMxM" data-default-tab="result" data-user="nchevobbe" class='codepen'>See the Pen <a href='http://codepen.io/nchevobbe/pen/yebMxM/'>2016 Challenge on Firefox Devtools : Bugzilla Timeline</a> by Nicolas Chevobbe (<a href='http://codepen.io/nchevobbe'>@nchevobbe</a>) on <a href='http://codepen.io'>CodePen</a>.</p>
<script async src="//assets.codepen.io/assets/embed/ei.js"></script>

I enjoyed working on it, and it turns out, some people in the devtools team quite liked it too. Julian Descottes pinged me on IRC to say it was cool, and Patrick Brosset, which is a manager of said team, even mentionned it during one of their meeting. It pushes me to build a simple configurable version in order to let every mozillians have a glimpse of what their timeline lokks like.

<h2>What you can do with it</h2>

<h3>Configurable</h3>

You can enter your email into the dedicated form, or just go to [http://nchevobbe.github.io/bugzilla-timeline/?email=youremail@email.com](http://nchevobbe.github.io/bugzilla-timeline/?email=chevobbe.nicolas@gmail.com)

<h3>Timeline navigation</h3>

<img src="http://nicolaschevobbe.com/images/bz-timeline-nav.gif" alt="Bugzilla Timeline year navigation">

You can navigate through your timeline, from year to year, starting 1998 ( Bugzilla's date of creation, I did not know it had been around for so long ). You can do this by clicking the buttons in the header, or using the navigation keys on the keyboard. If there are lots of bugs to display, it may no fit in the screen, so you can go down with the arrow key too.


<h3>Cmd/Ctrl + click on bug line</h3>

Cmd/Ctrl + click on a bug line open the bugzilla page for the clicked bug

<h3>Bug detail</h3>

A click on a bug line triggers the Detail view. It shows the changes that occured on the bug, and displays a timeline of the bug lifetime.

<h2>Backstory</h2>

<a href="https://sarasoueidan.com/">Sara Soueidan</a>, whom I follow on Twitter, is advocating SVG real hard. So hard that after seeing her conference at ffconf in Brighton, I really wanted to give it a try. This timeline vizualisation tool looked like a good use case to get my hands dirty. But it ended up to teach me a lot more. Let's see.


<h3>SVG</h3>
Fun fact : I first hear of SVG ( and SMIL ) during my first year of master's degree in college, in 2008. The browser support was awful, and we had to run SMIL animations in Real Media Player. Back then, I did not saw any interests in it : why bother write XML markup to draw, when you just have to open Photoshop and do it in a better user-friendly way ?

Fast forward, nowadays SVG support is much more better, you can produce it with a myriad of softwares, and the most important to me, you can write it directly with Javascript.

In the early days, I struggled to understand the basics of SVG, and Sara Soueidan's article were very helpful ( [https://sarasoueidan.com/blog/svg-coordinate-systems/](https://sarasoueidan.com/blog/svg-coordinate-systems/) ), for understanding how the viewBox attribute works.


<h3>Animation ( rAF )</h3>

Writing SVG dynamically is pretty cool, but it's even cooler to animate it ! In order to navigate from year to year, I update the viewBox ```start``` attribute so it shows the relevant bugs for the year.
I was able to use requestAnimationFrame in order to animate the viewBox attribute for a given duration.

```
function panViewBox(toX, duration){
  //Get the starting x position
  let xStart = svg.viewBox.baseVal.x;

  //Get the x position at the end of the animation
  let xDelta = svg.viewBox.baseVal.x - toX;

  let start;
  let pan = function(timestamp ){
    if (!start){
      start = timestamp
    };
    //Gives a percentage of completion of the animation ( between 0 and 1 )
    let t = (timestamp - start)/duration;
    if (t <= 1) {
      //Moving the viewBox relatively to the current percentage of completion
      svg.viewBox.baseVal.x = xStart - (xDelta  * t);
      requestAnimationFrame(pan);
    } else {
      //Animation is over, make sure we set the x position to what we want
      svg.viewBox.baseVal.x = toX;
    }
  }
  requestAnimationFrame(pan);
}
```
I even added a [simple easing function](https://gist.github.com/gre/1650294) to it, to make it feels a little less robotic.

<h3>Fetch</h3>

Fetch is kind of a new, polished, promise-based version of Ajax. I'm using it here to query the Bugzilla API ( [which has a nice documentation](http://bugzilla.readthedocs.org/en/latest/api/core/v1/) ). Here's how I used it :

```
var url = `${BUGZILLA_API_URL}bug?${searchParams}`;
var myHeaders = new Headers();
myHeaders.append('Accept', 'application/json');

fetch(url, {
  mode: 'cors',
  method: 'GET',
  headers: myHeaders
})
.then((response) => response.json())
```
Pretty neat in comparison with what I should have done using ```XMLHttpRequest```.
You can read more about fetch in Jake Archibald's blog : [https://jakearchibald.com/2015/thats-so-fetch/](https://jakearchibald.com/2015/thats-so-fetch/)

<h3>Github pages</h3>

I knew that Github provided a way to host static pages. As my app is only using HTML, CSS and Javascript, it was a perfect match for it. The process is quite simple, in you Git repository you create an orphan branch named "gh-pages". After that, you can put whatever you want in it. All I have to do is to merge my master branch to it and push it to Github. And that's it, free, painless hosting for the application. You can even make Travis automatically push master changes to the gh-pages branch.

<h2>Now what ?</h2>

The code is hosted on github : [https://github.com/nchevobbe/bugzilla-timeline](https://github.com/nchevobbe/bugzilla-timeline) and [I already filed some issues](https://github.com/nchevobbe/bugzilla-timeline/issues) I want to work on to improve the app.
As I am not very familiar with Bugzilla though, there might be some edge cases that the app don't handle well. If so, feel free to file an issue or a PR.







