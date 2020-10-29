const db = require("../models");
const Usuario = db.usuario;
const controllerUsuario = require("../controllers/usuario");

exports.Usuario = Usuario;

async function obtenerUsuario(username) {
    let userData = {}
    let request = {
        send: (data) => {
            userData = data;
        }
    }

    request.status = () => { return request };

    await controllerUsuario.buscarUsuario({ params: { username: username } }, request)

    if (userData.message == `Usuario con username=${username} no encontrado.` ||
        userData.message == `Error al devolver el usuario con username=${username}`) {
        return undefined
    }

    return userData.usuario
}

function modificarInventarioTrjetasUsuario1(usuario, tarjetas) {
    //console.log(tarjetas);
    let existe;
    for (const t of tarjetas){
        //console.log("Tarjeta a regalar: ", t);
        existe = false;

        for(let i = 0; i < usuario.tarjetas.length; i++){
            const ut = usuario.tarjetas[i];
            //console.log("Tarjeta de usuario: ", ut);
            if (t.id == ut.id && t.availability == ut.availability){
                existe = true;
                let nueva_cantidad = ut.cantidad - t.cantidad;
                if (nueva_cantidad < 0){
                    return { message: `No se cuenta con la cantidad suficiente tarjetas para regalar.` };
                }
                
                usuario.tarjetas[i].cantidad = nueva_cantidad;
                break;
            }
        }

        if (!existe){
            return { message: `La tajeta que se desea regalar no existe en el inventario del usuario.` }            
        }
    }

    return usuario;
}

function modificarInventarioTrjetasUsuario2(usuario, tarjetas) {
    listaTarjetas = []
    let existe;
    for (const t of tarjetas){
        existe = false;
        
        for(let i = 0; i < usuario.tarjetas.length; i++){
            if (usuario.tarjetas[i].id == t.id && usuario.tarjetas[i].availability == t.availability){
                existe = true;
                usuario.tarjetas[i].cantidad += t.cantidad;
                break;
            }    
        }

        if (!existe){
            usuario.tarjetas.push(t);
        }
    }

    return usuario;
}

async function actualizarUsuario(usuario) {
    let userData = {}
    let request = {
        send: (data) => {
            userData = data;
        }
    }

    request.status = () => { return request };

    await controllerUsuario.actualizarUsuario({ params: { username: usuario.username }, body: usuario }, request)

    if (userData.message == `¡No se encontro el usuario!` ||
        userData.message == `Error al actualizar el usuario con username=${usuario.username}.`) {
        return { message: userData.message }
    }

    return userData
}

exports.obtenerUsuario = obtenerUsuario;
exports.modificarInventarioTrjetasUsuario1 = modificarInventarioTrjetasUsuario1;
exports.modificarInventarioTrjetasUsuario2 = modificarInventarioTrjetasUsuario2;
exports.actualizarUsuario = actualizarUsuario;

exports.regalar = async function (req, res) {

    if (!req.body.usuario1 || !req.body.usuario2 || !req.body.giftcards) {
        return res.status(400).send({
            message: "Datos faltantes para dar el regalo."
        });
    }

    let usuario1 = await exports.obtenerUsuario(req.body.usuario1)
    if (!usuario1) {
        return res.status(400).send({
            message: `No se encontro el usuario ${req.body.usuario1}`
        });
    }

    let usuario2 = await exports.obtenerUsuario(req.body.usuario2)
    if (!usuario2) {
        return res.status(400).send({
            message: `No se encontro el usuario ${req.body.usuario2}`
        });
    }

    usuario1 = exports.modificarInventarioTrjetasUsuario1(usuario1, req.body.giftcards)
    if (usuario1.message) {
        return res.status(400).send({
            message: usuario1.message
        });
    }

    usuario2 = exports.modificarInventarioTrjetasUsuario2(usuario2, req.body.giftcards)
    if (usuario2.message) {
        return res.status(400).send({
            message: usuario2.message
        });
    }

    usuario1 = await exports.actualizarUsuario(usuario1);
    if (usuario1.message != 'Usuario actualizado correctamente.'){
        console.log(`Error modificando las tarjetas de ${req.body.usuario1}: `, usuario1.message);
        return res.status(500).send({
            message: usuario1.message
        });
    }

    usuario2 = await exports.actualizarUsuario(usuario2);
    if (usuario2.message != 'Usuario actualizado correctamente.'){
        console.log(`Error modificando las tarjetas de ${req.body.usuario2}: `, usuario2.message);
        return res.status(500).send({
            message: usuario2.message
        });
    }

    return res.status(200).send({
        message: `Tarjeta/s regaladas con exito.`
    });
}
