document.addEventListener('DOMContentLoaded', function() {
    const key = 1;

    // Event listener for adding a user
    const addButton = document.getElementById('add');
    if (addButton) {
        addButton.addEventListener('click', async () => {
            const inputField = document.getElementById('input-field');
            if (!inputField || !inputField.value.trim()) {
                console.error('Input field is missing or empty.');
                return;
            }

            const user = inputField.value.trim();
            await addUser(user);
        });
    } else {
        console.error('Element with id "add" not found.');
    }

    // Event listener for clearing all users
    const clearButton = document.getElementById('clrAll');
    if (clearButton) {
        clearButton.addEventListener('click', () => {
            localStorage.clear();
            returnUsers();
        });
    } else {
        console.error('Element with id "clrAll" not found.');
    }

    // Load users from localStorage on page load
    reload();

    // Function to add a user to localStorage and update UI
    async function addUser(user) {
        try {
            const response = await fetch(`https://codeforces.com/api/user.rating?handle=${user}`);
            const data = await response.json();
            
            if (data.status === "FAILED") {
                console.error('Failed to fetch user data.');
                return;
            }

            const users = localStorage.getItem(key) ? JSON.parse(localStorage.getItem(key)) : [];
            users.push(user);
            localStorage.setItem(key, JSON.stringify(users));

            returnUsers();
        } catch (error) {
            console.error('Error adding user:', error);
        }
    }

    // Function to display users from localStorage
    async function returnUsers() {
        const users = localStorage.getItem(key);
        if (!users) {
            document.getElementById('cards-div').innerHTML = '';
            return;
        }

        try {
            const usersArray = JSON.parse(users);
            const uniqueUsers = [...new Set(usersArray)]; // Ensure unique users

            const handlesString = uniqueUsers.join(';');
            const response = await fetch(`https://codeforces.com/api/user.info?handles=${handlesString}`);
            const data = await response.json();

            if (!data.result) {
                console.error('Failed to fetch user info.');
                return;
            }

            const cardsDiv = document.getElementById('cards-div');
            cardsDiv.innerHTML = '';

            data.result.forEach(user => {
                const fullName = `${user.firstName} ${user.lastName}`;

                cardsDiv.innerHTML += `
                    <div class="card" id="${user.handle}">
                        <div class="title-section">
                            <div class="user-info-section">
                                <div class="user-img-div">
                                    <img src="${user.titlePhoto}" alt="" class="user-img">
                                </div>
                                <div class="name-section">
                                    <div class="name-div">
                                        <h3 class="name">${fullName}</h3>
                                    </div>
                                    <div class="user-name-div">
                                        <h4 class="user-name">@${user.handle}</h4>
                                    </div>
                                </div>
                            </div>
                            
                        </div>
                        <div class="ratings-section">
                            <div class="curr-rating rating-div">
                                <h2 class="rating-score">${user.rank}</h2>
                                <p>Current Rank</p>
                            </div>
                            <div class="old-rating rating-div">
                                <h2 class="rating-score">${user.rating}</h2>
                                <p>Current Rating</p>
                            </div>
                            <div class="max-rating rating-div">
                                <h2 class="rating-score">${user.maxRating}</h2>
                                <p>Max Rating</p>
                            </div>
                        </div>
                    </div>`;
            });
        } catch (error) {
            console.error('Error displaying users:', error);
        }
    }

    function reload() {
        returnUsers();
    }
});
