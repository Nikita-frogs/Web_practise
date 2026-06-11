"use strict";

const STORAGE_KEY = "pr4-counters";

const countersBox = document.querySelector("#counters") || document.querySelector(".counters") || document.body;
const buttonsBox = document.querySelector("#buttons") || document.querySelector(".buttons") || document.body;
const counters = Array.from(countersBox.querySelectorAll(".counter"));

let counts = JSON.parse(localStorage.getItem(STORAGE_KEY)) || counters.map(() => 0);
const undo = [];
const history = [];
const lastClick = counters.map(() => 0);

if (counts.length !== counters.length) {
    counts = counters.map(() => 0);
}

countersBox.addEventListener("click", handleCounterClick);
buttonsBox.addEventListener("click", handlePanelClick);

render();

function handleCounterClick(event) {
    const button = event.target.closest("button");
    const counter = event.target.closest(".counter");

    if (!button || !counter) return;

    const index = counters.indexOf(counter);
    const isPlus = button.classList.contains("plus");
    const isMinus = button.classList.contains("minus");

    if (index === -1) return;
    if (!isPlus && !isMinus) return;
    if (Date.now() - lastClick[index] < 200) return;

    lastClick[index] = Date.now();

    if (isMinus && counts[index] === 0) return;

    undo.push([...counts]);

    if (undo.length > 10) {
        undo.shift();
    }

    if (isPlus) {
        counts[index]++;
        addHistory(`+1 ${counter.dataset.name}`);
    } else {
        counts[index]--;
        addHistory(`−1 ${counter.dataset.name}`);
    }

    saveAndRender();
}

function handlePanelClick(event) {
    const button = event.target.closest("button");

    if (!button) return;

    if (button.id === "undo") {
        const previousCounts = undo.pop();

        if (previousCounts) {
            counts = previousCounts;
            saveAndRender();
        }
    }

    if (button.id === "reset") {
        if (!confirm("Скинути всі лічильники?")) return;

        undo.push([...counts]);

        if (undo.length > 10) {
            undo.shift();
        }

        counts = counters.map(() => 0);
        addHistory("reset");
        saveAndRender();
    }

    if (button.id === "export") {
        const json = JSON.stringify({ counts });
        const link = document.createElement("a");

        link.href = URL.createObjectURL(new Blob([json], { type: "application/json" }));
        link.download = "counters.json";
        document.body.append(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(link.href);
    }
}

function addHistory(text) {
    history.unshift(text);

    if (history.length > 5) {
        history.pop();
    }
}

function saveAndRender() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(counts));
    render();
}

function render() {
    const total = counts.reduce((sum, count) => sum + count, 0);
    const max = Math.max(...counts);

    counters.forEach((counter, index) => {
        counter.querySelector(".value").textContent = counts[index];
        counter.classList.toggle("is-leader", max > 0 && counts[index] === max);
    });

    document.querySelector("#total").textContent = total;
    document.querySelector("#leader").textContent = getLeaderText(max);
    document.querySelector("#history").innerHTML = history
        .map((item) => `<li>${item}</li>`)
        .join("");
}

function getLeaderText(max) {
    if (max === 0) return "—";

    return counters
        .filter((counter, index) => counts[index] === max)
        .map((counter) => counter.querySelector(".label").textContent)
        .join(", ");
}
