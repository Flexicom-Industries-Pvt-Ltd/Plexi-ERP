import { DefaultSession, DefaultUser } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      permissions?: any[]
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    role?: string
    permissions?: any[]
  }
}
