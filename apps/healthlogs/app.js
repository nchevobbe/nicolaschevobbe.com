var logsData = {};
const loginSectionEl = document.querySelector("section.login");
const loginFormEl = loginSectionEl.querySelector("form");
const headerEl = document.querySelector("header");
const homeSectionEl = document.querySelector("section.home");
const dashboardSvgEl = homeSectionEl.querySelector(".dashboard svg");
const logsEl = homeSectionEl.querySelector("ul.logs");
const daySectionEl = document.querySelector("section.day");
const dayFormEl = daySectionEl.querySelector("form");

loginFormEl.addEventListener("submit", onSubmitLoginForm)
dayFormEl.addEventListener("submit", onSubmitDayForm)

for (const checkbox of dayFormEl.querySelectorAll("input.toggle")) {
    checkbox.addEventListener("input", onSportCheckboxToggle);
}

const dateFormatter = new Intl.DateTimeFormat("fr", {
    weekday: "long",
    day: "numeric",
    month: "long",
});

function onSubmitLoginForm(e) {
    e.stopPropagation();
    e.preventDefault();
    loginSectionEl.classList.add("hidden");
    homeSectionEl.classList.remove("hidden");

    const formData = new FormData(loginFormEl);
    fetchDataFromJsonBin(formData.get("secret")).then(populateHome)
}

function showDayForm(e) {
    daySectionEl.classList.remove("hidden");
    homeSectionEl.classList.add("hidden");

    const day = e.currentTarget.dataset.date;

    headerEl.originalTextContent = headerEl.textContent;
    headerEl.textContent = day;
    dateFormatter.format(new Date(day))

    const dayData = logsData[day];
    dayFormEl.querySelector(`[name=day]`).value = day;

    dayFormEl.querySelector(`[name=weight]`).value = dayData?.weight || "";
    dayFormEl.querySelector(`[name=drinks]`).value = dayData?.drinks || "";

    let checkbox = dayFormEl.querySelector(`[name=yoga-enable]`);
    checkbox.checked = !!dayData?.sports?.yoga;
    onSportCheckboxToggle({ target: checkbox })
    dayFormEl.querySelector(`[name=yoga-time]`).value = dayData?.sports?.yoga?.time || "";

    checkbox = dayFormEl.querySelector(`[name=skate-enable]`);
    checkbox.checked = !!dayData?.sports?.skate;
    onSportCheckboxToggle({ target: checkbox })
    dayFormEl.querySelector(`[name=skate-time]`).value = dayData?.sports?.skate?.time || "";

    checkbox = dayFormEl.querySelector(`[name=rameur-enable]`);
    checkbox.checked = !!dayData?.sports?.rameur;
    onSportCheckboxToggle({ target: checkbox })
    dayFormEl.querySelector(`[name=rameur-time]`).value = dayData?.sports?.rameur?.time || "";
    dayFormEl.querySelector(`[name=rameur-distance]`).value = dayData?.sports?.rameur?.distance || "";
}

