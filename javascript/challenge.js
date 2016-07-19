const COLORS = ["rgb(244, 67, 54)","rgb(0, 150, 136)","rgb(96, 125, 139)","rgb(156, 39, 176)","rgb(103, 58, 183)","rgb(63, 81, 181)","rgb(33, 150, 243)","rgb(3, 169, 244)","rgb(0, 188, 212)","rgb(76, 175, 80)","rgb(139, 195, 74)","rgb(255, 193, 7)","rgb(255, 152, 0)","rgb(255, 87, 34)","rgb(233, 30, 99)","rgb(121, 85, 72)"];
var userColor = {};
var timelineSvg = document.querySelector('svg.timeline');
var chartSvg = document.querySelector('svg.chart');

let currentTooltipTarget;
let tooltipEl = document.createElement("div");
tooltipEl.classList.add("tooltip");
document.body.appendChild(tooltipEl);
let tooltipHideId;

const jan4 = new Date('2016-01-04');
const X_PADDING = 17;
const LINE_HEIGHT = 9;
const MILLISECOND_A_DAY = (1000*60*60*24);
const BUGZILLA_API_URL = 'https://bugzilla.mozilla.org/rest/';
const EMAIL = 'chevobbe.nicolas@gmail.com';
const PRIORITY_REGEX = /^P[1-5]$/;
const DETAIL_PADDING = 15;

const HOLIDAYS = [{
  name: 'Skiing',
  start : new Date('2016-01-16'),
  end: new Date('2016-01-23')
},{
  name: '#MozLondon',
  start : new Date('2016-06-13'),
  end: new Date('2016-06-18')
}];

drawHolidays();

var lanes = [];
var bugs = [];


timelineSvg.addEventListener('mousemove', onMouseMove, false);

const today = new Date();
const weekNumber = Math.ceil((today - jan4)/MILLISECOND_A_DAY/7);
const todayNumber = ((today - jan4)/MILLISECOND_A_DAY);

var fetchSources = [fetchBugzilla(), fetchGithub()];

Promise.all(fetchSources).then(function(res){
  var bugzillaData = res[0];

  let bzBugs = bugzillaData.filter(function(x){
    if(!x.cf_last_resolved){
      return true;
    }

    return (new Date(x.cf_last_resolved) >= jan4);
  });


  let ghPR = res[1].filter(function(prData){
    return prData.user.login === "nchevobbe";
  });

  let bugs = bzBugs.concat(ghPR);

  plotChart(bugs);

  bugs.sort(function(a, b){
    var priorityA = (PRIORITY_REGEX.test(a.priority)?a.priority:'P3');
    var priorityB = (PRIORITY_REGEX.test(b.priority)?b.priority:'P3');
    // "a" and "b" are in the same state ( both resolved, or both unresolved)
    // we want to get the higher priority bugs first
    if(priorityA != priorityB){
      return priorityA < priorityB ? -1:1;
    }

    // "a" and "b" have the same priority
    // We want to get the older bugs first
    return a.creation_time < b.creation_time ? -1 : 1;
  });

  return bugs.reduce(function(previousBugPromise, bug, idx){
    return new Promise(function(resolve, reject){
      var historyPromise;

      if(bug.bugType === "BZ"){
        historyPromise = getBugHistory(bug).then(function(history){
          bug.history = history;

          // A bug is being worked on by the user when :
          // - creates the bug
          // - changes the bug
          // - is cc'ed on the bug
          // - is assigned on the bug
          bug.history.some(function(activity){

            var hasAssignement = (activity.who === EMAIL);
            if(!hasAssignement){
              activity.changes.some(function(change){
                return (
                  (
                    change.field_name === 'cc' ||
                    change.field_name === 'assigned_to'
                  ) && change.added === EMAIL
                );
              });
            }

            if(hasAssignement === true){
              bug.startDate = new Date(activity.when);
              return true;
            }
          });

          if(!bug.startDate && bug.assigned_to === EMAIL){
            bug.startDate = new Date(bug.creation_time);
          }


          if(bug.cf_last_resolved){
            bug.endDate = new Date(bug.cf_last_resolved);
          } else {
            bug.endDate = new Date();
          }

          return Promise.resolve(bug);
        });
      } else if( bug.bugType === "GH") {
        historyPromise = Promise.resolve(bug);
      }


      var promises = [historyPromise, previousBugPromise];
      Promise.all(promises).then(function(data){
        let retrievedBugs = data[promises.indexOf(previousBugPromise)];
        let bug = data[promises.indexOf(historyPromise)];
        let idx = bugs.findIndex((item) => item.id === bug.id);
        if(idx != -1){
          bugs[idx] = bug;
        }
        drawBug(bug);
        resolve(retrievedBugs.concat(bug));
      });
    });
  }, Promise.resolve([]))
  .catch((e) => console.error(e));
})
.then(function(data){
  bugs = data;

  updateDashboard(bugs);
  drawWeeks(bugs);
})
.catch((e) => console.error(e));

