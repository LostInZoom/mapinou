import basicAuth from 'express-basic-auth';

// Retrieve the password from the processing environement
export const exportAuth = basicAuth({
    users: { lapinou: process.env.MAPINOU_PWD },
    challenge: true
});