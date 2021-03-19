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

// module.exports = {};
