import Users from "../models/UserModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const getUsers = async (req, res) => {
    try {
        const users = await Users.findAll({
            attributes:['id', 'name', 'email'] 
        });
        res.json(users)
    } catch (error) {
        console.log(error)
    }
}

export const register = async (request, response) => {
    let name = request.body.name;
    let email = request.body.email;
    let password = request.body.password;
    let password2 = request.body.password2;

    if(password !== password2) return response.status(400).json(
        {message:"Password dan Confirm Password tidak cocok"}
    );

    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);

    try {
        await Users.create({
            name: name,
            email: email,
            password: hashPassword
        });
        response.json({message: "Register user berhasil"})
    } catch (error) {
        console.log(error);
    }
}

export const login = async (request, response) => {
    try {
        const user = await Users.findAll({
            where:{
                email:request.body.email
            }
        });

        const match = await  bcrypt.compare(request.body.password, user[0].password);
        if(!match) return response.status(400).json({message: "Wrong password"});
        const userId = user[0].id
        const name = user[0].name
        const email = user[0].email
        const accessToken = jwt.sign({userId, name, email}, process.env.ACCESS_TOKEN_SECRET,{
            expiresIn: '25s'
        });
        const refreshToken = jwt.sign({userId, name, email}, process.env.REFRESH_TOKEN_SECRET,{
            expiresIn: '1d'
        });
        await Users.update({refresh_token: refreshToken},{
            where: {
                id: userId
            }
        });
        response.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000, //24 jam
        });
        response.json({accessToken});
    } catch (error) {
        response.status(404).json({message: "Email tidak ditemukan"})
    }
}

export const logout = async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return res.sendStatus(204);

    const user = await Users.findAll({
        where: {
            refresh_token: refreshToken
        }
    });

    // Jika tidak ada kecocokan terhadap data yang dikirim dengan yang ada di database
    if (!user[0]) return res.sendStatus(204);
    const userId = user[0].id
    await Users.update({refresh_token: null}, {
        where: {
            id: userId
        }
    });

    res.clearCookie('refreahToken');
    return  res.sendStatus(200)
}

// export const hapusAkun = async (request, response) => {
//     let id = request.params.id
//     Users.destroy({ where: { id: id } })
//         .then(result => {
//             /** if update's process success */
//             return response.json({
//                 success: true,
//                 message: `Account has been deleted`
//             })
//         })
//         .catch(error => {
//             /** if update's process fail */
//             return response.json({
//                 success: false,
//                 message: error.message
//             })
//         })
// }

