require('dotenv').config();
const express = require('express');
const app = express();

const http = require('http').createServer(app);
const io = require('socket.io')(http);

const port = process.env.PORT || 3000;

app.set("view engine", "ejs");

app.use(express.static(__dirname + '/public'));

let users = {};

io.on('connection', (socket) => {
    console.log('a user connected');
    const userId = socket.id;

    // Notify all clients about the new user connection
    io.emit('user-connected', { id: userId });

    socket.on("set-username", (username) => {
        users[userId] = { username };
        io.emit("update-user-list", users);
    });

    socket.on("send-location", (data) => {
        if (users[userId]) {
            data.id = userId;
            data.username = users[userId].username;
            io.emit("location-message", data);
        }
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
        delete users[userId];
        io.emit('user-disconnected', { id: userId });
        io.emit("update-user-list", users);
    });
});

app.get('/', (req, res) => {
    res.render("index");
});

http.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
