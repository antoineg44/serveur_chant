(function () {
  "use strict";

  function initTopTabs() {
    var tabList = document.querySelector(".top-tabs");
    if (!tabList) {
      return;
    }

    var tabs = Array.prototype.slice.call(tabList.querySelectorAll("[role='tab']"));
    if (!tabs.length) {
      return;
    }

    function collapseTabs(focusTab) {
      tabs.forEach(function (currentTab) {
        var targetId = currentTab.getAttribute("data-tab-target");
        var panel = targetId ? document.getElementById(targetId) : null;

        currentTab.setAttribute("aria-selected", "false");
        currentTab.tabIndex = currentTab === focusTab ? 0 : -1;

        if (panel) {
          panel.hidden = true;
        }
      });
    }

    function clearSheetOpenState() {
      document.body.classList.remove("sheet-open");
    }

    function activateTab(tab) {
      var activeTargetId = tab.getAttribute("data-tab-target");

      clearSheetOpenState();

      tabs.forEach(function (currentTab) {
        var isActive = currentTab === tab;
        var targetId = currentTab.getAttribute("data-tab-target");

        currentTab.setAttribute("aria-selected", isActive ? "true" : "false");
        currentTab.tabIndex = isActive ? 0 : -1;
      });

      var uniqueTargetIds = Array.from(new Set(tabs
        .map(function (currentTab) {
          return currentTab.getAttribute("data-tab-target");
        })
        .filter(function (targetId) {
          return !!targetId;
        })));

      uniqueTargetIds.forEach(function (targetId) {
        var panel = document.getElementById(targetId);
        if (panel) {
          panel.hidden = targetId !== activeTargetId;
        }
      });
    }

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        if (tab.getAttribute("aria-selected") === "true") {
          collapseTabs(tab);
          return;
        }
        activateTab(tab);
      });

      tab.addEventListener("keydown", function (event) {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
          return;
        }

        event.preventDefault();
        var currentIndex = tabs.indexOf(tab);
        if (currentIndex < 0) {
          return;
        }

        var direction = event.key === "ArrowRight" ? 1 : -1;
        var nextIndex = (currentIndex + direction + tabs.length) % tabs.length;
        var nextTab = tabs[nextIndex];
        if (nextTab) {
          activateTab(nextTab);
          nextTab.focus();
        }
      });
    });

    var activeTab = tabs.find(function (tab) {
      return tab.getAttribute("aria-selected") === "true";
    }) || tabs[0];

    activateTab(activeTab);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTopTabs);
  } else {
    initTopTabs();
  }
})();
