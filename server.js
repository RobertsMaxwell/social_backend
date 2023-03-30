const admin = require('firebase-admin');
const express = require("express");
const cors = require("cors")
var bp = require("body-parser")

const server = express()
const port = 3000

server.use(express.json());
server.use(cors())

// firebase

let messages = {}
let users = {}

admin.initializeApp({credential: admin.credential.applicationDefault(), databaseURL: "https://social-7d736-default-rtdb.firebaseio.com/"})
const db = admin.database()
const auth = admin.auth()

const usersRef = db.ref("/users")
usersRef.on('value', (snap) => {
    users = snap.val()
})

const messageRef = db.ref("/messages")
messageRef.on('value', (snapshot) => {
    messages = snapshot.val()
})

const validateUser = (req, res, next) => {
    const userToken = req.body.userToken
    auth.verifyIdToken(userToken)
    .then(decoded => {
        const uid = decoded.uid
        req.body.uid = uid
        auth.getUser(uid)
        .then(userRecord => {
            req.body.name = userRecord.email.split("@")[0]
            next()
        })
    })
    .catch(e => {
        return res.status(400).send({
            message: e.message
         });
    })
}

server.get("/messages", (req, res) => {
    res.json(messages)
})

server.get("/users/:user", (req, res) => {
    if(users[req.params.user]) {
        res.json(users[req.params.user])
    } else {
        return res.status(404).send({message: "User does not exist"})
    }
})

server.post("/like", validateUser, (req, res) => {
    const postRef = db.ref("messages/" + req.body.postId)
    const postLikes = messages[req.body.postId].likes

    if(req.body.like) {
        const userLikeRef = db.ref("users/" + req.body.name + "/likes")
        userLikeRef.push(req.body.postId)
        postRef.update({likes: postLikes + 1})
    } else {
        let post = ""
        for(const key in users[req.body.name].likes) {
            if(users[req.body.name].likes[key] === req.body.postId) {
                post = key
                break
            }
        }

        const userLikeRef = db.ref("users/" + req.body.name + "/likes/" + post)
        userLikeRef.remove()
        postRef.update({likes: postLikes - 1})
    }
})

server.post("/createuser", validateUser, (req, res) => {
    const setterRef = db.ref("users/" + req.body.username)
    setterRef.set({
        pfp: Math.ceil(Math.random() * 5),
        likes: [""]
    })
})

server.post("/message", validateUser, (req, res) => {
    messageRef.push().set({
        author: req.body.name,
        pfp: users[req.body.name].pfp,
        message: req.body.message,
        likes: 0,
        time: new Date().getTime()
    }).then(() => {
        return res.status(200).send({
            message: "Message Created"
        })
    })
})

server.listen(port, () => {
    console.log("listening on port " + port)
})