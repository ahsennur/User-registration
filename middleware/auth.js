const jwt = require('jsonwebtoken')
const User = require('../model/UserModel')

const SECRET = 'aurora'

module.exports = async (req, res, next) => {

    try{
        //check if user agents match
        if(req.session.useragent != req.headers['user-agent']){
            throw new Error()
        }

        //get the token and verify 
        const token = req.cookies.token
        const decoded = jwt.verify(token, SECRET)

        if (decoded._id != req.session.user) {
            throw new Error()
        }
        
        req.userId = req.session.user
        next()
    }catch(e){
        res.status(400).send("please login")
    }
}