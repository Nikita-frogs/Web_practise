"use strict";

const API_URL = "https://pokeapi.co/api/v2/pokemon";
const PAGE_SIZE = 20;
const FAVORITES_KEY = "pr5-favorites";

const pokemonList = document.querySelector("#pokemonList");
const statusText = document.querySelector("#status");
const pageInfo = document.querySelector("#pageInfo");
const prevBtn = document.querySelector("#prevBtn");
const nextBtn = document.querySelector("#nextBtn");
const searchInput = document.querySelector("#searchInput");
const detailsDialog = document.querySelector("#detailsDialog");
const detailsContent = document.querySelector("#detailsContent");
const closeDetails = document.querySelector("#closeDetails");

let offset = 0;
let total = 0;
let currentPokemon = [];
let currentRequest = null;
let detailsRequest = null;

const pokemonCache = {};
let favorites = JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];

prevBtn.addEventListener("click", () => loadPage(offset - PAGE_SIZE));
nextBtn.addEventListener("click", () => loadPage(offset + PAGE_SIZE));
searchInput.addEventListener("input", renderList);
pokemonList.addEventListener("click", handleListClick);
closeDetails.addEventListener("click", () => detailsDialog.close());

loadPage(0);

async function loadPage(newOffset) {
  if (newOffset < 0) return;

  offset = newOffset;
  statusText.textContent = "Завантаження...";
  currentPokemon = [];
  renderList();

  if (currentRequest) {
    currentRequest.abort();
  }

  const request = new AbortController();

  currentRequest = request;
  let isTimeout = false;
  const timeoutId = setTimeout(() => {
    isTimeout = true;
    request.abort();
  }, 10000);

  try {
    const url = `${API_URL}?limit=${PAGE_SIZE}&offset=${offset}`;
    const response = await fetch(url, { signal: request.signal });

    if (!response.ok) {
      throw new Error(`Status code: ${response.status}`);
    }

    const data = await response.json();

    total = data.count;
    currentPokemon = await Promise.all(
      data.results.map((pokemon) => loadPokemon(pokemon.url, request.signal))
    );

    statusText.textContent = "";
    renderList();
  } catch (error) {
    if (isTimeout || error.name !== "AbortError") {
      statusText.textContent = "Помилка завантаження. Спробуйте ще раз.";
    }
  } finally {
    clearTimeout(timeoutId);
    updateButtons();
  }
}

async function loadPokemon(urlOrName, signal) {
  const url = urlOrName.startsWith("http") ? urlOrName : `${API_URL}/${urlOrName}`;

  if (pokemonCache[urlOrName]) {
    return pokemonCache[urlOrName];
  }

  if (pokemonCache[url]) {
    return pokemonCache[url];
  }

  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`Status code: ${response.status}`);
  }

  const pokemon = await response.json();

  pokemonCache[url] = pokemon;
  pokemonCache[urlOrName] = pokemon;
  pokemonCache[pokemon.name] = pokemon;

  return pokemon;
}

function renderList() {
  const query = searchInput.value.trim().toLowerCase();
  const filteredPokemon = currentPokemon.filter((pokemon) => fuzzySearch(pokemon.name, query));

  pokemonList.innerHTML = filteredPokemon.map((pokemon) => {
    const isFavorite = favorites.includes(pokemon.name);

    return `
      <article>
        <button type="button" data-favorite="${pokemon.name}">
          ${isFavorite ? "★" : "☆"}
        </button>
        <img src="${pokemon.sprites.front_default}" alt="${pokemon.name}" loading="lazy">
        <h2>${pokemon.name}</h2>
        <p>${pokemon.types.map((item) => item.type.name).join(", ")}</p>
        <button type="button" data-details="${pokemon.name}">Деталі</button>
      </article>
      <hr>
    `;
  }).join("");

  updateButtons();
}

function handleListClick(event) {
  const favoriteButton = event.target.closest("[data-favorite]");
  const detailsButton = event.target.closest("[data-details]");

  if (favoriteButton) {
    toggleFavorite(favoriteButton.dataset.favorite);
  }

  if (detailsButton) {
    showDetails(detailsButton.dataset.details);
  }
}

function toggleFavorite(name) {
  if (favorites.includes(name)) {
    favorites = favorites.filter((pokemonName) => pokemonName !== name);
  } else {
    favorites.push(name);
  }

  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  renderList();
}

async function showDetails(name) {
  if (detailsRequest) {
    detailsRequest.abort();
  }

  detailsRequest = new AbortController();
  detailsContent.innerHTML = "Завантаження деталей...";
  detailsDialog.showModal();

  try {
    const pokemon = await loadPokemon(name, detailsRequest.signal);

    detailsContent.innerHTML = `
      <h2>${pokemon.name}</h2>
      <img src="${pokemon.sprites.other["official-artwork"].front_default}" alt="${pokemon.name}" loading="lazy" width="200">
      <p>Типи: ${pokemon.types.map((item) => item.type.name).join(", ")}</p>
      <p>Зріст: ${pokemon.height / 10} м</p>
      <p>Вага: ${pokemon.weight / 10} кг</p>
      <h3>Статистики</h3>
      <ul>
        ${pokemon.stats.map((item) => `<li>${item.stat.name}: ${item.base_stat}</li>`).join("")}
      </ul>
    `;
  } catch (error) {
    if (error.name !== "AbortError") {
      detailsContent.innerHTML = "Не вдалося завантажити деталі.";
    }
  }
}

function updateButtons() {
  pageInfo.textContent = `Сторінка ${Math.floor(offset / PAGE_SIZE) + 1}`;
  prevBtn.disabled = offset === 0;
  nextBtn.disabled = total > 0 && offset + PAGE_SIZE >= total;
}

function fuzzySearch(name, query) {
  if (query === "") return true;
  if (name.includes(query)) return true;

  let queryIndex = 0;

  for (const letter of name) {
    if (letter === query[queryIndex]) {
      queryIndex++;
    }
  }

  return queryIndex === query.length;
}
