chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'addUser') {
        addUser(message.user);
    } else if (message.action === 'clearUsers') {
        clearUsers();
    } else if (message.action === 'getUsers') {
        getUsers();
    }

    async function generateKey() {
        return crypto.subtle.generateKey(
            {
                name: "AES-GCM",
                length: 256,
            },
            true,
            ["encrypt", "decrypt"]
        );
    }

    async function encryptData(data, key) {
        const encoder = new TextEncoder();
        const encodedData = encoder.encode(JSON.stringify(data)); // Ensure data is stringified
        const iv = crypto.getRandomValues(new Uint8Array(12));

        const encryptedData = await crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv,
            },
            key,
            encodedData
        );

        return { iv: Array.from(iv), encryptedData: Array.from(new Uint8Array(encryptedData)) };
    }

    async function decryptData(encryptedData, key) {
        const { iv, encryptedData: data } = encryptedData;
        const ivArray = new Uint8Array(iv);
        const encryptedArray = new Uint8Array(data);

        console.log('Decrypting data with IV:', ivArray);
        console.log('Encrypted data:', encryptedArray);

        try {
            const decryptedArray = await crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv: ivArray,
                },
                key,
                encryptedArray
            );

            const decoder = new TextDecoder();
            const decryptedString = decoder.decode(decryptedArray);
            console.log('Decrypted string:', decryptedString);

            // Attempt to parse decrypted data as JSON
            try {
                const decryptedData = JSON.parse(decryptedString);
                console.log('Decrypted data:', decryptedData);
                return decryptedData;
            } catch (e) {
                // If parsing as JSON fails, return decrypted data as-is
                console.error('Failed to parse decrypted data as JSON:', e);
                return decryptedString;
            }
        } catch (e) {
            console.error('Decryption error:', e);
            throw e;
        }
    }

    async function addUser(user) {
        try {
            // Trim and check if input is empty
            if (!user || user.trim() === '') {
                console.log('Empty user input.');
                alert('Please enter a valid user handle.');
                return;
            }

            // Fetch existing users from storage
            const { users } = await new Promise((resolve, reject) => {
                chrome.storage.local.get({ users: [] }, result => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve(result);
                    }
                });
            });

            // Check if user handle already exists
            const userExists = users.some(u => u.encryptedUser && u.encryptedUser.user === user);
            if (userExists) {
                console.log(`User '${user}' already exists.`);
                alert(`User '${user}' is already added.`);
                return; // Exit function if user handle already exists
            }

            // Fetch user data from Codeforces API
            const response = await fetch(`https://codeforces.com/api/user.rating?handle=${user}`);
            const data = await response.json();

            if (data.status === "OK") {
                // Generate encryption key
                const key = await generateKey();

                // Encrypt user data
                const encryptedUser = await encryptData({ user, data }, key);

                // Export key as JWK (JSON Web Key) format
                const keyExported = await crypto.subtle.exportKey("jwk", key);

                // Prepare new user object
                const newUser = { encryptedUser, key: keyExported };

                // Update local storage with new user
                const updatedUsers = [...users, newUser];
                chrome.storage.local.set({ users: updatedUsers }, function() {
                    if (chrome.runtime.lastError) {
                        console.error('Error storing user:', chrome.runtime.lastError);
                    } else {
                        console.log('Successfully stored user:', newUser);
                        getUsers(); // Trigger UI update after storing user
                    }
                });
            } else {
                // Handle invalid user response
                chrome.runtime.sendMessage({ action: 'invalidUser', user });
            }
        } catch (error) {
            console.error('Error adding user:', error);
        }
    }

    function clearUsers() {
        chrome.storage.local.clear(function() {
            if (chrome.runtime.lastError) {
                console.error('Error clearing users:', chrome.runtime.lastError);
            } else {
                console.log('Successfully cleared users.');
                getUsers(); // Trigger UI update after clearing users
            }
        });
    }

    async function getUsers() {
        try {
            const { users } = await new Promise((resolve, reject) => {
                chrome.storage.local.get({ users: [] }, result => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve(result);
                    }
                });
            });

            if (users.length === 0) {
                chrome.runtime.sendMessage({ action: 'updateUI', users: [] });
                return;
            }

            const uniqueUsers = [];
            for (const { encryptedUser, key: keyData } of users) {
                if (!encryptedUser || !keyData) {
                    console.error('Missing encrypted user data or key data:', encryptedUser, keyData);
                    continue;
                }

                console.log('Encrypted user data:', encryptedUser);
                console.log('Key data:', keyData);

                const key = await crypto.subtle.importKey(
                    "jwk",
                    keyData,
                    {
                        name: "AES-GCM",
                    },
                    true,
                    ["decrypt"]
                );

                console.log('Decryption key:', key);
                const { user, data } = await decryptData(encryptedUser, key);
                console.log('Decrypted user:', user);
                uniqueUsers.push({ user, data });
            }

            const handlesString = uniqueUsers.map(u => u.user).join(';');
            const response = await fetch(`https://codeforces.com/api/user.info?handles=${handlesString}`);

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const apiData = await response.json();

            if (apiData.status === "OK") {
                chrome.runtime.sendMessage({ action: 'updateUI', users: apiData.result });
            } else {
                throw new Error(`API error! Status: ${apiData.status}`);
            }
        } catch (error) {
            console.error('Error getting users:', error);
        }
    }
});
