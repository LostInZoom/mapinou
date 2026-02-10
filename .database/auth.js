import basicAuth from 'express-basic-auth';

export const exportAuth = basicAuth({
    users: { lapinou: process.env.MAPINOU_PWD },
    challenge: true
});