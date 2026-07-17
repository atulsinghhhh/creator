import NextAuth from "next-auth";
import { CredentialsSignin } from "@auth/core/errors";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { users, accounts } from "@/lib/db/schema";
import { LoginError, verifyCredentials } from "@/lib/auth/verify-credentials";
import { ACCESS_TOKEN_TTL_SECONDS } from "@/lib/auth/tokens";
import { getClientIp, getUserAgent } from "@/lib/auth/request-meta";
import { provisionNewUser } from "@/lib/billing/provision";

class InvalidCredentialsSignin extends CredentialsSignin {
  code = "invalid_credentials";
}

class AccountLockedSignin extends CredentialsSignin {
  code = "account_locked";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, { usersTable: users, accountsTable: accounts }),
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: ACCESS_TOKEN_TTL_SECONDS,
  },
  jwt: {
    maxAge: ACCESS_TOKEN_TTL_SECONDS,
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      credentials: {
        email: { label: "Email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const email = typeof credentials?.email === "string" ? credentials.email : undefined;
        const password = typeof credentials?.password === "string" ? credentials.password : undefined;
        if (!email || !password) return null;

        try {
          const user = await verifyCredentials({
            email,
            password,
            ip: getClientIp(request),
            userAgent: getUserAgent(request),
          });
          return { id: user.id, email: user.email, name: user.name, image: user.image };
        } catch (err) {
          if (err instanceof LoginError) {
            if (err.code === "account_locked") throw new AccountLockedSignin();
            throw new InvalidCredentialsSignin();
          }
          throw err;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
  events: {
    // Fires when the adapter creates a brand-new user — i.e. first-time OAuth
    // sign-in (Google). Credentials registration bypasses the adapter, so it
    // provisions inline in /api/auth/register instead.
    async createUser({ user }) {
      if (user.id) await provisionNewUser(user.id);
    },
  },
});
