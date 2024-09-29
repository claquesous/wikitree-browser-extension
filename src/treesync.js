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

async function processLink(event) {
  const wikitreeId = event.target.value;
  if (wikitreeId.match(/\w+\-\d+/)) {
    await setLink("ancestry", treeId, personId, wikitreeId);

    // call api
    let person = await getPeople(wikitreeId);
    console.log(person);
  }
}

$(async function () {
  const link = await getLink("ancestry", treeId, personId);
  const $input = $(`<input type="text" class="w16${link ? " success" : ""}"
    placeholder="Wikitree ID" value="${link?.wikitreeId||""}"></input>`);
  $("nav.pageCrumbs").after($input);

  $input.on("blur", processLink);

  let foundFamily = false;
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
        if (mutation.addedNodes.length > 0 && !foundFamily) {
          const $familyCards = $("section.familySection .researchList a.card");
          foundFamily ||= $familyCards;
          $familyCards.each(async (_,element) => {
            const [match, personId] = element.href.match(/\/person\/([\d]+)/);
            const link = await getLink("ancestry", treeId, personId);
            if (link) {
              $(element).append(`<img src="${wikitreeLogoURL}" alt="wikitreelogo" width="25" style="float: right"/>`);
            } else {
              $(element).append(`<img src="${wikitreeLogoURL}" alt="wikitreelogo" width="25" style="float: right; filter: grayscale(100%)"/>`);
            }
          });
        }
    });
  });
  observer.observe($('.personPageFacts')[0], { childList: true });

});