function onSubmitDayForm(e) {
    e.stopPropagation();
    e.preventDefault();
    daySectionEl.classList.add("hidden");
    homeSectionEl.classList.remove("hidden");
    headerEl.textContent = headerEl.originalTextContent;

    const formData = Object.fromEntries(new FormData(dayFormEl));
    logsData[formData.day] = {
        sports: {},
        drinks: 0
    };

    if (formData.weight) {
        logsData[formData.day].weight = formData.weight;
    }

    if (formData.drinks) {
        logsData[formData.day].drinks = formData.drinks;
    }

    if (formData["yoga-enable"]) {
        logsData[formData.day].sports.yoga = {
            time: formData["yoga-time"]
        };
    }

    if (formData["skate-enable"]) {
        logsData[formData.day].sports.skate = {
            time: formData["skate-time"]
        };
    }

    if (formData["rameur-enable"]) {
        logsData[formData.day].sports.rameur = {
            time: formData["rameur-time"],
            distance: formData["rameur-distance"]
        };
    }

    fetch("https://api.jsonbin.io/b/5fff5e658aa7af359da9ae38", {
        method: "PUT",
        headers: {
            "secret-key": "$2b$10$2l6oREZrSF9OmAF5UOIyMu/7ZmNXuFc6RmlbPofYCYsOoFx5SUdaG",
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(logsData)
    })

    populateDay(formData.day);
    buildDaysDashboard();
}

function onSportCheckboxToggle(e) {
    const checked = e.target.checked;
    const inputs = e.target.parentNode.querySelectorAll("input:not(.toggle)");
    for (const input of inputs) {
        if (checked) {
            input.removeAttribute("disabled");
        } else {
            input.setAttribute("disabled", true);
        }
    }
}

async function fetchDataFromJsonBin(secret) {
    const res = await fetch("https://api.jsonbin.io/b/5fff5e658aa7af359da9ae38/latest", {
        headers: {
            "secret-key": secret
        }
    })
    logsData = await res.json()
    return logsData;
}

function getDaysSinceBeginning() {
    let d = new Date();
    const days = [];
    while (!(d.getMonth() == 0 && d.getDate() == 3)) {
        const day = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart("2", "0")}-${(d.getDate()).toString().padStart("2", "0")}`;
        days.push(day);
        d.setDate(d.getDate() - 1);
    }
    return days;
}

function buildDaySectionElements() {
    const days = getDaysSinceBeginning();
    const lis = [];
    for (let i = 0; i < days.length; i++) {
        const day = days[i];

        const li = document.createElement("li");
        li.setAttribute("data-date", day);
        li.classList.add("day");
        const date = document.createElement("span");
        date.classList.add("date");
        date.textContent = dateFormatter.format(new Date(day));

        const dataUl = document.createElement("ul");
        dataUl.classList.add("day-detail");

        li.append(date, dataUl);
        li.addEventListener("click", showDayForm);
        lis.push(li);
    }
    logsEl.append(...lis)
}

function buildDaysDashboard() {
    dashboardSvgEl.innerHTML = "";
    const logsDataRange = getLogsDataRange();
    const days = getDaysSinceBeginning();

    const dashboardDaysNumber = 28;
    const viewBoxX = 300;
    let previousWeightPoint;
    for (let i = 0; i < days.length; i++) {
        const day = days[i];

        if (i > dashboardDaysNumber) {
            continue;
        }

        const dayData = logsData[day];
        const dayRange = viewBoxX / Math.min(dashboardDaysNumber, days.length);
        const x = viewBoxX - (dayRange * i) - (dayRange / 2);
        const y = 100;
        let stackY = y;
        const sportsData = Object.entries((dayData?.sports || [])).sort(([sportA], [sportB]) => sportB > sportA);
        for (const [sport, { time }] of sportsData) {
            const height = (time / logsDataRange.time) * 95;
            const line = createSVGElement("line", {
                class: `fat-line ${sport}`,
                x1: x,
                x2: x,
                y1: stackY,
                y2: stackY - height,
                title: `${day}: ${time} minutes`
            });
            stackY = stackY - height;
            dashboardSvgEl.append(line);
        }

        const drinks = (dayData?.drinks || 0);
        if (drinks) {
            const margin = 5;
            const startY = y + margin;
            const height = ((parseInt(drinks, 10) / logsDataRange.drinks)) * 10;
            const line = createSVGElement("line", {
                class: "fat-line drinks",
                x1: x,
                x2: x,
                y1: startY,
                y2: startY + height,
                title: `${day}: ${drinks}`
            });
            dashboardSvgEl.append(line);
        }

        const weight = dayData?.weight;
        if (weight) {
            const margin = 5;
            const percent = (weight - logsDataRange.minWeight) / (logsDataRange.maxWeight - logsDataRange.minWeight);
            const weightY = y - margin - (percent * 90);
            if (previousWeightPoint) {
                const line = createSVGElement("line", {
                    class: "weight",
                    x1: previousWeightPoint[0],
                    x2: x,
                    y1: previousWeightPoint[1],
                    y2: weightY,
                    title: `${day}: ${weight}kg`
                });
                dashboardSvgEl.append(line);
            }
            previousWeightPoint = [x, weightY];
        }
    }
}

function getLogsDataRange() {
    const logsDataRange = {};
    for (const dayData of Object.values(logsData)) {
        if (dayData.drinks && (!logsDataRange?.drinks || dayData.drinks > logsDataRange?.drinks)) {
            logsDataRange.drinks = dayData.drinks;
        }

        if (dayData.weight && (!logsDataRange?.maxWeight || dayData.weight > logsDataRange?.maxWeight)) {
            logsDataRange.maxWeight = dayData.weight;
        }

        if (dayData.weight && (!logsDataRange?.minWeight || dayData.weight < logsDataRange?.minWeight)) {
            logsDataRange.minWeight = dayData.weight;
        }

        const time = (Object.values(dayData.sports || {})).reduce((acc, current) => acc + parseInt(current.time), 0);
        if (time && (!logsDataRange?.time || time > logsDataRange?.time)) {
            logsDataRange.time = time;
        }
    }
    return logsDataRange;
}

function createSVGElement(tagName, attributes) {
    let el = document.createElementNS("http://www.w3.org/2000/svg", tagName);
    for (let key in attributes) {
        el.setAttribute(key, attributes[key]);
    }
    return el;
}

async function populateHome() {
    buildDaysDashboard();
    buildDaySectionElements();
    const ul = document.querySelector("ul");
    for (const day of Object.keys(logsData)) {
        populateDay(day);
    }
}

let maxPaces = {};
let minPaces = {};

function populateDay(day) {
    const dayData = logsData[day];
    const li = document.querySelector(`li[data-date="${day}"]`);

    if (!li) {
        return;
    }

    const dataUl = li.querySelector("ul");
    dataUl.innerHTML = "";
    if (dayData.weight) {
        const weightLi = document.createElement("li");
        weightLi.classList.add("weight");
        weightLi.textContent = `${dayData.weight}kg`;
        dataUl.append(weightLi);
    }

    if (dayData.sports) {
        for (const [sport, {
            time,
            distance
        }] of Object.entries(dayData.sports)) {
            const sportLi = document.createElement("li");
            sportLi.classList.add("sport", sport);
            sportLi.textContent = `${time}mn${distance ? ` ${distance}m` : ""}`;
            dataUl.append(sportLi);

            if (distance && time) {
                const pace = distance / time;
                sportLi.style.setProperty("--pace", pace);

                if (!maxPaces[sport] || pace > maxPaces[sport]) {
                    maxPaces[sport] = pace;
                    homeSectionEl.style.setProperty(`--${sport}-max-pace`, pace);
                }
                if (!minPaces[sport] || pace < minPaces[sport]) {
                    minPaces[sport] = pace;
                    homeSectionEl.style.setProperty(`--${sport}-min-pace`, pace);
                }
            }
        }
    }

    if (dayData.drinks) {
        const drinkLi = document.createElement("li");
        drinkLi.classList.add("drink");
        drinkLi.textContent = dayData.drinks;
        dataUl.append(drinkLi);
    }
}