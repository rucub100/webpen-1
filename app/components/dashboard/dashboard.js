// dark mode
document
    .getElementById("toggle-dark-mode")
    .addEventListener("click", async () => {
        const isDarkMode = await top.electron.darkModeToggle();
        document.getElementById("theme-source").innerHTML = isDarkMode
            ? "Dark"
            : "Light";
    });

document
    .getElementById("reset-to-system")
    .addEventListener("click", async () => {
        await top.electron.darkModeSystem();
        document.getElementById("theme-source").innerHTML = "System";
    });

// versions
document.getElementById("nodeVersion").innerText = top.electron.nodeVersion();

document.getElementById(
    "chromeVersion"
).innerText = top.electron.chromeVersion();

document.getElementById(
    "electronVersion"
).innerText = top.electron.electronVersion();
