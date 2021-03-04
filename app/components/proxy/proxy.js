document.getElementById("start-proxy").addEventListener("click", async () => {
    await top.electron.startProxy();
});

document.getElementById("stop-proxy").addEventListener("click", async () => {
    await top.electron.stopProxy();
});
