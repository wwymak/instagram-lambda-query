"use strict";
const ig = require('instagram-node').instagram();
const config = require('./config').instagram;
const async = require('async');
const AWS = require('aws-sdk');
AWS.config.region = 'us-east-1';
var s3 = new AWS.S3();


ig.use({ access_token: config.access_token });
var latSpan = 51.6926444 - 51.2915213,
    lngSpan = -(-0.5114061 -0.3344104),
    latPoints = Math.floor(latSpan/0.01),
    lngPoints = Math.floor(lngSpan/0.02);

var latSpanArr = new Array(latPoints).fill(51.2915213).map((d,i) => (d + i * 0.01).toFixed(6)),
    lngSpanArr = new Array(lngPoints).fill(-0.5114061).map((d,i) => (d + i * 0.02).toFixed(6));

function getLatLngPairs(latSpanArr, lngSpanArr){
    var out = [];
    latSpanArr.forEach((d,i) => {
        lngSpanArr.forEach((e,i) => {
            out.push({lat: d, lng: e});
        })
    });
    return out
}

var allLatLngs = getLatLngPairs(latSpanArr, lngSpanArr);



exports.handler = function(event, context, callback) {
    var locationInfoData = [];
    async.waterfall([
        function (next) {
            async.mapLimit(allLatLngs, 500, function (item, callback) {
                ig.media_search(parseFloat(item.lat), parseFloat(item.lng), {distance: 1400},
                    function (err, result, remaining, limit) {
                        if (remaining == 0) {
                            console.log('no remainling, waitin');
                            // setTimeout(()=> {
                            context.done(err, result);
                            // }, 5 * 60 * 60)
                        }
                        if (err) {
                            console.warn(err);
                            callback(err);
                        } else {
                            console.log('result 1 call');
                            callback(null, result);
                        }
                    });
            }, function (err, result) {
                locationInfoData = [].concat.apply([], result);
                if (err) {
                    next(err);
                } else {
                    next(null, locationInfoData);
                }
            })
        },
        function (locationInfoData, callback) {
            console.log('putting into s3');
            console.log(locationInfoData);
            var time = new Date();
            var filename = `instagram-data-${time.getTime()}.json`;
            s3.putObject({
                // Bucket: bucketName,
                Bucket: 'wwymak-instagram-dataapi',
                Key: filename,
                Body: JSON.stringify(locationInfoData),
                ContentType: 'application/json'
            },  callback);
        }
    ], function (err, result) {
        if (err) {
            console.error('cannot write to s3');
        }else {
            console.log('result');
        }
        context.done(err, result);
    });
};
// exports.handler();
