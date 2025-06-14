// Microsoft Entra ID (Azure AD) Configuration
const msalConfig = {
    auth: {
        clientId: process.env.ENTRA_CLIENT_ID || "e406fc3a-55f9-4477-9039-09f27292560e", // ZEO Clinical AI Assistant
        authority: process.env.ENTRA_AUTHORITY || "https://login.microsoftonline.com/c97cb1fb-d321-401b-b372-417a528542ba", // healthhealth.io tenant
        redirectUri: process.env.ENTRA_REDIRECT_URI || window.location.origin + "/",
        postLogoutRedirectUri: window.location.origin + "/"
    },
    cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: false,
    },
    system: {
        loggerOptions: {
            loggerCallback: (level, message, containsPii) => {
                if (containsPii) return;
                switch (level) {
                    case msal.LogLevel.Error:
                        console.error(message);
                        return;
                    case msal.LogLevel.Info:
                        console.info(message);
                        return;
                    case msal.LogLevel.Verbose:
                        console.debug(message);
                        return;
                    case msal.LogLevel.Warning:
                        console.warn(message);
                        return;
                }
            }
        }
    }
};

// Permissions to request
const loginRequest = {
    scopes: ["User.Read", "profile", "openid", "email"]
};

// Graph API endpoint
const graphConfig = {
    graphMeEndpoint: "https://graph.microsoft.com/v1.0/me",
    graphPhotoEndpoint: "https://graph.microsoft.com/v1.0/me/photo/$value"
};

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { msalConfig, loginRequest, graphConfig };
}