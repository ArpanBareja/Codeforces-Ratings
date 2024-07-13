chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'addUser') {
        addUser(message.user);
    } else if (message.action === 'clearUsers') {
        clearUsers();
    } else if (message.action === 'getUsers') {
        getUsers();
    } else if (message.action === 'deleteUser') {
        deleteUser(message.handle);
    }

    async function addUser(user) {
    try {
        if (!user || user.trim() === '') {
            console.log('Empty user input.');
            chrome.runtime.sendMessage({ action: 'showAlert', message: 'Please enter a valid user handle.' });
            return;
        }

        const { users } = await new Promise((resolve, reject) => {
            chrome.storage.local.get({ users: [] }, result => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(result);
                }
            });
        });

        const userExists = users.some(u => u.user === user);
        if (userExists) {
            console.log(`User '${user}' already exists.`);
            chrome.runtime.sendMessage({ action: 'showAlert', message: `User '${user}' is already added.` });
            return;
        }

        // Send message to show loading indicator
        chrome.runtime.sendMessage({ action: 'showLoading' });

        const response = await fetch(`https://codeforces.com/api/user.rating?handle=${user}`);
        const data = await response.json();

        if (data.status === "OK") {
            const newUser = { user, data };
            const updatedUsers = [...users, newUser];
            chrome.storage.local.set({ users: updatedUsers }, function() {
                if (chrome.runtime.lastError) {
                    console.error('Error storing user:', chrome.runtime.lastError);
                } else {
                    console.log('Successfully stored user:', newUser);
                    getUsers();
                }
            });
        } else {
            chrome.runtime.sendMessage({ action: 'invalidUser', user });
            getUsers() ;
        }

        // Send message to hide loading indicator
        chrome.runtime.sendMessage({ action: 'hideLoading' });

    } catch (error) {
        console.error('Error adding user:', error);
        // Send message to hide loading indicator in case of error
        chrome.runtime.sendMessage({ action: 'hideLoading' });
    }
}


    function clearUsers() {
        chrome.storage.local.clear(function() {
            if (chrome.runtime.lastError) {
                console.error('Error clearing users:', chrome.runtime.lastError);
            } else {
                console.log('Successfully cleared users.');
                getUsers();
            }
        });
    }

    async function getUsers() {
        let users = [];
    
         try{
            users = await new Promise((resolve, reject) => {
                chrome.storage.local.get({ users: [] }, result => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve(result.users || []);
                    }
                });
            });
    
            if (users.length === 0) {
                chrome.runtime.sendMessage({ action: 'updateUI', users: [] });
                return;
            }
    
            const handlesString = users.map(u => u.user).join(';');
            const response = await fetch(`https://codeforces.com/api/user.info?handles=${handlesString}`);

    
            if (response) {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
    
                const apiData = await response.json();
    
                if (apiData.status === "OK") {
                    chrome.runtime.sendMessage({ action: 'updateUI', users: apiData.result });
                } else {
                    throw new Error(`API error! Status: ${apiData.status}`);
                }
            } else {
                console.warn('Fetch operation timed out, displaying locally stored data.');
                chrome.runtime.sendMessage({ action: 'updateUI', users });
    
            }
        } catch (error) {
            console.error('Error getting users:', error);
            chrome.runtime.sendMessage({ action: 'siteDown', users });
            return ;
        }
    }

    async function deleteUser(handle) {
        try {
            // Retrieve the users from Chrome's local storage
            const { users } = await new Promise((resolve, reject) => {
                chrome.storage.local.get({ users: [] }, result => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve(result);
                    }
                });
            });
    
            console.log('Users before deletion:', users);
    
            // Log individual user objects to inspect their properties
            users.forEach((user, index) => {
                console.log(`User ${index}:`, user);
            });
    
            
            const normalizedHandle = handle.toLowerCase().trim();
    
            
            const updatedUsers = users.filter(user => user.user.toLowerCase().trim() !== normalizedHandle);
    
            // Log the updated users array to verify the deletion
            console.log('Users after deletion:', updatedUsers);
    
            // Store the updated list back in Chrome's local storage
            chrome.storage.local.set({ users: updatedUsers }, function() {
                if (chrome.runtime.lastError) {
                    console.error('Error deleting user:', chrome.runtime.lastError);
                } else {
                    console.log(`Successfully deleted user: ${handle}`);
                    getUsers();
                }
            });
        } catch (error) {
            console.error('Error deleting user:', error);
        }
    }
    
});
