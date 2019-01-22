const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const request = require('request');
const moment = require('moment');
const { uber_api_token, maps_api_key, lecab_api_key } = require('./config/keys');

const app = express();
app.use(express.urlencoded({ extended: false }));

app.use('/public', express.static('public'));

app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    res.render('pages/home', { prices: [], lecab: false });
});

app.post('/', (req, res) => {
    const location = {};

    request({
        uri: 'https://maps.googleapis.com/maps/api/geocode/json',
        method: 'GET',
        qs: {
            address: req.body.location,
            key: maps_api_key
        }
    }, function (error, response, body) {
        if (error) {
            return console.log('upload failed:', error);
        }
        location.start = JSON.parse(body).results[0].geometry.location;
        request({
            uri: 'https://maps.googleapis.com/maps/api/geocode/json',
            method: 'GET',
            qs: {
                address: req.body.destination,
                key: maps_api_key
            }
        }, function (error, response, body) {
            if (error) {
                return console.log('upload failed:', error);
            }
            location.end = JSON.parse(body).results[0].geometry.location;
            const date = new Date();
            request({
                uri: 'https://api.lecab.fr/release/jobs/estimate',
                method: 'POST',
                headers: {
                    Authorization: `X-Api-Key ${lecab_api_key}`,
                    'Content-Type': 'application/json'
                },
                json: {
                    pickup: {
                        latitude: location.start.lat,
                        longitude: location.start.lng
                    },
                    drop: {
                        latitude: location.end.lat,
                        longitude: location.end.lng
                    },
                    service: "P508",
                    date: `${date.getFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}T15:56:00+02:00`
                }
            }, function (error, response, body) {
                const lecab = body;
                request({
                    uri: 'https://api.uber.com/v1.2/estimates/price',
                    method: 'GET',
                    headers: {
                        Authorization: `Token ${uber_api_token}`
                    },
                    qs: {
                        start_latitude: location.start.lat,
                        start_longitude: location.start.lng,
                        end_latitude: location.end.lat,
                        end_longitude: location.end.lng
                    }
                }, function (error, response, bd) {
                    if (error) {
                        return console.log('upload failed:', error);
                    }
                    res.render('pages/home', { prices: JSON.parse(bd).prices || [], lecab });
                });
            });
        });
    });
});

app.listen(process.env.PORT || 3000, console.log(`App is running on port ${process.env.PORT || 3000}`));