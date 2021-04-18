const { ipcMain } = require("electron");

const targetFilters = [];

// #region Functions ----------------------------------------------------------

const addTargetFilter = (filter) => {
    targetFilters.push(filter);
};

const deleteTargetFilter = (index) => {
    targetFilters.splice(index, 1);
};

const updateTargetFilter = (index, filter) => {
    targetFilters[index] = filter;
};

const _getUserInfo = (url) => {
    if (url.username) {
        return url.username + (url.password ? `:${url.password}` : "") + "@";
    }

    return "";
};

const testScope = (url) => {
    if (
        targetFilters.length == 0 ||
        targetFilters.filter((f) => f.enabled).length == 0
    ) {
        return false;
    }

    const _url = new URL(url);
    const scheme = _url.protocol;
    const authority = _getUserInfo(_url) + _url.host;
    const path = _url.pathname;

    const filters = targetFilters.filter(
        (x) => x.enabled && (x.scheme === "any" || x.scheme === scheme)
    );

    for (filter of filters) {
        if (
            new RegExp(filter.authority).test(authority) &&
            new RegExp(filter.path).test(path)
        ) {
            return true;
        }
    }

    return false;
};

// #endregion

// #region IPC ----------------------------------------------------------------

ipcMain.handle("target:get-scope", () => {
    return [...targetFilters];
});

ipcMain.handle("target:add-filter", (_event, filter) => {
    addTargetFilter(filter);
});

ipcMain.handle("target:delete-filter", (_event, index) => {
    if (index >= 0 && index < targetFilters.length) {
        deleteTargetFilter(index);
    } else {
        console.warn(
            `Cannot delete target filter with index ${index}, because its out of the range [0, ${targetFilters.length})`
        );
    }
});

ipcMain.handle("target:update-filter", (_event, index, filter) => {
    if (index >= 0 && index < targetFilters.length) {
        updateTargetFilter(index, filter);
    } else {
        console.warn(
            `Cannot update target filter with index ${index}, because its out of the range [0, ${targetFilters.length})`
        );
    }
});

// #endregion

module.exports = {
    testScope,
};
