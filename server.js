var SerialPort = require("serialport").SerialPort;
var serialport = new SerialPort("/dev/ttyACM0", {
  baudrate: 57600
});
var http = require('http');
var url = require('url');

var useArduino = true;
if(process.argv[2] === 'noduino'){
  useArduino = false;
}

var buffOn = new Buffer("1");
var buffOff = new Buffer("0");

// State
var fanRunning = false;

function turnOn(){
  if(!fanRunning) {
    fanRunning = true;
    serialport.write(buffOn, function(err, results) {
      // TODO: Handle Error
      console.log('err ' + err);
    });
  }
}

function turnOff(){
  if(fanRunning) {
    fanRunning = false;
    serialport.write(buffOff, function(err, results) {
      // TODO: Handle Error
      console.log('err ' + err);
    });
  }
}

function setupServer(){
  http.createServer(function (req, res) {
    var parsedUrl = url.parse(req.url);
    if(parsedUrl.path === '/pushVolume'){
      turnOn();
      setTimeout(turnOff, 3000);
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