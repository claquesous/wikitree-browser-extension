/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { getWikiTreePage } from "./API/wwwWikiTree";
import { navigatorDetect } from "./navigatorDetect";
import { isNavHomePage } from "./pageType.js";
import { checkIfFeatureEnabled } from "./options/options_storage";

async function checkAnyDataFeature() {
  const features = ["extraWatchlist", "clipboardAndNotes", "customChangeSummaryOptions", "myMenu"];
  const promises = features.map((feature) => checkIfFeatureEnabled(feature));

  try {
    const results = await Promise.all(promises);
    // results is an array of booleans. If any is true, initialize this feature.
    const anyFeatureToInitialize = results.some((result) => result);
    if (anyFeatureToInitialize) {
      results.forEach((result, index) => {
        if (result) {
          if ($("div#featureDataButtons").length == 0) {
            addDataButtons();
          }
        }
      });
    }
  } catch (error) {
    console.error("Error checking features to initialize:", error);
  }
}

// Add buttons to download or import the feature data (My Menu, Change Summary Options, Extra Watchlist, Clipboard)
if (isNavHomePage) {
  checkAnyDataFeature();
}

function downloadFeatureData() {
  const data = {
    extension: "WikiTree Browser Extension",
    features: "1",
    data: { changeSummaryOptions: "[]", myMenu: "[]", extraWatchlist: "", clipboard: "[]" },
  };
  if (localStorage.LSchangeSummaryOptions) {
    data.data.changeSummaryOptions = localStorage.LSchangeSummaryOptions;
  }
  if (localStorage.customMenu) {
    data.data.myMenu = localStorage.customMenu;
  }
  if (localStorage.extraWatchlist) {
    data.data.extraWatchlist = localStorage.extraWatchlist;
  }
  if (localStorage.clipboard) {
    data.data.clipboard = localStorage.clipboard;
  }
  // Download this as a file
  const file = new Blob([JSON.stringify(data)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(file);
  // Get the date and time for the filename
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const seconds = now.getSeconds().toString().padStart(2, "0");
  a.download = `${year}-${month}-${day}_${hours}${minutes}${seconds}_WBE_backup_data.json`;
  a.click();
}

export function wrapBackupData(key, data) {
  let now = new Date();
  let wrapped = {
    id:
      Intl.DateTimeFormat("sv-SE", { dateStyle: "short", timeStyle: "medium" }) // sv-SE uses ISO format
        .format(now)
        .replace(/:/g, "")
        .replace(/ /g, "_") +
      "_WBE_backup_" +
      key,
    extension: WBE.name,
    version: WBE.version,
    browser: navigator.userAgent,
    timestamp: now.toISOString(),
  };
  wrapped[key] = data;
  return wrapped;
}

export function getBackupLink(wrappedJsonData) {
  let link = document.createElement("a");
  link.title = 'Right-click to "Save as..." at specific location on your device.';
  let json = JSON.stringify(wrappedJsonData, null, 2);
  if (navigatorDetect.browser.Safari) {
    // Safari doesn't handle blobs or the download attribute properly
    link.href = "data:application/octet-stream," + encodeURIComponent(json);
    link.target = "_blank";
    link.title = link.title.replace("Save as...", "Download Linked File As...");
  } else {
    let blob = new Blob([json], { type: "text/plain" });
    link.href = URL.createObjectURL(blob);
    link.download = wrappedJsonData.id + ".txt";
  }
  return link;
}

function importFeatureData() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";
  input.onchange = function () {
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = function () {
      const data = JSON.parse(reader.result);
      if (data.extension.startsWith("WikiTree Browser Extension") && data.features) {
        if (data.data.changeSummaryOptions) {
          localStorage.LSchangeSummaryOptions = data.data.changeSummaryOptions;
        }
        if (data.data.myMenu) {
          localStorage.customMenu = data.data.myMenu;
        }
        if (data.data.extraWatchlist) {
          localStorage.extraWatchlist = data.data.extraWatchlist;
        }
        if (data.data.clipboard) {
          localStorage.clipboard = data.data.clipboard;
        }
        // Reload the page to apply the changes
        location.reload();
      } else {
        alert("Invalid file");
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function addDataButtons() {
  const dataButtons = `
    <div id="featureDataButtons">
      <button id="downloadFeatureData" 
      title="Download a backup file for your WikiTree Browser Extension data from the Extra Watchlist, 
      My Menu, Clipboard and Notes, and Custom Change Summary Options features">Download WBE Feature Data</button>
      <button id="importFeatureData"
      title="Import/restore data from a backup file for your WikiTree Browser Extension data from the Extra Watchlist, 
      My Menu, Clipboard and Notes, and Custom Change Summary Options features">Import WBE Feature Data</button>
    </div>
  `;
  $(".eight.columns.alpha").last().after(dataButtons);
  $("#downloadFeatureData").on("click", downloadFeatureData);
  $("#importFeatureData").on("click", importFeatureData);
}

// Add wte class to body to let WikiTree BEE know not to add the same functions
document.querySelector("body").classList.add("wte");

export const WBE = {};
if (typeof BUILD_INFO !== "undefined") {
  let buildDate = Date.parse(BUILD_INFO.buildDate);
  if (!isNaN(buildDate)) WBE.buildDate = new Date(buildDate);
  if (BUILD_INFO.shortHash) WBE.shortHash = BUILD_INFO.shortHash;
  if (BUILD_INFO.commitHash) WBE.commitHash = BUILD_INFO.commitHash;
}
(function (runtime) {
  const manifest = runtime.getManifest();
  WBE.name = manifest.name;
  WBE.version = manifest.version;
  WBE.isDebug = WBE.name.indexOf("(Debug)") > -1; // non-published versions used by developers
  WBE.isPreview = WBE.isDebug || WBE.name.indexOf("(Preview)") > -1;
  WBE.isRelease = !WBE.isPreview;
  if (!WBE.isRelease) {
    console.log(
      `${WBE.name} ${WBE.version} (${navigatorDetect.browser.name ?? "Unknown"}/${
        navigatorDetect.os.name ?? "Unknown"
      })${WBE.shortHash ? " commit " + WBE.shortHash : ""}${WBE.buildDate ? " built " + WBE.buildDate : ""}`
    );
  }
})(chrome.runtime);

/**
 * Creates a new menu item in the Apps dropdown menu.
 *
 */
export function createTopMenuItem(options) {
  let title = options.title;
  let name = options.name;
  let id = options.id;
  let url = options.url;

  $("#wte-topMenu").append(`<li>
        <a id="${id}" class="pureCssMenui" title="${title}">${name}</a>
    </li>`);
}

// Add a link to the short list of links below the tabs
export function createProfileSubmenuLink(options) {
  $("ul.views.viewsm")
    .eq(0)
    .append(
      $(
        `<li class='viewsi'><a title='${options.title}' href='${options.url}' id='${options.id}'>${options.text}</a></li>`
      )
    );
  let links = $("ul.views.viewsm:first li");
  // Re-sort the links into alphabetical order
  links.sort(function (a, b) {
    return $(a).text().localeCompare($(b).text());
  });
  $("ul.views.viewsm").eq(0).append(links);
}

export function createTopMenu() {
  const newUL = $("<ul class='pureCssMenu' id='wte-topMenuUL'></ul>");
  $("ul.pureCssMenu").eq(0).after(newUL);
  newUL.append(`<li>
        <a class="pureCssMenui0">
            <span>App Features</span>
        </a>
        <ul class="pureCssMenum" id="wte-topMenu"></ul>
    </li>`);
}

// Used in familyTimeline, familyGroup, locationsHelper
export async function getRelatives(id, fields = "*", appId = "WBE") {
  try {
    const result = await $.ajax({
      url: "https://api.wikitree.com/api.php",
      crossDomain: true,
      xhrFields: { withCredentials: true },
      type: "POST",
      dataType: "json",
      data: {
        action: "getRelatives",
        keys: id,
        fields: fields,
        getParents: 1,
        getSiblings: 1,
        getSpouses: 1,
        getChildren: 1,
        appId: appId || "WBE",
      },
    });
    return result[0].items[0].person;
  } catch (error) {
    console.error(error);
  }
}

// Used in familyTimeline, familyGroup, locationsHelper
// Make the family member arrays easier to handle
export function extractRelatives(rel, theRelation = false) {
  let people = [];
  if (typeof rel == "undefined" || rel == null) {
    return false;
  }
  const pKeys = Object.keys(rel);
  pKeys.forEach(function (pKey) {
    var aPerson = rel[pKey];
    if (theRelation != false) {
      aPerson.Relation = theRelation;
    }
    people.push(aPerson);
  });
  return people;
}

// Used in familyTimeline, familyGroup, locationsHelper
export function familyArray(person) {
  // This is a person from getRelatives()
  if (person) {
    const rels = ["Parents", "Siblings", "Spouses", "Children"];
    let familyArr = [person];
    rels.forEach(function (rel) {
      const relation = rel.replace(/s$/, "").replace(/ren$/, "");
      if (person[rel]) {
        familyArr = familyArr.concat(extractRelatives(person[rel], relation));
      }
    });
    return familyArr;
  } else {
    return [];
  }
}

function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

// Check that a value is OK
// Used in familyTimeline and familyGroup
export function isOK(thing) {
  const excludeValues = [
    "",
    null,
    "null",
    "0000-00-00",
    "00000000",
    "unknown",
    "Unknown",
    "undefined",
    undefined,
    "0000",
    "0",
    0,
    false,
    "false",
    "NaN",
    NaN,
  ];
  if (!excludeValues.includes(thing)) {
    if (isNumeric(thing)) {
      return true;
    } else {
      if (typeof thing === "string") {
        const nanMatch = thing.match(/NaN/);
        if (nanMatch == null) {
          return true;
        } else {
          return false;
        }
      } else {
        return false;
      }
    }
  } else {
    return false;
  }
}

// Find good names to display (as the API doesn't return the same fields all profiles)
export function displayName(fPerson) {
  if (fPerson != undefined) {
    let fName1 = "";
    if (typeof fPerson["LongName"] != "undefined") {
      if (fPerson["LongName"] != "") {
        fName1 = fPerson["LongName"].replace(/\s\s/, " ");
      }
    }
    let fName2 = "";
    let fName4 = "";
    if (typeof fPerson["MiddleName"] != "undefined") {
      if (fPerson["MiddleName"] == "" && typeof fPerson["LongNamePrivate"] != "undefined") {
        if (fPerson["LongNamePrivate"] != "") {
          fName2 = fPerson["LongNamePrivate"].replace(/\s\s/, " ");
        }
      }
    } else {
      if (typeof fPerson["LongNamePrivate"] != "undefined") {
        if (fPerson["LongNamePrivate"] != "") {
          fName4 = fPerson["LongNamePrivate"].replace(/\s\s/, " ");
        }
      }
    }

    let fName3 = "";
    const checks = ["Prefix", "FirstName", "RealName", "MiddleName", "LastNameAtBirth", "LastNameCurrent", "Suffix"];
    checks.forEach(function (dCheck) {
      if (typeof fPerson["" + dCheck + ""] != "undefined") {
        if (fPerson["" + dCheck + ""] != "" && fPerson["" + dCheck + ""] != null) {
          if (dCheck == "LastNameAtBirth") {
            if (fPerson["LastNameAtBirth"] != fPerson.LastNameCurrent) {
              fName3 += "(" + fPerson["LastNameAtBirth"] + ") ";
            }
          } else if (dCheck == "RealName") {
            if (typeof fPerson["FirstName"] != "undefined") {
            } else {
              fName3 += fPerson["RealName"] + " ";
            }
          } else {
            fName3 += fPerson["" + dCheck + ""] + " ";
          }
        }
      }
    });

    const arr = [fName1, fName2, fName3, fName4];
    var longest = arr.reduce(function (a, b) {
      return a.length > b.length ? a : b;
    });

    const fName = longest;

    let sName;
    if (fPerson["ShortName"]) {
      sName = fPerson["ShortName"];
    } else {
      sName = fName;
    }
    // fName = full name; sName = short name
    return [fName.trim(), sName.trim()];
  }
}

// Replace certain characters with HTML entities
// Used in Family Timeline and My Menu
export function htmlEntities(str) {
  return String(str)
    .replaceAll(/&/g, "&amp;")
    .replaceAll(/</g, "&lt;")
    .replaceAll(/>/g, "&gt;")
    .replaceAll(/"/g, "&quot;")
    .replaceAll(/'/g, "&apos;");
}

// Used in Draft List and My Menu
export async function showDraftList() {
  if (localStorage.drafts) {
    await updateDraftList();
  }
  $("#myDrafts").remove();
  $("body").append($("<div id='myDrafts'><h2>My Drafts</h2><x>x</x><table></table></div>"));
  $("#myDrafts").dblclick(function () {
    $(this).slideUp();
  });
  $("#myDrafts x").click(function () {
    $(this).parent().slideUp();
  });
  $("#myDrafts").draggable();

  if (localStorage.drafts != undefined && localStorage.drafts != "[]") {
    window.drafts = JSON.parse(localStorage.drafts);
    window.draftCalls = 0;
    window.tempDraftArr = [];
    window.drafts.forEach(function (draft, index) {
      const theWTID = draft[0];
      if (!isOK(theWTID)) {
        delete window.drafts[index];
        window.draftCalls++;
      } else {
        getWikiTreePage("Drafts", "/index.php", "title=" + theWTID + "&displayDraft=1").then((res) => {
          /*
        $.ajax({
          url: "https://www.wikitree.com/index.php?title=" + theWTID + "&displayDraft=1",
          type: "GET",
          dataType: "html", // added data type
          success: function (res) {
*/
          window.draftCalls++;
          const dummy = $(res);
          const aWTID = dummy.find("a.pureCssMenui0 span.person").text();
          if (dummy.find("div.status:contains('You have an uncommitted')").length) {
            window.tempDraftArr.push(aWTID);
            const useLink = dummy.find("a:contains(Use the Draft)").attr("href");
            if (useLink != undefined) {
              const personID = useLink.match(/&u=[0-9]+/)[0].replace("&u=", "");
              const draftID = useLink.match(/&ud=[0-9]+/)[0].replace("&ud=", "");
              window.drafts.forEach(function (yDraft) {
                if (yDraft[0] == aWTID) {
                  yDraft[3] = personID;
                  yDraft[4] = draftID;
                }
              });
            }
          }
          if (window.draftCalls == window.drafts.length) {
            window.newDraftArr = [];
            window.drafts.forEach(function (aDraft) {
              if (window.tempDraftArr.includes(aDraft[0]) && isOK(aDraft[0])) {
                window.newDraftArr.push(aDraft);
              }
            });

            window.newDraftArr.forEach(function (xDraft) {
              let dButtons = "<td></td><td></td>";
              if (xDraft[3] != undefined) {
                dButtons =
                  "<td><a href='https://www.wikitree.com/index.php?title=Special:EditPerson&u=" +
                  xDraft[3] +
                  "&ud=" +
                  xDraft[4] +
                  "' class='small button'>USE</a></td><td><a href='https://www.wikitree.com/index.php?title=Special:EditPerson&u=" +
                  xDraft[3] +
                  "&dd=" +
                  xDraft[4] +
                  "' class='small button'>DISCARD</a></td>";
              }

              $("#myDrafts table").append(
                $(
                  "<tr><td><a href='https://www.wikitree.com/index.php?title=" +
                    xDraft[0] +
                    "&displayDraft=1'>" +
                    xDraft[2] +
                    "</a></td>" +
                    dButtons +
                    "</tr>"
                )
              );
            });
            $("#myDrafts").slideDown();
            if (window.newDraftArr.length == 0) {
              $("#myDrafts").append($("<p>No drafts!</p>"));
            }
            localStorage.setItem("drafts", JSON.stringify(window.newDraftArr));
          }
          /*
          },
          error: function (res) {},
*/
        });
      }
    });
  } else {
    $("#myDrafts").append($("<p>No drafts!</p>"));
    $("#myDrafts").slideDown();
  }
}

// Used in saveDraftList (above)
export async function updateDraftList() {
  const profileWTID = $("a.pureCssMenui0 span.person").text();
  let addDraft = false;
  let timeNow = Date.now();
  let lastWeek = timeNow - 604800000;
  let isEditPage = false;
  let theName = $("h1")
    .text()
    .replace("Edit Profile of ", "")
    .replaceAll(/\//g, "")
    .replaceAll(/ID|LINK|URL/g, "");
  if ($("#draftStatus:contains(saved),#status:contains(Starting with previous)").length) {
    addDraft = true;
  } else if ($("body.page-Special_EditPerson").length) {
    isEditPage = true;
  }
  if (localStorage.drafts) {
    let draftsArr = [];
    let draftsArrIDs = [];
    let drafts = JSON.parse(localStorage.drafts);
    drafts.forEach(function (draft) {
      if (!draftsArrIDs.includes(draft[0])) {
        if ((addDraft == false || window.fullSave == true) && draft[0] == profileWTID && isEditPage == true) {
        } else {
          if (draft[1] > lastWeek) {
            draftsArr.push(draft);
            draftsArrIDs.push(draft[0]);
          }
        }
      }
    });

    if (!draftsArrIDs.includes(profileWTID) && addDraft == true) {
      draftsArr.push([profileWTID, timeNow, theName]);
    }

    localStorage.setItem("drafts", JSON.stringify(draftsArr));
  } else {
    if (addDraft == true && window.fullSave != true) {
      localStorage.setItem("drafts", JSON.stringify([[profileWTID, timeNow, theName]]));
    }
  }
  return true;
}

export function isWikiTreeUrl(url) {
  if (url) {
    return /^http(s)?:\/+((www|staging)\.)?wikitree\.com\//i.test(url);
  }
  return false;
}

function backupData(sendResponse) {
  const data = {};
  data.changeSummaryOptions = localStorage.LSchangeSummaryOptions;
  data.myMenu = localStorage.customMenu;
  data.extraWatchlist = localStorage.extraWatchlist;
  const clipboardDB = window.indexedDB.open("Clipboard", window.idbv2);
  clipboardDB.onsuccess = function (event) {
    let cdb = clipboardDB.result;
    try {
      let transaction = cdb.transaction(["Clipboard"]);
      let req = transaction.objectStore("Clipboard").getAll();
      req.onsuccess = function (event) {
        data.clipboard = JSON.stringify(req.result);
        sendResponse({ ack: "feature data attached", backup: data });
      };
    } catch (e) {
      console.warn(e); // we weren't able to export any clipboard data, but we can still download the rest
      sendResponse({ ack: "feature data attached", backup: data });
    }
  };
}

function restoreData(data, sendResponse) {
  if (data.changeSummaryOptions) {
    localStorage.setItem("LSchangeSummaryOptions", data.changeSummaryOptions);
  }
  if (data.myMenu) {
    localStorage.setItem("customMenu", data.myMenu);
  }
  if (data.extraWatchlist) {
    localStorage.setItem("extraWatchlist", data.extraWatchlist);
  }
  if (data.clipboard) {
    const clipboard = JSON.parse(data.clipboard);
    clipboard.forEach(function (aClipping) {
      addToDB("Clipboard", 1, "Clipboard", aClipping);
    });
    sendResponse({ ack: "data restored" });
  }
}

function addToDB(db, dbv, os, obj) {
  const aDB = window.indexedDB.open(db, dbv);
  aDB.onsuccess = function (event) {
    let xdb = aDB.result;
    let insert = xdb.transaction([os], "readwrite").objectStore(os).put(obj);
  };
}

export function extensionContextInvalidatedCheck(error) {
  if (error.message.match("Extension context invalidated")) {
    console.log("Extension context invalidated");
    const errorMessage = "WikiTree Browser Extension has been updated. <br>Please reload the page and try again.";
    // Put the message in a small friendly popup, not an alert(), in the centre of the page, fixed position, with an X to close it.
    const messageDiv = $(
      "<div id='errorDiv' class='contextInvalidated'><button id='closeErrorMessageButton'>x</button>" +
        errorMessage +
        "</div>"
    );
    $("body").append(messageDiv);
    $("#closeErrorMessageButton").on("click", function () {
      $("#errorDiv").slideUp();
      setTimeout(function () {
        $("#errorDiv").remove();
      }, 1000);
    });
  }
}

export function showAlert(content, title, where = "body") {
  // replace the browser's alert() method with an HTML-based modal dialog
  // this is based on the settings dialog from the WBE options window
  let $title = $("<div></div>").text(title || "WikiTree Browser Extension"); // use || to prevent title from being blank
  let $content = $("<div></div>").html(content ?? "");
  if ($content.children().length === 0) {
    // if they only passed in text without any HTML elements, replace CR/LF with <br> tags
    $content.html($content.html().replace(/\r?\n/g, "<br /> "));
  }
  let $dialog = $('<dialog id="showAlertDialog">').append([
    $title.addClass("dialog-header").prepend(
      $('<a href="#" class="close">&#x2715;</a>') // add close button before the title text
    ),
    $content.addClass("dialog-content"),
  ]);
  $dialog.appendTo($(where).remove("#showAlertDialog")).on("click", function (e) {
    if (e.target === this) {
      this.close(); // close modal if the backdrop is clicked
    }
  });
  $dialog
    .find(".close")
    .on("auxclick", function (e) {
      e.stopPropagation();
      e.preventDefault();
    })
    .on("click", function (e) {
      e.stopPropagation();
      e.preventDefault();
      this.closest("dialog")?.close();
    });
  $dialog.get(0).showModal();
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request && request.action) {
    if (request.action === "backupData") {
      backupData(sendResponse);
    } else if (request.action === "restoreData") {
      restoreData(request.payload, sendResponse);
    } else {
      sendResponse({ nak: "UNKNOWN_ACTION", action: request.action });
    }
  } else {
    sendResponse({ nak: "INVALID_MESSAGE" });
  }
  return true; // potentially prevent the "The message port closed before a response was received." error
});

export const treeImageURL = chrome.runtime.getURL("images/tree.gif");