function getUrlParamsString(params) {
  var str;

  if(window.URLSearchParams){
    var searchParams = new URLSearchParams();

    Object.keys(params).forEach(function(key){
      searchParams.append(key, params[key]);
    });
    str = searchParams.toString();
  } else {
    var searchParams = [];
    Object.keys(params).forEach(function(key){
      searchParams.push(key+"="+params[key]);
    });
    str = searchParams.join('&');
  }

  return str;
}

function fetchBugzilla(){
  var ignoredBugs = [1272460, 1270166, 1272452, 1272456, 1285672, 1287508];
  var searchParams = getUrlParamsString({
    "include_fields": "id,summary,status,cf_last_resolved,target_milestone,creation_time,resolution,assigned_to,priority,resolution",
    "email1": EMAIL,
    "resolution": "FIXED",
    "emailassigned_to1":1
  });

  var url = `${BUGZILLA_API_URL}bug?${searchParams}`;
  var myHeaders = new Headers();
  myHeaders.append('Accept', 'application/json');

  return fetch(url, {
    mode: 'cors',
    method: 'GET',
    headers: myHeaders
  })
  .then((response) => response.json())
  .then((json) => {
    return json.bugs.map((item) => {
      item.bugType = "BZ";
      return item;
    }).filter((item) => ignoredBugs.indexOf(item.id) === -1)
  });
}

function fetchGithub(){

  var searchParams = getUrlParamsString({
    "state": "closed",
    "base": "console-frontend",
    "sort": "updated",
    "per_page":200
  });
  var url = `https://api.github.com/repos/devtools-html/gecko-dev/pulls?${searchParams}`;
  var myHeaders = new Headers();
  myHeaders.append('Accept', 'application/vnd.github.v3+json');

  return fetch(url, {
    mode: 'cors',
    method: 'GET',
    headers: myHeaders
  })
  .then((response) => response.json())
  .then((json) => {
    return json.map((item) => {
      item.assign_time = item.created_at;
      item.startDate = new Date(item.created_at);
      item.endDate = new Date(item.merged_at);
      item.id = "gh-" + item.id;
      item.bugType = "GH";
      return item;
    })
    .filter((item) => {
      return (item.merged_at !== null);
    });
  });
}

function getBugHistory(bugData){
  var myHeaders = new Headers();
  myHeaders.append('Accept', 'application/json');
  var url = `${BUGZILLA_API_URL}bug/${bugData.id}/history`;
  return fetch(url, {
    mode: 'cors',
    method: 'GET',
    headers: myHeaders
  })
  .then((response) => response.json())
  .then(function(data){
    data.bugs[0].history.some(function(activity){
      var hasAssignement = activity.changes.some(function(change){
        return (change.field_name === 'assigned_to' && change.added === EMAIL);
      });
      if(hasAssignement === true){
        bugData.assign_time = activity.when;
        return true;
      }
    });
    if(!bugData.assign_time && bugData.assigned_to == EMAIL){
        bugData.assign_time = bugData.creation_time;
    }
    return data.bugs[0].history;
  }).catch((e) => console.error(e));
}

