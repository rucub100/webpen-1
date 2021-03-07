const defaultTab = "scope";
if (!top.target) {
    top.target = { tab: defaultTab };
} else if (!top.target.tab) {
    top.target.tab = defaultTab;
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

openTab(top.target.tab);
