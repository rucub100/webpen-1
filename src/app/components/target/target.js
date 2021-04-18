const defaultTab = "scope";
if (!top.target) {
    top.target = {
        tab: defaultTab,
        filters: [],
    };
}

let _editFilter;

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

const toggleFilterEnabled = async (index) => {
    const filter = top.target.filters[index];
    await top.electron.updateTargetFilter(index, {
        ...filter,
        enabled: !filter.enabled,
    });
    top.target.filters = await top.electron.getTargetScope();
    showScopeFilter(top.target.filters);
};

const deleteFilter = async (index) => {
    await top.electron.deleteTargetFilter(index);
    top.target.filters = await top.electron.getTargetScope();
    showScopeFilter(top.target.filters);
};

const editFilter = async (index) => {
    _editFilter = { index, filter: top.target.filters[index] };
    top.target.filters.splice(index, 1);
    showScopeFilter(top.target.filters);

    document.getElementById("schemes").value = _editFilter.filter.scheme;
    document.getElementById("authority").value = _editFilter.filter.authority;
    document.getElementById("path").value = _editFilter.filter.path;
};

const addScopeFilter = async () => {
    const scheme = document.getElementById("schemes").value;
    const authority = document.getElementById("authority").value;
    const path = document.getElementById("path").value;
    document.getElementById("authority").value = "";
    document.getElementById("path").value = "";

    if (_editFilter) {
        _editFilter.filter = { ..._editFilter.filter, scheme, authority, path };
        await top.electron.updateTargetFilter(
            _editFilter.index,
            _editFilter.filter
        );
        top.target.filters = await top.electron.getTargetScope();
        _editFilter = undefined;
    } else {
        await top.electron.addTargetFilter({
            enabled: true,
            scheme,
            authority,
            path,
        });
        top.target.filters = await top.electron.getTargetScope();
    }

    showScopeFilter(top.target.filters);
};

const showScopeFilter = (filters) => {
    const table = document.getElementById("scope-filter-table");
    const tbody = table.querySelector("tbody");

    tbody.querySelectorAll("tr").forEach((row) => row.remove());

    for (index in filters) {
        const filter = filters[index];
        const row = tbody.insertRow();
        row.insertCell().innerHTML = _editFilter
            ? ""
            : `<i class="far fa-${
                  filter.enabled ? "check-" : ""
              }square fa-fw fa-lg" onclick="toggleFilterEnabled(${index})"></i>`;
        row.insertCell().innerHTML = `${filter.scheme}`;
        row.insertCell().innerHTML = `${filter.authority}`;
        row.insertCell().innerHTML = `${filter.path}`;
        row.insertCell().innerHTML = _editFilter
            ? ""
            : `<i class="fas fa-pen fa-fw" onclick="editFilter(${index})"></i>
            <i class="fas fa-trash fa-fw" onclick="deleteFilter(${index})"></i>`;
    }
};

window.onload = async () => {
    openTab(top.target.tab);
    top.target.filters = await top.electron.getTargetScope();
    showScopeFilter(top.target.filters);
};