function drawBug(bug){
  if(bug.assign_time !== null ){
    var strokeWidth = 2;
    var endCircleR = 1.75;
    var minMultiplier = 0.25;
    var maxMultiplier = 1.75;

    if(PRIORITY_REGEX.test(bug.priority)){
      var priorityRatio = minMultiplier + ((((-1.25/5) * bug.priority[1]) + 1.25) * (maxMultiplier - minMultiplier));
      strokeWidth = strokeWidth * priorityRatio;
      endCircleR = endCircleR * priorityRatio;
    }

    var id = bug.id;
    if(id.startsWith && id.startsWith("gh")){
      id = id.replace("gh-","");
    }
    var colorIndex = (id % (COLORS.length - 1));
    var bugColor = COLORS[colorIndex];
    var startDayNumber = 0;
    if(new Date(bug.assign_time) > jan4){
      startDayNumber = (new Date(bug.assign_time) - jan4)/MILLISECOND_A_DAY;
    }

    var endDate = bug.endDate;
    if(!endDate){
      endDate = new Date(bug.cf_last_resolved);
    }
    var endDayNumber = ((endDate - jan4)/MILLISECOND_A_DAY);

    var startPoint = X_PADDING + startDayNumber;
    var endPoint = X_PADDING + endDayNumber;
    var laneNumber = findLane(startPoint,endPoint);

    if(!lanes[laneNumber]){
      lanes[laneNumber] = [];
    }
    lanes[laneNumber].push([startPoint,endPoint]);
    var y = (laneNumber + 1 ) * LINE_HEIGHT;
    var bugGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    bugGroup.classList.add('bug-line');
    bugGroup.setAttribute('data-tooltip',
        `Bug ${bug.id}
        ${PRIORITY_REGEX.test(bug.priority)?" [" + bug.priority + "]":""}
        <hr>
        ${bug.summary || bug.title}`);
    bugGroup.setAttribute('data-bug-id', bug.id);

    if(bug.bugType === "GH" || (bug.bugType == "BZ" && bug.cf_last_resolved && bug.resolution == 'FIXED')){
      var endCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      endCircle.classList.add('resolved');
      endCircle.setAttribute('cx',endPoint);
      endCircle.setAttribute('cy', y);
      endCircle.setAttribute('r', endCircleR);
      endCircle.setAttribute('fill', bugColor);

      bugGroup.appendChild(endCircle);
    }

    var assignStartDayNumber = ((new Date(bug.assign_time) - jan4)/MILLISECOND_A_DAY);
    var assignStartPoint = X_PADDING + assignStartDayNumber;

    var bugAssignedLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    bugAssignedLine.setAttribute('x1', assignStartPoint);
    bugAssignedLine.setAttribute('y1', y);
    bugAssignedLine.setAttribute('x2', endPoint);
    bugAssignedLine.setAttribute('y2', y);
    bugAssignedLine.setAttribute('stroke', bugColor);
    bugAssignedLine.setAttribute('stroke-width', strokeWidth);
    bugAssignedLine.setAttribute('stroke-linecap', "round");

    bugGroup.appendChild(bugAssignedLine);

    timelineSvg.appendChild(bugGroup);
  }
}

function plotChart(bugs){
  var displayedSvg;
  if(document.getElementById("input-timeline").checked) {
    displayedSvg = timelineSvg;
  } else {
    displayedSvg = chartSvg;
  }

  var matrix = displayedSvg.getScreenCTM();
  var inverseMatrix = matrix.inverse();

  var rect = displayedSvg.getBoundingClientRect();
  var position = displayedSvg.createSVGPoint();
  position.x = 0;
  position.y = rect.bottom;

  var correctZeroPosition = position.matrixTransform(inverseMatrix);
  var increment = correctZeroPosition.y / 100;

  var extraGoalLine = createSVGElement("line", {
    x1: getPositionFromDate(jan4),
    y1: correctZeroPosition.y,
    x2: getPositionFromDate(new Date("2017-01-02")),
    y2: 0,
    stroke: "#36f475",
    opacity: 0.5,
    "stroke-width": 0.25
  });

  var goalLine = createSVGElement("line", {
    x1: getPositionFromDate(jan4),
    y1: correctZeroPosition.y,
    x2: getPositionFromDate(new Date("2017-01-02")),
    y2: correctZeroPosition.y - (52 * increment),
    stroke: "#F44336",
    "stroke-width": 0.25
  });

  bugs.sort(function(bug1, bug2){
    var d1 = bug1.cf_last_resolved || bug1.merged_at;
    var d2 = bug2.cf_last_resolved || bug2.merged_at;
    return d1 < d2 ? -1 : 1;
  });

  for(var i = 0; i<= todayNumber; i++){
    var resolved = bugs.filter(function(item){
      var resolvedDate = item.cf_last_resolved || item.merged_at;
      return Math.floor(((new Date(resolvedDate)).getTime() - jan4.getTime()) / MILLISECOND_A_DAY) <= i
    });

    if(resolved.length > 0){
      var bzs = resolved.filter(function(item){
        return item.bugType === "BZ";
      });
      var x = getPositionFromDate(jan4.getTime() + (i * MILLISECOND_A_DAY));

      if(bzs.length > 0){
        var bzLine = createSVGElement("line", {
          x1: x,
          y1: correctZeroPosition.y,
          x2: x,
          y2: correctZeroPosition.y - (bzs.length * increment),
          stroke: "#8BC34A",
          "stroke-width": 0.75
        });
        chartSvg.appendChild(bzLine);
      }

      if((resolved.length - bzs.length) > 0){
        var prLine = createSVGElement("line", {
          x1: x,
          y1: correctZeroPosition.y - (bzs.length * increment),
          x2: x,
          y2: correctZeroPosition.y - (resolved.length * increment),
          stroke: "#6E5494",
          "stroke-width": 0.5
        });
        chartSvg.appendChild(prLine);
      }

    }
  }
  chartSvg.appendChild(goalLine);
  chartSvg.appendChild(extraGoalLine);
}

