var logsData = {};
const loginSectionEl = document.querySelector("section.login");
const loginFormEl = loginSectionEl.querySelector("form");
const headerEl = document.querySelector("header");
const homeSectionEl = document.querySelector("section.home");
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
}

function onSportCheckboxToggle(e) {
    const checked = e.target.checked;
    const inputs = e.target.parentNode.querySelectorAll(".sport-inputs-container input");
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

function buildDaySectionElements() {
    let d = new Date();
    const lis = [];
    while (!(d.getMonth() == 0 && d.getDate() == 3)) {
        const day = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart("2", "0")}-${(d.getDate()).toString().padStart("2", "0")}`;

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

        d.setDate(d.getDate() - 1);
    }
    logsEl.append(...lis)
}

async function populateHome() {
    buildDaySectionElements();
    const ul = document.querySelector("ul");
    for (const day of Object.keys(logsData)) {
        populateDay(day);
    }
}

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
        }
    }

    if (dayData.drinks) {
        const drinkLi = document.createElement("li");
        drinkLi.classList.add("drink");
        drinkLi.textContent = dayData.drinks;
        dataUl.append(drinkLi);
    }
}