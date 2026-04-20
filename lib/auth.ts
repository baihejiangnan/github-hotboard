import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { PrismaAdapter } from "@next-auth/prisma-adapter";

import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/membership";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  debug: true,
  logger: {
    error(code, metadata) {
      console.error("[next-auth][error]", code, metadata);
    },
    warn(code) {
      console.warn("[next-auth][warn]", code);
    },
    debug(code, metadata) {
      console.debug("[next-auth][debug]", code, metadata);
    }
  },
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID || "",
      clientSecret: process.env.GITHUB_SECRET || "",
      authorization: {
        params: {
          scope: "read:user user:email"
        }
      }
    })
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
    async signIn({ user }) {
      if (user.email && isAdmin(user.email)) {
        const db = prisma as any;
        await db.user.update({
          where: { id: user.id },
          data: { membershipTier: "god" }
        });
      }
      return true;
    }
  },
  session: {
    strategy: "database"
  },
  pages: {
    signIn: "/explore"
  }
};

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireUser() {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error("Authentication required.");
  }
  return session.user;
}

export async function getGitHubAccessToken(userId: string) {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: "github"
    },
    select: {
      access_token: true
    }
  });

  if (!account?.access_token) {
    throw new Error("GitHub access token is unavailable for this user.");
  }

  return account.access_token;
}
