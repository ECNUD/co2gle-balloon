var SerialPort = require("serialport").SerialPort;
var serialport = new SerialPort("/dev/ttyACM0", {
  baudrate: 57600
});
var http = require('http');
var url = require('url');

var debug = true;

var useArduino = true;
if(process.argv[2] === 'noduino'){
  useArduino = false;
}

var buffOn = new Buffer("1");
var buffOff = new Buffer("0");

var pumpTimeout = null;
var lastPush = Date.now();
var runningTime = 0;
var volumeToTimeRelation = 400;
var miniumTime = 500;

var co2ConversionRate = 7.22;

function bytesToCO2(bytes){
  return Math.round(bytes / 1024 / 1024 * co2ConversionRate);
}

function gramsToLiters(grams){
  return Math.round(grams * (559 / 1000) * 1000) / 1000;
}


// State
var fanRunning = false;

function turnOn(){
  if(!fanRunning) {
    fanRunning = true;
    serialport.write(buffOn, function(err, results) {
      // TODO: Handle Error
      if(err) console.log('err ' + err);
    });
    if(debug) console.log('turned ON');
  }
}

function turnOff(){
  if(fanRunning) {
    fanRunning = false;
    serialport.write(buffOff, function(err, results) {
      // TODO: Handle Error
      if(err) console.log('err ' + err);
    });
    if(debug) console.log('turned OFF');
  }
}

function setupServer(){
  http.createServer(function (req, res) {
    var parsedUrl = url.parse(req.url, true);
    if(parsedUrl.pathname === '/pushVolume'){
      var volume = gramsToLiters( bytesToCO2( parseInt(parsedUrl.query.bytes) ) );
      var time = 0;
      if(volume > 0) {
        clearTimeout(pumpTimeout);
        var timeDelta = Date.now() - lastPush;
        var restTime = Math.max(runningTime - timeDelta, 0);
        turnOn();
        time = Math.max( volume * volumeToTimeRelation + restTime, miniumTime );
        pumpTimeout = setTimeout(turnOff, time);
        lastPush = Date.now();
        runningTime = time;
      }
      console.log('Pushed:', parsedUrl.query.bytes, 'Volume:', volume, 'Calculated Time:', time, 'Running Time:', runningTime);
    }
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('done\n');
  }).listen(3000);
}

if(useArduino){
  serialport.on('open', function(){
    console.log('Serial Port Opened');
    setupServer();
  });
} else {
  setupServer();
}