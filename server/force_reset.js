const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function forceReset() {
    console.log("Starting forced reset...");

    // 1. Try to call the API
    try {
        await axios.post('http://localhost:3001/api/desconectar');
        console.log("API signaled success.");
    } catch (e) {
        console.log("API failed or server down. Proceeding with folder cleanup.");
    }

    // 2. Kill Chrome processes if any (Windows)
    const { exec } = require('child_process');
    exec('taskkill /F /IM chrome.exe /T', (err) => {
        if (err) console.log("No chrome processes found or error killing them.");

        // 3. Delete auth folder
        const authPath = path.join(__dirname, '.wwebjs_auth');
        if (fs.existsSync(authPath)) {
            try {
                fs.rmSync(authPath, { recursive: true, force: true });
                console.log("Auth folder deleted.");
            } catch (e) {
                console.log("Could not delete folder. Is it in use?", e.message);
            }
        }

        console.log("Reset complete. Please restart the backend server manually if it didn't auto-restart.");
    });
}

forceReset();
