document.addEventListener('DOMContentLoaded', function() {
    const addButton = document.getElementById('add');
    const clearButton = document.getElementById('clrAll');
    const inputField = document.getElementById('input-field');
    const cardsDiv = document.getElementById('cards-div');

    if (addButton) {
        addButton.addEventListener('click', async () => {
            if (!inputField || !inputField.value.trim()) {
                alert("Enter username");
            } else {
                const user = inputField.value.trim();
                chrome.runtime.sendMessage({ action: 'addUser', user });
                inputField.value = "";
            }
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

    inputField.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent default form submission
            addButton.click(); // Trigger click on add button
        }
    });

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'updateUI') {
            updateUI(message.users);
        } else if (message.action === 'invalidUser') {
            alert(`The username ${message.user} is invalid.`);
        } else if (message.action === 'showAlert') {
            alert(message.message);
        }
        else if( message.action == 'siteDown') {
            alert("Problem due to ongoing contest") ;
        }
    });

    showLoadingIndicator() ;

    chrome.runtime.sendMessage({ action: 'getUsers' });

    function updateUI(users) {
        if (!cardsDiv) {
            console.error('Element with id "cards-div" not found.');
            return;
        }
    
        cardsDiv.innerHTML = ''; // Clear existing cards
    
        if (users.length === 0) {
            return;
        }
    
        users.forEach(user => {
            let fullName = '';
            if (user.firstName != undefined ) {
                fullName += `${user.firstName}` ;
            } if( user.lastName != undefined ) {
                fullName += ` ${user.lastName}`;
            }
    
            const cardHtml = `
                <div class="card">
                    <div class="title-section">
                        <div class="user-info-section">
                            <div class="user-img-div">
                                <img src="${user.titlePhoto || 'default-image.jpg'}" alt="" class="user-img">
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
                        <button class="delete-button" data-handle="${user.handle}">Delete</button>
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
                </div>
            `;
    
            cardsDiv.insertAdjacentHTML('beforeend', cardHtml);
        });
    
        // Add event listeners for delete buttons
        document.querySelectorAll('.delete-button').forEach(button => {
            button.addEventListener('click', () => {
                const handle = button.dataset.handle;
                chrome.runtime.sendMessage({ action: 'deleteUser', handle });
            });
        });
    }

    // Function to add loading indicator
    function showLoadingIndicator() {
        cardsDiv.innerHTML = '<div class="card loading"></div>';
    }

    // Function to remove loading indicator
    function hideLoadingIndicator() {
        const loadingCard = cardsDiv.querySelector('.card.loading');
        if (loadingCard) {
            cardsDiv.removeChild(loadingCard);
        }
    }

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'showLoading') {
            showLoadingIndicator();
        } else if (message.action === 'hideLoading') {
            hideLoadingIndicator();
        }
    });
});
