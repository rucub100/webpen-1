const forEachPage = (action) => {
    for (const page in top.pages) {
        action(page);
    }
};

const updateNavigation = () => {
    forEachPage((page) => {
        if (page === top.currentPage) {
            document.getElementById(`goto-${page}`).classList.add("active");
        } else {
            document.getElementById(`goto-${page}`).classList.remove("active");
        }
    });
};

updateNavigation();

top.updateNavigation = updateNavigation;

forEachPage((page) => {
    document.getElementById(`goto-${page}`).addEventListener("click", () => {
        if (page !== top.currentPage) {
            top.openPage(`${page}`);
        }
    });
});

top.explorer.addListener((explorer) => {
    if (!explorer) {
        document
            .querySelectorAll("li span")
            .forEach((value) => (value.style.visibility = "collapse"));
    } else {
        document
            .querySelectorAll("li span")
            .forEach((value) => (value.style.visibility = ""));
    }
});
