// Load environment variables from .env file
// require('dotenv').config();

const socket = io();
let username = '';
let mapInitialized = false;

// Function to initialize the map and start location tracking
function initializeMap() {
    if (!mapInitialized) {
        mapInitialized = true;
        const map = L.map("map").setView([0, 0], 16);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: 'Ashish Home'
        }).addTo(map);

        const userMarkers = {};

        // Watch user's location and send updates to the server
        if (navigator.geolocation) {
            navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude: lat, longitude: long } = position.coords;
                    socket.emit("send-location", { lat, long });
                },
                (err) => {
                    console.error(err);
                },
                {
                    enableHighAccuracy: true,
                    maximumAge: 0,
                    timeout: 5000
                }
            );
        }

        // Handle location messages from the server to update markers on the map
        socket.on('location-message', (data) => {
            const { id, lat, long, username } = data;
            
            if (userMarkers[id]) {
                userMarkers[id].setLatLng([lat, long]).update();
            } else {
                userMarkers[id] = L.marker([lat, long]).addTo(map)
                    .bindPopup(`User ${username || id} is here`)
                    .openPopup();
            }
        });

        // Handle new user connection
        socket.on('user-connected', (data) => {
            const { id } = data;
            console.log(`User ${id} connected`);
        });

        // Handle user disconnection
        socket.on('user-disconnected', (data) => {
            const { id } = data;
            console.log(`User ${id} disconnected`);
            if (userMarkers[id]) {
                map.removeLayer(userMarkers[id]);
                delete userMarkers[id];
            }
        });

        // Handle update user list (for debugging)
        socket.on('update-user-list', (users) => {
            console.log('Connected users:', users);
        });

        // Function to fetch weather data and update UI
        function fetchWeather(lat, long) {
            const apiKey = 'your openweather api key';
            const apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${long}&units=metric&appid=${apiKey}`;
            
            fetch(apiUrl)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data => {
                    const { main, weather, name, sys } = data;
                    const iconUrl = `https://openweathermap.org/img/wn/${weather[0].icon}.png`;
                    document.getElementById('weather-icon').innerHTML = `<img src="${iconUrl}" alt="Weather Icon" class="weather-icon" />`;
                    document.getElementById('weather-text').innerText = `${weather[0].main}, ${Math.round(main.temp)}°C`;
                    document.getElementById('weather-text1').innerText = `${name}, ${sys.country}`;
                })
                .catch(error => {
                    console.error('Error fetching weather:', error);
                });
        }

        // Listen for location updates and fetch weather data
        socket.on('location-message', (data) => {
            const { lat, long } = data;
            fetchWeather(lat, long);
        });
    }
}

// Event listener for "Set Username" button click
document.getElementById('set-username').addEventListener('click', () => {
    setUsername();
});

// Event listener for "Enter" key press in username input
document.getElementById('username').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        setUsername();
    }
});

// Function to set username and initialize the map
function setUsername() {
    username = document.getElementById('username').value;
    if (username) {
        socket.emit('set-username', username);
        document.getElementById('username-container').style.display = 'none';
        initializeMap();
    } else {
        alert('Please enter a username');
    }
}
