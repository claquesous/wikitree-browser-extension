import $ from "jquery";
import Dexie from "dexie";

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

async function processLink(event) {
  const wikitreeId = event.target.value;
  if (wikitreeId.match(/\w+\-\d+/)) {
    await setLink("ancestry", treeId, personId, wikitreeId);

    // call api
  }
}

$(async function () {
  const link = await getLink("ancestry", treeId, personId);
  const $input = $(`<input type="text" class="w16${link ? " success" : ""}"
    placeholder="Wikitree ID" value="${link?.wikitreeId||""}"></input>`);
  $("nav.pageCrumbs").after($input);

  $input.on("blur", processLink);
});
