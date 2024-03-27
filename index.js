const functions = require('@google-cloud/functions-framework');
const Pool = require('pg').Pool;
var randomBytes = require("randombytes");
const formData = require('form-data');
const Mailgun = require('mailgun.js');

// const Knex = require('knex');
// const {Connector} = require('@google-cloud/cloud-sql-connector');

// const connectWithConnector = async config => {
//   const connector = new Connector();
//   const clientOpts = await connector.getOptions({
//     instanceConnectionName: 'csye-6225-project-dev:us-east1:private-ip-cloud-sql-instance',
//     ipType: 'PRIVATE',
//   });
//   const dbConfig = {
//     client: 'pg',
//     connection: {
//       ...clientOpts,
//       user: 'webapp', 
//       password: 'cY}eUT?&rkkDn:_4', 
//       database: 'webapp',
//     },
//     ...config,
//   };
//   // Establish a connection to the database.
//   return Knex(dbConfig);
// }

// const createPool = async () => {
//   const config = {pool: {}};

//   config.pool.max = 10;
//   config.pool.min = 5;

//   config.pool.acquireTimeoutMillis = 60000; // 60 seconds
//   config.pool.createTimeoutMillis = 30000; // 30 seconds
//   config.pool.idleTimeoutMillis = 600000; // 10 minutes
//   config.pool.createRetryIntervalMillis = 200; // 0.2 seconds

//   return connectWithConnector(config);
// };

// const updateUser = async () => {
//     await createPool()
//     .then(async pool => {
//       return await pool('Users')
//       .select();
//     })
//     .catch(err => {
//       console.log(err);
//     });

// };


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
        subject: "Email verification",
        text: "Please verify your email with the csye6225 service",
        html: "<h1>Please verify your email with the csye6225 service</h1><p>http://abathula.tech:8080/v1/user/validate?username="+json.username+"&email_validation_token="+token+"</p> "
      })
      .then(msg => console.log(msg)) // logs response data
      .catch(err => console.log(err)); // logs any error

    }
  })

  // updateUser().then(
  //   data => {
  //     console.log(data);
  //   }
  // ).catch(
  //   err => {
  //     console.log(err);
  //   }
  // )
});
