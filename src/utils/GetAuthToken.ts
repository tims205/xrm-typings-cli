#!/usr/bin/env node

import { Configuration, CryptoProvider, PublicClientApplication } from "@azure/msal-node"
import open from "open"
import express from "express"
import { Server } from "http"
import { GenerateAuthRequest } from "../models/GenerateAuthRequest.js";

/**
 * Generates an auth token through a PKCE exchange
 * @param generateAuthRequest 
 * @returns 
 */
export async function GenerateAuthToken(generateAuthRequest: GenerateAuthRequest): Promise<string> {
    
    const msalConfig: Configuration = {
        auth: {
            clientId: generateAuthRequest.appId,
            authority: "https://login.microsoftonline.com/common" 
        }
    };

    const pca = new PublicClientApplication(msalConfig); 

    const cryptoProvider = new CryptoProvider();
    const { verifier, challenge } = await cryptoProvider.generatePkceCodes();

    // Builds up a url that is opened in the browser
    const authCodeUrlParameters = {
        scopes: [`${generateAuthRequest.orgUrl}/.default`],
        redirectUri: `http://localhost:${generateAuthRequest.localhostPort}`,
        codeChallenge: challenge, // PKCE code challenge
        codeChallengeMethod: "S256" // PKCE code challenge method 
    };

    const authCodeUrl = await pca.getAuthCodeUrl(authCodeUrlParameters);

    // This opens a browser for the user to enter credentials
    await open(authCodeUrl);

    // Then we need to get the code that is sent back to the http://localhost redirect uri
    // Wait for the authorization response to be send to the redirect URI
    // An express server is created and listens for the redirect then extracts the auth code
    const authorizationCode = await authCodePromise(generateAuthRequest.localhostPort);

    // Once we have an auth code then we can exchange it for a token
    const tokenRequest = {
        code: authorizationCode,
        codeVerifier: verifier, // PKCE code verifier 
        scopes: [`${generateAuthRequest.orgUrl}/.default`],
        redirectUri: `http://localhost:${generateAuthRequest.localhostPort}`,
    };

    const token = await pca.acquireTokenByCode(tokenRequest);

    // Now we have a token
    //console.log(`Access Token: ${token.accessToken}`);

    return token.accessToken;
}

/**
 * Sets up a server running on localhost that listens for the login redirect
 * and extracts the access token.
 */
const authCodePromise = (port: number) => new Promise<string>((resolve, reject) => {
    const app = express();
    let server: Server | undefined = undefined;

    app.get("*", (req: any, res) => {
        // Close the temporary server once we've received the redirect.
        res.status(200).send("<p>You can now close this window.</p>")
        
        if (server) {
            server.close();
        }

        // The redirect will either contain a "code" or an "error"
        const authorizationCode = req.query["code"];
        if (authorizationCode) {
            resolve(authorizationCode.toString());
        } else {
            reject(
                new Error(
                    `Authentication Error "${req.query["error"]}":\n\n${req.query["error_description"]}`,
                ),
            );
        }
    });

    server = app.listen(port, () =>
        console.log(`Authorization code redirect server listening on port ${port}`),
    );
});