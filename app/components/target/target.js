const defaultTab = "scope";
if (!top.target) {
    top.target = {
        tab: defaultTab,
        filter: [],
    };
}

const openTab = (tab) => {
    const tabLinks = document.getElementsByClassName("tablink");
    for (let i = 0; i < tabLinks.length; i++) {
        tabLinks[i].classList.remove("active");
    }

    const tabContent = document.getElementsByClassName("tabcontent");
    for (let i = 0; i < tabContent.length; i++) {
        tabContent[i].style.display = "none";
    }

    top.target.tab = tab;
    document.getElementById(tab + "-tablink").classList.add("active");
    document.getElementById(tab).style.display = "flex";
};

const showScopeFilter = (filters) => {
    const table = document.getElementById("scope-filter-table");
    const tbody = table.querySelector("tbody");

    tbody.querySelectorAll("tr").forEach((row) => row.remove());

    for (filter of filters) {
        const row = tbody.insertRow();
        row.insertCell().innerHTML = `<i class="far fa-${
            filter.enabled ? "check-" : ""
        }square fa-fw fa-lg"></i>`;
        row.insertCell().innerHTML = `${filter.scheme}`;
        row.insertCell().innerHTML = `${filter.authority}`;
        row.insertCell().innerHTML = `${filter.path}`;
        row.insertCell().innerHTML = `<i class="fas fa-pen fa-fw"></i><i class="fas fa-trash fa-fw"></i>`;
    }
};

const addScopeFilter = () => {
    const scheme = document.getElementById("schemes").value;
    const authority = document.getElementById("authority").value;
    const path = document.getElementById("path").value;

    top.target.filter.push({ enabled: true, scheme, authority, path });

    // TODO sync with main process

    showScopeFilter(top.target.filter);
};

window.onload = () => {
    openTab(top.target.tab);
    showScopeFilter(top.target.filter);
};