function drawWeeks(bugs){

  var weekGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  weekGroup.classList.add('weeks');
  for(var i = 0; i <= 52; i++){
    var weekLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    var x = X_PADDING + (i * 7);
    weekLine.setAttribute('x1', x);
    weekLine.setAttribute('y1', 0);
    weekLine.setAttribute('x2', x);
    weekLine.setAttribute('y2', 10000);
    weekLine.setAttribute('stroke', 'rgba(0,0,0,0.3)');
    weekLine.setAttribute('stroke-width', 0.1);
    weekGroup.appendChild(weekLine);

    if(todayNumber >= i * 7){
      var weekStatus = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      weekStatus.setAttribute('x', x);
      weekStatus.setAttribute('y', 0);
      weekStatus.setAttribute('width', 7);
      weekStatus.setAttribute('height', 2);

      var hasResolved = bugs.some(function(bug){
        if(bug.cf_last_resolved || bug.merged_at){
          var resDate = new Date(bug.cf_last_resolved ? bug.cf_last_resolved :  bug.merged_at);
          var resolvedDayNumber = (resDate - jan4)/MILLISECOND_A_DAY;
          return (Math.floor(resolvedDayNumber /7) == i);
        }
      });

      var fillColor = hasResolved?'#8BC34A':'#F44336';
      if(!hasResolved && i + 1 === weekNumber){
         fillColor = '#607D8B';
      }

      weekStatus.setAttribute('fill', fillColor);
      weekGroup.appendChild(weekStatus);
    }
  }
  timelineSvg.insertBefore(weekGroup,timelineSvg.firstChild);
  chartSvg.insertBefore(weekGroup.cloneNode(true),chartSvg.firstChild);
}

function drawHolidays(){
  var holidaysGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  holidaysGroup.classList.add('holidays');
  HOLIDAYS.forEach(function(holiday){
    var holidayRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    holidayRect.setAttribute('data-tooltip', holiday.name);
    holidayRect.setAttribute('x', getPositionFromDate(holiday.start));
    holidayRect.setAttribute('y', 2);
    holidayRect.setAttribute('width', getPositionFromDate(holiday.end) - getPositionFromDate(holiday.start));
    holidayRect.setAttribute('height', 10000);
    holidayRect.setAttribute('fill', '#77B6EC');
    holidayRect.setAttribute('fill-opacity', 0.3);
    holidaysGroup.appendChild(holidayRect);
  });

  timelineSvg.appendChild(holidaysGroup);
}

function createSVGElement(tagName, attributes){
  let el = document.createElementNS("http://www.w3.org/2000/svg", tagName);
  for(let key in attributes){
    el.setAttribute(key, attributes[key])
  }
  return el;
}

function getPositionFromDate(date, period){

    if(period){
      var start = period[0];
      var end = period[1];
      var length = (end - start);
      var percent = (date - start)/length;
      return X_PADDING + ((400 - (X_PADDING*2)) * percent);
    }
    var dayNumber = ((date - jan4)/MILLISECOND_A_DAY);
    if(dayNumber < 0){
      dayNumber = 0;
    }
    return X_PADDING + dayNumber;
}

function findLane(start, end){
  var lane = 0;
  var safe_space = 5;
  start = start - safe_space;
  end = end + safe_space;
  for(;lane < lanes.length;lane++){
    var fit = lanes[lane].every(function(xs){
      return !(
        ( xs[0] >= start && xs[0] <= end ) ||
        ( start >= xs[0] && start <= xs[1] )
      );
    });
    if(fit === true){
      break;
    }
  }
  return lane;
}

