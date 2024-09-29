import $ from "jquery";
import Dexie from "dexie";
const wikitreeLogoURL = chrome.runtime.getURL("images/we128.png");

const db = new Dexie('WikitreeLinks');
db.version(1).stores({
  links: '[site+treeId+personId], [site+wikitreeId], wikitreeId',
});

const [_, treeId, personId] = window.location.pathname.match(/\/tree\/([\d]+)\/person\/([\d]+)/);

async function getLink(site, treeId, personId) {
  return await db.links.get({site, treeId, personId})
}

async function setLink(site, treeId, personId, wikitreeId) {
  return await db.links.put({site, treeId, personId, wikitreeId})
}

async function getPeople(personId) {
  const response = await fetch(`https://apps.wikitree.com/apps/beacall6/api/get_people.php?id=${personId}&ancestors=1&descendants=1&fields=BirthDate,BirthLocation,DeathDate,DeathLocation,Derived.BirthName,Name`);
  const data = await response.json();
  return Object.values(data[0].people);
}

let $familyCards;

async function processLink(event) {
  const wikitreeId = event.target.value;
  if (wikitreeId.match(/\w+\-\d+/)) {
    await setLink("ancestry", treeId, personId, wikitreeId);

    processFamily(await getPeople(wikitreeId), $familyCards);
  }
}

async function processFamily(family, $cards) {
  for (let person of family) {
    for (let card of $cards) {
      if (person.BirthName === $(card).find(".userCardTitle").text() &&
        (`${person.BirthDate.substr(0,4)}–${person.DeathDate.substr(0,4)}`) === $(card).find(".userCardSubTitle").text()) {
        await setLink("ancestry", treeId, $(card).attr("id").substr(6), person.Name);
      } else {
        console.log(person.BirthName, $(card).find(".userCardTitle").text(), `${person.BirthDate.substr(0,4)}-${person.DeathDate.substr(0,4)}`, $(card).find(".userCardSubTitle").text());
      }
    }
  }
}

$(function () {
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(async function(mutation) {
        if (mutation.addedNodes.length > 0 && !$familyCards) {
          $familyCards = $("section.familySection .researchList a.card");
          $familyCards.each(async (_,element) => {
            const [match, personId] = element.href.match(/\/person\/([\d]+)/);
            const link = await getLink("ancestry", treeId, personId);
            if (link) {
              $(element).append(`<img src="${wikitreeLogoURL}" alt="wikitreelogo" width="25" style="float: right"/>`);
            } else {
              $(element).append(`<img src="${wikitreeLogoURL}" alt="wikitreelogo" width="25" style="float: right; filter: grayscale(100%)"/>`);
            }
          });

          const link = await getLink("ancestry", treeId, personId);
          const $input = $(`<input type="text" class="w16${link ? " success" : ""}"
            placeholder="Wikitree ID" value="${link?.wikitreeId||""}"></input>`);
          $("nav.pageCrumbs").after($input);

          $input.on("blur", processLink);
        }
    });
  });
  observer.observe($('.personPageFacts')[0], { childList: true });

});
