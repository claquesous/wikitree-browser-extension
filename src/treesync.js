import $ from "jquery";
import Dexie from "dexie";
const wikitreeLogoURL = chrome.runtime.getURL("images/we128.png");

const db = new Dexie('WikitreeLinks');
db.version(1).stores({
  links: '[site+treeId+personId], [site+wikitreeId], wikitreeId',
});

const [_, treeId, personId] = window.location.pathname.match(/\/tree\/([\d]+)\/person\/([\d]+)/);

async function getLink(site, treeId, personId) {
  return await db.links.get({site, treeId, personId});
}

async function setLink(site, treeId, personId, wikitreeId) {
  return await db.links.put({site, treeId, personId, wikitreeId});
}

async function getPeople(personId) {
  const response = await fetch(`https://apps.wikitree.com/apps/beacall6/api/get_people.php?id=${personId}&ancestors=1&descendants=1&fields=BirthDate,BirthLocation,DeathDate,DeathLocation,Derived.BirthName,Name`);
  const data = await response.json();
  return Object.values(data[0].people);
}

let $familyCards;

async function parseLink(event) {
  const wikitreeId = event.target.value;
  if (wikitreeId.match(/\w+\-\d+/)) {
    await processLink(wikitreeId);
  }
}

async function processLink(wikitreeId) {
  await setLink("ancestry", treeId, personId, wikitreeId);
  await processFamily(await getPeople(wikitreeId), $familyCards);
}

function stripAccents(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function personIsMatch(person, name, birthYear, deathYear) {
  return stripAccents(person.BirthName) === stripAccents(name) &&
    person.BirthDate.substring(0,4) === birthYear &&
    (person.DeathDate.substring(0,4) === deathYear ||
    person.DeathDate.substring(0,4) === "0000" && deathYear === "");
}

async function processFamily(family, $cards) {
  for (let person of family) {
    for (let card of $cards) {
      let name = $(card).find(".userCardTitle").text();
      let lifeRangeYears = $(card).find(".userCardSubTitle").text().split("–");
      if (personIsMatch(person, name, ...lifeRangeYears)) {
        await setLink("ancestry", treeId, $(card).attr("id").substring(6), person.Name);
        $(card).find("img").attr("title", person.Name);
        $(card).find("img").attr("style", "float: right");
      }
    }
  }
}

$(function () {
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(async function(mutation) {
        if (mutation.addedNodes.length > 0 && !$familyCards) {
          let fullyLinked = true;
          $familyCards = $("section.familySection .researchList a.card");
          $familyCards.each(async (_,element) => {
            const [match, personId] = element.href.match(/\/person\/([\d]+)/);
            const link = await getLink("ancestry", treeId, personId);
            if (link) {
              $(element).append(`<img src="${wikitreeLogoURL}" alt="wikitreelogo" title="${personId}" width="25" style="float: right"/>`);
            } else {
              fullyLinked = false;
              $(element).append(`<img src="${wikitreeLogoURL}" alt="wikitreelogo" width="25" style="float: right; filter: grayscale(100%)"/>`);
            }
          });

          const link = await getLink("ancestry", treeId, personId);
          const $input = $(`<input type="text" class="w16${link ? " success" : ""}"
            placeholder="Wikitree ID" value="${link?.wikitreeId||""}"></input>`);
          $("nav.pageCrumbs").after($input);

          $input.on("blur", parseLink);

          if (!fullyLinked && !!link?.wikitreeId) {
            await processLink(link.wikitreeId);
          }
        }
    });
  });
  observer.observe($('.personPageFacts')[0], { childList: true });

});
