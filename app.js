const path = require('path')
const express = require('express')
const session = require('express-session')
const MongoStore = require('connect-mongo')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')

const User = require('./model/UserModel')
const auth = require('./middleware/auth')

const app = express()

const publicDirectoryPath = path.join(__dirname, './public')
const port = process.env.PORT || 3000

const db = () => {
    return mongoose.connect('mongodb://127.0.0.1:27017/authdb',
    {
        useNewUrlParser: true,
    }).then(connected => {
        console.log("Db is ready")
    })
}

const SECRET = 'aurora'

app.use(express.static(publicDirectoryPath))

app.use(bodyParser.json())
app.use(cookieParser())

app.use(express.urlencoded({
    extended: true
}))

app.use(session({
    secret: "a-secret",
    resave: true,
    saveUninitialized: false, 
    store: MongoStore.create({
        mongoUrl: 'mongodb://127.0.0.1:27017/authdb',
        collectionName: 'sessions'
    })
}))

app.post('/register', async (req, res, next) => {

    try{
        //create the user to register
        const user = new User()
        user.name = req.body.name,
        user.surname = req.body.surname,
        user.userName = req.body.userName,

        //hash the password
        user.password = bcrypt.hashSync( req.body.password, 10)

        //generate the jwt token 
        const token = jwt.sign({ _id: user._id.toString() }, SECRET, {expiresIn:'7d'} )
        user.token = token

        res.cookie("token", token, {
            httpOnly: true,
        })

        //session data
        req.session.useragent = req.headers['user-agent']
        req.session.user = user._id

        const saved = await user.save()
        res.status(201).send(saved)
    
    }catch(e){
        res.status(400).send("username exists")
    }
    
})

app.post('/login', async (req, res, next) => {

    try{
        //check database with the username
        const user = await User.findOne({userName: req.body.userName})
        if(user){

            //check if the hashed password matches
            const pass = bcrypt.compareSync(req.body.password, user.password)

            if(pass){

                //session data
                req.session.useragent = req.headers['user-agent']                
                req.session.user = user._id

                //generate the jwt token 
                const token = jwt.sign({ _id: user._id.toString() }, SECRET, {expiresIn:'7d'} )

                user.token = token
                const saved = await user.save()

                res.cookie("token", token, {
                    httpOnly: true,
                })

                res.status(200).send(saved)
            }
            else{
                res.status(400).send("wrong password")
            }
        }

        else{
            res.status(400).send('no such user')
        }
    
    }catch(e){
        res.status(400).send("cannot login")
    }
    
})

//list all users
app.get('/users', auth, async (req, res, next) => {

    try{
       const users = await User.find()
       const usersInfo = users.map(element => {
        return {
            name: element.name,
            surname : element.surname,
            userName : element.userName
        }
    })
        res.status(200).send(usersInfo)

    }catch(e){
        res.status(400).send("Cannot get users")
    }
    
})

app.get('/logout', auth, async (req, res, next) => {

    try{
        if(req.userId){
            //remove the data
            req.userId = undefined
            res.clearCookie("token")
            res.clearCookie("connect.sid")
            req.session.destroy() 
            req.session = null
        }
        res.status(200).send()
    }catch(e){
        res.status(400).send()
    }
    
})

db().then(() => {
    app.listen(port, () => {
        console.log(`Server is up on port ${port}`)
    })
})

