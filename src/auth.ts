import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { headers } from "next/headers";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const headersList = await headers();
        const ip = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || null;
        const userAgent = headersList.get("user-agent") || null;

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
          include: { role: true }
        });

        if (!user || !user.password) {
          // Log failed login — user not found
          const { logEvent } = await import("@/lib/logging");
          await logEvent({
            module: "AUTH",
            severity: "SECURITY",
            action: "Login Failed — User Not Found",
            payload: { email: credentials.email },
            ip,
            userAgent,
            httpMethod: "POST",
            url: "/api/auth/callback/credentials",
          });
          return null;
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValidPassword) {
          // Log failed login — wrong password
          const { logEvent } = await import("@/lib/logging");
          await logEvent({
            userId: user.id,
            module: "AUTH",
            severity: "SECURITY",
            action: "Login Failed — Invalid Password",
            payload: { email: credentials.email },
            ip,
            userAgent,
            httpMethod: "POST",
            url: "/api/auth/callback/credentials",
          });
          return null;
        }

        // Return user object without the password
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role?.name || "USER",
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
      }
      return session;
    }
  },
  events: {
    async signIn({ user }) {
      // Log successful login
      const headersList = await headers();
      const ip = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || null;
      const userAgent = headersList.get("user-agent") || null;
      
      const { logEvent } = await import("@/lib/logging");
      await logEvent({
        userId: user.id,
        module: "AUTH",
        severity: "INFO",
        action: "Login Success",
        payload: { email: user.email, name: user.name },
        ip,
        userAgent,
      });
    },
    async signOut(message) {
      // Log sign-out event
      const headersList = await headers();
      const ip = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || null;
      const userAgent = headersList.get("user-agent") || null;

      const { logEvent } = await import("@/lib/logging");
      const token = 'token' in message ? message.token : null;
      await logEvent({
        userId: (token as any)?.id ?? undefined,
        module: "AUTH",
        severity: "INFO",
        action: "Logout",
        payload: {},
        ip,
        userAgent,
      });
    },
  },
  pages: {
    signIn: "/auth/login",
  },
});

