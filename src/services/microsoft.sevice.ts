import { Client } from "@microsoft/microsoft-graph-client";
import { ClientSecretCredential } from "@azure/identity";
import dotenv from "dotenv";

dotenv.config();
// Auth using Azure AD app registration
const credential = new ClientSecretCredential(
  process.env.MICROSOFT_TENANT_ID,
  process.env.MICROSOFT_CLIENT_ID,
  process.env.MICROSOFT_CLIENT_SECRET
);

// Create Microsoft Graph client
const graphClient = Client.initWithMiddleware({
  authProvider: {
    getAccessToken: async () => {
      const token = await credential.getToken(
        "https://graph.microsoft.com/.default"
      );
      return token.token;
    },
  },
});

export const getUsers = async () => {
  try {
    const users = [];

    // MS Graph returns max 999 users per page → this loop collects all pages
    let result = await graphClient
      .api("/users")
      .select("id,displayName,userPrincipalName,employeeId")
      .top(999)
      .get();

    users.push(...result.value);

    while (result["@odata.nextLink"]) {
      result = await graphClient.api(result["@odata.nextLink"]).get();
      users.push(...result.value);
    }

    const filteredUsers = users.filter((user) => user.employeeId !== null);

    return filteredUsers;
  } catch (err) {
    console.error(err);
  }
};
