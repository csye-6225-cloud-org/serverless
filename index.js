const functions = require('@google-cloud/functions-framework');
const Pool = require('pg').Pool;
var randomBytes = require("randombytes");
const formData = require('form-data');
const Mailgun = require('mailgun.js');
const mailgunkey = "fcde11b70b4218dc2aabeff145f0dde4-f68a26c9-cf88b96e";

// Register a CloudEvent callback with the Functions Framework that will
// be executed when the Pub/Sub trigger topic receives a message.
functions.cloudEvent('sendValidationEmail', cloudEvent => {
  // The Pub/Sub message is passed as the CloudEvent's data payload.
  const base64name = cloudEvent.data.message.data;

  const name = base64name
    ? Buffer.from(base64name, 'base64').toString()
    : 'World';

  var json = JSON.parse(name);
  console.log('Parsing json from topic username:', json.username);
  console.log("cloudDBUser", process.env.cloudDBUser);
  console.log("cloudDBPassword", process.env.cloudDBPassword);
  console.log("cloudDBHost", process.env.cloudDBHost);
  console.log("cloudDBDB", process.env.cloudDBDB);

  const pool = new Pool({
    user: process.env.cloudDBUser,
    database: process.env.cloudDBDB,
    password: process.env.cloudDBPassword,
    host: process.env.cloudDBHost,
    port: 5432
  });

  var token = randomBytes(20).toString('hex');

  pool.query('UPDATE public."Users" SET "email_sent" = $1, "email_validation_token" = $2 WHERE "username" = $3',
  [new Date(), token, json.username],
  (error, results) => {
    if (error) {
      console.log(error);
    }
    if(results != undefined){
      console.log(results.rows);
      const mailgun = new Mailgun(formData);
      const mg = mailgun.client({username: 'api', key: process.env.MAILGUN_API_KEY || mailgunkey});

      mg.messages.create('abathula.tech', {
        from: "Mail Admin <mail@abathula.tech>",
        to: [json.username],
        subject: "Email verification with csye6225 service",
        text: "Please verify your email with the csye6225 service",
        // html: "<h1>Please verify your email with the csye6225 service</h1><p>http://abathula.tech:8080/v1/user/validate?username="+json.username+"&email_validation_token="+token+"</p> "
        html: "<table style=width:100%;padding:20px;border-spacing:3px;> <tr> <td><p><font face=Helvetica size=4px>Hi there</font></p><td> </tr> <tr> <td><p><font face=Helvetica size=4px>Thank you for registering with the csye6225 service. Please click on the link below to verify your email.</font></p><td> </tr> <tr> <td><p><font face=Helvetica size=4px>https://abathula.tech:443/v1/user/validate?username="+json.username+"&email_validation_token="+token+"</font></p><td> </tr> <tr> <td><p><font face=Helvetica size=4px>You must verify your email within 2 minutes of receiving it.</font></p><td> </tr> <tr> <td><p><font face=Helvetica size=4px>Welcome to csye6225!</font></p><td> </tr> </table>"
      })
      .then(msg => console.log(msg)) // logs response data
      .catch(err => console.log(err)); // logs any error

    }
  })
});
