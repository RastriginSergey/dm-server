const Pokedex = require('pokedex-promise-v2');
const P = new Pokedex();
const User = require('../models/user');

function byName(req, res, next) {
    const {name} = req.query;
    P.getPokemonsList()
        .then(response => {
            const matches = response.results.filter(item => {
                const pattern = new RegExp(`^${name.toLowerCase()}`);
                return pattern.test(item.name.toLowerCase());
            });

            res.json({pokemons: matches});
        }).catch(error => next(error));
}

function all(req, res, next) {
    const {limit, offset} = req.query;
    const interval = {
        limit: limit - 1 || 1,
        offset: offset || 0
    };

    P.getPokemonsList(interval)
        .then(response => {
            const pokemons = response.results.map(item => P.getPokemonByName(item.name));
            Promise.all(pokemons).then(result => res.json({result: result, count: response.count}))
        }).catch(error => next(error));
}

function byType(req, res, next) {
    const {type} = req.query;
    if (type) {
        P.getTypeByName(type)
            .then(response => {
                res.json({pokemons: response.results})
            }).catch(error => next(error));
    } else {
        res.status(403).send({error: "Provide 'type' parameter"});
    }
}

function types(req, res, next) {
    P.getTypesList()
        .then(response => {
            res.json({types: response.results})
        }).catch(error => next(error));
}

function getFavorites(req, res, next) {
    User.findOne({"_id": req.user._id}, function (err, user) {
        if (err) {
            return next(err);
        }

        const promises = user.favorites.map((name, i) => {
            return P.getPokemonByName(name)
        });

        Promise.all(promises)
            .then(response => {
                res.json({pokemons: response});
            }).catch(error => next(error));
    });
}


function addFavorite(req, res, next) {
    let favorite = req.body.name;

    User.findOne({"_id": req.user._id}, function (err, user) {
        if (err) {
            return next(error);
        }

        const isMatch = user.favorites.includes(favorite);
        if (!isMatch) {
            user.favorites.push(favorite);
            user.save(err => {
                if (err) {
                    return next(err);
                }

                res.status(200).send({status: "Saved"});
            })
        } else {
            res.status(400).send({error: "Already added"});
        }
    });
}

function removeFavorite(req, res, next) {
    let favorite = req.body.name;
    User.findOne({"_id": req.user._id}, function (err, user) {
        if (err) {
            return next(err);
        }

        user.favorites = user.favorites.filter(name => {
            return name !== favorite;
        });

        user.save(err => {
            if (err) {
                return next(err);
            } else {
                res.status(200).send({status: "removed"});
            }
        })
    });


}

module.exports = {
    byName,
    byType,
    all,
    types,
    getFavorites,
    addFavorite,
    removeFavorite
};