document.addEventListener('DOMContentLoaded', function() {
    const addButton = document.getElementById('add');
    const clearButton = document.getElementById('clrAll');

    if (addButton) {
        addButton.addEventListener('click', async () => {
            const inputField = document.getElementById('input-field');
            if (!inputField || !inputField.value.trim()) {
                alert("Enter username") ;
                //console.error('Input field is missing or empty.');
                //return;
            }
           else
           { const user = inputField.value.trim();
            chrome.runtime.sendMessage({ action: 'addUser', user });}
        });
    } else {
        console.error('Element with id "add" not found.');
    }

    if (clearButton) {
        clearButton.addEventListener('click', () => {
            chrome.runtime.sendMessage({ action: 'clearUsers' });
        });
    } else {
        console.error('Element with id "clrAll" not found.');
    }

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'updateUI') {
            updateUI(message.users);
        } else if (message.action === 'invalidUser') {
            alert(`The username ${message.user} is invalid.`);
        }
    });

    chrome.runtime.sendMessage({ action: 'getUsers' });

    function updateUI(users) {
        const cardsDiv = document.getElementById('cards-div');
        if (!cardsDiv) {
            console.error('Element with id "cards-div" not found.');
            return;
        }

        cardsDiv.innerHTML = '';
        if (users.length === 0) {
            return;
        }

        users.forEach(user => {
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
    }
});
