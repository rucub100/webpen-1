// dark mode
document
    .getElementById("toggle-dark-mode")
    .addEventListener("click", async () => {
        const isDarkMode = await window.electron.darkModeToggle();
        document.getElementById("theme-source").innerHTML = isDarkMode
            ? "Dark"
            : "Light";
    });

document
    .getElementById("reset-to-system")
    .addEventListener("click", async () => {
        await window.electron.darkModeSystem();
        document.getElementById("theme-source").innerHTML = "System";
    });

// versions
document.getElementById(
    "nodeVersion"
).innerText = window.electron.nodeVersion();

document.getElementById(
    "chromeVersion"
).innerText = window.electron.chromeVersion();

document.getElementById(
    "electronVersion"
).innerText = window.electron.electronVersion();
