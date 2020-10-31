const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const serviceNow = require('./serviceNow');
const localtunnel = require('localtunnel');
const app = express();
const localPort = 8080;
app.use(bodyParser.urlencoded({ extended: false }))

let previousAlarmID = '';

//handler for receiving get request
app.get('/', (req, res) => {
  console.log('Received get request');

  let data = '';
  req.setEncoding('utf8');
  req.on('data', (chunk) => {
    data += chunk;
  });

  req.on('end', () => {
    let response = JSON.parse(data);
    console.log(response);
  });
})

//handler for receiving post request
app.post('/', (req, res) => {
  console.log('Received post request');

  let data = '';
  req.setEncoding('utf8');
  req.on('data', (chunk) => {
    data += chunk;
  });

  req.on('end', () => {
    let response = JSON.parse(data);
    console.log(response);

    if (response.MessageId.localeCompare(previousAlarmID) && response.Subject.includes('ALARM')) {
      console.log(previousAlarmID);
      console.log(response.MessageId);
      previousAlarmID = response.MessageId;
      console.log('Creating Servicenow ticket');
      serviceNow.createIncidentTicket();
    }
    if (response.Type === 'SubscriptionConfirmation') {
      console.log(response.SubscribeURL);
      request(response.SubscribeURL, (error, response, body) => {
        if (!error && response.statusCode === 200) {
          console.log('Subscription has been confirmed.');
        }
      })
    }
  });
})

//create server on the port specified
const server = app.listen(localPort, () => {
  console.log('Server is on port ' + localPort);
})

//create a tunnel from the local port to a https public domain
const attemptedTunnel = localtunnel(localPort, { subdomain: 'se4485cloudmonitoring' }, (err, successfulTunnel) => {
  if (err) {
    console.log('Unable to create tunnel.')
    process.exit(1);
  }
  console.log(successfulTunnel.url);
});

//graceful handling of ending the server, will output appropriate messages
process.on('SIGTERM', shutDown);
process.on('SIGINT', shutDown);

function shutDown (signal) {
  console.log('\nReceived kill signal ' + signal + ', shutting down server.');
  attemptedTunnel.close();
}

attemptedTunnel.on('close', () => {
  console.log('URL has closed.');
  server.close();
})

server.on('close', () => {
  console.log('Local server has been stopped.');
  process.exit(0);
})