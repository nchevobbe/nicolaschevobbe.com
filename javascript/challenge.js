const COLORS = ["rgb(244, 67, 54)","rgb(0, 150, 136)","rgb(96, 125, 139)","rgb(156, 39, 176)","rgb(103, 58, 183)","rgb(63, 81, 181)","rgb(33, 150, 243)","rgb(3, 169, 244)","rgb(0, 188, 212)","rgb(76, 175, 80)","rgb(139, 195, 74)","rgb(255, 193, 7)","rgb(255, 152, 0)","rgb(255, 87, 34)","rgb(233, 30, 99)","rgb(121, 85, 72)"];
var userColor = {};
var svg = document.querySelector('svg');

let currentTooltipTarget;
let tooltipEl = document.createElement("div");
tooltipEl.classList.add("tooltip");
document.body.appendChild(tooltipEl);
let tooltipHideId;

const jan4 = new Date('2016-01-04');
const X_PADDING = 17;
const LINE_HEIGHT = 10;
const MILLISECOND_A_DAY = (1000*60*60*24);
const BUGZILLA_API_URL = 'https://bugzilla.mozilla.org/rest/';
const EMAIL = 'chevobbe.nicolas@gmail.com';
const PRIORITY_REGEX = /^P[1-5]$/;
const DETAIL_PADDING = 15;

const HOLIDAYS = [{
  name: 'Skiing',
  start : new Date('2016-01-16'),
  end: new Date('2016-01-23')
}];

drawHolidays();

var lanes = [];
var bugs = [];


svg.addEventListener('mousemove', onMouseMove, false);


const weekNumber = Math.ceil(((new Date()) - jan4)/MILLISECOND_A_DAY/7);
const todayNumber = (((new Date()) - jan4)/MILLISECOND_A_DAY);

var params = {
  "include_fields": "id,summary,status,cf_last_resolved,target_milestone,creation_time,resolution, assigned_to,priority",
  "email1": EMAIL,
  "status": "RESOLVED",
  "emailassigned_to1":1
};
if(window.URLSearchParams){
  var searchParams = new URLSearchParams();

  Object.keys(params).forEach(function(key){
    searchParams.append(key, params[key]);
  });
  searchParams = searchParams.toString();
} else {
  var searchParams = [];
  Object.keys(params).forEach(function(key){
    searchParams.push(key+"="+params[key]);
  });
  searchParams = searchParams.join('&');
}


var url = `${BUGZILLA_API_URL}bug?${searchParams}`;
var myHeaders = new Headers();
myHeaders.append('Accept', 'application/json');

fetch(url, {
  mode: 'cors',
  method: 'GET',
  headers: myHeaders
})
.then((response) => response.json())
.then(function(data){

  let bugs = data.bugs.filter(function(x){
    if(!x.cf_last_resolved){
      return true;
    }

    return (new Date(x.cf_last_resolved) >= jan4);
  });

  bugs.sort(function(a, b){

    var priorityA = (PRIORITY_REGEX.test(a.priority)?a.priority:'P3');
    var priorityB = (PRIORITY_REGEX.test(b.priority)?b.priority:'P3');
    // "a" and "b" are in the same state ( both resolved, or both unresolved)
    // we want to get the higher priority bugs first
    if(priorityA != priorityB){
      return priorityA < priorityB ? -1:1;
    }

    // "a" and "b" are in the same state (both resolved, or both unresolved)
    // and have the same priority
    // We want to get the older bugs first
    return a.creation_time < b.creation_time ? -1 : 1;
  });

  return bugs.reduce(function(previousBugPromise, bug, idx){
    return new Promise(function(resolve, reject){
      var historyPromise = getBugHistory(bug).then(function(history){
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

      var promises = [historyPromise,previousBugPromise];
      Promise.all(promises).then(function(data){
        let retrievedBugs = data[promises.indexOf(previousBugPromise)];
        let bug = data[promises.indexOf(historyPromise)];
        let idx = bugs.findIndex((item) => item.id === bug.id);
        if(idx != -1){
          bugs[idx] = bug;
        }
        drawBug(bug);
        bug.displayed = true;
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

function getBugHistory(bugData){
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

    var colorIndex = (bug.id % (COLORS.length - 1));
    var bugColor = COLORS[colorIndex];
    var startDayNumber = 0;
    if(new Date(bug.assign_time) > jan4){
      startDayNumber = (new Date(bug.assign_time) - jan4)/MILLISECOND_A_DAY;
    }

    var endDate = new Date();
    if(bug.cf_last_resolved){
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
        ${bug.summary}`);
    bugGroup.setAttribute('data-bug-id', bug.id);

    if(bug.cf_last_resolved && bug.resolution == 'FIXED'){
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

    svg.appendChild(bugGroup);
    }
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
        if(bug.cf_last_resolved){
          var resolvedDayNumber = (new Date(bug.cf_last_resolved) - jan4)/MILLISECOND_A_DAY;
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
  svg.insertBefore(weekGroup,svg.firstChild);
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

  svg.appendChild(holidaysGroup);
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
  var safe_space = 4;
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
    return (bug.resolution === "FIXED");
  });
  var resolutionWeeks = fixedBugs.map((bug) => Math.ceil(((new Date(bug.cf_last_resolved)) - jan4)/MILLISECOND_A_DAY/7));

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
  document.getElementById('successPercentage').textContent = Math.round((fixedBugs.length / weekNumber) * 100)+"%";

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