function updateDashboard(bugs){
  var fixedBugs = bugs.filter(function(bug){
    return (bug.bugType === "BZ" && bug.resolution === "FIXED");
  });

  var mergedPR = bugs.filter(function(bug){
    return (bug.bugType === "GH" && bug.merged_at);
  });

  var resolutionWeeks = fixedBugs.concat(mergedPR).map((bug) => {
    var resDate = new Date(bug.cf_last_resolved ? bug.cf_last_resolved :  bug.merged_at);
    var resolvedDayNumber = (resDate - jan4)/MILLISECOND_A_DAY;
    return Math.ceil(resolvedDayNumber/7);
  });

  var missedWeeks = [];
  for(var i = 1; i <=weekNumber; i++){
    if(resolutionWeeks.indexOf(i) === -1){
      missedWeeks.push(i);
    }
  }

  document.getElementById('currentWeek').textContent = weekNumber;
  document.getElementById('failedWeek').textContent = missedWeeks.length;
  document.getElementById('failedWeek').setAttribute("title", missedWeeks.map((x) => `#${x}`).join(' - '));
  document.getElementById('bugsFixed').textContent = fixedBugs.length;
  document.getElementById('prsMerged').textContent = mergedPR.length;
  var percent = Math.round((fixedBugs.length / weekNumber) * 100);
  if(percent > 100){
    percent = ">100"
  }
  document.getElementById('successPercentage').textContent = `${percent}%`;

  document.querySelector('.stats').classList.toggle('ready');
}

function needWhiteText(rgb){
  let values = rgb.replace("rgb(","").replace(")","").replace(" ","").split(",");
  var r = parseInt(values[0],10);
  var g = parseInt(values[1],10);
  var b = parseInt(values[2],10);
  var yiq = ((r*299)+(g*587)+(b*114))/1000;
  return (yiq < 120);
}

function hideTooltip(){
  if(tooltipEl.innerHTML === ""){
    return;
  }
  tooltipHideId = setTimeout(function(){
    tooltipHideId = null;
    tooltipEl.style.left = `-9999px`;
    tooltipEl.style.top = `0`;
    tooltipEl.style.backgroundColor = "";
    tooltipEl.textContent = "";
    tooltipEl.classList.remove("dark");
  },200);
  return tooltipHideId;
}

function onMouseMove(e){
  if(
    e.target.getAttribute('data-tooltip') ||
    (
      e.target.parentNode.tagName === 'g' &&
      e.target.parentNode.getAttribute('data-tooltip')
    )
  ){
    let newTarget = e.target.getAttribute('data-tooltip')?e.target:e.target.parentNode;

    if(currentTooltipTarget === null || currentTooltipTarget != newTarget){
      if(tooltipHideId){
        clearTimeout(tooltipHideId);
        tooltipHideId = null;
      }

      currentTooltipTarget = newTarget;

      tooltipEl.innerHTML = e.target.getAttribute('data-tooltip') || e.target.parentNode.getAttribute('data-tooltip');

      let left = e.clientX + (2 *DETAIL_PADDING);
      let top = e.clientY;
      if(left < 0){
        left = DETAIL_PADDING;
      } else if(left + tooltipEl.clientWidth > document.body.clientWidth){
        left = document.body.clientWidth - tooltipEl.clientWidth - DETAIL_PADDING;
      }

      if(top + tooltipEl.clientHeight > document.body.clientHeight){
        top = e.clientY - tooltipEl.clientHeight - DETAIL_PADDING;
      }

      tooltipEl.style.left = `${left}px`;
      tooltipEl.style.top = `${top}px`;
      if(e.target.getAttribute('stroke')){
        tooltipEl.style.backgroundColor = e.target.getAttribute('stroke');
      }
      if(e.target.getAttribute('fill')){
        tooltipEl.style.backgroundColor = e.target.getAttribute('fill');
      }
      if(needWhiteText(tooltipEl.style.backgroundColor)){
        tooltipEl.classList.add("dark");
      } else {
        tooltipEl.classList.remove("dark");
      }
    }
  } else {
    currentTooltipTarget = null;
    if(!tooltipHideId){
      hideTooltip();
    }
  }
}


